# app/main.py
from fastapi import FastAPI, Depends, Query, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import os, asyncio, logging
from sqlalchemy import select, func
from contextlib import asynccontextmanager

from app.core import models
from app.core.db import init_db, get_db, ensure_indexes, engine
from app.core import crud, schemas
from app.core import trends as trends_svc
from app.orchestrator import run_ingest_once
from app.services.auth.router import router as auth_router
from app.services.applications.router import router as applications_router
from app.services.email.router import router as email_router
from app.services.ai.router import router as ai_router
from app.services.paystack.router import router as paystack_router
from app.services.stripe.router import router as stripe_router
from app.services.profile.router import router as profile_router
from app.services.matching.router import router as matching_router
from app.services.resume_generator.router import router as resume_generator_router
from app.services.cover_letter.router import router as cover_letter_router
from app.services.onboarding.router import router as onboarding_router
from app.services.interview_prep.router import router as interview_prep_router
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

logger = logging.getLogger(__name__)

scheduler: AsyncIOScheduler | None = None


async def _deferred_ingest(delay_seconds: int = 15):
    """
    FIX: Don't run ingest immediately on startup.
    Waiting 15s lets the app fully initialize before bulk inserts.
    """
    await asyncio.sleep(delay_seconds)
    logger.info("🔄 Starting deferred ingest...")
    await run_ingest_once()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────
    logger.info("🚀 Starting MyJobPhase API...")
    init_db()

    with engine.connect() as conn:
        ensure_indexes(conn)
        logger.info("📊 Database indexes ready")

    asyncio.create_task(_deferred_ingest(delay_seconds=15))

    global scheduler
    scheduler = AsyncIOScheduler()

    # ── Ingest: every 12 hours ────────────────────────────────────────
    scheduler.add_job(run_ingest_once, trigger="interval", hours=12)

    # ── Score jobs for active users: every 6 hours ────────────────────
    # Runs as a sync function in APScheduler's thread pool.
    # Starts 1 hour after startup so ingest has time to complete first.
    # time.sleep(1.0) inside the job keeps Groq calls under TPM limits.
    # max_instances=1 ensures it never runs twice simultaneously.
    from app.services.matching.scorer_job import run_scoring_job
    from datetime import datetime, timedelta

    scheduler.add_job(
        run_scoring_job,
        trigger="interval",
        hours=6,
        next_run_time=datetime.now() + timedelta(hours=1),
        id="score_users",
        max_instances=1,
        misfire_grace_time=3600,
    )

    # ── Follow-up reminders: daily at 9 AM ───────────────────────────
    from app.services.email.tasks import check_followup_reminders
    from app.core.db import SessionLocal

    def run_followup_check():
        db = SessionLocal()
        try:
            check_followup_reminders(db)
        finally:
            db.close()

    scheduler.add_job(run_followup_check, "cron", hour=9, minute=0)

    # ── Weekly digest: Sundays at 10 AM ──────────────────────────────
    from app.services.email.tasks import send_weekly_digests

    def run_weekly_digest():
        db = SessionLocal()
        try:
            send_weekly_digests(db)
        finally:
            db.close()

    scheduler.add_job(run_weekly_digest, "cron", day_of_week="sun", hour=10, minute=0)

    scheduler.start()
    logger.info("✅ Scheduler started — ingest:12h | scoring:6h | followup:9am | digest:Sunday")

    yield

    # ── Shutdown ─────────────────────────────────────────────────────
    logger.info("🛑 Shutting down...")
    if scheduler:
        scheduler.shutdown(wait=False)


# ── Rate limiter ──────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/hour"])

# ── App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="MyJobPhase API",
    description="AI-powered job search platform API",
    version="1.0.0",
    lifespan=lifespan,
)

ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "http://localhost:3000").split(",")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SlowAPIMiddleware)

# ── Routers ───────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(applications_router)
app.include_router(email_router)
app.include_router(ai_router)
app.include_router(stripe_router)
app.include_router(profile_router)
app.include_router(matching_router)
app.include_router(resume_generator_router)
app.include_router(cover_letter_router)
app.include_router(onboarding_router)
app.include_router(interview_prep_router)
app.include_router(paystack_router)


# ── Core endpoints ────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "MyJobPhase API is running"}


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
    db: Session = Depends(get_db),
):
    return crud.list_jobs(db, q=q, days=days, limit=limit, offset=offset)


@app.get("/jobs/page", response_model=schemas.JobsPage)
def list_jobs_page(
    q: str | None = Query(None, description="keyword search"),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    skill: str | None = Query(None, description="filter by a skill keyword"),
    location: str | None = Query(None, description="substring match, e.g. 'london' or 'remote'"),
    remote: bool | None = Query(None, description="true/false"),
    db: Session = Depends(get_db),
):
    return crud.list_jobs_paginated(
        db, q=q, days=days, limit=limit, offset=offset,
        skill=skill, location=location, remote=remote,
    )


@app.get("/trends/skills")
def trends_skills(
    days: int = Query(90, ge=7, le=365),
    top_k: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return trends_svc.top_skills(db, days=days, top_k=top_k)


@app.get("/trends/remote_ratio")
def trends_remote_ratio(days: int = Query(90, ge=7, le=365), db: Session = Depends(get_db)):
    return trends_svc.remote_ratio(db, days=days)


@app.get("/trends/company_activity")
def trends_company_activity(
    days: int = Query(90, ge=7, le=365),
    top_k: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return trends_svc.company_activity(db, days=days, top_k=top_k)


@app.get("/admin/status")
def admin_status(db: Session = Depends(get_db)):
    gh = [x.strip() for x in os.getenv("GH_ORGS", "").split(",") if x.strip()]
    lever = [x.strip() for x in os.getenv("LEVER_ORGS", "").split(",") if x.strip()]
    ashby = [x.strip() for x in os.getenv("ASHBY_ORGS", "").split(",") if x.strip()]

    total = db.scalar(select(func.count()).select_from(models.Job)) or 0

    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    recent_7d = db.scalar(
        select(func.count()).select_from(models.Job).where(models.Job.scraped_at >= cutoff)
    ) or 0

    return {
        "sources": {"greenhouse": gh, "lever": lever, "ashby": ashby},
        "counts": {"total": total, "last_7d": recent_7d},
    }