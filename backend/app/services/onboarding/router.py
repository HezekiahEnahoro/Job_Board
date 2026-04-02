from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User
from app.services.profile.models import UserProfile
from app.services.profile.parser import parse_resume
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class OnboardingStatus(BaseModel):
    step: int  # 1-6
    completed: bool
    has_resume: bool
    has_preferences: bool


class JobPreferences(BaseModel):
    job_titles: List[str]
    remote_preference: str  # "remote", "hybrid", "onsite", "any"
    location: str | None = None


@router.get("/status", response_model=OnboardingStatus)
def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user has completed onboarding"""
    
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    
    # Determine current step
    if not profile:
        step = 2  # Need to upload resume
        has_resume = False
        has_preferences = False
        completed = False
    elif not profile.preferences or not profile.preferences.get("job_titles"):
        step = 4  # Need to set preferences
        has_resume = True
        has_preferences = False
        completed = False
    else:
        step = 6  # Completed
        has_resume = True
        has_preferences = True
        completed = True
    
    return OnboardingStatus(
        step=step,
        completed=completed,
        has_resume=has_resume,
        has_preferences=has_preferences
    )


@router.post("/upload-resume")
async def upload_resume_onboarding(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and parse resume during onboarding"""
    
    # Read file
    content = await file.read()
    
    # Parse resume
    parsed = parse_resume(content, file.filename)
    
    # Check if profile exists
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    
    if profile:
        # Update existing
        profile.full_name = parsed.get("full_name", profile.full_name)
        profile.email = parsed.get("email", profile.email)
        profile.phone = parsed.get("phone", profile.phone)
        profile.skills = parsed.get("skills", [])
        profile.experience = parsed.get("experience", [])
        profile.education = parsed.get("education", [])
        profile.summary = parsed.get("summary")
        profile.resume_text = parsed.get("resume_text")
    else:
        # Create new
        profile = UserProfile(
            user_id=current_user.id,
            full_name=parsed.get("full_name", current_user.full_name),
            email=parsed.get("email", current_user.email),
            phone=parsed.get("phone"),
            skills=parsed.get("skills", []),
            experience=parsed.get("experience", []),
            education=parsed.get("education", []),
            summary=parsed.get("summary"),
            resume_text=parsed.get("resume_text")
        )
        db.add(profile)
    
    db.commit()
    db.refresh(profile)
    
    return {
        "success": True,
        "profile": {
            "full_name": profile.full_name,
            "skills": profile.skills[:12],  # First 12 skills
            "total_skills": len(profile.skills),
            "experience_years": len(profile.experience),
            "education": profile.education
        }
    }


@router.post("/set-preferences")
def set_job_preferences(
    preferences: JobPreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set job preferences during onboarding"""
    
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(404, "Profile not found. Upload resume first.")
    
    # Update preferences
    profile.preferences = {
        "job_titles": preferences.job_titles,
        "remote_preference": preferences.remote_preference,
        "location": preferences.location
    }
    
    db.commit()
    db.refresh(profile)
    
    return {
        "success": True,
        "message": "Preferences saved!"
    }


@router.post("/complete")
def complete_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark onboarding as complete"""
    
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        raise HTTPException(404, "Complete steps 2-4 first")
    
    # Could add a flag to user model if needed
    # For now, just return success
    
    return {
        "success": True,
        "message": "Onboarding complete! 🎉"
    }