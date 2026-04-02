from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.core.db import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Basic Info
    full_name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    location = Column(String(255))
    linkedin_url = Column(String(500))
    portfolio_url = Column(String(500))
    github_url = Column(String(500))
    
    # Resume Content
    summary = Column(Text)
    skills = Column(JSONB)  # ["Python", "React", ...]
    experience = Column(JSONB)  # [{"title": "Senior Dev", ...}]
    education = Column(JSONB)  # [{"degree": "BS CS", ...}]
    certifications = Column(JSONB)  # ["AWS Certified", ...]
    languages = Column(JSONB)  # [{"language": "English", "level": "Native"}]
    
    # Preferences
    preferences = Column(JSONB)  # {"job_types": [...], "salary_min": 100000}
    
    # Files
    resume_file_url = Column(String(500))
    resume_file_name = Column(String(255))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())