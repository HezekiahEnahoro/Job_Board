from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CoverLetterTemplateCreate(BaseModel):
    name: str
    content: str
    job_type: Optional[str] = None
    is_default: bool = False

class CoverLetterTemplateUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    job_type: Optional[str] = None
    is_default: Optional[bool] = None

class CoverLetterTemplateOut(BaseModel):
    id: int
    user_id: int
    name: str
    content: str
    job_type: Optional[str]
    is_default: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class GenerateCoverLetterRequest(BaseModel):
    job_id: int
    template_id: Optional[int] = None  # If None, use default or AI-generate

class GeneratedCoverLetterOut(BaseModel):
    id: int
    user_id: int
    job_id: int
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True