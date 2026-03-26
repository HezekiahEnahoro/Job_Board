import httpx
import re
from typing import List, Dict
from datetime import datetime, timedelta
from app.core.skills import extract_skills

API = "https://remoteok.com/api"

def clean_job_title(title: str) -> str:
    if not title:
        return title
    title = re.sub(r'\s*\([mwfd/]+\)\s*', ' ', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*\(Ref\.?\s*Nr\.?:?\s*\d+\)\s*', '', title, flags=re.IGNORECASE)
    return ' '.join(title.split()).strip()

async def fetch_remoteok_jobs(hours: int = 72) -> List[Dict]:
    """
    Fetch from Remote OK
    Filter: Recent jobs only
    """
    
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(API)
        r.raise_for_status()
        data = r.json()

    jobs = data[1:] if len(data) > 1 else []
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    out: List[Dict] = []
    for j in jobs:
        epoch = j.get("epoch")
        if epoch:
            posted_date = datetime.fromtimestamp(epoch)
            if posted_date < cutoff:
                continue
        else:
            posted_date = datetime.utcnow()
        
        raw_title = j.get("position", "")
        clean_title = clean_job_title(raw_title)
        
        if not clean_title:
            continue
        
        out.append({
            "title": clean_title,
            "company": j.get("company", ""),
            "location": j.get("location", "Worldwide"),
            "remote_flag": True,
            "skills": extract_skills(clean_title, j.get("description", "")),
            "description_text": j.get("description", "")[:10000],
            "apply_url": j.get("url", ""),
            "canonical_url": j.get("url", ""),
            "posted_at": posted_date.isoformat(),
            "salary_min": j.get("salary_min"),
            "salary_max": j.get("salary_max"),
            "currency": None,
        })
    
    return out