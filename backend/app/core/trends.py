from sqlalchemy.orm import Session
from sqlalchemy import select, func
from datetime import datetime, timedelta
from collections import Counter
from . import models

def top_skills(db: Session, days: int = 90, top_k: int = 15):
    cutoff = datetime.utcnow() - timedelta(days=days)
    stmt = select(models.Job.skills).where(models.Job.scraped_at >= cutoff)
    rows = db.execute(stmt).all()
    c = Counter()
    for (skills,) in rows:
        if not skills: 
            continue
        c.update([s.strip().lower() for s in skills if isinstance(s, str) and s.strip()])
    return [{"skill": skill, "count": count} for skill, count in c.most_common(top_k)]

def remote_ratio(db: Session, days: int = 90):
    cutoff = datetime.utcnow() - timedelta(days=days)
    total = db.scalar(select(func.count()).select_from(models.Job).where(models.Job.scraped_at >= cutoff)) or 0
    remote = db.scalar(select(func.count()).select_from(models.Job).where(models.Job.scraped_at >= cutoff, models.Job.remote_flag.is_(True))) or 0
    onsite = total - remote
    return {
        "total": total,
        "remote": remote,
        "onsite": onsite,
        "remote_pct": (remote / total * 100.0) if total else 0.0
    }

def company_activity(db: Session, days: int = 90, top_k: int = 15):
    cutoff = datetime.utcnow() - timedelta(days=days)
    stmt = (
        select(models.Job.company, func.count().label("cnt"))
        .where(models.Job.scraped_at >= cutoff)
        .group_by(models.Job.company)
        .order_by(func.count().desc())
        .limit(top_k)
    )
    rows = db.execute(stmt).all()
    return [{"company": c, "count": n} for (c, n) in rows]