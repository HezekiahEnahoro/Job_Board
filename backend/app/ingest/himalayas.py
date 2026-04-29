import httpx
import logging
from typing import List, Dict
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from app.core.skills import extract_skills

logger = logging.getLogger(__name__)

BROWSE_API = "https://himalayas.app/jobs/api"
SEARCH_API = "https://himalayas.app/jobs/api/search"
PAGE_SIZE = 20
REQUEST_TIMEOUT = 30


async def fetch_himalayas_jobs(max_jobs: int = 200, categories: List[str] | None = None) -> List[Dict]:
    if categories:
        return await _fetch_search(categories=categories, max_jobs=max_jobs)
    return await _fetch_browse(max_jobs=max_jobs)


async def _fetch_browse(max_jobs: int) -> List[Dict]:
    logger.info(f"[Himalayas] Fetching up to {max_jobs} jobs...")
    out: List[Dict] = []
    offset = 0

    # Match exact headers that work in debug endpoint
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; MyJobPhase/1.0)",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=60, headers=headers) as client:
        while len(out) < max_jobs:
            try:
                r = await client.get(
                    BROWSE_API,
                    params={"limit": PAGE_SIZE, "offset": offset}
                )
                r.raise_for_status()
                data = r.json()
            except Exception as e:
                # Log type AND message — empty message hides the real error
                logger.error(f"[Himalayas] Browse failed (offset={offset}): {type(e).__name__}: {e}")
                break

            raw_jobs = data.get("jobs", [])
            total_count = data.get("totalCount", 0)
            if not raw_jobs:
                break

            for j in raw_jobs:
                n = _normalize(j)
                if n:
                    out.append(n)

            offset += PAGE_SIZE
            if offset >= min(total_count, max_jobs + PAGE_SIZE):
                break

    logger.info(f"[Himalayas] Done — {len(out)} jobs")
    return out[:max_jobs]


async def _fetch_search(categories: List[str], max_jobs: int) -> List[Dict]:
    out: List[Dict] = []
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        for category in categories:
            page = 1
            while len(out) < max_jobs:
                try:
                    r = await client.get(SEARCH_API, params={"q": category, "page": page, "sort": "recent"})
                    r.raise_for_status()
                    raw_jobs = r.json().get("jobs", [])
                except Exception as e:
                    logger.error(f"[Himalayas] Search failed ({category} p{page}): {e}")
                    break
                if not raw_jobs:
                    break
                for j in raw_jobs:
                    n = _normalize(j)
                    if n:
                        out.append(n)
                page += 1
    return out[:max_jobs]


def _normalize(j: Dict) -> Dict | None:
    title = (j.get("title") or "").strip()
    if not title:
        return None

    company = (j.get("companyName") or "Unknown").strip()

    # locationRestrictions is a list of dicts: [{alpha2, name, slug}]
    loc_list = j.get("locationRestrictions") or []
    if loc_list:
        names = []
        for loc in loc_list[:3]:
            name = loc.get("name", "") if isinstance(loc, dict) else str(loc)
            if name:
                names.append(name)
        location = ", ".join(names)
        if len(loc_list) > 3:
            location += f" +{len(loc_list) - 3} more"
    else:
        location = "Worldwide"

    desc_html = j.get("description") or j.get("excerpt") or ""
    desc_text = _strip_html(desc_html)[:10000]

    # ── APPLY URL FIX ─────────────────────────────────────────────────
    # Himalayas API actual fields (confirmed from their docs):
    #   applicationLink → direct apply URL e.g. https://himalayas.app/apply/abc123
    #   guid            → Himalayas listing URL e.g. https://himalayas.app/companies/x/jobs/y
    #
    # Old scraper used j.get("url") and j.get("applyUrl") — NEITHER EXISTS
    # causing fallback to the general /jobs page.
    apply_url = (j.get("applicationLink") or "").strip()
    canonical_url = (j.get("guid") or apply_url or "").strip()

    # If no applicationLink, use the listing URL as fallback
    # (at least takes user to the specific job, not the general page)
    if not apply_url:
        apply_url = canonical_url or "https://himalayas.app/jobs"
    # ──────────────────────────────────────────────────────────────────

    # pubDate is Unix ms timestamp
    posted_at = _parse_date(j.get("pubDate") or j.get("createdAt"))

    return {
        "title": title,
        "company": company,
        "location": location,
        "remote_flag": True,
        "skills": extract_skills(title, desc_text, location),
        "description_text": desc_text,
        "apply_url": apply_url,
        "canonical_url": canonical_url,
        "posted_at": posted_at,
        "salary_min": _to_int(j.get("minSalary")),
        "salary_max": _to_int(j.get("maxSalary")),
        "currency": j.get("currency") or None,
        "source": "himalayas",
    }


def _to_int(val) -> int | None:
    try:
        return int(val) if val is not None else None
    except (ValueError, TypeError):
        return None


def _parse_date(val) -> datetime:
    if val is None:
        return datetime.now(timezone.utc)
    if isinstance(val, (int, float)):  # Unix ms
        try:
            return datetime.fromtimestamp(val / 1000, tz=timezone.utc)
        except Exception:
            return datetime.now(timezone.utc)
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return datetime.now(timezone.utc)
    return datetime.now(timezone.utc)


def _strip_html(html: str) -> str:
    if not html:
        return ""
    try:
        return BeautifulSoup(html, "lxml").get_text(separator=" ", strip=True)
    except Exception:
        return html