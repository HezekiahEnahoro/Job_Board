import httpx, asyncio
from typing import List, Dict
from app.core.skills import extract_skills
from .detail import fetch_job_text

API = "https://api.ashbyhq.com/posting-api/job-board/{name}"

async def fetch_ashby_org(org: str) -> List[Dict]:
    url = API.format(name=org)
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, params={"includeCompensation": "true"})
        if r.status_code == 404:
            raise RuntimeError(f"Ashby board not found for '{org}'")
        r.raise_for_status()
        data = r.json()

    jobs = data.get("jobs", [])
    # many Ashby board payloads lack full desc → fetch jobUrl if present
    detail_tasks = []
    for j in jobs:
        job_url = j.get("jobUrl") or j.get("applyUrl")
        detail_tasks.append(fetch_job_text(job_url))

    details = await asyncio.gather(*detail_tasks, return_exceptions=True)

    out: List[Dict] = []
    for j, detail in zip(jobs, details):
        title = j.get("title")
        loc = j.get("location")
        desc = (j.get("descriptionPlain") or "").strip()
        if desc == "" and isinstance(detail, str) and detail:
            desc = detail
        apply_url = j.get("applyUrl") or j.get("jobUrl")
        out.append({
            "title": title,
            "company": org,
            "location": loc,
            "remote_flag": bool(j.get("isRemote")),
            "skills": extract_skills(title, desc, loc),
            "description_text": desc,
            "apply_url": apply_url,
            "canonical_url": apply_url,
            "posted_at": j.get("publishedAt"),
            "salary_min": None, "salary_max": None, "currency": None,
        })
    return out
