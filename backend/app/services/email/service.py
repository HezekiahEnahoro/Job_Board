import os
import resend
from typing import Optional
from datetime import datetime

resend.api_key = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")

def send_welcome_email(to_email: str, user_name: Optional[str] = None):
    """Send welcome email to new user"""
    name = user_name or to_email.split("@")[0]
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to MyJobPhase! 🎉</h1>
        
        <p>Hi {name},</p>
        
        <p>Thanks for signing up! MyJobPhase helps you track job applications and land interviews faster.</p>
        
        <h2 style="color: #1f2937;">What's next?</h2>
        <ul>
            <li><strong>Browse Jobs:</strong> Find opportunities from top companies</li>
            <li><strong>Track Applications:</strong> Keep everything organized in one place</li>
            <li><strong>Get Reminders:</strong> Never miss a follow-up</li>
        </ul>
        
        <p>
            <a href="http://localhost:3000/jobs" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
                Start Tracking Jobs →
            </a>
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Questions? Just reply to this email - we're here to help!
        </p>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "Welcome to MyJobPhase! 🚀",
            "html": html,
        }
        
        result = resend.Emails.send(params)
        print(f"✅ Welcome email sent to {to_email}: {result}")
        return result
    except Exception as e:
        print(f"❌ Failed to send welcome email to {to_email}: {e}")
        return None


def send_followup_reminder(to_email: str, job_title: str, company: str, days_since: int, apply_url: Optional[str] = None):
    """Send reminder to follow up on application"""
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Time to Follow Up! 📬</h1>
        
        <p>Hey there,</p>
        
        <p>It's been <strong>{days_since} days</strong> since you applied to:</p>
        
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937;">{job_title}</h3>
            <p style="margin: 0; color: #6b7280;">{company}</p>
        </div>
        
        <p><strong>Pro tip:</strong> Following up shows initiative and keeps you top-of-mind!</p>
        
        <h3 style="color: #1f2937;">What to do:</h3>
        <ul>
            <li>Send a polite follow-up email to the recruiter</li>
            <li>Mention your continued interest</li>
            <li>Ask about the timeline</li>
        </ul>
        
        <p>
            <a href="http://localhost:3000/dashboard" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
                View Application →
            </a>
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Good luck! 🍀
        </p>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"Follow up on your {company} application",
            "html": html,
        }
        
        result = resend.Emails.send(params)
        print(f"✅ Follow-up reminder sent to {to_email}: {result}")
        return result
    except Exception as e:
        print(f"❌ Failed to send follow-up reminder to {to_email}: {e}")
        return None


def send_weekly_digest(to_email: str, stats: dict, recent_apps: list):
    """Send weekly summary of pipeline"""
    
    # Build applications list HTML
    apps_html = ""
    for app in recent_apps[:5]:  # Show max 5 recent
        apps_html += f"""
        <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; margin: 8px 0;">
            <div style="font-weight: bold; color: #1f2937;">{app['job_title']}</div>
            <div style="color: #6b7280; font-size: 14px;">{app['company']} • {app['status']}</div>
        </div>
        """
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Your Weekly Job Search Summary 📊</h1>
        
        <p>Here's how your job search is going:</p>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0;">
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #2563eb;">{stats.get('total', 0)}</div>
                <div style="color: #6b7280; font-size: 14px;">Total</div>
            </div>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #2563eb;">{stats.get('applied', 0)}</div>
                <div style="color: #6b7280; font-size: 14px;">Applied</div>
            </div>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #2563eb;">{stats.get('interview', 0)}</div>
                <div style="color: #6b7280; font-size: 14px;">Interviews</div>
            </div>
        </div>
        
        <h3 style="color: #1f2937;">Recent Activity:</h3>
        {apps_html if apps_html else "<p style='color: #6b7280;'>No recent applications</p>"}
        
        <p>
            <a href="http://localhost:3000/dashboard" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
                View Dashboard →
            </a>
        </p>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Keep going! You're making progress. 💪
        </p>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": "Your Weekly Job Search Update",
            "html": html,
        }
        
        result = resend.Emails.send(params)
        print(f"✅ Weekly digest sent to {to_email}: {result}")
        return result
    except Exception as e:
        print(f"❌ Failed to send weekly digest to {to_email}: {e}")
        return None

def send_job_digest(to_email: str, jobs: list, user_name: Optional[str] = None, user_id: Optional[int] = None):
    """Send digest of new matching jobs"""
    name = user_name or to_email.split("@")[0]
    
    # Build jobs list HTML
    jobs_html = ""
    for job in jobs[:10]:  # Max 10 jobs
        match_badge = ""
        if job.get('match_score'):
            score = job['match_score']
            color = "#10b981" if score >= 80 else "#3b82f6" if score >= 70 else "#6b7280"
            match_badge = f'<span style="background-color: {color}20; color: {color}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">{score}% Match</span>'
        
        jobs_html += f"""
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; margin: 12px 0;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <h3 style="margin: 0; color: #1f2937; font-size: 18px;">{job['title']}</h3>
                {match_badge}
            </div>
            <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
                <strong>{job['company']}</strong> • {job.get('location', 'Remote')}
            </p>
            <a href="http://localhost:3000/jobs?job_id={job['id']}" 
               style="display: inline-block; margin-top: 12px; background-color: #2563eb; color: white; 
                      padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px;">
                View Job →
            </a>
        </div>
        """
    
    # Footer with unsubscribe
    footer = f"""
    <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
        Don't want these emails? 
        <a href="http://localhost:3000/settings" style="color: #2563eb;">Manage preferences</a>
        {f' or <a href="http://localhost:3000/api/emails/unsubscribe/{user_id}" style="color: #2563eb;">Unsubscribe</a>' if user_id else ''}
    </p>
    """
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">🎯 New Jobs Matching Your Profile</h1>
        
        <p>Hi {name},</p>
        
        <p>We found <strong>{len(jobs)}</strong> new job{'' if len(jobs) == 1 else 's'} that match your skills and preferences!</p>
        
        {jobs_html}
        
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p>
                <a href="http://localhost:3000/jobs" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                    Browse All Jobs →
                </a>
            </p>
        </div>
        
        {footer}
    </body>
    </html>
    """
    
    try:
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"🎯 {len(jobs)} New Job{'' if len(jobs) == 1 else 's'} Matching Your Profile",
            "html": html,
        }
        
        result = resend.Emails.send(params)
        print(f"✅ Job digest sent to {to_email}: {result}")
        return result
    except Exception as e:
        print(f"❌ Failed to send job digest to {to_email}: {e}")
        return None