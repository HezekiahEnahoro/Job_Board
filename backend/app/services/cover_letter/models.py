from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.core.db import Base

class CoverLetterTemplate(Base):
    __tablename__ = "cover_letter_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)  # "Software Engineer", "Startup"
    content = Column(Text, nullable=False)  # Template with {{placeholders}}
    job_type = Column(String(100))  # "engineering", "design", "product"
    is_default = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class GeneratedCoverLetter(Base):
    __tablename__ = "generated_cover_letters"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(Integer, ForeignKey("cover_letter_templates.id", ondelete="SET NULL"), nullable=True)
    
    content = Column(Text, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())