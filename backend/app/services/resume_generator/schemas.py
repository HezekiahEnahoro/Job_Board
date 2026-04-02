from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class GenerateResumeRequest(BaseModel):
    job_id: int
    template: str = "modern"  # "modern", "classic", "minimal"

class GeneratedResumeOut(BaseModel):
    id: int
    user_id: int
    job_id: int
    tailored_summary: str
    highlighted_skills: List[str]
    reordered_experience: List[Dict[str, Any]]
    match_score: int
    resume_html: str
    resume_url: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True