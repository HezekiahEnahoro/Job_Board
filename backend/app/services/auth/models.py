from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean, DateTime, ForeignKey,Column, Integer, Text, UniqueConstraint, Float, JSON
from datetime import datetime, timezone
from app.core.db import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    is_active = Column(Boolean, default=True)
    is_pro = Column(Boolean, default=False)
    
    # Stripe fields (NEW)
    is_pro = Column(Boolean, default=False, nullable=False)
    stripe_customer_id = Column(String, nullable=True, unique=True)
    stripe_subscription_id = Column(String, nullable=True)
    subscription_status = Column(String, nullable=True)  # active, canceled, past_due, etc.
    subscription_end_date = Column(DateTime, nullable=True)
    
    # Relationships
    saved_jobs = relationship("SavedJob", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    resume_analyses = relationship("ResumeAnalysis", back_populates="user", cascade="all, delete-orphan")

class SavedJob(Base):
    __tablename__ = "saved_jobs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[int] = mapped_column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    saved_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    
    user = relationship("User", back_populates="saved_jobs")
    job = relationship("Job")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'job_id', name='uix_user_job_saved'),
    )

class Application(Base):
    __tablename__ = "applications"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[int] = mapped_column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    
    status: Mapped[str] = mapped_column(String(50), default="saved", nullable=False)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    user = relationship("User", back_populates="applications")
    job = relationship("Job")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'job_id', name='uix_user_job_app'),
    )


class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, nullable=True)
    
    # Resume details
    resume_text = Column(Text, nullable=False)  # Extracted text from PDF/DOCX
    resume_filename = Column(String, nullable=True)
    
    # Analysis results
    match_score = Column(Float, nullable=True)  # 0-100
    missing_keywords = Column(JSON, nullable=True)  # Array of strings
    strengths = Column(JSON, nullable=True)  # Array of strings
    suggestions = Column(Text, nullable=True)  # Improvement suggestions
    cover_letter = Column(Text, nullable=True)  # Generated cover letter
    
    # Metadata
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    analysis_time_seconds = Column(Float, nullable=True)  # How long AI took
    
    # Relationships
    user = relationship("User", back_populates="resume_analyses")

# Add to User model
User.resume_analyses = relationship("ResumeAnalysis", back_populates="user", cascade="all, delete-orphan")