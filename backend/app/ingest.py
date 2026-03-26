import os
from dotenv import load_dotenv
import asyncio
from sqlalchemy.orm import Session
from .core.db import SessionLocal
from .core import crud, schemas
from .core.location_filter import is_worldwide_remote, clean_location
from .collectors.greenhouse import fetch_greenhouse_org
from .collectors.lever import fetch_lever_org
from .collectors.ashby import fetch_ashby_org
from .collectors.remotive import fetch_remotive_jobs
from .collectors.arbeitnow import fetch_arbeitnow_jobs
from .collectors.remoteok import fetch_remoteok_jobs
from .collectors.landingjobs import fetch_landingjobs
from .collectors.europeremotely import fetch_europeremotely_jobs
from .collectors.remoteafrica import fetch_remoteafrica_jobs

load_dotenv()

def get_env_list(key: str) -> list[str]:
    raw = os.getenv(key, "")
    return [x.strip() for x in raw.split(",") if x.strip()]


def filter_worldwide_jobs(jobs: list[dict]) -> list[dict]:
    """
    Filter jobs to only include worldwide/EMEA remote positions
    Exclude US-only remote jobs
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
            # Count rejected for logging
            rejected_count += 1
            # Uncomment to see what's being filtered
            # print(f"  ❌ Filtered: {job.get('title')} - {location}")
    
    if rejected_count > 0:
        print(f"  🌍 Filtered out {rejected_count} US-only positions")
    
    return filtered


def _bulk_upsert(db: Session, jobs: list[dict]):
    for jd in jobs:
        payload = schemas.JobCreate(**jd)
        crud.upsert_job(db, payload)


async def ingest_source(orgs: list[str], fetcher, label: str):
    """Ingest from company job boards (Greenhouse, Lever, Ashby)"""
    for org in orgs:
        try:
            print(f"🔍 [{label}] {org}: Fetching...")
            jobs = await fetcher(org)
            print(f"📦 [{label}] {org}: Fetched {len(jobs)} jobs")
            
            # FILTER for worldwide remote
            jobs = filter_worldwide_jobs(jobs)
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
    """For APIs that don't need org tokens (Remotive, Arbeitnow, etc.)"""
    try:
        print(f"🔍 [{label}]: Fetching...")
        jobs = await fetcher(*args)
        print(f"📦 [{label}]: Fetched {len(jobs)} jobs")
        
        # FILTER for worldwide remote
        jobs = filter_worldwide_jobs(jobs)
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
        tasks.append(ingest_api_source(fetch_remotive_jobs, "Remotive", 48))
    
    if enable_arbeitnow:
        tasks.append(ingest_api_source(fetch_arbeitnow_jobs, "Arbeitnow"))

    if enable_remoteok:
        tasks.append(ingest_api_source(fetch_remoteok_jobs, "RemoteOK", 72))
    
    if enable_landingjobs:
        tasks.append(ingest_api_source(fetch_landingjobs, "LandingJobs"))
    
    if enable_europeremotely:
        tasks.append(ingest_api_source(fetch_europeremotely_jobs, "EuropeRemotely"))
    
    if enable_remoteafrica:
        tasks.append(ingest_api_source(fetch_remoteafrica_jobs, "RemoteAfrica"))
    
    if tasks:
        await asyncio.gather(*tasks)
        print("\n" + "=" * 70)
        print("✅ WORLDWIDE REMOTE JOB INGESTION COMPLETE")
        print("=" * 70)
    else:
        print("⚠️  No sources configured. Check your .env file.")


if __name__ == "__main__":
    asyncio.run(run_ingest_once())