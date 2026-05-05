"""
app/services/matching/scorer_job.py
Scheduled pre-compute job. Runs every 6 hours via APScheduler.
"""

import os
import json
import time
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

_NON_TECH_TITLE_SIGNALS = [
    "sales", "business development", "account executive", "bdr", "sdr",
    "customer success", "client success", "onboarding specialist",
    "marketing", "seo", "content creator", "social media",
    "art director", "creative director", "graphic designer",
    "brand manager", "copywriter", "content manager",
    "accountant", "buchhalter", "buchhaltung", "controller", "cfo",
    "demand planner", "supply chain", "logistics",
    "credit risk", "fraud operations", "risk strategist",
    "financial crimes", "pricing analyst", "fp&a",
    "jurist", "lawyer", "attorney", "rechtsanwalt", "legal",
    "recruiter", "talent acquisition", "hr manager", "people ops",
    "administrative", "coordinator", "workplace technology",
    "office manager", "executive assistant", "operations associate",
    "business operations", "strategy lead", "strategy manager",
    "co-founder", "cofounder", "craftsmen", "local services",
    "management consultant", "strategy consultant",
]


def run_scoring_job():
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

            for job_row in to_score:
                job_id, title, company, location, description = job_row
                try:
                    result = _score_single_job(
                        groq_client, f"{title} at {company}",
                        description or "", location or "",
                        skills_str, exp_lines, targets, title or "",
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
                       skills_str, exp_lines, targets, raw_title="") -> dict:
    # Bypass AI for obviously wrong roles — saves tokens + returns accurate low score
    if any(s in raw_title.lower() for s in _NON_TECH_TITLE_SIGNALS):
        return {
            "match_score": 8, "skills_match": 5,
            "experience_match": 5, "preferences_match": 5,
            "matched_skills": [], "missing_skills": [],
            "reason": "Role type mismatch — not an engineering/data role",
        }

    prompt = f"""Recruiter scoring job fit. Strict and accurate.

CANDIDATE: targets={targets} | skills={skills_str}
EXPERIENCE: {exp_lines}

JOB: {job_title} | {job_location}
{job_desc[:900]}

RULES:
1. Non-English language required + no evidence candidate speaks it → 10
2. Wrong role type (design, admin, finance/risk, sales, legal, HR, marketing, trades) vs engineering/data → 10-20
3. Internship/Praktikum/Werkstudent/Minijob + 2+ years experience → 10
4. Only git/react/python matching on non-engineering role → max 15
5. Genuine engineering/data role + 3+ skills → 70-88
6. Genuine engineering/data + 1-2 skills → 45-69
7. Adjacent tech role + overlap → 35-55
8. NEVER return 100 or 99. MAXIMUM is 90. Having git ≠ Art Director or Fraud Analyst.

JSON only:
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
        "match_score": max(0, min(90, int(result.get("match_score", 0)))),  # hard cap at 90
        "skills_match": int(result.get("skills_match", 0)),
        "experience_match": int(result.get("experience_match", 0)),
        "preferences_match": int(result.get("preferences_match", 0)),
        "matched_skills": result.get("matched_skills", [])[:5],
        "missing_skills": result.get("missing_skills", [])[:5],
        "reason": result.get("reason", ""),
    }