import os
from dotenv import load_dotenv
import asyncio
from sqlalchemy.orm import Session
from .core.db import SessionLocal
from .core import crud, schemas
from .collectors.greenhouse import fetch_greenhouse_org
from .collectors.lever import fetch_lever_org
from .collectors.ashby import fetch_ashby_org
from .collectors.remotive import fetch_remotive_jobs
from .collectors.arbeitnow import fetch_arbeitnow_jobs

load_dotenv()

def get_env_list(key: str) -> list[str]:
    raw = os.getenv(key, "")
    return [x.strip() for x in raw.split(",") if x.strip()]

def _bulk_upsert(db: Session, jobs: list[dict]):
    for jd in jobs:
        payload = schemas.JobCreate(**jd)
        crud.upsert_job(db, payload)

async def ingest_source(orgs: list[str], fetcher, label: str):
    for org in orgs:
        try:
            jobs = await fetcher(org)
            with SessionLocal() as db:
                _bulk_upsert(db, jobs)
            print(f"[{label}] {org}: upserted {len(jobs)} jobs")
        except Exception as e:
            print(f"[WARN] {label} {org}: {e}")

async def ingest_api_source(fetcher, label: str, *args):
    """For APIs that don't need org tokens (like Remotive)"""
    try:
        jobs = await fetcher(*args)
        with SessionLocal() as db:
            _bulk_upsert(db, jobs)
        print(f"[{label}] upserted {len(jobs)} jobs")
    except Exception as e:
        print(f"[WARN] {label}: {e}")

async def run_ingest_once():
    gh_orgs = get_env_list("GH_ORGS")
    lever_orgs = get_env_list("LEVER_ORGS")
    ashby_orgs = get_env_list("ASHBY_ORGS")
    
    # Enable/disable remote job sources
    enable_remotive = os.getenv("ENABLE_REMOTIVE", "true").lower() == "true"
    enable_arbeitnow = os.getenv("ENABLE_ARBEITNOW", "true").lower() == "true"

    tasks = []
    
    # Existing ATS scrapers
    if gh_orgs:    tasks.append(ingest_source(gh_orgs, fetch_greenhouse_org, "Greenhouse"))
    if lever_orgs: tasks.append(ingest_source(lever_orgs, fetch_lever_org, "Lever"))
    if ashby_orgs: tasks.append(ingest_source(ashby_orgs, fetch_ashby_org, "Ashby"))
    
    # NEW: Remote job APIs
    if enable_remotive:
        tasks.append(ingest_api_source(fetch_remotive_jobs, "Remotive", 48))  # Last 48 hours
    
    if enable_arbeitnow:
        tasks.append(ingest_api_source(fetch_arbeitnow_jobs, "Arbeitnow"))

    if tasks:
        await asyncio.gather(*tasks)
    else:
        print("No sources configured.")

if __name__ == "__main__":
    asyncio.run(run_ingest_once())