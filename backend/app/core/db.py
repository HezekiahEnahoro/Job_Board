import os
from sqlalchemy import create_engine, text, Connection
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# For local dev, connect to localhost:5432 (Docker exposes it)
DATABASE_URL = os.getenv("DATABASE_URL")

# Fix SSL for Render PostgreSQL
if DATABASE_URL and "render.com" in DATABASE_URL:
    # Replace postgres:// with postgresql:// (psycopg2 requirement)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Add SSL mode
    if "?" in DATABASE_URL:
        DATABASE_URL += "&sslmode=require"
    else:
        DATABASE_URL += "?sslmode=require"

engine = create_engine(DATABASE_URL, pool_pre_ping=True,
pool_recycle=300,
connect_args={
        "connect_timeout": 10,
    })
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