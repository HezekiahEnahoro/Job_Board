import httpx
from typing import List, Dict
from app.core.skills import extract_skills
import re

API = "https://landing.jobs/api/v1/jobs"

def clean_job_title(title: str) -> str:
    if not title:
        return title
    title = re.sub(r'\s*\([mwfd/]+\)\s*', ' ', title, flags=re.IGNORECASE)
    return ' '.join(title.split()).strip()

async def fetch_landingjobs() -> List[Dict]:
    """
    Fetch jobs from Landing.Jobs (Europe-focused)
    Strong presence: Portugal, Spain, Germany, UK
    """
    
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(API, params={
            "remote": "true",
            "page": 1,
            "per_page": 100
        })
        r.raise_for_status()
        data = r.json()

    jobs = data.get("jobs", [])
    
    out: List[Dict] = []
    for j in jobs:
        title = clean_job_title(j.get("title", ""))
        company = j.get("company_name", "")
        location = j.get("location", {}).get("name", "Europe")
        desc = j.get("description", "")
        
        if not title:
            continue
        
        out.append({
            "title": title,
            "company": company,
            "location": location,
            "remote_flag": True,
            "skills": extract_skills(title, desc),
            "description_text": desc[:10000],
            "apply_url": j.get("url", ""),
            "canonical_url": j.get("url", ""),
            "posted_at": j.get("created_at"),
            "salary_min": None,
            "salary_max": None,
            "currency": None,
        })
    
    return out