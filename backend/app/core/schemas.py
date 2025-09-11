from pydantic import BaseModel, Field
from datetime import datetime

class JobCreate(BaseModel):
    title: str
    company: str
    location: str | None = None
    remote_flag: bool = False
    skills: list[str] = Field(default_factory=list)  # NEW
    salary_min: int | None = None
    salary_max: int | None = None
    currency: str | None = None
    description_text: str | None = None
    apply_url: str | None = None
    canonical_url: str | None = None
    posted_at: datetime | None = None

class JobOut(JobCreate):
    id: int
    scraped_at: datetime
    last_seen_at: datetime

    class Config:
        from_attributes = True

class JobsPage(BaseModel):
    total: int
    count: int
    next: int | None = None
    items: list[JobOut]