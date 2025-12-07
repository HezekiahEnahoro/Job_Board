from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User, Application
from app.core.models import Job
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/applications", tags=["applications"])

class ApplicationCreate(BaseModel):
    job_id: int
    status: str = "saved"
    notes: str | None = None

class ApplicationUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None
    applied_at: datetime | None = None

class JobBasic(BaseModel):
    id: int
    title: str
    company: str
    location: str | None
    apply_url: str | None
    
    class Config:
        from_attributes = True

class ApplicationOut(BaseModel):
    id: int
    job_id: int
    status: str
    notes: str | None
    applied_at: datetime | None
    created_at: datetime
    updated_at: datetime
    job: JobBasic
    
    class Config:
        from_attributes = True

@router.post("/", response_model=ApplicationOut, status_code=201)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Track a new job application"""
    # Check if already tracking
    existing = db.scalar(
        select(Application).where(
            Application.user_id == current_user.id,
            Application.job_id == payload.job_id
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already tracking this job")
    
    # Verify job exists
    job = db.scalar(select(Job).where(Job.id == payload.job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Create application
    app = Application(
        user_id=current_user.id,
        job_id=payload.job_id,
        status=payload.status,
        notes=payload.notes,
        applied_at=datetime.utcnow() if payload.status == "applied" else None
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    
    return ApplicationOut(
        id=app.id,
        job_id=app.job_id,
        status=app.status,
        notes=app.notes,
        applied_at=app.applied_at,
        created_at=app.created_at,
        updated_at=app.updated_at,
        job=JobBasic(
            id=job.id,
            title=job.title,
            company=job.company,
            location=job.location,
            apply_url=job.apply_url
        )
    )

@router.get("/", response_model=list[ApplicationOut])
def list_applications(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tracked applications for current user"""
    stmt = select(Application).where(Application.user_id == current_user.id)
    if status:
        stmt = stmt.where(Application.status == status)
    stmt = stmt.order_by(Application.updated_at.desc())
    
    apps = db.scalars(stmt).all()
    
    result = []
    for app in apps:
        job = db.scalar(select(Job).where(Job.id == app.job_id))
        if job:
            result.append(ApplicationOut(
                id=app.id,
                job_id=app.job_id,
                status=app.status,
                notes=app.notes,
                applied_at=app.applied_at,
                created_at=app.created_at,
                updated_at=app.updated_at,
                job=JobBasic(
                    id=job.id,
                    title=job.title,
                    company=job.company,
                    location=job.location,
                    apply_url=job.apply_url
                )
            ))
    
    return result

@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(
    app_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an application status/notes"""
    app = db.scalar(
        select(Application).where(
            Application.id == app_id,
            Application.user_id == current_user.id
        )
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Update fields
    if payload.status:
        app.status = payload.status
        # Auto-set applied_at when status changes to "applied"
        if payload.status == "applied" and not app.applied_at:
            app.applied_at = datetime.utcnow()
    
    if payload.notes is not None:
        app.notes = payload.notes
    
    if payload.applied_at:
        app.applied_at = payload.applied_at
    
    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)
    
    # Get job details
    job = db.scalar(select(Job).where(Job.id == app.job_id))
    
    return ApplicationOut(
        id=app.id,
        job_id=app.job_id,
        status=app.status,
        notes=app.notes,
        applied_at=app.applied_at,
        created_at=app.created_at,
        updated_at=app.updated_at,
        job=JobBasic(
            id=job.id,
            title=job.title,
            company=job.company,
            location=job.location,
            apply_url=job.apply_url
        )
    )

@router.delete("/{app_id}")
def delete_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove an application from tracking"""
    app = db.scalar(
        select(Application).where(
            Application.id == app_id,
            Application.user_id == current_user.id
        )
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    db.delete(app)
    db.commit()
    return {"ok": True}

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get application statistics for current user"""
    total = db.scalar(
        select(func.count()).select_from(Application).where(
            Application.user_id == current_user.id
        )
    ) or 0
    
    by_status = db.execute(
        select(Application.status, func.count()).where(
            Application.user_id == current_user.id
        ).group_by(Application.status)
    ).all()
    
    return {
        "total": total,
        "by_status": {status: count for status, count in by_status}
    }