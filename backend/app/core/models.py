from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, Boolean, Text, JSON
from datetime import datetime
from .db import Base

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(256), index=True)
    company: Mapped[str] = mapped_column(String(256), index=True)
    location: Mapped[str | None] = mapped_column(String(256), index=True, default=None)
    remote_flag: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    # NEW — for trends
    skills: Mapped[list[str] | None] = mapped_column(JSON, default=list)

    salary_min: Mapped[int | None] = mapped_column(Integer, default=None)
    salary_max: Mapped[int | None] = mapped_column(Integer, default=None)
    currency: Mapped[str | None] = mapped_column(String(8), default=None)

    description_text: Mapped[str | None] = mapped_column(Text, default=None)
    apply_url: Mapped[str | None] = mapped_column(String(512), default=None)
    canonical_url: Mapped[str | None] = mapped_column(String(512), default=None)

    posted_at: Mapped[datetime | None] = mapped_column(DateTime, index=True, default=None)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, index=True, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, index=True, default=datetime.utcnow)
