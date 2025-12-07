from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User
from app.services.email.tasks import check_followup_reminders, send_weekly_digests
from app.services.email.service import send_weekly_digest, send_followup_reminder

router = APIRouter(prefix="/emails", tags=["emails"])

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