import os
from sqlalchemy import create_engine, text, Connection
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# For local dev, connect to localhost:5432 (Docker exposes it)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://jobuser:jobpass@localhost:5432/jobsdb"  # localhost instead of 'db'
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=5, pool_recycle=1800)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    from . import models
    from app.services.auth import models as auth_models
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        ensure_indexes(conn)

def ensure_indexes(conn: Connection):
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs (posted_at)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at ON jobs (scraped_at)"))
    conn.commit()