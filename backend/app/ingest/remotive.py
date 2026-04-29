import httpx
import re
import logging
from typing import List, Dict
from datetime import datetime, timedelta, timezone
from app.core.skills import extract_skills

logger = logging.getLogger(__name__)

API = "https://remotive.com/api/remote-jobs"

# ──────────────────────────────────────────────
# FIX: was 48 hours — too tight for Remotive's
# posting frequency. Daily DAG should look back
# 7 days so no jobs fall through.
# ──────────────────────────────────────────────
DEFAULT_LOOKBACK_HOURS = 168  # 7 days


def clean_job_title(title: str) -> str:
    """Normalize job titles — strip gender markers, ref numbers, whitespace."""
    if not title:
        return title
    title = re.sub(r"\s*\([mwfd/]+\)\s*", " ", title, flags=re.IGNORECASE)
    title = re.sub(r"\s*\(Ref\.?\s*Nr\.?:?\s*\d+\)\s*", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\s*\(ID:?\s*\d+\)\s*", "", title, flags=re.IGNORECASE)
    return " ".join(title.split()).strip()


async def fetch_remotive_jobs(hours: int = DEFAULT_LOOKBACK_HOURS) -> List[Dict]:
    """
    Fetch remote jobs from Remotive API.
    Focus: global remote jobs with strong EMEA presence.

    Rate limit: max 4 calls/day — call once per DAG run only.
    """
    logger.info(f"[Remotive] Fetching jobs (lookback={hours}h)...")

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(API)
        r.raise_for_status()
        data = r.json()

    raw_jobs = data.get("jobs", [])
    logger.info(f"[Remotive] API returned {len(raw_jobs)} raw jobs")

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    out: List[Dict] = []
    skipped_old = 0
    skipped_no_title = 0

    for j in raw_jobs:
        pub_date_str = j.get("publication_date", "")
        try:
            if pub_date_str.endswith("Z"):
                pub_date = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00"))
            else:
                pub_date = datetime.fromisoformat(pub_date_str)
            if pub_date.tzinfo is None:
                pub_date = pub_date.replace(tzinfo=timezone.utc)
        except Exception:
            # Unparseable date → include rather than silently drop
            pub_date = datetime.now(timezone.utc)

        if pub_date < cutoff:
            skipped_old += 1
            continue

        raw_title = j.get("title", "")
        clean_title = clean_job_title(raw_title)
        if not clean_title:
            skipped_no_title += 1
            continue

        company = j.get("company_name", "")
        location = j.get("candidate_required_location", "Worldwide") or "Worldwide"
        desc = j.get("description", "")

        # Parse salary — Remotive returns a free-text salary field
        salary_text = j.get("salary", "") or ""
        salary_min, salary_max, currency = _parse_salary(salary_text)

        out.append({
            "title": clean_title,
            "company": company,
            "location": location,
            "remote_flag": True,
            "skills": extract_skills(clean_title, desc, location),
            "description_text": desc[:10000],
            "apply_url": j.get("url", ""),
            "canonical_url": j.get("url", ""),
            "posted_at": pub_date,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "currency": currency,
            "source": "remotive",
        })

    logger.info(
        f"[Remotive] Result: {len(out)} jobs kept | "
        f"{skipped_old} too old | {skipped_no_title} no title"
    )
    return out


def _parse_salary(text: str):
    """
    Best-effort salary parser for Remotive's free-text salary field.
    Returns (min, max, currency) or (None, None, None).
    Examples: "$80k - $120k", "€50,000–€80,000", "100000"
    """
    if not text:
        return None, None, None

    currency = None
    if "$" in text:
        currency = "USD"
    elif "€" in text:
        currency = "EUR"
    elif "£" in text:
        currency = "GBP"

    # Extract all numeric groups (handle k suffix)
    nums = re.findall(r"[\d,]+(?:\.\d+)?k?", text, flags=re.IGNORECASE)
    parsed = []
    for n in nums:
        try:
            val = float(n.replace(",", "").replace("k", "").replace("K", ""))
            if n.lower().endswith("k"):
                val *= 1000
            if val > 1000:  # ignore noise like "2023"
                parsed.append(int(val))
        except ValueError:
            continue

    if len(parsed) >= 2:
        return min(parsed), max(parsed), currency
    elif len(parsed) == 1:
        return parsed[0], None, currency
    return None, None, currency