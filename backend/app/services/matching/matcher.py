from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.core import crud, schemas
from app.services.profile.models import UserProfile
from .scorer import calculate_match_score

def job_to_dict(job) -> Dict[str, Any]:
    """Convert Job object or dict to dict"""
    if isinstance(job, dict):
        return job
    
    # Convert SQLAlchemy object to dict
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "remote_flag": job.remote_flag,
        "posted_at": job.posted_at.isoformat() if job.posted_at else None,
        "apply_url": job.apply_url,
        "description_text": job.description_text,
        "scraped_at": job.scraped_at.isoformat() if job.scraped_at else None,
    }

def get_matched_jobs(
    db: Session,
    user_id: int,
    min_match_score: int = 0,
    limit: int = 50,
    offset: int = 0,
    **filters
) -> Dict[str, Any]:
    """
    Get jobs with match scores for a user
    
    Args:
        db: Database session
        user_id: User ID
        min_match_score: Minimum match score (0-100)
        limit: Max jobs to return
        offset: Pagination offset
        **filters: Additional filters (q, days, skill, location, remote)
    
    Returns:
        {
            "jobs": [...],
            "total": 150,
            "matched_count": 45
        }
    """
    # Get user profile
    user_profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    if not user_profile:
        # No profile = no matching, return all jobs with 0% match
        jobs_data = crud.list_jobs_paginated(db, limit=limit, offset=offset, **filters)
        
        # Convert jobs to dicts
        jobs_list = jobs_data.get("jobs") or jobs_data.get("items", [])
        jobs_dicts = [job_to_dict(job) for job in jobs_list]
        
        for job in jobs_dicts:
            job["match_score"] = 0
            job["match_details"] = None
        
        return {
            "jobs": jobs_dicts,
            "total": jobs_data.get("total", 0),
            "matched_count": 0,
            "limit": limit,
            "offset": offset
        }
    
    # Convert profile to dict
    profile_dict = {
        "skills": user_profile.skills or [],
        "experience": user_profile.experience or [],
        "preferences": user_profile.preferences or {}
    }
    
    # Get all jobs (fetch more for filtering)
    jobs_data = crud.list_jobs_paginated(db, limit=1000, offset=0, **filters)
    
    # Convert jobs to dicts
    jobs_list = jobs_data.get("jobs") or jobs_data.get("items", [])
    jobs_dicts = [job_to_dict(job) for job in jobs_list]
    
    # Calculate match scores
    jobs_with_scores = []
    for job in jobs_dicts:
        job_dict = {
            "title": job.get("title", ""),
            "description": job.get("description_text", ""),
            "skills": job.get("skills", []),
            "remote": job.get("remote_flag", False),
            "location": job.get("location", "")
        }
        
        match_details = calculate_match_score(job_dict, profile_dict)
        
        if match_details["match_score"] >= min_match_score:
            job["match_score"] = match_details["match_score"]
            job["match_details"] = match_details
            jobs_with_scores.append(job)
    
    # Sort by match score (highest first)
    jobs_with_scores.sort(key=lambda x: x["match_score"], reverse=True)
    
    # Paginate
    total_matched = len(jobs_with_scores)
    paginated_jobs = jobs_with_scores[offset:offset + limit]
    
    return {
        "jobs": paginated_jobs,
        "total": jobs_data.get("total", 0),
        "matched_count": total_matched,
        "limit": limit,
        "offset": offset
    }


def get_top_matches(db: Session, user_id: int, top_k: int = 10) -> List[Dict[str, Any]]:
    """Get top K matched jobs for a user"""
    result = get_matched_jobs(db, user_id, min_match_score=70, limit=top_k)
    return result["jobs"]