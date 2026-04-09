import os
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import sessionmaker, declarative_base, Session

# Get DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Fix SSL for Render PostgreSQL
if DATABASE_URL and "render.com" in DATABASE_URL:
    # Replace postgres:// with postgresql:// (psycopg2 requirement)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Add SSL mode to URL (don't use connect_args for SSL)
    if "?" in DATABASE_URL:
        if "sslmode" not in DATABASE_URL:
            DATABASE_URL += "&sslmode=require"
    else:
        DATABASE_URL += "?sslmode=require"

# Create engine (NO sslmode in connect_args!)
engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={
        "connect_timeout": 10,
    }
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.
    
    Yields:
        Session: SQLAlchemy database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database tables"""
    from . import models
    from app.services.auth import models as auth_models
    Base.metadata.create_all(bind=engine)


def ensure_indexes(conn: Connection) -> None:
    """Create indexes for better query performance"""
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs (company)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs (posted_at)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_jobs_scraped_at ON jobs (scraped_at)"))
    conn.commit()