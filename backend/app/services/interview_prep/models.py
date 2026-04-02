from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from datetime import datetime
from app.core.db import Base

class InterviewPrep(Base):
    __tablename__ = "interview_preps"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    
    # Company research
    company_overview = Column(Text)
    company_culture = Column(Text)
    recent_news = Column(ARRAY(Text))
    
    # Questions (array of objects)
    technical_questions = Column(JSONB)  # [{"question": "...", "topic": "...", "difficulty": "..."}]
    behavioral_questions = Column(JSONB)  # [{"question": "...", "category": "...", "star_tip": "..."}]
    questions_to_ask = Column(JSONB)  # [{"question": "...", "why_ask": "..."}]
    
    # Tips
    preparation_tips = Column(ARRAY(Text))
    key_skills_to_highlight = Column(ARRAY(Text))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('user_id', 'job_id', name='uix_user_job_prep'),
    )