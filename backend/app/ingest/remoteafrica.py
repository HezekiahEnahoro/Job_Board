import httpx
import logging
from typing import List, Dict
from datetime import datetime, timezone
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from app.core.skills import extract_skills

logger = logging.getLogger(__name__)

BASE_URL = "https://remoteafrica.io"
JOBS_URL = f"{BASE_URL}/jobs"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

MAX_JOBS = 100


async def fetch_remoteafrica_jobs() -> List[Dict]:
    """
    Scrape Remote Africa job board.
    Focus: remote roles for African applicants.

    Strategy:
      1. Try the main /jobs page with robust selectors.
      2. Log exactly what was found at each stage so debugging
         failures takes seconds, not hours.
    """
    logger.info("[RemoteAfrica] Starting scrape...")

    async with httpx.AsyncClient(
        timeout=30,
        headers=HEADERS,
        follow_redirects=True,
    ) as client:
        try:
            r = await client.get(JOBS_URL)
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"[RemoteAfrica] HTTP {e.response.status_code} — {JOBS_URL}")
            return []
        except Exception as e:
            logger.error(f"[RemoteAfrica] Request failed: {e}")
            return []

    logger.info(f"[RemoteAfrica] Page fetched ({len(r.text)} chars)")

    soup = BeautifulSoup(r.text, "lxml")
    jobs = _parse_jobs(soup)

    logger.info(f"[RemoteAfrica] Scraped {len(jobs)} jobs")
    return jobs[:MAX_JOBS]


def _parse_jobs(soup: BeautifulSoup) -> List[Dict]:
    """
    Try selector strategies in priority order.
    RemoteAfrica has changed its markup before — this order
    covers the variants seen in the wild.
    """

    # ── Strategy 1: semantic job cards (most specific) ──────────────
    cards = (
        soup.select("div.job-card")
        or soup.select("li.job-card")
        or soup.select("[class*='JobCard']")
        or soup.select("[class*='job-card']")
        or soup.select("[data-job-id]")
    )

    if cards:
        logger.info(f"[RemoteAfrica] Strategy 1 matched {len(cards)} cards")
        return [j for c in cards for j in [_extract_from_card(c)] if j]

    # ── Strategy 2: list items inside a jobs container ───────────────
    container = (
        soup.select_one("#jobs-list")
        or soup.select_one(".jobs-list")
        or soup.select_one("[class*='jobs-list']")
        or soup.select_one("[class*='JobsList']")
        or soup.select_one("main")
    )

    if container:
        items = container.select("li") or container.select("article")
        if items:
            logger.info(f"[RemoteAfrica] Strategy 2 matched {len(items)} items")
            return [j for i in items for j in [_extract_from_card(i)] if j]

    # ── Strategy 3: any anchor with a job-like href ──────────────────
    # Fallback for heavily JS-rendered pages that still embed links
    links = soup.select("a[href*='/job'], a[href*='/jobs/']")
    if links:
        logger.info(f"[RemoteAfrica] Strategy 3 matched {len(links)} links (fallback)")
        return [j for a in links for j in [_extract_from_link(a)] if j]

    # ── Nothing matched ──────────────────────────────────────────────
    logger.warning(
        "[RemoteAfrica] No job elements found — site may be JS-rendered. "
        "Consider switching to Playwright or Splash for this source."
    )
    # Dump a small fragment to help diagnose
    body_preview = soup.get_text(separator=" ", strip=True)[:500]
    logger.debug(f"[RemoteAfrica] Body preview: {body_preview}")
    return []


def _extract_from_card(card) -> Dict | None:
    """Extract job data from a BeautifulSoup element (card or list item)."""

    # Title — try dedicated element, then fall through heading hierarchy
    title_el = (
        card.select_one(".job-title")
        or card.select_one("[class*='job-title']")
        or card.select_one("[class*='JobTitle']")
        or card.select_one("h2")
        or card.select_one("h3")
        or card.select_one("h4")
    )

    # Link
    link_el = card.select_one("a[href]")

    if not title_el or not link_el:
        return None

    title = title_el.get_text(strip=True)
    if not title:
        return None

    href = link_el.get("href", "")
    url = href if href.startswith("http") else urljoin(BASE_URL, href)

    # Company
    company_el = (
        card.select_one(".company-name")
        or card.select_one(".company")
        or card.select_one("[class*='company']")
        or card.select_one("[class*='Company']")
    )
    company = company_el.get_text(strip=True) if company_el else "Unknown"

    # Location — RemoteAfrica jobs are remote for Africa
    location_el = card.select_one(".location") or card.select_one("[class*='location']")
    location = location_el.get_text(strip=True) if location_el else "Remote - Africa"
    if not location:
        location = "Remote - Africa"

    # Description snippet
    desc_el = card.select_one(".description") or card.select_one("p")
    desc = desc_el.get_text(strip=True) if desc_el else ""

    return {
        "title": title,
        "company": company,
        "location": location,
        "remote_flag": True,
        "skills": extract_skills(title, desc, location),
        "description_text": desc[:10000],
        "apply_url": url,
        "canonical_url": url,
        "posted_at": datetime.now(timezone.utc),  # site rarely exposes dates
        "salary_min": None,
        "salary_max": None,
        "currency": None,
        "source": "remoteafrica",
    }


def _extract_from_link(anchor) -> Dict | None:
    """Minimal extraction from a bare <a> tag (Strategy 3 fallback)."""
    href = anchor.get("href", "")
    title = anchor.get_text(strip=True)

    if not title or len(title) < 5:
        return None

    url = href if href.startswith("http") else urljoin(BASE_URL, href)

    return {
        "title": title,
        "company": "Unknown",
        "location": "Remote - Africa",
        "remote_flag": True,
        "skills": extract_skills(title, "", "Remote - Africa"),
        "description_text": "",
        "apply_url": url,
        "canonical_url": url,
        "posted_at": datetime.now(timezone.utc),
        "salary_min": None,
        "salary_max": None,
        "currency": None,
        "source": "remoteafrica",
    }