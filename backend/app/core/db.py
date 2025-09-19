import os
from sqlalchemy import create_engine, text, Connection
from sqlalchemy.orm import sessionmaker, declarative_base, Session

DATABASE_URL = os.getenv(
    "DATABASE_URL"
    # "postgresql+psycopg2://jobuser:jobpass@db:5432/jobsdb"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5,
    max_overflow=5,
    pool_recycle=1800,)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    # Import models so metadata is registered, then create tables.
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    # Create indexes once
    with engine.begin() as conn:
        ensure_indexes(conn)

def ensure_indexes(conn: Connection):
    # indexes for performance; IF NOT EXISTS require PG 9.5+ (you're fine)
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs (posted_at)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at ON jobs (scraped_at)"))
    # if 'skills' is JSONB in PG, a GIN index helps contains/array queries a lot:
    # conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_skills_gin ON jobs USING GIN ((skills))"))
    conn.commit()