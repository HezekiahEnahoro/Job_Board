import httpx
from typing import List, Dict
from app.core.skills import extract_skills
from bs4 import BeautifulSoup

async def fetch_europeremotely_jobs() -> List[Dict]:
    """
    Scrape EuropeRemotely
    Focus: European remote jobs
    """
    
    url = "https://europeremotely.com/jobs/"
    
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url)
        r.raise_for_status()
    
    soup = BeautifulSoup(r.text, "lxml")
    jobs = []
    
    for job_elem in soup.select(".job-listing"):
        title_elem = job_elem.select_one(".job-title")
        company_elem = job_elem.select_one(".company-name")
        link_elem = job_elem.select_one("a")
        
        if title_elem and company_elem and link_elem:
            jobs.append({
                "title": title_elem.text.strip(),
                "company": company_elem.text.strip(),
                "location": "Europe Remote",
                "remote_flag": True,
                "skills": extract_skills(title_elem.text),
                "description_text": "",
                "apply_url": link_elem.get("href", ""),
                "canonical_url": link_elem.get("href", ""),
                "posted_at": None,
                "salary_min": None,
                "salary_max": None,
                "currency": "EUR",
            })
    
    return jobs[:50]  # Limit to recent