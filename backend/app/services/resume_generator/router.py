from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
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
from slowapi import Limiter
from slowapi.util import get_remote_address
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resume-generator", tags=["resume-generator"])
limiter = Limiter(key_func=get_remote_address)

@router.post("/generate", response_model=GeneratedResumeOut)
@limiter.limit("30/hour")
def generate_resume_for_job(
    payload: GenerateResumeRequest,
    request: Request, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get user profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(404, "Profile not found. Upload a resume first.")
    
    # Get job
    job = crud.get_job(db, payload.job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    
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
    
    # Save generated resume
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

    # ── Sync score to user_job_scores so job card shows the same number ──
    # The resume tailoring AI is the most accurate scorer — it reads the
    # full job description and tailors against the actual profile.
    # This makes job card score = Quick Apply score = single source of truth.
    try:
        matched_skills = tailored_content.get("highlighted_skills", [])
        db.execute(text("""
            INSERT INTO user_job_scores
                (user_id, job_id, match_score, skills_match,
                 experience_match, preferences_match,
                 matched_skills, missing_skills, reason, computed_at)
            VALUES
                (:uid, :jid, :score, :score, 50, 50,
                 CAST(:ms AS jsonb), CAST('[]' AS jsonb), 'Scored from resume tailoring', NOW())
            ON CONFLICT (user_id, job_id) DO UPDATE SET
                match_score    = EXCLUDED.match_score,
                skills_match   = EXCLUDED.skills_match,
                matched_skills = EXCLUDED.matched_skills,
                reason         = EXCLUDED.reason,
                computed_at    = NOW()
        """), {
            "uid": current_user.id,
            "jid": payload.job_id,
            "score": match_details["match_score"],
            "ms": json.dumps(matched_skills[:10]),
        })
        db.commit()
        logger.info(f"[Resume] Synced score {match_details['match_score']}% for job {payload.job_id} user {current_user.id}")
    except Exception as e:
        logger.warning(f"[Resume] Failed to sync score to user_job_scores: {e}")
        # Non-critical — resume still returns successfully

    return generated_resume


@router.get("/{resume_id}", response_model=GeneratedResumeOut)
def get_generated_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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
    from fastapi.responses import HTMLResponse
    resume = db.query(GeneratedResume).filter(
        GeneratedResume.id == resume_id,
        GeneratedResume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(404, "Resume not found")
    return HTMLResponse(content=resume.resume_html)