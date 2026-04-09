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
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        try:
            r = await client.get(url)
            r.raise_for_status()
        except:
            # If scraping fails, return empty
            return []
    
    soup = BeautifulSoup(r.text, "lxml")
    jobs = []
    
    # Try multiple selectors
    job_selectors = [
        ".job-card",
        ".job-item",
        "article",
        "[class*='job']"
    ]
    
    job_cards = []
    for selector in job_selectors:
        job_cards = soup.select(selector)
        if job_cards:
            break
    
    for job_card in job_cards:
        title_elem = job_card.select_one(".job-title") or job_card.select_one("h2") or job_card.select_one("h3")
        company_elem = job_card.select_one(".company") or job_card.select_one(".company-name")
        link_elem = job_card.select_one("a")
        
        if title_elem and link_elem:
            company_name = company_elem.text.strip() if company_elem else "Unknown"
            
            jobs.append({
                "title": title_elem.text.strip(),
                "company": company_name,
                "location": "Remote - Africa",
                "remote_flag": True,
                "skills": extract_skills(title_elem.text.strip()),
                "description_text": "",
                "apply_url": link_elem.get("href", ""),
                "canonical_url": link_elem.get("href", ""),
                "posted_at": None,
                "salary_min": None,
                "salary_max": None,
                "currency": "USD",
            })
    
    return jobs[:50]