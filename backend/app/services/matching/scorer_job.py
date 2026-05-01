"""
app/services/matching/scorer_job.py

Scheduled job that pre-computes AI match scores for active users.
Runs every 6 hours via APScheduler in main.py.

Why here and not at query time:
- Query-time AI scoring hits Groq TPM limits immediately
- 25 parallel calls per page load = rate limit errors
- Pre-computing during off-hours = no rate limit pressure
- Query time becomes a simple DB read < 200ms

Schedule: every 6 hours (offset 1 hour after ingest)
"""

import os
import json
import time
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


def run_scoring_job():
    """
    Entry point called by APScheduler.
    Synchronous — APScheduler runs this in a thread pool.
    """
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
        # ── Get new jobs from last 25 hours ──────────────────────────
        cutoff = datetime.utcnow() - timedelta(hours=25)
        new_jobs = db.execute(text("""
            SELECT id, title, company, location, description_text
            FROM jobs
            WHERE scraped_at >= :cutoff
            ORDER BY scraped_at DESC
            LIMIT 300
        """), {"cutoff": cutoff}).fetchall()

        if not new_jobs:
            logger.info("[Scorer Job] No new jobs in last 25h — skipping")
            return

        logger.info(f"[Scorer Job] {len(new_jobs)} new jobs to score")

        # ── Get active users with profiles ────────────────────────────
        # Active = signed up in last 30 days OR applied to a job in last 7 days
        active_users = db.execute(text("""
            SELECT u.id, up.skills, up.experience, up.preferences
            FROM users u
            JOIN user_profiles up ON up.user_id = u.id
            WHERE u.created_at >= NOW() - INTERVAL '30 days'
               OR u.id IN (
                   SELECT DISTINCT user_id FROM applications
                   WHERE applied_at >= NOW() - INTERVAL '7 days'
               )
        """)).fetchall()

        if not active_users:
            logger.info("[Scorer Job] No active users with profiles — skipping")
            return

        logger.info(f"[Scorer Job] Scoring for {len(active_users)} active users")

        total_scored = 0
        total_skipped = 0
        total_errors = 0

        for user_row in active_users:
            user_id = user_row[0]
            user_skills = user_row[1] or []
            user_experience = user_row[2] or []
            user_preferences = user_row[3] or {}
            target_roles = user_preferences.get("job_titles", [])

            # Get already-scored job IDs for this user
            existing = db.execute(text("""
                SELECT job_id FROM user_job_scores WHERE user_id = :uid
            """), {"uid": user_id}).fetchall()
            scored_ids = {row[0] for row in existing}

            # Only score new jobs not yet scored for this user
            to_score = [j for j in new_jobs if j[0] not in scored_ids]

            if not to_score:
                total_skipped += len(new_jobs)
                continue

            logger.info(f"  [User {user_id}] Scoring {len(to_score)} new jobs")

            # Build user context once per user
            exp_lines = "\n".join([
                f"- {e.get('title', '')} at {e.get('company', '')}"
                for e in (user_experience or [])[:3]
            ])
            targets = ", ".join(target_roles) if target_roles else "software/data engineering"
            skills_str = ", ".join((user_skills or [])[:25])

            for job_row in to_score:
                job_id, title, company, location, description = job_row

                try:
                    score_result = _score_single_job(
                        groq_client=groq_client,
                        job_title=f"{title} at {company}",
                        job_desc=description or "",
                        job_location=location or "",
                        skills_str=skills_str,
                        exp_lines=exp_lines,
                        targets=targets,
                    )

                    # Upsert score
                    db.execute(text("""
                        INSERT INTO user_job_scores
                            (user_id, job_id, match_score, skills_match,
                             experience_match, preferences_match,
                             matched_skills, missing_skills, reason, computed_at)
                        VALUES
                            (:uid, :jid, :score, :sm, :em, :pm,
                             :ms::jsonb, :mis::jsonb, :reason, NOW())
                        ON CONFLICT (user_id, job_id) DO UPDATE SET
                            match_score       = EXCLUDED.match_score,
                            skills_match      = EXCLUDED.skills_match,
                            experience_match  = EXCLUDED.experience_match,
                            preferences_match = EXCLUDED.preferences_match,
                            matched_skills    = EXCLUDED.matched_skills,
                            missing_skills    = EXCLUDED.missing_skills,
                            reason            = EXCLUDED.reason,
                            computed_at       = NOW()
                    """), {
                        "uid": user_id,
                        "jid": job_id,
                        "score": score_result["match_score"],
                        "sm": score_result["skills_match"],
                        "em": score_result["experience_match"],
                        "pm": score_result["preferences_match"],
                        "ms": json.dumps(score_result["matched_skills"]),
                        "mis": json.dumps(score_result["missing_skills"]),
                        "reason": score_result["reason"],
                    })
                    db.commit()
                    total_scored += 1

                    # Rate limit protection — 1 call/second keeps us
                    # well under 6000 TPM on llama-3.1-8b-instant
                    time.sleep(1.0)

                except Exception as e:
                    total_errors += 1
                    logger.warning(
                        f"  [Scorer Job] Failed job {job_id} user {user_id}: "
                        f"{type(e).__name__}: {e}"
                    )
                    # Back off longer on rate limit errors
                    if "429" in str(e):
                        time.sleep(10)
                    else:
                        time.sleep(2)
                    continue

        logger.info(
            f"✅ Scoring complete — "
            f"scored: {total_scored}, skipped: {total_skipped}, errors: {total_errors}"
        )

    except Exception as e:
        logger.error(f"[Scorer Job] Fatal error: {e}")
    finally:
        db.close()


def _score_single_job(
    groq_client,
    job_title: str,
    job_desc: str,
    job_location: str,
    skills_str: str,
    exp_lines: str,
    targets: str,
) -> dict:
    """
    Single AI scoring call. Returns score dict.
    Raises on failure — caller handles retry/skip.
    """
    prompt = f"""Recruiter scoring job fit. Be strict and accurate.

CANDIDATE:
- Target roles: {targets}
- Skills: {skills_str}
- Experience:
{exp_lines}

JOB:
- Title: {job_title}
- Location: {job_location}
- Description: {job_desc[:900]}

SCORING RULES:
1. Non-English language required (German C1/B2, French, Dutch) + no evidence candidate speaks it → cap 15
2. Wrong role type (legal, accounting, supply chain, marketing, HR, sales, consulting) vs engineering/data background → cap 20
3. Internship/Praktikum/Werkstudent/Minijob + candidate has 2+ years experience → cap 15
4. Genuine role + skill match → 65-95
5. Partial match → 30-64
6. "Automation" in accounting ≠ data engineering. Score ACTUAL fit not keywords.

Return ONLY valid JSON, no markdown:
{{"match_score":<0-100>,"skills_match":<0-100>,"experience_match":<0-100>,"preferences_match":<0-100>,"matched_skills":[<strings, max 5>],"missing_skills":[<strings, max 5>],"reason":"<one sentence>"}}"""

    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=220,
    )

    content = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if "```" in content:
        for part in content.split("```"):
            part = part.strip().lstrip("json").strip()
            if part.startswith("{"):
                content = part
                break

    result = json.loads(content)

    return {
        "match_score": max(0, min(100, int(result.get("match_score", 0)))),
        "skills_match": int(result.get("skills_match", 0)),
        "experience_match": int(result.get("experience_match", 0)),
        "preferences_match": int(result.get("preferences_match", 0)),
        "matched_skills": result.get("matched_skills", [])[:5],
        "missing_skills": result.get("missing_skills", [])[:5],
        "reason": result.get("reason", ""),
    }