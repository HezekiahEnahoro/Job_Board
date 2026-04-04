from fastapi import APIRouter, Depends, UploadFile, File, Form, Request, HTTPException, status
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
from slowapi import Limiter
from slowapi.util import get_remote_address


router = APIRouter(prefix="/ai", tags=["ai"])

limiter = Limiter(key_func=get_remote_address)

# CONFIGURABLE LIMITS
FREE_ANALYSES_PER_MONTH = 3
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
@limiter.limit("10/hour")  # ✅ 10 analyses per hour per IP
async def analyze_resume(
    request: Request,
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

    # ✅ ADD FILE VALIDATION HERE
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    ALLOWED_TYPES = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'  # .docx
    ]
    
    # Check file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are allowed"
        )
    
    # Check file size
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 5MB"
        )
    
    # Reset file pointer for later reading
    await file.seek(0)
    
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

@router.get("/analysis/{analysis_id}", response_model=AnalysisResult)
def get_single_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific resume analysis by ID"""
    analysis = db.scalar(
        select(ResumeAnalysis).where(
            ResumeAnalysis.id == analysis_id,
            ResumeAnalysis.user_id == current_user.id
        )
    )
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Get job details
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


@router.get("/analysis/{analysis_id}/download")
def download_analysis_pdf(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download analysis as PDF"""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    # Get analysis
    analysis = db.scalar(
        select(ResumeAnalysis).where(
            ResumeAnalysis.id == analysis_id,
            ResumeAnalysis.user_id == current_user.id
        )
    )
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Get job details
    if analysis.job_id > 0:
        job = db.scalar(select(Job).where(Job.id == analysis.job_id))
        job_title = job.title if job else "Unknown"
        company = job.company if job else "Unknown"
    else:
        job_title = "Manual Entry"
        company = "N/A"
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#6366f1'),
        spaceAfter=30,
        alignment=1  # Center
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=12,
        spaceBefore=20
    )
    
    # Title
    story.append(Paragraph("Resume Analysis Report", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Job Info
    story.append(Paragraph(f"<b>Position:</b> {job_title}", styles['Normal']))
    story.append(Paragraph(f"<b>Company:</b> {company}", styles['Normal']))
    story.append(Paragraph(f"<b>Date:</b> {analysis.created_at.strftime('%B %d, %Y')}", styles['Normal']))
    story.append(Spacer(1, 0.3*inch))
    
    # Match Score Box
    score_color = '#10b981' if analysis.match_score >= 80 else '#eab308' if analysis.match_score >= 60 else '#ef4444'
    bg_color = '#f0fdf4' if analysis.match_score >= 80 else '#fef9c3' if analysis.match_score >= 60 else '#fee2e2'
    text_color = '#166534' if analysis.match_score >= 80 else '#854d0e' if analysis.match_score >= 60 else '#991b1b'
    
    score_label = "Excellent Match!" if analysis.match_score >= 80 else "Good Match" if analysis.match_score >= 60 else "Needs Improvement"
    
    score_data = [[f"Match Score: {int(analysis.match_score)}%"], [score_label]]
    score_table = Table(score_data, colWidths=[6*inch])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(bg_color)),
        ('TEXTCOLOR', (0, 0), (0, 0), colors.HexColor(text_color)),
        ('TEXTCOLOR', (0, 1), (0, 1), colors.HexColor(text_color)),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (0, 0), 20),
        ('FONTNAME', (0, 1), (0, 1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (0, 1), 14),
        ('PADDING', (0, 0), (-1, -1), 15),
        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor(score_color)),
        ('TOPPADDING', (0, 0), (-1, 0), 20),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 20),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 0.4*inch))
    
    # Strengths Section
    if analysis.strengths and len(analysis.strengths) > 0:
        story.append(Paragraph("Your Strengths", heading_style))
        for i, strength in enumerate(analysis.strengths, 1):
            story.append(Paragraph(f"{i}. {strength}", styles['Normal']))
            story.append(Spacer(1, 0.08*inch))
        story.append(Spacer(1, 0.2*inch))
    
    # Missing Keywords Section
    if analysis.missing_keywords and len(analysis.missing_keywords) > 0:
        story.append(Paragraph("Missing Keywords", heading_style))
        keywords_text = ", ".join(analysis.missing_keywords)
        story.append(Paragraph(keywords_text, styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
    
    # AI Suggestions Section
    if analysis.suggestions:
        story.append(Paragraph("AI Suggestions", heading_style))
        # Split by newlines and create paragraphs
        suggestion_lines = analysis.suggestions.split('\n')
        for line in suggestion_lines:
            if line.strip():
                story.append(Paragraph(line.strip(), styles['Normal']))
                story.append(Spacer(1, 0.08*inch))
        story.append(Spacer(1, 0.3*inch))
    
    # Cover Letter Section
    if analysis.cover_letter:
        story.append(Paragraph("Generated Cover Letter", heading_style))
        # Split cover letter into paragraphs
        paragraphs = analysis.cover_letter.split('\n\n')
        for para in paragraphs:
            if para.strip():
                story.append(Paragraph(para.strip(), styles['Normal']))
                story.append(Spacer(1, 0.15*inch))
    
    # Footer
    story.append(Spacer(1, 0.5*inch))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#6b7280'),
        alignment=1  # Center
    )
    story.append(Paragraph(f"Generated by MyJobPhase • Analysis completed in {analysis.analysis_time_seconds:.1f}s", footer_style))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=resume_analysis_{analysis_id}.pdf"
        }
    )