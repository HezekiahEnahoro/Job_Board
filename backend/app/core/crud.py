from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, exists
from datetime import datetime, timedelta
from . import models, schemas
from sqlalchemy import cast, String, any_
from sqlalchemy.dialects.postgresql import ARRAY

def _find_existing(db: Session, title: str, company: str, canonical_url: str | None):
    if not canonical_url:
        return None
    stmt = select(models.Job).where(
        and_(
            func.lower(models.Job.title) == func.lower(title),
            func.lower(models.Job.company) == func.lower(company),
            func.lower(models.Job.canonical_url) == func.lower(canonical_url),
        )
    )
    return db.execute(stmt).scalar_one_or_none()

def upsert_job(db: Session, payload: schemas.JobCreate) -> models.Job:
    existing = _find_existing(db, payload.title, payload.company, payload.canonical_url or "")
    if existing:
        # update lightweight fields
        existing.last_seen_at = datetime.utcnow()
        if payload.salary_min is not None: existing.salary_min = payload.salary_min
        if payload.salary_max is not None: existing.salary_max = payload.salary_max
        if payload.currency is not None:   existing.currency = payload.currency
        if payload.skills:                 existing.skills = payload.skills
        if payload.location is not None:  existing.location = payload.location
        if payload.remote_flag is not None: existing.remote_flag = payload.remote_flag
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    obj = models.Job(
        **payload.model_dump(),
        scraped_at=datetime.utcnow(),
        last_seen_at=datetime.utcnow(),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_jobs(
    db: Session,
    q: str | None = None,
    days: int = 30,
    limit: int = 100,
    offset: int = 0
) -> list[models.Job]:
    stmt = select(models.Job)
    if days:
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = stmt.where(models.Job.scraped_at >= cutoff)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(models.Job.title).like(like) |
            func.lower(models.Job.company).like(like) |
            func.lower(models.Job.description_text).like(like)
        )
    stmt = stmt.order_by(models.Job.posted_at.desc().nullslast(), models.Job.scraped_at.desc())
    stmt = stmt.limit(limit).offset(offset)
    return db.execute(stmt).scalars().all()

def list_jobs_paginated(
    db: Session,
    q: str | None = None,
    days: int = 30,
    limit: int = 50,
    offset: int = 0,
    skill: str | None = None,
    location: str | None = None,
    remote: bool | None = None,
):
    stmt = select(models.Job)
    
    # Apply filters
    if days:
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = stmt.where(models.Job.scraped_at >= cutoff)
    
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(models.Job.title).like(like) |
            func.lower(models.Job.company).like(like) |
            func.lower(models.Job.description_text).like(like)
        )
    
    if skill:
        # Check if the skill exists in the skills array (case-insensitive)
        skill_lower = skill.strip().lower()
        # Use PostgreSQL's array functions
        stmt = stmt.where(
            func.exists(
                select(1).where(
                    func.lower(func.unnest(models.Job.skills)) == skill_lower
                )
            )
        )
    
    if location:
        stmt = stmt.where(func.lower(models.Job.location).like(f"%{location.lower()}%"))
    
    if remote is not None:
        stmt = stmt.where(models.Job.remote_flag.is_(remote))

    # Get total count
    total = db.scalar(
        select(func.count()).select_from(stmt.subquery())
    ) or 0

    # Get page of results
    page_stmt = (
        stmt.order_by(models.Job.posted_at.desc().nullslast(), models.Job.scraped_at.desc())
            .limit(limit)
            .offset(offset)
    )
    rows = db.execute(page_stmt).scalars().all()
    
    # Calculate next offset
    next_offset = offset + limit if offset + limit < total else None
    
    return {
        "total": total,
        "count": len(rows),
        "next": next_offset,
        "items": rows
    }