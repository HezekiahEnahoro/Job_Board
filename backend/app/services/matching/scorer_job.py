"""
app/services/matching/scorer_job.py
Scheduled pre-compute job. Runs every 6 hours via APScheduler.

Uses the same is_tech_role() whitelist logic as scorer.py.
Non-tech roles get score=8 instantly without an AI call.
This prevents wasting Groq tokens on Art Directors and Fraud Analysts.
"""

import os
import re
import json
import time
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# ── Copy of title patterns from scorer.py (no circular import) ────────

_TECH_TITLE_PATTERNS = [
    r'\bengineer\b', r'\bdeveloper\b', r'\bprogrammer\b', r'\barchitect\b',
    r'\bdevops\b', r'\bsite\s+reliability\b', r'\bsre\b',
    r'\bmachine\s+learning\b', r'\bml\s+engineer\b', r'\bai\s+engineer\b',
    r'\bbackend\b', r'\bfrontend\b', r'\bfront-end\b', r'\bback-end\b',
    r'\bfullstack\b', r'\bfull[\s-]stack\b',
    r'\bsoftware\b', r'\bsoftwareentwickler\b', r'\bentwickler\b',
    r'\btech(nical)?\s+lead\b', r'\bengineering\s+manager\b',
    r'\bvp\s+of\s+engineering\b', r'\bvp\s+engineering\b',
    r'\bprincipal\s+engineer\b', r'\bstaff\s+engineer\b',
    r'\bcto\b', r'\bresearch\s+engineer\b',
    r'\bdata\s+engineer(ing)?\b', r'\bdata\s+scientist\b',
    r'\bdata\s+architect\b', r'\banalytics\s+engineer\b',
    r'\bdata\s+platform\b', r'\bdata\s+pipeline\b',
]

_NON_TECH_OVERRIDES = [
    r'\bbusiness\s+develop\w+\b',
    r'\bdata\s+analyst,\s*(financial|product|pricing|risk|fraud)\b',
    r'\bproduct\s+accounting\b',
    r'\bdata\s+insights\b',
]

_LANG_PATTERNS = [
    r'\b(fluent|native|proficient|bilingual)\s+(in\s+)?(german|deutsch|french|spanish|portuguese|dutch|italian|polish|swedish|norwegian|danish|finnish)\b',
    r'\b[BC][12]\s+(level\s+)?(german|deutsch|french|spanish|dutch)\b',
    r'\b(german|deutsch|french|spanish|dutch)\s+[BC][12]\b',
    r'\bcommunicat\w+\s+(fluently\s+)?in\s+german\b',
    r'\bsprichst\s+deutsch\b', r'\bdeutschkenntnisse\b',
    r'\bminijob\b', r'\bwerkstudent\b', r'\bpraktikum\b',
]

_JUNIOR_SIGNALS = [
    "internship", "intern ", "praktikum", "werkstudent",
    "minijob", "trainee", "entry level", "entry-level", "aushilfe",
]


def _is_tech_role(title: str) -> bool:
    t = title.lower()
    if not any(re.search(p, t) for p in _TECH_TITLE_PATTERNS):
        return False
    if any(re.search(p, t) for p in _NON_TECH_OVERRIDES):
        return False
    return True


def _requires_non_english(text: str) -> bool:
    t = text.lower()
    return any(re.search(p, t, re.IGNORECASE) for p in _LANG_PATTERNS)


def _is_junior(text: str) -> bool:
    t = text.lower()
    return any(s in t for s in _JUNIOR_SIGNALS)


def run_scoring_job():
    """Entry point called by APScheduler."""
    logger.info("🎯 Starting user job scoring...")

    from app.core.db import SessionLocal
    from sqlalchemy import text
    from groq import Groq

    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    if not GROQ_API_KEY:
        logger.warning("[Scorer Job] GROQ_API_KEY not set — skipping")
        return

    groq_client = Groq(api_key=GROQ_API_KEY)
    db = SessionLocal()

    try:
        cutoff = datetime.utcnow() - timedelta(hours=25)
        new_jobs = db.execute(text("""
            SELECT id, title, company, location, description_text
            FROM jobs WHERE scraped_at >= :cutoff
            ORDER BY scraped_at DESC LIMIT 300
        """), {"cutoff": cutoff}).fetchall()

        if not new_jobs:
            logger.info("[Scorer Job] No new jobs in last 25h — skipping")
            return

        logger.info(f"[Scorer Job] {len(new_jobs)} new jobs to score")

        active_users = db.execute(text("""
            SELECT u.id, up.skills, up.experience, up.preferences
            FROM users u JOIN user_profiles up ON up.user_id = u.id
            WHERE u.created_at >= NOW() - INTERVAL '30 days'
               OR u.id IN (
                   SELECT DISTINCT user_id FROM applications
                   WHERE applied_at >= NOW() - INTERVAL '7 days'
               )
        """)).fetchall()

        if not active_users:
            logger.info("[Scorer Job] No active users — skipping")
            return

        total_scored = total_skipped = total_errors = 0

        for user_row in active_users:
            user_id, user_skills, user_experience, user_preferences = user_row
            user_skills = user_skills or []
            user_experience = user_experience or []
            user_preferences = user_preferences or {}
            target_roles = user_preferences.get("job_titles", [])

            existing = db.execute(text(
                "SELECT job_id FROM user_job_scores WHERE user_id = :uid"
            ), {"uid": user_id}).fetchall()
            scored_ids = {row[0] for row in existing}

            to_score = [j for j in new_jobs if j[0] not in scored_ids]
            if not to_score:
                total_skipped += len(new_jobs)
                continue

            logger.info(f"  [User {user_id}] Scoring {len(to_score)} jobs")

            exp_lines = "\n".join([
                f"- {e.get('title', '')} at {e.get('company', '')}"
                for e in user_experience[:3]
            ])
            targets = ", ".join(target_roles) or "software/data engineering"
            skills_str = ", ".join(user_skills[:25])
            has_experience = len(user_experience) >= 2

            for job_row in to_score:
                job_id, title, company, location, description = job_row
                full_text = f"{title} {description or ''}"

                try:
                    result = _score_single_job(
                        groq_client=groq_client,
                        job_title=f"{title} at {company}",
                        job_desc=description or "",
                        job_location=location or "",
                        skills_str=skills_str,
                        exp_lines=exp_lines,
                        targets=targets,
                        raw_title=title or "",
                        full_text=full_text,
                        has_experience=has_experience,
                    )

                    db.execute(text("""
                        INSERT INTO user_job_scores
                            (user_id, job_id, match_score, skills_match,
                             experience_match, preferences_match,
                             matched_skills, missing_skills, reason, computed_at)
                        VALUES (:uid,:jid,:score,:sm,:em,:pm,:ms::jsonb,:mis::jsonb,:reason,NOW())
                        ON CONFLICT (user_id, job_id) DO UPDATE SET
                            match_score=EXCLUDED.match_score,
                            skills_match=EXCLUDED.skills_match,
                            experience_match=EXCLUDED.experience_match,
                            preferences_match=EXCLUDED.preferences_match,
                            matched_skills=EXCLUDED.matched_skills,
                            missing_skills=EXCLUDED.missing_skills,
                            reason=EXCLUDED.reason,
                            computed_at=NOW()
                    """), {
                        "uid": user_id, "jid": job_id,
                        "score": result["match_score"],
                        "sm": result["skills_match"],
                        "em": result["experience_match"],
                        "pm": result["preferences_match"],
                        "ms": json.dumps(result["matched_skills"]),
                        "mis": json.dumps(result["missing_skills"]),
                        "reason": result["reason"],
                    })
                    db.commit()
                    total_scored += 1

                    # Only sleep after real AI calls (non-tech bypass is instant)
                    if result.get("_used_ai", False):
                        time.sleep(1.0)

                except Exception as e:
                    total_errors += 1
                    logger.warning(f"  Failed job {job_id} user {user_id}: {type(e).__name__}: {e}")
                    time.sleep(10 if "429" in str(e) else 2)

        logger.info(f"✅ Done — scored:{total_scored} skipped:{total_skipped} errors:{total_errors}")

    except Exception as e:
        logger.error(f"[Scorer Job] Fatal: {e}")
    finally:
        db.close()


def _score_single_job(groq_client, job_title, job_desc, job_location,
                       skills_str, exp_lines, targets,
                       raw_title="", full_text="", has_experience=True) -> dict:
    """Score one job. Bypasses AI for non-tech/language-blocked/junior roles."""

    # Stage 1: Language check
    if _requires_non_english(full_text[:500]):
        return {
            "match_score": 8, "skills_match": 0,
            "experience_match": 0, "preferences_match": 0,
            "matched_skills": [], "missing_skills": [],
            "reason": "Non-English language requirement",
            "_used_ai": False,
        }

    # Stage 2: Tech title whitelist check — 67/67 test cases pass
    if not _is_tech_role(raw_title):
        return {
            "match_score": 8, "skills_match": 0,
            "experience_match": 0, "preferences_match": 0,
            "matched_skills": [], "missing_skills": [],
            "reason": "Role type mismatch — not an engineering/data role",
            "_used_ai": False,
        }

    # Stage 3: Junior/intern check
    if _is_junior(full_text[:300]) and has_experience:
        return {
            "match_score": 10, "skills_match": 0,
            "experience_match": 0, "preferences_match": 0,
            "matched_skills": [], "missing_skills": [],
            "reason": "Internship/junior role — candidate is experienced",
            "_used_ai": False,
        }

    # Stage 4: AI scoring — only reached for confirmed tech roles
    prompt = f"""Professional recruiter scoring job fit. Strict and accurate.

CANDIDATE: targets={targets} | skills={skills_str}
EXPERIENCE:
{exp_lines}

JOB: {job_title} | {job_location}
{job_desc[:900]}

RULES:
1. Non-English language required + no evidence candidate speaks it → 10
2. Internship/junior/trainee + experienced candidate → 10
3. Adjacent tech role (solutions architect, TAM) + partial overlap → 35-55
4. Genuine engineering/data + 1-2 skills → 45-69
5. Genuine engineering/data + 3+ skills → 70-88
6. Near-perfect fit → 85-90
7. NEVER return 91-100. MAXIMUM is 90. Nothing is perfect.
8. Score actual fit not keyword overlap.

JSON only, no markdown:
{{"match_score":<0-90>,"skills_match":<0-100>,"experience_match":<0-100>,"preferences_match":<0-100>,"matched_skills":[<max 5>],"missing_skills":[<max 5>],"reason":"<one line>"}}"""

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1, max_tokens=220,
    )
    content = response.choices[0].message.content.strip()
    if "```" in content:
        for part in content.split("```"):
            part = part.strip().lstrip("json").strip()
            if part.startswith("{"):
                content = part
                break

    result = json.loads(content)
    return {
        "match_score": max(0, min(90, int(result.get("match_score", 0)))),
        "skills_match": int(result.get("skills_match", 0)),
        "experience_match": int(result.get("experience_match", 0)),
        "preferences_match": int(result.get("preferences_match", 0)),
        "matched_skills": result.get("matched_skills", [])[:5],
        "missing_skills": result.get("missing_skills", [])[:5],
        "reason": result.get("reason", ""),
        "_used_ai": True,
    }