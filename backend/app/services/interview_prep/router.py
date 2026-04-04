from fastapi import APIRouter, Depends, HTTPException,Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import List

from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User
from app.services.profile.models import UserProfile
from app.core.models import Job
from .models import InterviewPrep
from .schemas import InterviewPrepOut
from .service import generate_interview_prep

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/interview-prep", tags=["interview-prep"])


@router.post("/{job_id}", response_model=InterviewPrepOut)
def create_interview_prep(
    job_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate interview prep for a job"""
    
    # Get job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Check if prep already exists
    existing_prep = db.query(InterviewPrep).filter(
        InterviewPrep.user_id == current_user.id,
        InterviewPrep.job_id == job_id
    ).first()
    
    if existing_prep:
        return existing_prep
    
    # Get user profile
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(400, "Please upload your resume first to get personalized prep")
    
    # Generate prep using AI
    prep_data = generate_interview_prep(
        job_title=job.title,
        company=job.company,
        job_description=job.description_text or "",
        user_profile={
            "skills": profile.skills or [],
            "experience": profile.experience or []
        }
    )
    
    # Create prep record
    prep = InterviewPrep(
        user_id=current_user.id,
        job_id=job_id,
        company_overview=prep_data.get("company_overview"),
        company_culture=prep_data.get("company_culture"),
        recent_news=prep_data.get("recent_news", []),
        technical_questions=prep_data.get("technical_questions", []),
        behavioral_questions=prep_data.get("behavioral_questions", []),
        questions_to_ask=prep_data.get("questions_to_ask", []),
        preparation_tips=prep_data.get("preparation_tips", []),
        key_skills_to_highlight=prep_data.get("key_skills_to_highlight", [])
    )
    
    db.add(prep)
    db.commit()
    db.refresh(prep)
    
    return prep


@router.get("/{job_id}", response_model=InterviewPrepOut)
@limiter.limit("20/hour")  # ✅ 20 preps per hour per IP
def get_interview_prep(
    job_id: int,
    request: Request, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get existing interview prep for a job"""
    
    prep = db.query(InterviewPrep).filter(
        InterviewPrep.user_id == current_user.id,
        InterviewPrep.job_id == job_id
    ).first()
    
    if not prep:
        raise HTTPException(404, "Interview prep not found. Create one first.")
    
    return prep


@router.get("/", response_model=List[InterviewPrepOut])
def list_my_preps(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all user's interview preps"""
    
    preps = db.query(InterviewPrep).filter(
        InterviewPrep.user_id == current_user.id
    ).order_by(InterviewPrep.created_at.desc()).all()
    
    return preps


@router.delete("/{prep_id}")
def delete_prep(
    prep_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an interview prep"""
    
    prep = db.query(InterviewPrep).filter(
        InterviewPrep.id == prep_id,
        InterviewPrep.user_id == current_user.id
    ).first()
    
    if not prep:
        raise HTTPException(404, "Prep not found")
    
    db.delete(prep)
    db.commit()
    
    return {"message": "Interview prep deleted"}