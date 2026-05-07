"""
app/services/matching/matcher.py

Score source of truth: resume tailoring (resume_router.py writes to user_job_scores).
For jobs without a tailored score: keyword prescore (conservative, no inflation).

scorer_job is DISABLED — it was overwriting accurate tailoring scores with wrong ones.
Scores now only enter user_job_scores via Quick Apply → resume_router.py.

Result:
- Job card score = resume tailoring score (accurate, consistent with Quick Apply)
- Unscored jobs show keyword estimate (rough but never inflated)
- On refresh: tailored scores persist, no drift
"""

import json
import logging
from typing import List, Dict, Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import crud
from app.services.profile.models import UserProfile
from .scorer import keyword_prescore, is_tech_role, _fallback_score

logger = logging.getLogger(__name__)

# Scores above this came from the old broken scorer — filter them out
_MAX_VALID_SCORE = 90


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
    Get jobs with match scores.

    Score priority:
    1. user_job_scores (written by resume_router.py after tailoring) — accurate
    2. keyword_prescore — rough estimate, shown for unscored jobs

    min_match_score filter:
    - 0 (All Jobs): returns everything, scores from tailoring or keyword
    - >0 (60%+, etc.): returns ONLY jobs with tailored scores >= threshold
      (keyword estimates are too rough to use for precision filtering)
    """
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
            "matched_count": 0,
            "limit": limit,
            "offset": offset,
        }

    profile_dict = {
        "skills": user_profile.skills or [],
        "experience": user_profile.experience or [],
        "preferences": user_profile.preferences or {},
    }

    if min_match_score > 0:
        # ── Filtered view: only jobs with accurate tailored scores ─────
        return _get_tailored_filtered(db, user_id, profile_dict, min_match_score, limit, offset, **filters)
    else:
        # ── All Jobs: current page with tailored or keyword scores ─────
        return _get_all_with_scores(db, user_id, profile_dict, limit, offset, **filters)


def _get_all_with_scores(
    db: Session,
    user_id: int,
    profile_dict: Dict,
    limit: int,
    offset: int,
    **filters
) -> Dict[str, Any]:
    """
    Fetch current page of jobs, attach tailored scores where available,
    keyword estimates for the rest.
    """
    jobs_data = crud.list_jobs_paginated(db, limit=limit, offset=offset, **filters)
    jobs_list = jobs_data.get("jobs") or jobs_data.get("items", [])
    total = jobs_data.get("total", 0)

    if not jobs_list:
        return {"jobs": [], "total": total, "matched_count": 0, "limit": limit, "offset": offset}

    # Fetch tailored scores for this page's job IDs
    job_ids = [j.id if not isinstance(j, dict) else j["id"] for j in jobs_list]
    tailored = _fetch_tailored_scores(db, user_id, job_ids)

    result = []
    for job in jobs_list:
        jd = job_to_dict(job)
        jid = jd["id"]

        if jid in tailored:
            # Use accurate tailoring score
            t = tailored[jid]
            jd["match_score"] = t["match_score"]
            jd["match_details"] = t
        else:
            # Use keyword estimate
            ks = keyword_prescore(jd, profile_dict)
            jd["match_score"] = ks
            jd["match_details"] = _fallback_score(jd, profile_dict)
            jd["match_details"]["match_score"] = ks

        result.append(jd)

    # Sort: tailored scores first (more trustworthy), then by score desc
    result.sort(key=lambda x: (x["id"] in tailored, x.get("match_score", 0)), reverse=True)

    return {
        "jobs": result,
        "total": total,
        "matched_count": len(tailored),  # count of jobs with accurate scores
        "limit": limit,
        "offset": offset,
    }


def _get_tailored_filtered(
    db: Session,
    user_id: int,
    profile_dict: Dict,
    min_match_score: int,
    limit: int,
    offset: int,
    **filters
) -> Dict[str, Any]:
    """
    For filtered views (60%+, 70%+ etc): only return jobs with tailored
    scores at or above threshold. Keyword estimates excluded — too rough.
    """
    q = filters.get("q")
    skill = filters.get("skill")
    location = filters.get("location")
    remote = filters.get("remote")
    days = filters.get("days", 30)

    where_clauses = [
        "ujs.user_id = :user_id",
        f"ujs.match_score >= :min_score",
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

    total_matched = db.execute(text(f"""
        SELECT COUNT(*) FROM user_job_scores ujs
        JOIN jobs j ON j.id = ujs.job_id WHERE {where_sql}
    """), params).scalar() or 0

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
        matched_skills = _parse_json(row[13])
        missing_skills = _parse_json(row[14])
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
                "matched_skills": matched_skills, "missing_skills": missing_skills,
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

    result = {}
    for row in rows:
        result[row[0]] = {
            "match_score": row[1],
            "skills_match": row[2],
            "experience_match": row[3],
            "preferences_match": row[4],
            "matched_skills": _parse_json(row[5]),
            "missing_skills": _parse_json(row[6]),
            "reason": row[7] or "",
        }
    return result


def _parse_json(val) -> list:
    if val is None:
        return []
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return []
    return val


def get_top_matches(db: Session, user_id: int, top_k: int = 10) -> List[Dict[str, Any]]:
    result = get_matched_jobs(db, user_id, min_match_score=60, limit=top_k)
    return result["jobs"]