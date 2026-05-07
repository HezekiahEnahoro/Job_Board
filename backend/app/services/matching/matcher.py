"""
app/services/matching/matcher.py

Score source of truth: resume tailoring (resume_router.py → user_job_scores).
Unscored jobs: keyword prescore (conservative, no inflation).
scorer_job is DISABLED — remove it from main.py scheduler.
"""

import json
import logging
from typing import List, Dict, Any, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import crud
from app.services.profile.models import UserProfile
from .scorer import keyword_prescore, _fallback_score

logger = logging.getLogger(__name__)

_MAX_VALID_SCORE = 90  # anything above = old broken scorer, ignore


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


def _fetch_tailored_scores(db: Session, user_id: int, job_ids: List[int]) -> Dict[int, Dict]:
    """Fetch accurate tailored scores for a list of job IDs. Returns {job_id: score_dict}."""
    if not job_ids:
        return {}
    rows = db.execute(text("""
        SELECT job_id, match_score, skills_match, experience_match,
               preferences_match, matched_skills, missing_skills, reason
        FROM user_job_scores
        WHERE user_id = :uid
          AND job_id = ANY(:jids)
          AND match_score <= :max
    """), {"uid": user_id, "jids": job_ids, "max": _MAX_VALID_SCORE}).fetchall()

    return {
        row[0]: {
            "match_score": row[1],
            "skills_match": row[2],
            "experience_match": row[3],
            "preferences_match": row[4],
            "matched_skills": _parse_json(row[5]),
            "missing_skills": _parse_json(row[6]),
            "reason": row[7] or "",
        }
        for row in rows
    }


def get_matched_jobs(
    db: Session,
    user_id: int,
    min_match_score: int = 0,
    limit: int = 25,
    offset: int = 0,
    **filters
) -> Dict[str, Any]:
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()

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
        "skills": user_profile.skills or [],
        "experience": user_profile.experience or [],
        "preferences": user_profile.preferences or {},
    }

    if min_match_score > 0:
        # Filtered view: only jobs with tailored scores >= threshold
        return _get_filtered_by_tailored_score(
            db, user_id, min_match_score, limit, offset, **filters
        )
    else:
        # All Jobs: current page with tailored or keyword scores
        return _get_page_with_scores(
            db, user_id, profile_dict, limit, offset, **filters
        )


def _get_page_with_scores(
    db: Session,
    user_id: int,
    profile_dict: Dict,
    limit: int,
    offset: int,
    **filters
) -> Dict[str, Any]:
    """
    Fetch current page of jobs. For each job:
    - If user has a tailored score in user_job_scores → use that
    - Otherwise → keyword prescore (conservative estimate)

    matched_count: how many jobs the user has tailored resumes for.
    If 0, omit from response so frontend doesn't show "0 jobs match".
    """
    jobs_data = crud.list_jobs_paginated(db, limit=limit, offset=offset, **filters)
    jobs_list = jobs_data.get("jobs") or jobs_data.get("items", [])
    total = jobs_data.get("total", 0)

    if not jobs_list:
        return {"jobs": [], "total": total, "limit": limit, "offset": offset}

    job_ids = [j.id if not isinstance(j, dict) else j["id"] for j in jobs_list]
    tailored = _fetch_tailored_scores(db, user_id, job_ids)

    result = []
    for job in jobs_list:
        jd = job_to_dict(job)
        jid = jd["id"]

        if jid in tailored:
            t = tailored[jid]
            jd["match_score"] = t["match_score"]
            jd["match_details"] = t
        else:
            ks = keyword_prescore(jd, profile_dict)
            fallback = _fallback_score(jd, profile_dict)
            fallback["match_score"] = ks
            jd["match_score"] = ks
            jd["match_details"] = fallback

        result.append(jd)

    # Sort: tailored scores (accurate) first, then by score desc
    result.sort(
        key=lambda x: (x["id"] in tailored, x.get("match_score", 0)),
        reverse=True
    )

    # Total tailored score count (across ALL jobs, not just this page)
    total_tailored = db.execute(text("""
        SELECT COUNT(*) FROM user_job_scores
        WHERE user_id = :uid AND match_score <= :max
    """), {"uid": user_id, "max": _MAX_VALID_SCORE}).scalar() or 0

    response = {
        "jobs": result,
        "total": total,
        "limit": limit,
        "offset": offset,
    }

    # Only include matched_count if user has actually tailored some resumes.
    # When 0, omit it so the frontend doesn't show "0 jobs match your profile".
    if total_tailored > 0:
        response["matched_count"] = total_tailored

    return response


def _get_filtered_by_tailored_score(
    db: Session,
    user_id: int,
    min_match_score: int,
    limit: int,
    offset: int,
    **filters
) -> Dict[str, Any]:
    """
    Filter by min_match_score. Only shows jobs with accurate tailored scores.
    Keyword estimates are too rough for precision filtering.
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
        where_clauses.append("(LOWER(j.title) LIKE :q OR LOWER(j.company) LIKE :q)")
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

    total_matched = db.execute(
        text(f"SELECT COUNT(*) FROM user_job_scores ujs JOIN jobs j ON j.id = ujs.job_id WHERE {where_sql}"),
        params
    ).scalar() or 0

    rows = db.execute(text(f"""
        SELECT j.id, j.title, j.company, j.location, j.remote_flag,
               j.posted_at, j.apply_url, j.description_text, j.scraped_at,
               ujs.match_score, ujs.skills_match, ujs.experience_match,
               ujs.preferences_match, ujs.matched_skills, ujs.missing_skills, ujs.reason
        FROM user_job_scores ujs
        JOIN jobs j ON j.id = ujs.job_id
        WHERE {where_sql}
        ORDER BY ujs.match_score DESC, j.posted_at DESC NULLS LAST
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    jobs = []
    for row in rows:
        jobs.append({
            "id": row[0], "title": row[1], "company": row[2],
            "location": row[3], "remote_flag": row[4],
            "posted_at": row[5].isoformat() if row[5] else None,
            "apply_url": row[6], "description_text": row[7],
            "scraped_at": row[8].isoformat() if row[8] else None,
            "match_score": row[9],
            "match_details": {
                "match_score": row[9], "skills_match": row[10],
                "experience_match": row[11], "preferences_match": row[12],
                "matched_skills": _parse_json(row[13]),
                "missing_skills": _parse_json(row[14]),
                "reason": row[15] if len(row) > 15 else "",
            },
        })

    total_in_db = db.execute(
        text(f"SELECT COUNT(*) FROM jobs WHERE scraped_at >= NOW() - INTERVAL '30 days'")
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