from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User
from .matcher import get_matched_jobs, get_top_matches

router = APIRouter(prefix="/matching", tags=["matching"])

@router.get("/jobs")
def get_jobs_with_match_scores(
    q: Optional[str] = Query(None, description="Search query"),
    days: int = Query(30, ge=1, le=365),
    min_match_score: int = Query(0, ge=0, le=100, description="Minimum match score (0-100)"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    skill: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    remote: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get jobs with match scores based on user's profile
    
    Returns jobs sorted by match score (highest first)
    """
    return get_matched_jobs(
        db=db,
        user_id=current_user.id,
        min_match_score=min_match_score,
        limit=limit,
        offset=offset,
        q=q,
        days=days,
        skill=skill,
        location=location,
        remote=remote
    )

@router.get("/top-matches")
def get_user_top_matches(
    top_k: int = Query(10, ge=1, le=50, description="Number of top matches to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top K matched jobs for current user"""
    return {
        "top_matches": get_top_matches(db, current_user.id, top_k=top_k)
    }