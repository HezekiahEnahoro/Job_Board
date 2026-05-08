"""
app/services/matching/matcher.py

On first page load for a user:
  - Keyword-score ALL recent jobs instantly (pure Python, no API, < 1s for 5000 jobs)
  - Write scores to user_job_scores
  - Serve from DB sorted highest → lowest

On subsequent loads:
  - Read from DB directly — fast query, already sorted

When user runs Quick Apply:
  - AI score overwrites the keyword estimate for that specific job
  - resume_router.py handles this via ON CONFLICT DO UPDATE

Filter buttons (60%+, 70%+, 80%+, 90%+):
  - Query user_job_scores WHERE match_score >= threshold
  - Works immediately because ALL jobs are scored on first load

Score hierarchy (highest wins):
  1. Resume tailoring score (most accurate — from Quick Apply)
  2. AI score on modal open (accurate — from /matching/score-job)
  3. Keyword prescore (fast estimate — written on first browse)
"""

import json
import logging
from typing import List, Dict, Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import crud
from app.services.profile.models import UserProfile
from .scorer import keyword_prescore, _fallback_score, is_tech_role

logger = logging.getLogger(__name__)

_MAX_VALID_SCORE = 90  # scores above this are from the old broken scorer


def job_to_dict(job) -> Dict[str, Any]:
    if isinstance(job, dict):
        return job
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "remote_flag": job.remote_flag,
        "posted_at": job.posted_at.isoformat() if job.posted_at else None,
        "apply_url": job.apply_url,
        "description_text": job.description_text,
        "description": job.description_text,
        "scraped_at": job.scraped_at.isoformat() if job.scraped_at else None,
    }


def _parse_json(val) -> list:
    if val is None:
        return []
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return []
    return val


def get_matched_jobs(
    db: Session,
    user_id: int,
    min_match_score: int = 0,
    limit: int = 25,
    offset: int = 0,
    **filters
) -> Dict[str, Any]:
    user_profile = db.query(UserProfile).filter(
        UserProfile.user_id == user_id
    ).first()

    if not user_profile:
        jobs_data = crud.list_jobs_paginated(db, limit=limit, offset=offset, **filters)
        jobs_list = jobs_data.get("jobs") or jobs_data.get("items", [])
        jobs_dicts = [job_to_dict(j) for j in jobs_list]
        for job in jobs_dicts:
            job["match_score"] = 0
            job["match_details"] = None
        return {
            "jobs": jobs_dicts,
            "total": jobs_data.get("total", 0),
            "limit": limit,
            "offset": offset,
        }

    profile_dict = {
        "summary": user_profile.summary or "",
        "skills": user_profile.skills or [],
        "experience": user_profile.experience or [],
        "education": user_profile.education or [],
        "certifications": user_profile.certifications or [],
        "languages": user_profile.languages or [],
        "preferences": user_profile.preferences or {},
    }

    # Check if user has any scores in DB
    score_count = db.execute(
        text("SELECT COUNT(*) FROM user_job_scores WHERE user_id = :uid AND match_score <= :max"),
        {"uid": user_id, "max": _MAX_VALID_SCORE}
    ).scalar() or 0

    if score_count == 0:
        # First load — keyword-score ALL recent jobs and persist
        # Pure Python, no API calls, completes in < 1 second
        _bootstrap_scores(db, user_id, profile_dict, **filters)

    # Serve from DB — sorted by score, paginated, filter-ready
    return _serve_from_db(db, user_id, min_match_score, limit, offset, **filters)


def _bootstrap_scores(db: Session, user_id: int, profile_dict: Dict, **filters):
    """
    Keyword-score all recent jobs for a new user.
    Writes results to user_job_scores so:
    - Jobs appear sorted highest → lowest on first load
    - Filter buttons (60%+, 70%+, etc.) work immediately
    - No Groq API calls needed — pure Python keyword matching

    Called once per user. Subsequent loads read from DB.
    """
    days = filters.get("days", 30)

    # Fetch ALL recent jobs (not just current page)
    rows = db.execute(text(f"""
        SELECT id, title, company, location, description_text
        FROM jobs
        WHERE scraped_at >= NOW() - INTERVAL '{days} days'
        ORDER BY scraped_at DESC
        LIMIT 2000
    """)).fetchall()

    if not rows:
        return

    logger.info(f"[Matcher] Bootstrapping scores for user {user_id} — {len(rows)} jobs")

    batch = []
    for row in rows:
        job_id, title, company, location, description = row
        job_dict = {
            "id": job_id,
            "title": title or "",
            "company": company or "",
            "location": location or "",
            "description": description or "",
            "description_text": description or "",
        }

        score = keyword_prescore(job_dict, profile_dict)
        fallback = _fallback_score(job_dict, profile_dict)
        matched_skills = fallback.get("matched_skills", [])

        batch.append({
            "uid": user_id,
            "jid": job_id,
            "score": score,
            "ms": json.dumps(matched_skills),
        })

    # Bulk insert — ON CONFLICT DO NOTHING so we never overwrite AI scores
    for item in batch:
        db.execute(text("""
            INSERT INTO user_job_scores
                (user_id, job_id, match_score, skills_match,
                 experience_match, preferences_match,
                 matched_skills, missing_skills, reason, computed_at)
            VALUES
                (:uid, :jid, :score, :score, 40, 40,
                 :ms::jsonb, '[]'::jsonb, 'keyword estimate', NOW())
            ON CONFLICT (user_id, job_id) DO NOTHING
        """), item)

    db.commit()
    logger.info(f"[Matcher] Bootstrap complete — {len(batch)} scores written for user {user_id}")


def _serve_from_db(
    db: Session,
    user_id: int,
    min_match_score: int,
    limit: int,
    offset: int,
    **filters
) -> Dict[str, Any]:
    """
    Serve jobs from user_job_scores, sorted by score descending.
    Applies search/skill/location/remote filters at DB level.
    """
    q = filters.get("q")
    skill = filters.get("skill")
    location = filters.get("location")
    remote = filters.get("remote")
    days = filters.get("days", 30)

    where_clauses = [
        "ujs.user_id = :user_id",
        "ujs.match_score >= :min_score",
        f"ujs.match_score <= {_MAX_VALID_SCORE}",
        f"j.scraped_at >= NOW() - INTERVAL '{days} days'",
    ]
    params: Dict[str, Any] = {
        "user_id": user_id,
        "min_score": min_match_score,
        "limit": limit,
        "offset": offset,
    }

    if q:
        where_clauses.append(
            "(LOWER(j.title) LIKE :q OR LOWER(j.company) LIKE :q)"
        )
        params["q"] = f"%{q.lower()}%"

    if skill:
        where_clauses.append("LOWER(j.description_text) LIKE :skill")
        params["skill"] = f"%{skill.lower()}%"

    if location:
        where_clauses.append("LOWER(j.location) LIKE :location")
        params["location"] = f"%{location.lower()}%"

    if remote is not None:
        where_clauses.append("j.remote_flag = :remote")
        params["remote"] = remote

    where_sql = " AND ".join(where_clauses)

    # Total matching jobs (for filter count display)
    total_matched = db.execute(text(f"""
        SELECT COUNT(*)
        FROM user_job_scores ujs
        JOIN jobs j ON j.id = ujs.job_id
        WHERE {where_sql}
    """), params).scalar() or 0

    # Current page
    rows = db.execute(text(f"""
        SELECT
            j.id, j.title, j.company, j.location, j.remote_flag,
            j.posted_at, j.apply_url, j.description_text, j.scraped_at,
            ujs.match_score, ujs.skills_match, ujs.experience_match,
            ujs.preferences_match, ujs.matched_skills, ujs.missing_skills,
            ujs.reason
        FROM user_job_scores ujs
        JOIN jobs j ON j.id = ujs.job_id
        WHERE {where_sql}
        ORDER BY ujs.match_score DESC, j.posted_at DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    jobs = []
    for row in rows:
        matched_skills = _parse_json(row[13])
        missing_skills = _parse_json(row[14])
        jobs.append({
            "id": row[0],
            "title": row[1],
            "company": row[2],
            "location": row[3],
            "remote_flag": row[4],
            "posted_at": row[5].isoformat() if row[5] else None,
            "apply_url": row[6],
            "description_text": row[7],
            "scraped_at": row[8].isoformat() if row[8] else None,
            "match_score": row[9],
            "match_details": {
                "match_score": row[9],
                "skills_match": row[10],
                "experience_match": row[11],
                "preferences_match": row[12],
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "reason": row[15] if len(row) > 15 else "",
            },
        })

    # Total jobs in DB for "Showing X of Y" display
    total_in_db = db.execute(
        text(f"SELECT COUNT(*) FROM jobs WHERE scraped_at >= NOW() - INTERVAL '{days} days'")
    ).scalar() or 0

    return {
        "jobs": jobs,
        "total": total_in_db,
        "matched_count": total_matched,
        "limit": limit,
        "offset": offset,
    }


def get_top_matches(db: Session, user_id: int, top_k: int = 10) -> List[Dict[str, Any]]:
    result = get_matched_jobs(db, user_id, min_match_score=60, limit=top_k)
    return result["jobs"]