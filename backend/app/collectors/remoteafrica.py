import httpx
from typing import List, Dict
from bs4 import BeautifulSoup
from app.core.skills import extract_skills

async def fetch_remoteafrica_jobs() -> List[Dict]:
    """
    Scrape Remote Africa job board
    Focus: African remote workers
    """
    
    url = "https://remoteafrica.io/jobs"
    
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url)
        r.raise_for_status()
    
    soup = BeautifulSoup(r.text, "lxml")
    jobs = []
    
    # Adjust selectors based on actual site structure
    for job_card in soup.select(".job-card"):
        title = job_card.select_one(".job-title")
        company = job_card.select_one(".company")
        link = job_card.select_one("a")
        
        if title and company and link:
            jobs.append({
                "title": title.text.strip(),
                "company": company.text.strip(),
                "location": "Remote - Africa",
                "remote_flag": True,
                "skills": extract_skills(title.text),
                "description_text": "",
                "apply_url": link.get("href", ""),
                "canonical_url": link.get("href", ""),
                "posted_at": None,
                "salary_min": None,
                "salary_max": None,
                "currency": "USD",
            })
    
    return jobs