from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User, EmailPreferences
from app.services.email.tasks import check_followup_reminders, send_weekly_digests
from app.services.email.service import send_weekly_digest, send_followup_reminder

router = APIRouter(prefix="/emails", tags=["emails"])

class EmailPreferencesUpdate(BaseModel):
    enabled: bool
    frequency: str  # daily, weekly, disabled
    min_match_score: int
    remote_only: bool


class EmailPreferencesOut(BaseModel):
    id: int
    enabled: bool
    frequency: str
    min_match_score: int
    remote_only: bool
    last_sent_at: Optional[datetime]
    
    class Config:
        from_attributes = True


@router.get("/preferences", response_model=EmailPreferencesOut)
def get_email_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's email alert preferences"""
    prefs = db.query(EmailPreferences).filter(
        EmailPreferences.user_id == current_user.id
    ).first()
    
    # Create default preferences if none exist
    if not prefs:
        prefs = EmailPreferences(
            user_id=current_user.id,
            enabled=True,
            frequency="weekly",
            min_match_score=70,
            remote_only=False
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    
    return prefs


@router.put("/preferences", response_model=EmailPreferencesOut)
def update_email_preferences(
    data: EmailPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update email alert preferences"""
    prefs = db.query(EmailPreferences).filter(
        EmailPreferences.user_id == current_user.id
    ).first()
    
    if not prefs:
        prefs = EmailPreferences(user_id=current_user.id)
        db.add(prefs)
    
    # Update fields
    prefs.enabled = data.enabled
    prefs.frequency = data.frequency
    prefs.min_match_score = data.min_match_score
    prefs.remote_only = data.remote_only
    prefs.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(prefs)
    
    return prefs


@router.post("/unsubscribe/{user_id}")
def unsubscribe_from_alerts(user_id: int, db: Session = Depends(get_db)):
    """Unsubscribe from email alerts (public endpoint)"""
    prefs = db.query(EmailPreferences).filter(
        EmailPreferences.user_id == user_id
    ).first()
    
    if prefs:
        prefs.enabled = False
        prefs.frequency = "disabled"
        prefs.updated_at = datetime.utcnow()
        db.commit()
    
    return {"message": "Successfully unsubscribed from email alerts"}


@router.post("/test-welcome")
def test_welcome_email(current_user: User = Depends(get_current_user)):
    """Test welcome email (sends to current user)"""
    from app.services.email.service import send_welcome_email
    result = send_welcome_email(current_user.email, current_user.full_name)
    return {"sent": bool(result), "to": current_user.email}

@router.post("/test-followup")
def test_followup_email(current_user: User = Depends(get_current_user)):
    """Test follow-up reminder email"""
    result = send_followup_reminder(
        to_email=current_user.email,
        job_title="Senior Software Engineer",
        company="Example Corp",
        days_since=7,
        apply_url="https://example.com/jobs/123"
    )
    return {"sent": bool(result), "to": current_user.email}

@router.post("/test-digest")
def test_digest_email(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test weekly digest email"""
    from sqlalchemy import select
    from app.services.auth.models import Application
    from app.core.models import Job
    
    # Get user's actual stats
    apps = db.scalars(
        select(Application).where(Application.user_id == current_user.id)
    ).all()
    
    stats = {
        "total": len(apps),
        "applied": len([a for a in apps if a.status == "applied"]),
        "interview": len([a for a in apps if a.status == "interview"]),
        "offer": len([a for a in apps if a.status == "offer"]),
    }
    
    recent_apps = [
        {
            "job_title": db.scalar(select(Job.title).where(Job.id == a.job_id)),
            "company": db.scalar(select(Job.company).where(Job.id == a.job_id)),
            "status": a.status,
        }
        for a in apps[:5]  # Max 5 recent
    ]
    
    result = send_weekly_digest(
        to_email=current_user.email,
        stats=stats,
        recent_apps=recent_apps
    )
    
    return {"sent": bool(result), "to": current_user.email, "stats": stats}

@router.post("/run-followup-check")
def run_followup_check_now(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger follow-up reminder check (admin only in production)"""
    count = check_followup_reminders(db)
    return {"checked": True, "sent": count}

@router.post("/run-weekly-digest")
def run_weekly_digest_now(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger weekly digest (admin only in production)"""
    count = send_weekly_digests(db)
    return {"checked": True, "sent": count}

@router.post("/test-job-alert")
def test_job_alert(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test job alert email with actual matching jobs"""
    from app.core.models import Job
    from sqlalchemy import select
    from app.services.matching.scorer import calculate_match_score
    from app.services.auth.models import UserProfile
    
    # Get user profile
    profile = db.scalar(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    
    if not profile:
        return {"error": "No profile found. Please upload resume first."}
    
    # Get recent jobs
    jobs = db.scalars(
        select(Job).where(Job.is_active == True).limit(20)
    ).all()
    
    # Score and filter jobs
    scored_jobs = []
    for job in jobs:
        try:
            score = calculate_match_score(profile, job)
            if score >= 70:  # Min 70% match
                scored_jobs.append({
                    "id": job.id,
                    "title": job.title,
                    "company": job.company,
                    "location": job.location or "Remote",
                    "match_score": score,
                })
        except:
            continue
    
    # Sort by match score
    scored_jobs.sort(key=lambda x: x['match_score'], reverse=True)
    
    if not scored_jobs:
        return {"error": "No matching jobs found"}
    
    # Send email
    from app.services.email.service import send_job_digest
    
    result = send_job_digest(
        to_email=current_user.email,
        jobs=scored_jobs[:10],
        user_name=current_user.full_name
    )
    
    return {
        "sent": bool(result),
        "to": current_user.email,
        "jobs_count": len(scored_jobs)
    }


@router.post("/run-job-alerts")
def run_job_alerts_now(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger job alerts (admin only in production)"""
    from app.services.email.tasks import send_job_alerts
    count = send_job_alerts(db)
    return {"checked": True, "sent": count}