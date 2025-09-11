# app/main.py
from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import os, asyncio
from sqlalchemy import select, func

from app.core import models
from app.core.db import init_db, get_db
from app.core import crud, schemas
from app.core import trends as trends_svc
from app.ingest import run_ingest_once

# app = FastAPI(title="JobBoard API", version="0.4.1")
app = FastAPI(title="JobBoard API", version="0.5.1")
scheduler: AsyncIOScheduler | None = None

# CORS — allow Next.js dev origins
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOW_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    init_db()

    # kick off one ingestion ASAP on the running event loop
    asyncio.create_task(run_ingest_once())

    # schedule recurring ingestions (every 12 hours)
    global scheduler
    scheduler = AsyncIOScheduler()
    # With AsyncIOScheduler you can schedule coroutine functions directly:
    scheduler.add_job(run_ingest_once, trigger="interval", hours=12)
    scheduler.start()

@app.on_event("shutdown")
def on_shutdown():
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/jobs", response_model=schemas.JobOut)
def create_job(payload: schemas.JobCreate, db: Session = Depends(get_db)):
    return crud.upsert_job(db, payload)

@app.get("/jobs", response_model=list[schemas.JobOut])
def list_jobs(
    q: str | None = Query(None, description="keyword search across title/company/description"),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    return crud.list_jobs(db, q=q, days=days, limit=limit, offset=offset)

@app.get("/trends/skills")
def trends_skills(days: int = Query(90, ge=7, le=365), top_k: int = Query(15, ge=1, le=50), db: Session = Depends(get_db)):
    return trends_svc.top_skills(db, days=days, top_k=top_k)

@app.get("/trends/remote_ratio")
def trends_remote_ratio(days: int = Query(90, ge=7, le=365), db: Session = Depends(get_db)):
    return trends_svc.remote_ratio(db, days=days)

@app.get("/jobs/page", response_model=schemas.JobsPage)
def list_jobs_page(
    q: str | None = Query(None, description="keyword search"),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    skill: str | None = Query(None, description="filter by a skill keyword"),
    location: str | None = Query(None, description="substring match, e.g. 'london' or 'remote'"),
    remote: bool | None = Query(None, description="true/false"),
    db: Session = Depends(get_db)
):
    return crud.list_jobs_paginated(db, q=q, days=days, limit=limit, offset=offset, skill=skill, location=location, remote=remote)

@app.get("/trends/company_activity")
def trends_company_activity(
    days: int = Query(90, ge=7, le=365),
    top_k: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return trends_svc.company_activity(db, days=days, top_k=top_k)

@app.get("/admin/status")
def admin_status(db: Session = Depends(get_db)):
    gh = [x.strip() for x in os.getenv("GH_ORGS", "").split(",") if x.strip()]
    lever = [x.strip() for x in os.getenv("LEVER_ORGS", "").split(",") if x.strip()]
    ashby = [x.strip() for x in os.getenv("ASHBY_ORGS", "").split(",") if x.strip()]

    total = db.scalar(select(func.count()).select_from(models.Job)) or 0

    # Python-side cutoff for portability
    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    recent_7d = db.scalar(
        select(func.count()).select_from(models.Job).where(models.Job.scraped_at >= cutoff)
    ) or 0

    return {
        "sources": {"greenhouse": gh, "lever": lever, "ashby": ashby},
        "counts": {"total": total, "last_7d": recent_7d}
    }