from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.core.db import Base

class GeneratedResume(Base):
    __tablename__ = "generated_resumes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    
    # AI-Generated Content
    tailored_summary = Column(Text)
    highlighted_skills = Column(JSON)  # ["Python", "React", ...]
    reordered_experience = Column(JSON)  # Reordered experience array
    match_score = Column(Integer)  # 0-100
    
    # Generated Files
    resume_url = Column(String(500))  # S3/storage URL
    resume_html = Column(Text)  # HTML version for preview
    
    # Metadata
    generation_method = Column(String(50))  # "ai_tailored", "template", "manual"
    ai_changes = Column(JSON)  # Track what AI changed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())