from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.db import get_db, SessionLocal
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User
from app.services.profile.models import UserProfile
from app.services.profile.parser import parse_resume
from pydantic import BaseModel
from typing import List
import json
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class OnboardingStatus(BaseModel):
    step: int
    completed: bool
    has_resume: bool
    has_preferences: bool


class JobPreferences(BaseModel):
    job_titles: List[str]
    remote_preference: str
    location: str | None = None


@router.get("/status", response_model=OnboardingStatus)
def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()

    if not profile:
        step, has_resume, has_preferences, completed = 2, False, False, False
    elif not profile.preferences or not profile.preferences.get("job_titles"):
        step, has_resume, has_preferences, completed = 4, True, False, False
    else:
        step, has_resume, has_preferences, completed = 6, True, True, True

    return OnboardingStatus(
        step=step, completed=completed,
        has_resume=has_resume, has_preferences=has_preferences
    )


@router.post("/upload-resume")
async def upload_resume_onboarding(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = await file.read()
    parsed = parse_resume(content, file.filename)

    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()

    if profile:
        profile.full_name = parsed.get("full_name", profile.full_name)
        profile.email = parsed.get("email", profile.email)
        profile.phone = parsed.get("phone", profile.phone)
        profile.skills = parsed.get("skills", [])
        profile.experience = parsed.get("experience", [])
        profile.education = parsed.get("education", [])
        profile.summary = parsed.get("summary")
    else:
        profile = UserProfile(
            user_id=current_user.id,
            full_name=parsed.get("full_name", current_user.full_name),
            email=parsed.get("email", current_user.email),
            phone=parsed.get("phone"),
            skills=parsed.get("skills", []),
            experience=parsed.get("experience", []),
            education=parsed.get("education", []),
            summary=parsed.get("summary"),
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)

    return {
        "success": True,
        "profile": {
            "full_name": profile.full_name,
            "skills": profile.skills[:12],
            "total_skills": len(profile.skills),
            "experience_years": len(profile.experience),
            "education": profile.education
        }
    }


@router.post("/set-preferences")
def set_job_preferences(
    preferences: JobPreferences,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(404, "Profile not found. Upload resume first.")

    profile.preferences = {
        "job_titles": preferences.job_titles,
        "remote_preference": preferences.remote_preference,
        "location": preferences.location
    }
    db.commit()
    db.refresh(profile)

    # Fire background AI scoring — user is still on onboarding screens
    # By the time they reach the jobs page, scores will be ready
    background_tasks.add_task(_ai_score_jobs_for_new_user, user_id=current_user.id)

    return {"success": True, "message": "Preferences saved!"}


def _ai_score_jobs_for_new_user(user_id: int):
    """
    Background task: AI-score top 200 tech jobs for a new user.

    Uses short prompt (~280 tokens/call) to stay within Groq's 6000 TPM.
    Runs 6 parallel workers → ~20 calls/min → 200 jobs in ~10 minutes.
    Filters to tech roles first (keyword, instant) to avoid wasting
    API calls on non-tech jobs.

    User spends ~3-5 mins on final onboarding screens + lands on jobs page.
    By then, first 60-80 jobs are already scored and showing accurate badges.
    Remaining jobs score over next few minutes in the background.
    """
    import os
    from groq import Groq

    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    if not GROQ_API_KEY:
        logger.warning("[Onboarding Scorer] GROQ_API_KEY not set — skipping")
        return

    db = SessionLocal()
    try:
        profile = db.query(UserProfile).filter(
            UserProfile.user_id == user_id
        ).first()

        if not profile or not profile.skills:
            logger.info(f"[Onboarding Scorer] User {user_id}: no profile — skipping")
            return

        profile_dict = {
            "summary": profile.summary or "",
            "skills": profile.skills or [],
            "experience": profile.experience or [],
            "education": profile.education or [],
            "certifications": profile.certifications or [],
            "languages": profile.languages or [],
            "preferences": profile.preferences or {},
        }

        targets = ", ".join(profile.preferences.get("job_titles", [])) or "software/data engineering"
        skills_str = ", ".join((profile.skills or [])[:25])
        exp_lines = "\n".join([
            f"- {e.get('title','')} at {e.get('company','')}"
            for e in (profile.experience or [])[:3]
            if isinstance(e, dict)
        ])
        langs = [
            (l.get("language","") if isinstance(l, dict) else str(l)).lower()
            for l in (profile.languages or [])
        ]
        langs_str = ", ".join(langs) if langs else "english"

        # Fetch recent jobs — pre-filtered to tech roles only
        from app.services.matching.scorer import is_tech_role
        rows = db.execute(text("""
            SELECT id, title, company, location, description_text
            FROM jobs
            WHERE scraped_at >= NOW() - INTERVAL '30 days'
            ORDER BY scraped_at DESC
            LIMIT 500
        """)).fetchall()

        # Filter to tech roles instantly (no API)
        tech_jobs = [r for r in rows if is_tech_role(r[1] or "")]
        logger.info(f"[Onboarding Scorer] User {user_id}: {len(tech_jobs)} tech jobs from {len(rows)} total")

        # Score top 200 tech jobs
        to_score = tech_jobs[:200]

        groq_client = Groq(api_key=GROQ_API_KEY)

        def score_one(row):
            job_id, title, company, location, description = row
            desc = (description or "")[:600]  # short = fewer tokens
            prompt = f"""Score job fit 0-90. Strict.

CANDIDATE: targets={targets} | skills={skills_str} | languages={langs_str}
EXPERIENCE: {exp_lines}

JOB: {title} at {company} | {location or ''}
{desc}

RULES:
1. Job requires non-English language candidate doesn't speak → 10
2. Wrong role type (non-engineering/data) → 10-20
3. Internship/junior + experienced candidate → 10
4. Tech role + 3+ skill matches → 70-88
5. Tech role + 1-2 skills → 45-69
6. Adjacent tech role → 35-55
7. Max 90. Never 91-100.

JSON only: {{"match_score":<0-90>,"matched_skills":[<max 5>],"reason":"<10 words>"}}"""

            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=80,  # tiny response = fewer output tokens
            )
            content = response.choices[0].message.content.strip()
            if "```" in content:
                for part in content.split("```"):
                    part = part.strip().lstrip("json").strip()
                    if part.startswith("{"):
                        content = part
                        break
            result = json.loads(content)
            return job_id, result

        # Run in parallel — 6 workers to stay under TPM limit
        scored = 0
        errors = 0
        batch_size = 6  # process in small batches with pause between
        delay_between_batches = 3.5  # seconds — keeps us under 6000 TPM

        for i in range(0, len(to_score), batch_size):
            batch = to_score[i:i + batch_size]

            with ThreadPoolExecutor(max_workers=batch_size) as executor:
                futures = {executor.submit(score_one, row): row for row in batch}
                for future in as_completed(futures):
                    row = futures[future]
                    job_id = row[0]
                    try:
                        jid, result = future.result()
                        score = max(0, min(90, int(result.get("match_score", 0))))
                        matched = result.get("matched_skills", [])

                        db.execute(text("""
                            INSERT INTO user_job_scores
                                (user_id, job_id, match_score, skills_match,
                                 experience_match, preferences_match,
                                 matched_skills, missing_skills, reason, computed_at)
                            VALUES
                                (:uid, :jid, :score, :score, 50, 50,
                                 :ms::jsonb, '[]'::jsonb, 'ai onboarding score', NOW())
                            ON CONFLICT (user_id, job_id) DO UPDATE SET
                                match_score    = EXCLUDED.match_score,
                                skills_match   = EXCLUDED.skills_match,
                                matched_skills = EXCLUDED.matched_skills,
                                reason         = EXCLUDED.reason,
                                computed_at    = NOW()
                            WHERE user_job_scores.reason IN ('keyword estimate', 'ai onboarding score')
                        """), {
                            "uid": user_id, "jid": jid, "score": score,
                            "ms": json.dumps(matched[:5]),
                        })
                        db.commit()
                        scored += 1

                    except Exception as e:
                        errors += 1
                        if "429" in str(e):
                            logger.warning(f"[Onboarding Scorer] Rate limit hit — pausing 15s")
                            time.sleep(15)
                        else:
                            logger.warning(f"[Onboarding Scorer] Job {job_id} failed: {e}")

            # Pause between batches to stay under TPM
            if i + batch_size < len(to_score):
                time.sleep(delay_between_batches)

        logger.info(
            f"[Onboarding Scorer] User {user_id} done — "
            f"scored: {scored}, errors: {errors}"
        )

    except Exception as e:
        logger.error(f"[Onboarding Scorer] Fatal for user {user_id}: {e}")
    finally:
        db.close()


@router.post("/complete")
def complete_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(404, "Complete steps 2-4 first")
    return {"success": True, "message": "Onboarding complete! 🎉"}