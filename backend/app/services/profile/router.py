from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User
from .models import UserProfile
from .schemas import ProfileCreate, ProfileUpdate, ProfileOut
from .parser import parse_resume
import json

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/me", response_model=ProfileOut)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(404, "Profile not found. Upload a resume to create your profile.")
    
    return profile

@router.post("/", response_model=ProfileOut)
def create_profile(
    payload: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create user profile"""
    # Check if profile already exists
    existing = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if existing:
        raise HTTPException(400, "Profile already exists. Use PUT to update.")
    
    # Create profile
    profile = UserProfile(
        user_id=current_user.id,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        location=payload.location,
        linkedin_url=payload.linkedin_url,
        portfolio_url=payload.portfolio_url,
        github_url=payload.github_url,
        summary=payload.summary,
        skills=payload.skills,
        experience=[exp.dict() for exp in payload.experience] if payload.experience else [],
        education=[edu.dict() for edu in payload.education] if payload.education else [],
        certifications=[cert.dict() for cert in payload.certifications] if payload.certifications else [],
        languages=[lang.dict() for lang in payload.languages] if payload.languages else [],
        preferences=payload.preferences.dict() if payload.preferences else {}
    )
    
    db.add(profile)
    db.commit()
    db.refresh(profile)
    
    return profile

@router.put("/", response_model=ProfileOut)
def update_profile(
    payload: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(404, "Profile not found. Create one first.")
    
    # Update fields
    update_data = payload.dict(exclude_unset=True)
    
    # Handle nested models
    if "experience" in update_data and update_data["experience"]:
        update_data["experience"] = [exp.dict() if hasattr(exp, 'dict') else exp for exp in update_data["experience"]]
    if "education" in update_data and update_data["education"]:
        update_data["education"] = [edu.dict() if hasattr(edu, 'dict') else edu for edu in update_data["education"]]
    if "certifications" in update_data and update_data["certifications"]:
        update_data["certifications"] = [cert.dict() if hasattr(cert, 'dict') else cert for cert in update_data["certifications"]]
    if "languages" in update_data and update_data["languages"]:
        update_data["languages"] = [lang.dict() if hasattr(lang, 'dict') else lang for lang in update_data["languages"]]
    if "preferences" in update_data and update_data["preferences"]:
        update_data["preferences"] = update_data["preferences"].dict() if hasattr(update_data["preferences"], 'dict') else update_data["preferences"]
    
    for key, value in update_data.items():
        setattr(profile, key, value)
    
    db.commit()
    db.refresh(profile)
    
    return profile

@router.post("/upload-resume", response_model=ProfileOut)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and parse resume to create/update profile"""
    
    # Validate file type
    if not file.filename.lower().endswith(('.pdf', '.txt', '.docx')):
        raise HTTPException(400, "Only PDF, TXT, and DOCX files are supported")
    
    # Read file
    file_bytes = await file.read()
    
    # Parse resume
    parsed_data = parse_resume(file_bytes, file.filename)
    
    if "error" in parsed_data:
        raise HTTPException(400, parsed_data["error"])
    
    # Check if profile exists
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if profile:
        # Update existing profile
        for key, value in parsed_data.items():
            if value is not None and value != [] and value != {}:
                setattr(profile, key, value)
        profile.resume_file_name = file.filename
    else:
        # Create new profile
        profile = UserProfile(
            user_id=current_user.id,
            full_name=parsed_data.get("full_name"),
            email=parsed_data.get("email"),
            phone=parsed_data.get("phone"),
            location=parsed_data.get("location"),
            linkedin_url=parsed_data.get("linkedin_url"),
            portfolio_url=parsed_data.get("portfolio_url"),
            github_url=parsed_data.get("github_url"),
            summary=parsed_data.get("summary"),
            skills=parsed_data.get("skills", []),
            experience=parsed_data.get("experience", []),
            education=parsed_data.get("education", []),
            certifications=parsed_data.get("certifications", []),
            languages=parsed_data.get("languages", []),
            resume_file_name=file.filename
        )
        db.add(profile)
    
    db.commit()
    db.refresh(profile)
    
    return profile

@router.delete("/")
def delete_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user profile"""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    db.delete(profile)
    db.commit()
    
    return {"message": "Profile deleted successfully"}