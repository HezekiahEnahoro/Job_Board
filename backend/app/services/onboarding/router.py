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

    # ── Score top jobs in the background ─────────────────────────────
    # Fires after response is sent — user doesn't wait for this.
    # By the time they reach the jobs page (~3-5 seconds), most scores
    # will be written and they'll see real match badges immediately.
    background_tasks.add_task(
        _score_jobs_for_new_user,
        user_id=current_user.id,
    )

    return {"success": True, "message": "Preferences saved!"}


def _score_jobs_for_new_user(user_id: int):
    """
    Background task: score the top 50 recent tech jobs for a new user.
    Runs after preferences are saved so we have full profile context.
    Writes results to user_job_scores — jobs page shows scores on first load.
    """
    from app.services.matching.scorer import (
        calculate_match_score, is_tech_role, requires_language_user_lacks
    )

    db = SessionLocal()
    try:
        # Get full profile
        profile = db.query(UserProfile).filter(
            UserProfile.user_id == user_id
        ).first()

        if not profile or not profile.skills:
            logger.info(f"[Onboarding Scorer] User {user_id} has no profile/skills — skipping")
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

        # Fetch top 100 recent jobs
        rows = db.execute(text("""
            SELECT id, title, company, location, description_text
            FROM jobs
            WHERE scraped_at >= NOW() - INTERVAL '30 days'
            ORDER BY scraped_at DESC
            LIMIT 100
        """)).fetchall()

        if not rows:
            logger.info(f"[Onboarding Scorer] No recent jobs found")
            return

        logger.info(f"[Onboarding Scorer] Scoring {len(rows)} jobs for user {user_id}")

        # Filter to tech roles first (instant, no API calls)
        tech_jobs = []
        for row in rows:
            job_id, title, company, location, description = row
            if is_tech_role(title or ""):
                tech_jobs.append(row)

        logger.info(f"[Onboarding Scorer] {len(tech_jobs)} tech roles after filter")

        # Score each tech job with AI
        scored = 0
        for row in tech_jobs[:50]:  # max 50 AI calls at onboarding
            job_id, title, company, location, description = row

            try:
                job_dict = {
                    "title": f"{title} at {company}",
                    "description": description or "",
                    "location": location or "",
                }

                result = calculate_match_score(job_dict, profile_dict)
                score = result["match_score"]

                db.execute(text("""
                    INSERT INTO user_job_scores
                        (user_id, job_id, match_score, skills_match,
                         experience_match, preferences_match,
                         matched_skills, missing_skills, reason, computed_at)
                    VALUES
                        (:uid, :jid, :score, :sm, :em, :pm,
                         :ms::jsonb, :mis::jsonb, :reason, NOW())
                    ON CONFLICT (user_id, job_id) DO UPDATE SET
                        match_score      = EXCLUDED.match_score,
                        skills_match     = EXCLUDED.skills_match,
                        experience_match = EXCLUDED.experience_match,
                        matched_skills   = EXCLUDED.matched_skills,
                        missing_skills   = EXCLUDED.missing_skills,
                        reason           = EXCLUDED.reason,
                        computed_at      = NOW()
                """), {
                    "uid": user_id,
                    "jid": job_id,
                    "score": score,
                    "sm": result.get("skills_match", 0),
                    "em": result.get("experience_match", 0),
                    "pm": result.get("preferences_match", 0),
                    "ms": json.dumps(result.get("matched_skills", [])),
                    "mis": json.dumps(result.get("missing_skills", [])),
                    "reason": result.get("reason", "Scored at onboarding"),
                })
                db.commit()
                scored += 1

                # 1.1s between calls keeps us under 6000 TPM on llama-3.1-8b-instant
                time.sleep(1.1)

            except Exception as e:
                logger.warning(f"[Onboarding Scorer] Failed job {job_id}: {type(e).__name__}: {e}")
                if "429" in str(e):
                    time.sleep(12)
                else:
                    time.sleep(2)
                continue

        logger.info(f"[Onboarding Scorer] Done — {scored} jobs scored for user {user_id}")

    except Exception as e:
        logger.error(f"[Onboarding Scorer] Fatal error for user {user_id}: {e}")
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