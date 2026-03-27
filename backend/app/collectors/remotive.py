import httpx
import re
from typing import List, Dict
from datetime import datetime, timedelta, timezone
from app.core.skills import extract_skills

API = "https://remotive.com/api/remote-jobs"

def clean_job_title(title: str) -> str:
    """Clean up job titles"""
    if not title:
        return title
    
    # Remove gender markers
    title = re.sub(r'\s*\([mwfd/]+\)\s*', ' ', title, flags=re.IGNORECASE)
    
    # Remove reference numbers
    title = re.sub(r'\s*\(Ref\.?\s*Nr\.?:?\s*\d+\)\s*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*\(ID:?\s*\d+\)\s*', '', title, flags=re.IGNORECASE)
    
    # Remove extra whitespace
    title = ' '.join(title.split())
    
    return title.strip()

async def fetch_remotive_jobs(hours: int = 48) -> List[Dict]:
    """
    Fetch remote jobs from Remotive API
    Focus: Global remote jobs (strong EMEA presence)
    """
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(API)
        r.raise_for_status()
        data = r.json()

    jobs = data.get("jobs", [])
    
    # FIX: Use timezone-aware datetime
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    out: List[Dict] = []
    for j in jobs:
        # Parse publication date
        pub_date_str = j.get("publication_date", "")
        try:
            # Handle both formats
            if pub_date_str.endswith("Z"):
                pub_date = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00"))
            else:
                pub_date = datetime.fromisoformat(pub_date_str)
        except:
            # If parsing fails, include the job anyway
            pub_date = datetime.now(timezone.utc)
        
        # Make pub_date timezone-aware if it isn't
        if pub_date.tzinfo is None:
            pub_date = pub_date.replace(tzinfo=timezone.utc)
        
        # Skip old jobs
        if pub_date < cutoff:
            continue
        
        raw_title = j.get("title", "")
        clean_title = clean_job_title(raw_title)
        
        company = j.get("company_name", "")
        location = j.get("candidate_required_location", "Worldwide")
        desc = j.get("description", "")
        
        # Skip if title becomes empty after cleaning
        if not clean_title:
            continue
        
        out.append({
            "title": clean_title,
            "company": company,
            "location": location,
            "remote_flag": True,
            "skills": extract_skills(clean_title, desc, location),
            "description_text": desc[:10000],
            "apply_url": j.get("url", ""),
            "canonical_url": j.get("url", ""),
            "posted_at": pub_date,  # Use datetime object, not string
            "salary_min": None,
            "salary_max": None,
            "currency": None,
        })
    
    return out