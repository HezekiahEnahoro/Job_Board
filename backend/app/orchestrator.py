import os
from dotenv import load_dotenv
import asyncio
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from .core.models import Job
from .core.db import SessionLocal
from .core import crud, schemas
from .core.location_filter import is_worldwide_remote, clean_location
from .ingest.greenhouse import fetch_greenhouse_org
from .ingest.lever import fetch_lever_org
from .ingest.ashby import fetch_ashby_org
from .ingest.remotive import fetch_remotive_jobs
from .ingest.arbeitnow import fetch_arbeitnow_jobs
from .ingest.remoteok import fetch_remoteok_jobs
from .ingest.landingjobs import fetch_landingjobs
from .ingest.europeremotely import fetch_europeremotely_jobs
from .ingest.remoteafrica import fetch_remoteafrica_jobs
from .ingest.himalayas import fetch_himalayas_jobs
from .ingest.storage import BronzeStorage, DeadLetterQueue

load_dotenv()

# Initialize Bronze and DLQ
bronze = BronzeStorage()
dlq = DeadLetterQueue()

def get_env_list(key: str) -> list[str]:
    raw = os.getenv(key, "")
    return [x.strip() for x in raw.split(",") if x.strip()]


def filter_worldwide_jobs(jobs: list[dict], source_name: str) -> list[dict]:
    """
    Filter jobs to only include worldwide/EMEA remote positions
    Exclude US-only remote jobs
    
    Logs rejected jobs to DLQ for analysis
    
    WHY: Before, we just silently dropped US-only jobs
         Now: We can analyze them, track filtering trends
    """
    filtered = []
    rejected_count = 0
    
    for job in jobs:
        location = job.get("location", "")
        description = job.get("description_text", "")
        
        # Clean location first
        location = clean_location(location)
        
        # Check if worldwide remote
        if is_worldwide_remote(location, description):
            filtered.append(job)
        else:
            # Log to DLQ instead of just counting
            dlq.log_failure(
                source=source_name,
                record={
                    "title": job.get("title"),
                    "company": job.get("company"),
                    "location": location,
                    "url": job.get("url")
                },
                error=f"US-only location: {location}",
                error_type="filter"
            )
            rejected_count += 1
    
    if rejected_count > 0:
        print(f"  🌍 Filtered out {rejected_count} US-only positions")
    
    return filtered


def _bulk_upsert(db: Session, jobs: list[dict]):
    from app.core.translate import translate_to_english, is_english
    for jd in jobs:
        payload = schemas.JobCreate(**jd)
        crud.upsert_job(db, payload)


async def ingest_source(orgs: list[str], fetcher, label: str):
    """
    Ingest from company job boards (Greenhouse, Lever, Ashby)
    
    Now saves to Bronze layer before processing
    
    WHY: 
    - Disaster recovery: Can replay if database fails
    - Audit trail: Know exactly what API returned
    - Data engineering best practice: Immutable raw data
    """
    for org in orgs:
        try:
            print(f"🔍 [{label}] {org}: Fetching...")
            
            # Fetch from API
            jobs = await fetcher(org)
            print(f"📦 [{label}] {org}: Fetched {len(jobs)} jobs")
            
            # ⭐ NEW: Save to Bronze FIRST (before any processing)
            source_name = f"{label.lower()}_{org}"
            bronze.save_raw_response(
                source_name=source_name,
                data=jobs,
                metadata={
                    "org": org,
                    "source_type": label,
                    "total_fetched": len(jobs)
                }
            )
            
            # THEN filter for worldwide remote
            jobs = filter_worldwide_jobs(jobs, source_name)
            print(f"✅ [{label}] {org}: {len(jobs)} worldwide remote jobs")
            
            if jobs:
                with SessionLocal() as db:
                    _bulk_upsert(db, jobs)
                    db.commit()
                print(f"💾 [{label}] {org}: Upserted {len(jobs)} jobs")
            else:
                print(f"⚠️  [{label}] {org}: No worldwide remote jobs found")
                
        except Exception as e:
            print(f"❌ [{label}] {org}: {e}")


async def ingest_api_source(fetcher, label: str, *args):
    """
    For APIs that don't need org tokens (Remotive, Arbeitnow, etc.)
    
    ⭐ ENHANCED: Now saves to Bronze layer
    """
    try:
        print(f"🔍 [{label}]: Fetching...")
        
        # Fetch from API
        jobs = await fetcher(*args)
        print(f"📦 [{label}]: Fetched {len(jobs)} jobs")
        
        # ⭐ NEW: Save to Bronze FIRST
        source_name = label.lower().replace(" ", "_")
        bronze.save_raw_response(
            source_name=source_name,
            data=jobs,
            metadata={
                "source_type": label,
                "total_fetched": len(jobs)
            }
        )
        
        # THEN filter for worldwide remote
        jobs = filter_worldwide_jobs(jobs, source_name)
        print(f"✅ [{label}]: {len(jobs)} worldwide remote jobs")
        
        if jobs:
            with SessionLocal() as db:
                _bulk_upsert(db, jobs)
                db.commit()
            print(f"💾 [{label}]: Upserted {len(jobs)} jobs")
        else:
            print(f"⚠️  [{label}]: No worldwide remote jobs found")
            
    except Exception as e:
        print(f"❌ [{label}]: {e}")


async def run_ingest_once():
    """Run job ingestion from all enabled sources"""
    
    print("=" * 70)
    print("🚀 STARTING WORLDWIDE REMOTE JOB INGESTION")
    print("=" * 70)
    
    gh_orgs = get_env_list("GH_ORGS")
    lever_orgs = get_env_list("LEVER_ORGS")
    ashby_orgs = get_env_list("ASHBY_ORGS")
    
    # Enable/disable remote job sources
    enable_remotive = os.getenv("ENABLE_REMOTIVE", "true").lower() == "true"
    enable_arbeitnow = os.getenv("ENABLE_ARBEITNOW", "true").lower() == "true"
    enable_remoteok = os.getenv("ENABLE_REMOTEOK", "true").lower() == "true"
    enable_landingjobs = os.getenv("ENABLE_LANDINGJOBS", "true").lower() == "true"
    enable_europeremotely = os.getenv("ENABLE_EUROPEREMOTELY", "true").lower() == "true"
    enable_remoteafrica = os.getenv("ENABLE_REMOTEAFRICA", "true").lower() == "true"
    enable_himalayas = os.getenv("ENABLE_HIMALAYAS", "true").lower() == "true"

    tasks = []
    
    # Company ATS scrapers
    if gh_orgs:
        tasks.append(ingest_source(gh_orgs, fetch_greenhouse_org, "Greenhouse"))
    if lever_orgs:
        tasks.append(ingest_source(lever_orgs, fetch_lever_org, "Lever"))
    if ashby_orgs:
        tasks.append(ingest_source(ashby_orgs, fetch_ashby_org, "Ashby"))
    
    # Remote job board APIs
    if enable_remotive:
        tasks.append(ingest_api_source(fetch_remotive_jobs, "Remotive", 168))
    
    if enable_arbeitnow:
        tasks.append(ingest_api_source(fetch_arbeitnow_jobs, "Arbeitnow"))

    if enable_remoteok:
        tasks.append(ingest_api_source(fetch_remoteok_jobs, "RemoteOK", 168))
    
    if enable_landingjobs:
        tasks.append(ingest_api_source(fetch_landingjobs, "LandingJobs"))
    
    if enable_europeremotely:
        tasks.append(ingest_api_source(fetch_europeremotely_jobs, "EuropeRemotely"))
    
    if enable_remoteafrica:
        tasks.append(ingest_api_source(fetch_remoteafrica_jobs, "RemoteAfrica"))

    if enable_himalayas:
        tasks.append(ingest_api_source(fetch_himalayas_jobs, "Himalayas"))
    
    if tasks:
        await asyncio.gather(*tasks)
        
        # ⭐ NEW: Show DLQ stats at end
        print("\n" + "=" * 70)
        print("✅ WORLDWIDE REMOTE JOB INGESTION COMPLETE")
        print("=" * 70)
        
        # Show data quality stats
        dlq_stats = dlq.get_failure_stats(days=1)
        if dlq_stats:
            print(f"\n📊 Data Quality (Last 24 hours):")
            for error_type, count in dlq_stats.items():
                print(f"  - {error_type}: {count} records")
    else:
        print("⚠️  No sources configured. Check your .env file.")


if __name__ == "__main__":
    asyncio.run(run_ingest_once())