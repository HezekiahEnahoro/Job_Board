from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User
from app.services.profile.models import UserProfile
from app.core import crud
from .models import CoverLetterTemplate, GeneratedCoverLetter
from .schemas import (
    CoverLetterTemplateCreate,
    CoverLetterTemplateUpdate,
    CoverLetterTemplateOut,
    GenerateCoverLetterRequest,
    GeneratedCoverLetterOut
)
from .generator import generate_cover_letter_with_ai, fill_template_placeholders
from slowapi import Limiter
from slowapi.util import get_remote_address


router = APIRouter(prefix="/cover-letter", tags=["cover-letter"])
limiter = Limiter(key_func=get_remote_address)

# ============= TEMPLATES =============

@router.get("/templates", response_model=List[CoverLetterTemplateOut])
def get_user_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all cover letter templates for current user"""
    templates = db.query(CoverLetterTemplate).filter(
        CoverLetterTemplate.user_id == current_user.id
    ).all()
    return templates

@router.post("/templates", response_model=CoverLetterTemplateOut)
def create_template(
    payload: CoverLetterTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new cover letter template"""
    
    # If this is set as default, unset other defaults
    if payload.is_default:
        db.query(CoverLetterTemplate).filter(
            CoverLetterTemplate.user_id == current_user.id,
            CoverLetterTemplate.is_default == True
        ).update({"is_default": False})
    
    template = CoverLetterTemplate(
        user_id=current_user.id,
        name=payload.name,
        content=payload.content,
        job_type=payload.job_type,
        is_default=payload.is_default
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template

@router.put("/templates/{template_id}", response_model=CoverLetterTemplateOut)
def update_template(
    template_id: int,
    payload: CoverLetterTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a cover letter template"""
    template = db.query(CoverLetterTemplate).filter(
        CoverLetterTemplate.id == template_id,
        CoverLetterTemplate.user_id == current_user.id
    ).first()
    
    if not template:
        raise HTTPException(404, "Template not found")
    
    # If setting as default, unset other defaults
    if payload.is_default:
        db.query(CoverLetterTemplate).filter(
            CoverLetterTemplate.user_id == current_user.id,
            CoverLetterTemplate.is_default == True
        ).update({"is_default": False})
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)
    
    db.commit()
    db.refresh(template)
    
    return template

@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a cover letter template"""
    template = db.query(CoverLetterTemplate).filter(
        CoverLetterTemplate.id == template_id,
        CoverLetterTemplate.user_id == current_user.id
    ).first()
    
    if not template:
        raise HTTPException(404, "Template not found")
    
    db.delete(template)
    db.commit()
    
    return {"message": "Template deleted"}

# ============= GENERATE =============

@router.post("/generate", response_model=GeneratedCoverLetterOut)
@limiter.limit("10/hour")
def generate_cover_letter(
    payload: GenerateCoverLetterRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a cover letter for a job"""
    # ADD PRO CHECK HERE
    if not current_user.is_pro:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cover letter generation is a Pro feature. Upgrade to Pro for unlimited AI cover letters!"
        )
    # Get user profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Profile not found. Upload a resume first.")
    
    # Get job
    job = crud.get_job(db, payload.job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    
    # Get template if specified
    template_content = None
    if payload.template_id:
        template = db.query(CoverLetterTemplate).filter(
            CoverLetterTemplate.id == payload.template_id,
            CoverLetterTemplate.user_id == current_user.id
        ).first()
        if template:
            template_content = template.content
    else:
        # Use default template if exists
        default_template = db.query(CoverLetterTemplate).filter(
            CoverLetterTemplate.user_id == current_user.id,
            CoverLetterTemplate.is_default == True
        ).first()
        if default_template:
            template_content = default_template.content
    
    # Generate cover letter
    cover_letter = generate_cover_letter_with_ai(
        job_title=job.title,
        job_description=job.description_text or "",
        company=job.company,
        user_name=profile.full_name or "Candidate",
        user_summary=profile.summary or "",
        user_experience=profile.experience or [],
        template_content=template_content
    )
    
    # Save to database
    generated = GeneratedCoverLetter(
        user_id=current_user.id,
        job_id=payload.job_id,
        template_id=payload.template_id,
        content=cover_letter
    )
    
    db.add(generated)
    db.commit()
    db.refresh(generated)
    
    return generated

@router.get("/history", response_model=List[GeneratedCoverLetterOut])
def get_cover_letter_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's generated cover letter history"""
    letters = db.query(GeneratedCoverLetter).filter(
        GeneratedCoverLetter.user_id == current_user.id
    ).order_by(GeneratedCoverLetter.created_at.desc()).limit(limit).all()
    
    return letters

@router.get("/{cover_letter_id}/view")
def view_cover_letter(
    cover_letter_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """View generated cover letter"""
    from fastapi.responses import HTMLResponse
    
    cover_letter = db.query(GeneratedCoverLetter).filter(
        GeneratedCoverLetter.id == cover_letter_id,
        GeneratedCoverLetter.user_id == current_user.id
    ).first()
    
    if not cover_letter:
        raise HTTPException(404, "Cover letter not found")
    
    # Wrap in simple HTML
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Cover Letter</title>
        <style>
            body {{ 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 40px auto; 
                padding: 20px; 
                line-height: 1.6;
                background: #f5f5f5;
            }}
            .letter {{
                background: white;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                white-space: pre-wrap;
            }}
        </style>
    </head>
    <body>
        <div class="letter">
            {cover_letter.content}
        </div>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html)