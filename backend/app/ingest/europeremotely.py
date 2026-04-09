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
    
    # FIX: Add User-Agent and longer timeout
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    async with httpx.AsyncClient(timeout=60, headers=headers, follow_redirects=True) as client:
        try:
            r = await client.get(url)
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            # Site might be blocking scrapers
            print(f"EuropeRemotely returned status {e.response.status_code}")
            return []
    
    soup = BeautifulSoup(r.text, "lxml")
    jobs = []
    
    # FIX: Try multiple selectors (site structure may vary)
    job_selectors = [
        ".job-listing",
        ".job-item",
        "article.job",
        "[data-job]"
    ]
    
    job_elements = []
    for selector in job_selectors:
        job_elements = soup.select(selector)
        if job_elements:
            break
    
    for job_elem in job_elements:
        title_elem = job_elem.select_one(".job-title") or job_elem.select_one("h2") or job_elem.select_one("h3")
        company_elem = job_elem.select_one(".company-name") or job_elem.select_one(".company")
        link_elem = job_elem.select_one("a")
        
        if title_elem and link_elem:
            company_name = company_elem.text.strip() if company_elem else "Unknown"
            
            jobs.append({
                "title": title_elem.text.strip(),
                "company": company_name,
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