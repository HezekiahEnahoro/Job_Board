import httpx
import re
from typing import List, Dict
from app.core.skills import extract_skills

API = "https://www.arbeitnow.com/api/job-board-api"

def clean_job_title(title: str) -> str:
    """Clean up German job titles"""
    if not title:
        return title
    
    # Remove gender markers like (m/w/d), (m/f/d), (w/m/d)
    title = re.sub(r'\s*\([mwfd/]+\)\s*', ' ', title, flags=re.IGNORECASE)
    
    # Remove reference numbers like (Ref.Nr.: 12345) or (ID: 12345)
    title = re.sub(r'\s*\(Ref\.?\s*Nr\.?:?\s*\d+\)\s*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*\(ID:?\s*\d+\)\s*', '', title, flags=re.IGNORECASE)
    
    # Remove extra whitespace
    title = ' '.join(title.split())
    
    return title.strip()

async def fetch_arbeitnow_jobs() -> List[Dict]:
    """
    Fetch jobs from Arbeitnow API
    Focus: Europe + Remote jobs
    """
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(API)
        r.raise_for_status()
        data = r.json()

    jobs = data.get("data", [])
    
    out: List[Dict] = []
    for j in jobs:
        # Only include remote jobs
        if not j.get("remote", False):
            continue
        
        raw_title = j.get("title", "")
        clean_title = clean_job_title(raw_title)
        
        company = j.get("company_name", "")
        location = j.get("location", "Europe")
        desc = j.get("description", "")
        
        # Skip if title becomes empty after cleaning
        if not clean_title:
            continue
        
        out.append({
            "title": clean_title,
            "company": company,
            "location": location,
            "remote_flag": True,
            "skills": extract_skills(clean_title, desc),
            "description_text": desc[:10000],
            "apply_url": j.get("url", ""),
            "canonical_url": j.get("url", ""),
            "posted_at": j.get("created_at"),
            "salary_min": None,
            "salary_max": None,
            "currency": None,
        })
    
    return out