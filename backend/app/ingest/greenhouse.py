import httpx, asyncio
from typing import List, Dict
from app.core.skills import extract_skills
from .detail import fetch_job_text

API = "https://boards-api.greenhouse.io/v1/boards/{token}/jobs"

async def fetch_greenhouse_org(token: str) -> List[Dict]:
    url = API.format(token=token)
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, params={"content": "true"})
        if r.status_code == 404:
            raise RuntimeError(f"Greenhouse board not found for '{token}'")
        r.raise_for_status()
        data = r.json()

    out: List[Dict] = []
    jobs = data.get("jobs", [])
    # pre-collect tasks for details (only when content missing/short)
    detail_tasks = []
    for j in jobs:
        apply_url = j.get("absolute_url")
        desc = (j.get("content") or "").strip()
        need_detail = len(desc) < 200  # tweak threshold as you wish
        detail_tasks.append(fetch_job_text(apply_url) if need_detail else asyncio.sleep(0, result=None))

    details = await asyncio.gather(*detail_tasks, return_exceptions=True)

    for j, detail in zip(jobs, details):
        title = j.get("title")
        loc = (j.get("location") or {}).get("name")
        desc = (j.get("content") or "").strip()
        if desc == "" and isinstance(detail, str) and detail:
            desc = detail
        apply_url = j.get("absolute_url")
        out.append({
            "title": title,
            "company": token,
            "location": loc,
            "remote_flag": "remote" in (loc or "").lower(),
            "skills": extract_skills(title, desc, loc),
            "description_text": desc,
            "apply_url": apply_url,
            "canonical_url": apply_url,
            "posted_at": j.get("updated_at"),
            "salary_min": None, "salary_max": None, "currency": None,
        })
    return out
