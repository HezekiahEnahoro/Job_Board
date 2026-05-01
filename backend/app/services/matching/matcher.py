"""
app/services/matching/matcher.py

Reads pre-computed scores from user_job_scores table.
No live AI calls at query time — instant response.

For new users with no scores yet → keyword fallback (fast, good enough).
Scores are pre-computed by the Airflow DAG after each ingest run.
"""

from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core import crud
from app.services.profile.models import UserProfile
from .scorer import keyword_prescore, _fallback_score


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


def get_matched_jobs(
    db: Session,
    user_id: int,
    min_match_score: int = 0,
    limit: int = 25,
    offset: int = 0,
    **filters
) -> Dict[str, Any]:
    """
    Get jobs with match scores for a user.

    Primary: reads from user_job_scores (pre-computed by Airflow DAG)
    Fallback: keyword scoring for users with no pre-computed scores yet
    """
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

    if not user_profile:
        # No profile — return plain jobs, no scores
        jobs_data = crud.list_jobs_paginated(db, limit=limit, offset=offset, **filters)
        jobs_list = jobs_data.get("jobs") or jobs_data.get("items", [])
        jobs_dicts = [job_to_dict(j) for j in jobs_list]
        for job in jobs_dicts:
            job["match_score"] = 0
            job["match_details"] = None
        return {
            "jobs": jobs_dicts,
            "total": jobs_data.get("total", 0),
            "matched_count": 0,
            "limit": limit,
            "offset": offset,
        }

    profile_dict = {
        "skills": user_profile.skills or [],
        "experience": user_profile.experience or [],
        "preferences": user_profile.preferences or {},
    }

    # Check if user has pre-computed scores
    score_count = db.execute(
        text("SELECT COUNT(*) FROM user_job_scores WHERE user_id = :uid"),
        {"uid": user_id}
    ).scalar() or 0

    if score_count > 0:
        # ── Primary path: read pre-computed scores from DB ────────────
        return _get_from_precomputed(db, user_id, min_match_score, limit, offset, **filters)
    else:
        # ── Fallback: keyword scoring for new users ───────────────────
        # Scores will be pre-computed on next DAG run (within 6 hours)
        return _get_with_keyword_fallback(db, user_id, profile_dict, min_match_score, limit, offset, **filters)


def _get_from_precomputed(
    db: Session,
    user_id: int,
    min_match_score: int,
    limit: int,
    offset: int,
    **filters
) -> Dict[str, Any]:
    """Read jobs + scores from pre-computed user_job_scores table."""

    # Build base query joining jobs with pre-computed scores
    # Apply search/skill/location filters at DB level
    q = filters.get("q")
    skill = filters.get("skill")
    location = filters.get("location")
    remote = filters.get("remote")
    days = filters.get("days", 30)

    where_clauses = [
        "ujs.user_id = :user_id",
        "ujs.match_score >= :min_score",
        "j.scraped_at >= NOW() - INTERVAL ':days days'",
    ]
    params: Dict[str, Any] = {
        "user_id": user_id,
        "min_score": min_match_score,
        "days": days,
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

    # Get total count
    count_sql = f"""
        SELECT COUNT(*)
        FROM user_job_scores ujs
        JOIN jobs j ON j.id = ujs.job_id
        WHERE {where_sql}
    """
    # Use simpler date filter without parameter interpolation issue
    count_sql = count_sql.replace(
        "j.scraped_at >= NOW() - INTERVAL ':days days'",
        f"j.scraped_at >= NOW() - INTERVAL '{days} days'"
    )
    del params["days"]

    total_matched = db.execute(text(count_sql), params).scalar() or 0

    # Get page
    page_sql = f"""
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
    """
    page_sql = page_sql.replace(
        "j.scraped_at >= NOW() - INTERVAL ':days days'",
        f"j.scraped_at >= NOW() - INTERVAL '{days} days'"
    )

    rows = db.execute(text(page_sql), params).fetchall()

    jobs = []
    for row in rows:
        matched_skills = row[14] if row[14] else []
        missing_skills = row[15] if row[15] else []

        # JSONB comes back as list already from psycopg2
        if isinstance(matched_skills, str):
            import json
            matched_skills = json.loads(matched_skills)
        if isinstance(missing_skills, str):
            import json
            missing_skills = json.loads(missing_skills)

        job = {
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
                "reason": row[16] if len(row) > 16 else "",
            },
        }
        jobs.append(job)

    # Total jobs in DB (for pagination display)
    total_in_db = db.execute(
        text("SELECT COUNT(*) FROM jobs WHERE scraped_at >= NOW() - INTERVAL '30 days'")
    ).scalar() or 0

    return {
        "jobs": jobs,
        "total": total_in_db,
        "matched_count": total_matched,
        "limit": limit,
        "offset": offset,
    }


def _get_with_keyword_fallback(
    db: Session,
    user_id: int,
    profile_dict: Dict,
    min_match_score: int,
    limit: int,
    offset: int,
    **filters
) -> Dict[str, Any]:
    """
    Keyword scoring fallback for new users.
    Fast — no AI calls. Scores are rough but better than nothing.
    Will be replaced by pre-computed AI scores after next DAG run.
    """
    jobs_data = crud.list_jobs_paginated(db, limit=200, offset=0, **filters)
    jobs_list = jobs_data.get("jobs") or jobs_data.get("items", [])
    all_jobs = [job_to_dict(j) for j in jobs_list]

    scored = []
    for job in all_jobs:
        ks = keyword_prescore(job, profile_dict)
        if ks >= min_match_score:
            fallback = _fallback_score(job, profile_dict)
            fallback["match_score"] = ks  # use keyword prescore as the displayed score
            job["match_score"] = ks
            job["match_details"] = fallback
            scored.append(job)

    scored.sort(key=lambda x: x.get("match_score", 0), reverse=True)
    total_matched = len(scored)
    page = scored[offset: offset + limit]

    return {
        "jobs": page,
        "total": jobs_data.get("total", 0),
        "matched_count": total_matched,
        "limit": limit,
        "offset": offset,
    }


def get_top_matches(db: Session, user_id: int, top_k: int = 10) -> List[Dict[str, Any]]:
    result = get_matched_jobs(db, user_id, min_match_score=60, limit=top_k)
    return result["jobs"]