from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.services.auth.models import User, Application
from app.core.models import Job
from app.services.email.service import send_followup_reminder, send_weekly_digest

def check_followup_reminders(db: Session):
    """Check for applications that need follow-up reminders"""
    # Find applications marked "applied" 7 days ago that haven't been updated
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    stmt = select(Application).where(
        Application.status == "applied",
        Application.applied_at <= seven_days_ago,
        Application.updated_at <= seven_days_ago  # Not updated since applying
    )
    
    apps = db.scalars(stmt).all()
    
    sent_count = 0
    for app in apps:
        user = db.scalar(select(User).where(User.id == app.user_id))
        job = db.scalar(select(Job).where(Job.id == app.job_id))
        
        if user and job:
            days_since = (datetime.now(timezone.utc) - app.applied_at).days
            
            send_followup_reminder(
                to_email=user.email,
                job_title=job.title,
                company=job.company,
                days_since=days_since,
                apply_url=job.apply_url
            )
            
            sent_count += 1
    
    print(f"✅ Sent {sent_count} follow-up reminders")
    return sent_count


def send_weekly_digests(db: Session):
    """Send weekly digest to all active users"""
    # Get all users who have at least 1 application
    stmt = select(User).join(Application).distinct()
    users = db.scalars(stmt).all()
    
    sent_count = 0
    for user in users:
        # Get user's stats
        apps = db.scalars(
            select(Application).where(Application.user_id == user.id)
        ).all()
        
        if not apps:
            continue
        
        stats = {
            "total": len(apps),
            "applied": len([a for a in apps if a.status == "applied"]),
            "interview": len([a for a in apps if a.status == "interview"]),
            "offer": len([a for a in apps if a.status == "offer"]),
        }
        
        # Get recent applications (last 7 days)
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent_apps = [
            {
                "job_title": db.scalar(select(Job.title).where(Job.id == a.job_id)),
                "company": db.scalar(select(Job.company).where(Job.id == a.job_id)),
                "status": a.status,
            }
            for a in apps
            if a.updated_at >= seven_days_ago
        ]
        
        send_weekly_digest(
            to_email=user.email,
            stats=stats,
            recent_apps=recent_apps
        )
        
        sent_count += 1
    
    print(f"✅ Sent {sent_count} weekly digests")
    return sent_count