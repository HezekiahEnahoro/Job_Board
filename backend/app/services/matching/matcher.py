"""
app/services/matching/matcher.py

Two-stage matching:

Stage 1 — Keyword pre-filter (instant, free):
  Score all DB jobs with keyword_prescore().
  This filters 3000 jobs down to ~50-100 tech-relevant candidates.
  Eliminates non-tech roles, language-blocked jobs, internships.

Stage 2 — AI scoring (accurate, ~4-6s for 25 jobs in parallel):
  AI-score only the 25 jobs on the current page.
  Groq llama-3.1-8b-instant, 8 parallel workers.

Result:
  - "All Jobs" page load: ~5s (25 AI calls in parallel)
  - "90%+ Match" filter: ~6s (pre-filter narrows pool, AI scores page)
  - Match scores are accurate — not keyword guesses
  - Filter buttons actually work — pre-filter ensures only good candidates reach AI
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.core import crud
from app.services.profile.models import UserProfile
from .scorer import keyword_prescore, score_jobs_batch, _fallback_score


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
        "description": job.description_text,  # scorer expects this key
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

    Without profile: returns plain job list, no scores.
    With profile: two-stage keyword→AI scoring.
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

    # ── Stage 1: Fetch a large pool and keyword pre-filter ────────────
    # Fetch 500 recent jobs — enough to find good candidates after filtering
    POOL_SIZE = 500
    jobs_data = crud.list_jobs_paginated(db, limit=POOL_SIZE, offset=0, **filters)
    jobs_list = jobs_data.get("jobs") or jobs_data.get("items", [])
    all_jobs = [job_to_dict(j) for j in jobs_list]
    total_in_db = jobs_data.get("total", 0)

    # Keyword pre-score every job (fast — no API calls)
    # Use a lower threshold than min_match_score to avoid excluding
    # jobs the AI might score higher than keywords estimate
    keyword_threshold = max(0, min_match_score - 30) if min_match_score > 0 else 0

    prescored = []
    for job in all_jobs:
        ks = keyword_prescore(job, profile_dict)
        if ks >= keyword_threshold:
            job["_keyword_score"] = ks
            prescored.append(job)

    # Sort by keyword score so best candidates are first
    prescored.sort(key=lambda x: x.get("_keyword_score", 0), reverse=True)

    # ── Stage 2: AI-score + paginate ─────────────────────────────────
    if min_match_score == 0:
        # No score filter — just show current page with AI scores
        page_jobs = prescored[offset: offset + limit]
        if not page_jobs:
            # Fallback: page beyond prescored pool, fetch directly
            raw = crud.list_jobs_paginated(db, limit=limit, offset=offset, **filters)
            raw_list = raw.get("jobs") or raw.get("items", [])
            page_jobs = [job_to_dict(j) for j in raw_list]

        ai_scored = score_jobs_batch(page_jobs, profile_dict, max_workers=8)

        return {
            "jobs": ai_scored,
            "total": total_in_db,
            "matched_count": len(prescored),
            "limit": limit,
            "offset": offset,
        }

    else:
        # Score filter active — AI-score ALL prescored candidates, filter, then paginate
        # Cap at 150 to avoid too many API calls
        candidates = prescored[:150]

        ai_scored_all = score_jobs_batch(candidates, profile_dict, max_workers=10)

        # Filter by actual AI score (not keyword estimate)
        filtered = [j for j in ai_scored_all if j.get("match_score", 0) >= min_match_score]
        filtered.sort(key=lambda x: x.get("match_score", 0), reverse=True)

        total_matched = len(filtered)
        page = filtered[offset: offset + limit]

        return {
            "jobs": page,
            "total": total_in_db,
            "matched_count": total_matched,
            "limit": limit,
            "offset": offset,
        }


def get_top_matches(db: Session, user_id: int, top_k: int = 10) -> List[Dict[str, Any]]:
    result = get_matched_jobs(db, user_id, min_match_score=70, limit=top_k)
    return result["jobs"]