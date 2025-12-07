from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User, ResumeAnalysis
from app.core.models import Job
from app.services.ai.parser import extract_text_from_resume, validate_resume_text
from app.services.ai.analyzer import analyze_resume_match, generate_cover_letter
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/ai", tags=["ai"])

class AnalysisResult(BaseModel):
    id: int
    job_id: int
    job_title: str
    company: str
    match_score: float
    missing_keywords: List[str]
    strengths: List[str]
    suggestions: str
    cover_letter: Optional[str]
    created_at: str
    analysis_time_seconds: float
    
    class Config:
        from_attributes = True

@router.post("/analyze-resume", response_model=AnalysisResult)
async def analyze_resume(
    file: UploadFile = File(...),
    job_id: int = Form(...),
    generate_cover: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload resume and analyze against a job posting
    Returns match score, missing keywords, strengths, and suggestions
    """
    
    # Check usage limits (free users: 1 per month, pro users: unlimited)
    # TODO: Implement pro tier check
    from datetime import datetime, timedelta, timezone
    one_month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    recent_analyses = db.scalar(
        select(ResumeAnalysis)
        .where(
            ResumeAnalysis.user_id == current_user.id,
            ResumeAnalysis.created_at >= one_month_ago
        )
        .limit(1)
    )
    
    if not current_user.is_pro and recent_analyses:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Free tier limit: 1 analysis per month. Upgrade to Pro for unlimited analyses!"
        )
    
    # Get job details
    job = db.scalar(select(Job).where(Job.id == job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Read and parse resume
    try:
        file_content = await file.read()
        resume_text = extract_text_from_resume(file_content, file.filename)
        validate_resume_text(resume_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Analyze with AI
    try:
        analysis_result = analyze_resume_match(
            resume_text=resume_text,
            job_title=job.title,
            job_description=job.description_text or "",
            company=job.company
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # Generate cover letter if requested
    cover_letter = None
    if generate_cover:
        try:
            cover_letter = generate_cover_letter(
                resume_text=resume_text,
                job_title=job.title,
                job_description=job.description_text or "",
                company=job.company,
                user_name=current_user.full_name
            )
        except ValueError as e:
            print(f"Warning: Cover letter generation failed: {e}")
            # Don't fail the whole request if cover letter fails
    
    # Save to database
    db_analysis = ResumeAnalysis(
        user_id=current_user.id,
        job_id=job.id,
        resume_text=resume_text[:5000],  # Store first 5000 chars
        resume_filename=file.filename,
        match_score=analysis_result["match_score"],
        missing_keywords=analysis_result["missing_keywords"],
        strengths=analysis_result["strengths"],
        suggestions=analysis_result["suggestions"],
        cover_letter=cover_letter,
        analysis_time_seconds=analysis_result["analysis_time_seconds"]
    )
    
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    
    return AnalysisResult(
        id=db_analysis.id,
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        match_score=db_analysis.match_score,
        missing_keywords=db_analysis.missing_keywords,
        strengths=db_analysis.strengths,
        suggestions=db_analysis.suggestions,
        cover_letter=db_analysis.cover_letter,
        created_at=db_analysis.created_at.isoformat(),
        analysis_time_seconds=db_analysis.analysis_time_seconds
    )

@router.get("/analyses", response_model=List[AnalysisResult])
def get_user_analyses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all resume analyses for current user"""
    analyses = db.scalars(
        select(ResumeAnalysis)
        .where(ResumeAnalysis.user_id == current_user.id)
        .order_by(ResumeAnalysis.created_at.desc())
    ).all()
    
    results = []
    for analysis in analyses:
        job = db.scalar(select(Job).where(Job.id == analysis.job_id))
        if job:
            results.append(AnalysisResult(
                id=analysis.id,
                job_id=job.id,
                job_title=job.title,
                company=job.company,
                match_score=analysis.match_score,
                missing_keywords=analysis.missing_keywords,
                strengths=analysis.strengths,
                suggestions=analysis.suggestions,
                cover_letter=analysis.cover_letter,
                created_at=analysis.created_at.isoformat(),
                analysis_time_seconds=analysis.analysis_time_seconds
            ))
    
    return results

@router.get("/analyses/{analysis_id}", response_model=AnalysisResult)
def get_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific resume analysis"""
    analysis = db.scalar(
        select(ResumeAnalysis).where(
            ResumeAnalysis.id == analysis_id,
            ResumeAnalysis.user_id == current_user.id
        )
    )
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    job = db.scalar(select(Job).where(Job.id == analysis.job_id))
    
    return AnalysisResult(
        id=analysis.id,
        job_id=job.id if job else 0,
        job_title=job.title if job else "Unknown",
        company=job.company if job else "Unknown",
        match_score=analysis.match_score,
        missing_keywords=analysis.missing_keywords,
        strengths=analysis.strengths,
        suggestions=analysis.suggestions,
        cover_letter=analysis.cover_letter,
        created_at=analysis.created_at.isoformat(),
        analysis_time_seconds=analysis.analysis_time_seconds
    )