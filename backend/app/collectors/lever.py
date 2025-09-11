import httpx
from typing import List, Dict
from app.core.skills import extract_skills

API = "https://api.lever.co/v0/postings/{org}"
async def fetch_lever_org(org: str) -> List[Dict]:
    """Returns normalized dicts ready for schemas.JobCreate(**d)
    """
    url = API.format(org=org)
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, params={"mode": "json"})
        if r.status_code == 404:
            raise RuntimeError(f"Lever org not found for '{org}'")
        r.raise_for_status()
        data = r.json()

    out: List[Dict] = []
    for j in data:
        title = j.get("text") or j.get("title")
        loc = (j.get("categories") or {}).get("location")
        desc = j.get("descriptionPlain") or ""
        apply_url = j.get("applyUrl") or j.get("hostedUrl")
        out.append({
            "title": title,
            "company": org,
            "location": loc,
            "remote_flag": "remote" in (loc or "").lower() if loc else False,
            "skills": extract_skills(title, desc, loc),
            "description_text": desc,
            "apply_url": apply_url,
            "canonical_url": j.get("hostedUrl") or apply_url,
            "posted_at": j.get("createdAt"),  # Lever timestamps are ms; you can parse later
            "salary_min": None, "salary_max": None, "currency": None,
        })
    return out
