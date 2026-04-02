from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from app.services.auth.models import User, Application, EmailPreferences
from app.services.profile.models import UserProfile 
from app.core.models import Job
from app.services.email.service import send_followup_reminder, send_weekly_digest, send_job_digest
from app.services.matching.scorer import calculate_match_score


def send_job_alerts(db: Session):
    """Send job alerts based on user preferences"""
    
    # Get users with job alerts enabled and profiles
    users_to_email = (
        db.query(User, EmailPreferences, UserProfile)  # ✅ Fixed
        .join(EmailPreferences, User.id == EmailPreferences.user_id)
        .join(UserProfile, User.id == UserProfile.user_id)  # ✅ Fixed
        .filter(
            and_(
                EmailPreferences.enabled == True,
                EmailPreferences.frequency != "disabled"
            )
        )
        .all()
    )
    
    sent_count = 0
    
    for user, prefs, profile in users_to_email:
        # Check if should send based on frequency
        if not should_send_alert(prefs):
            continue
        
        # Get matching jobs
        jobs = get_matching_jobs_for_user(
            profile=profile,
            min_match_score=prefs.min_match_score,
            remote_only=prefs.remote_only,
            db=db
        )
        
        # Skip if no jobs
        if not jobs:
            print(f"⏭️ Skipping {user.email} - no matching jobs")
            continue
        
        # Send email
        result = send_job_digest(
            to_email=user.email,
            jobs=jobs,
            user_name=user.full_name,
            user_id=user.id  # ✅ Added for unsubscribe link
        )
        
        if result:
            # Update last_sent_at
            prefs.last_sent_at = datetime.now(timezone.utc)
            db.commit()
            sent_count += 1
    
    print(f"✅ Sent {sent_count} job alerts")
    return sent_count


def should_send_alert(prefs: EmailPreferences) -> bool:
    """Check if alert should be sent based on frequency"""
    if not prefs.enabled or prefs.frequency == "disabled":
        return False
    
    now = datetime.now(timezone.utc)
    
    # First time sending
    if not prefs.last_sent_at:
        return True
    
    last_sent = prefs.last_sent_at
    
    # Daily: send if last sent was yesterday or earlier
    if prefs.frequency == "daily":
        return (now - last_sent).days >= 1
    
    # Weekly: send if last sent was 7+ days ago
    if prefs.frequency == "weekly":
        return (now - last_sent).days >= 7
    
    return False


def get_matching_jobs_for_user(profile: UserProfile, min_match_score: int, remote_only: bool, db: Session):
    """Get jobs matching user's profile and preferences"""
    # Get recent active jobs
    jobs = db.scalars(
        select(Job).where(Job.is_active == True).limit(50)
    ).all()
    
    # Score and filter jobs
    scored_jobs = []
    for job in jobs:
        try:
            score = calculate_match_score(profile, job)
            
            # Filter by match score
            if score < min_match_score:
                continue
            
            # Filter by remote preference
            if remote_only and not job.remote_flag:
                continue
            
            scored_jobs.append({
                "id": job.id,
                "title": job.title,
                "company": job.company,
                "location": job.location or "Remote",
                "match_score": score,
            })
        except Exception as e:
            print(f"Error scoring job {job.id}: {e}")
            continue
    
    # Sort by match score
    scored_jobs.sort(key=lambda x: x['match_score'], reverse=True)
    
    return scored_jobs[:10]  # Return top 10


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