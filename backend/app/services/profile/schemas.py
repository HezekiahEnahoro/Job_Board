from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime

class ExperienceItem(BaseModel):
    title: str
    company: str
    location: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None  # None = "Present"
    current: bool = False
    description: Optional[str] = None
    achievements: List[str] = []
    technologies: List[str] = []

class EducationItem(BaseModel):
    degree: str
    school: str
    location: Optional[str] = None
    graduation_date: Optional[str] = None
    gpa: Optional[str] = None
    achievements: List[str] = []

class CertificationItem(BaseModel):
    name: str
    issuer: str
    date: Optional[str] = None
    expires: Optional[str] = None
    credential_url: Optional[str] = None

class LanguageItem(BaseModel):
    language: str
    level: str  # "Native", "Fluent", "Professional", "Basic"

class UserPreferences(BaseModel):
    job_types: List[str] = []  # ["Full Stack", "Backend", ...]
    industries: List[str] = []  # ["SaaS", "FinTech", ...]
    remote_only: bool = True
    willing_to_relocate: bool = False
    preferred_locations: List[str] = []
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    company_size: List[str] = []  # ["Startup", "Enterprise", ...]

class ProfileCreate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    github_url: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = []
    experience: List[ExperienceItem] = []
    education: List[EducationItem] = []
    certifications: List[CertificationItem] = []
    languages: List[LanguageItem] = []
    preferences: Optional[UserPreferences] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    github_url: Optional[str] = None
    summary: Optional[str] = None
    skills: Optional[List[str]] = None
    experience: Optional[List[ExperienceItem]] = None
    education: Optional[List[EducationItem]] = None
    certifications: Optional[List[CertificationItem]] = None
    languages: Optional[List[LanguageItem]] = None
    preferences: Optional[UserPreferences] = None

class ProfileOut(BaseModel):
    id: int
    user_id: int
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    linkedin_url: Optional[str]
    portfolio_url: Optional[str]
    github_url: Optional[str]
    summary: Optional[str]
    skills: Optional[List[str]]
    experience: Optional[List[Dict[str, Any]]]
    education: Optional[List[Dict[str, Any]]]
    certifications: Optional[List[Dict[str, Any]]]
    languages: Optional[List[Dict[str, Any]]]
    preferences: Optional[Dict[str, Any]]
    resume_file_url: Optional[str]
    resume_file_name: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True