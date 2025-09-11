# JobBoardX — Next.js + FastAPI + Postgres

Production-like job search & trends:
- Filters: search / skill / location / remote
- Trends: top skills, remote ratio, company activity
- Dark mode, responsive UI (Tailwind + shadcn/ui)
- Scrapers: Greenhouse, Lever, Ashby + detail fetch (BeautifulSoup)
- Scheduler: APScheduler

## Tech
Next.js (App Router, TypeScript), Recharts, Tailwind + shadcn/ui
FastAPI, SQLAlchemy, Postgres, Docker, APScheduler

## Run
docker compose up --build
# Frontend: npm run dev

## Demo data
docker compose exec api python -m app.seed