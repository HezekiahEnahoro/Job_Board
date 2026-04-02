from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User
from app.services.profile.models import UserProfile
from app.core import crud
from .schemas import GenerateResumeRequest, GeneratedResumeOut
from .models import GeneratedResume
from .generator import generate_tailored_resume
from .pdf_builder import build_resume_html
from app.services.matching.scorer import calculate_match_score

router = APIRouter(prefix="/resume-generator", tags=["resume-generator"])

@router.post("/generate", response_model=GeneratedResumeOut)
def generate_resume_for_job(
    payload: GenerateResumeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a tailored resume for a specific job
    """
    
    # Get user profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Profile not found. Upload a resume first.")
    
    # Get job
    job = crud.get_job(db, payload.job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Convert to dicts
    profile_dict = {
        "full_name": profile.full_name,
        "email": profile.email,
        "phone": profile.phone,
        "location": profile.location,
        "linkedin_url": profile.linkedin_url,
        "portfolio_url": profile.portfolio_url,
        "summary": profile.summary,
        "skills": profile.skills or [],
        "experience": profile.experience or [],
        "education": profile.education or []
    }
    
    job_dict = {
        "title": job.title,
        "description": job.description_text or "",
        "company": job.company
    }
    
    # Calculate match score
    match_details = calculate_match_score(
        {
            "title": job.title,
            "description": job.description_text or "",
            "skills": [],
            "remote": job.remote_flag,
            "location": job.location or ""
        },
        {
            "skills": profile.skills or [],
            "experience": profile.experience or [],
            "preferences": profile.preferences or {}
        }
    )
    
    # Generate tailored resume
    tailored_content = generate_tailored_resume(
        profile_dict,
        job_dict,
        match_details["match_score"]
    )
    
    # Build HTML
    resume_html = build_resume_html(profile_dict, tailored_content, payload.template)
    
    # Save to database
    generated_resume = GeneratedResume(
        user_id=current_user.id,
        job_id=payload.job_id,
        tailored_summary=tailored_content["tailored_summary"],
        highlighted_skills=tailored_content["highlighted_skills"],
        reordered_experience=tailored_content["reordered_experience"],
        match_score=match_details["match_score"],
        resume_html=resume_html,
        generation_method="ai_tailored",
        ai_changes=tailored_content["ai_changes"]
    )
    
    db.add(generated_resume)
    db.commit()
    db.refresh(generated_resume)
    
    return generated_resume

@router.get("/{resume_id}", response_model=GeneratedResumeOut)
def get_generated_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a previously generated resume"""
    resume = db.query(GeneratedResume).filter(
        GeneratedResume.id == resume_id,
        GeneratedResume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(404, "Resume not found")
    
    return resume

@router.get("/{resume_id}/view")
def view_resume_html(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """View generated resume as HTML page"""
    from fastapi.responses import HTMLResponse
    
    resume = db.query(GeneratedResume).filter(
        GeneratedResume.id == resume_id,
        GeneratedResume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(404, "Resume not found")
    
    return HTMLResponse(content=resume.resume_html)