from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User, ResumeAnalysis
from app.core.models import Job
from app.services.ai.parser import extract_text_from_resume, validate_resume_text
from app.services.ai.analyzer import analyze_resume_match, generate_cover_letter
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/ai", tags=["ai"])

# CONFIGURABLE LIMITS
FREE_ANALYSES_PER_MONTH = 5
PRO_ANALYSES_PER_MONTH = None  # None = unlimited

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

class UsageStats(BaseModel):
    analyses_used: int
    analyses_limit: int | None
    is_pro: bool
    can_analyze: bool
    remaining: int | None

@router.get("/usage", response_model=UsageStats)
def get_usage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current month's usage statistics"""
    
    one_month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    analyses_count = db.scalar(
        select(func.count())
        .select_from(ResumeAnalysis)
        .where(
            ResumeAnalysis.user_id == current_user.id,
            ResumeAnalysis.created_at >= one_month_ago
        )
    ) or 0
    
    if current_user.is_pro:
        limit = None
        remaining = None
        can_analyze = True
    else:
        limit = FREE_ANALYSES_PER_MONTH
        remaining = max(0, limit - analyses_count)
        can_analyze = analyses_count < limit
    
    return UsageStats(
        analyses_used=analyses_count,
        analyses_limit=limit,
        is_pro=current_user.is_pro,
        can_analyze=can_analyze,
        remaining=remaining
    )

@router.post("/analyze-resume", response_model=AnalysisResult)
async def analyze_resume(
    file: UploadFile = File(...),
    job_id: int = Form(...),
    generate_cover: bool = Form(False),
    manual_job_title: Optional[str] = Form(None),
    manual_company: Optional[str] = Form(None),
    manual_description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload resume and analyze against a job posting
    Supports both database jobs and manual job entry
    """
    
    # Check usage limits
    one_month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    analyses_count = db.scalar(
        select(func.count())
        .select_from(ResumeAnalysis)
        .where(
            ResumeAnalysis.user_id == current_user.id,
            ResumeAnalysis.created_at >= one_month_ago
        )
    ) or 0
    
    # Enforce limits for free users
    if not current_user.is_pro:
        if analyses_count >= FREE_ANALYSES_PER_MONTH:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Free tier limit: {FREE_ANALYSES_PER_MONTH} analyses per month. Upgrade to Pro!"
            )
    
    # Handle manual vs database job
    if job_id == 0 and manual_job_title and manual_company and manual_description:
        # Manual job entry
        job_title = manual_job_title
        company = manual_company
        description = manual_description
        job_id_to_save = 0  # Save as 0 for manual entries
    else:
        # Database job
        job = db.scalar(select(Job).where(Job.id == job_id))
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        job_title = job.title
        company = job.company
        description = job.description_text or ""
        job_id_to_save = job.id
    
    # Read and parse resume
    try:
        file_content = await file.read()
        resume_text = extract_text_from_resume(file_content, file.filename)
        
        if not validate_resume_text(resume_text):
            raise ValueError(
                "This doesn't appear to be a valid resume. "
                "Please ensure your resume contains standard sections."
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Analyze with AI
    try:
        analysis_result = analyze_resume_match(
            resume_text=resume_text,
            job_title=job_title,
            job_description=description,
            company=company
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # Generate cover letter if requested (Pro feature)
    cover_letter = None
    if generate_cover:
        if not current_user.is_pro:
            print(f"ℹ️ Free user requested cover letter, skipping")
        else:
            try:
                cover_letter = generate_cover_letter(
                    resume_text=resume_text,
                    job_title=job_title,
                    job_description=description,
                    company=company,
                    user_name=current_user.full_name
                )
            except ValueError as e:
                print(f"⚠️ Cover letter generation failed: {e}")
    
    # Save to database
    db_analysis = ResumeAnalysis(
        user_id=current_user.id,
        job_id=job_id_to_save,
        resume_text=resume_text[:5000],
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
        job_id=job_id_to_save,
        job_title=job_title,
        company=company,
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
        # Handle both database jobs and manual entries
        if analysis.job_id > 0:
            job = db.scalar(select(Job).where(Job.id == analysis.job_id))
            job_title = job.title if job else "Unknown"
            company = job.company if job else "Unknown"
        else:
            # Manual entry - extract from suggestions or use placeholder
            job_title = "Manual Entry"
            company = "N/A"
        
        results.append(AnalysisResult(
            id=analysis.id,
            job_id=analysis.job_id,
            job_title=job_title,
            company=company,
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
    
    if analysis.job_id > 0:
        job = db.scalar(select(Job).where(Job.id == analysis.job_id))
        job_title = job.title if job else "Unknown"
        company = job.company if job else "Unknown"
    else:
        job_title = "Manual Entry"
        company = "N/A"
    
    return AnalysisResult(
        id=analysis.id,
        job_id=analysis.job_id,
        job_title=job_title,
        company=company,
        match_score=analysis.match_score,
        missing_keywords=analysis.missing_keywords,
        strengths=analysis.strengths,
        suggestions=analysis.suggestions,
        cover_letter=analysis.cover_letter,
        created_at=analysis.created_at.isoformat(),
        analysis_time_seconds=analysis.analysis_time_seconds
    )