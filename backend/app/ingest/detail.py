import os, asyncio, httpx
from bs4 import BeautifulSoup

DETAIL_FETCH = (os.getenv("DETAIL_FETCH", "false").lower() == "true")
DETAIL_CONCURRENCY = int(os.getenv("DETAIL_CONCURRENCY", "3"))
DETAIL_TIMEOUT = int(os.getenv("DETAIL_TIMEOUT", "20"))

_sema = asyncio.Semaphore(DETAIL_CONCURRENCY)

async def fetch_job_text(url: str) -> str | None:
    if not DETAIL_FETCH or not url:
        return None
    async with _sema:
        async with httpx.AsyncClient(timeout=DETAIL_TIMEOUT, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()
            html = r.text
    soup = BeautifulSoup(html, "lxml")
    # keep it simple: full page text (you can narrow to a content div later)
    text = soup.get_text(" ", strip=True)
    return text[:20000]  # guard: very long pages
