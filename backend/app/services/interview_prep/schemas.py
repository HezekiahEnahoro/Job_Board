from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TechnicalQuestion(BaseModel):
    question: str
    topic: str
    difficulty: str  # "Easy", "Medium", "Hard"
    sample_answer: Optional[str] = None

class BehavioralQuestion(BaseModel):
    question: str
    category: str  # "Leadership", "Teamwork", "Conflict", etc.
    star_tip: str  # STAR method guidance

class QuestionToAsk(BaseModel):
    question: str
    why_ask: str
    category: str  # "Role", "Team", "Company", "Growth"

class InterviewPrepOut(BaseModel):
    id: int
    user_id: int
    job_id: int
    
    # Company research
    company_overview: Optional[str]
    company_culture: Optional[str]
    recent_news: List[str] = []
    
    # Questions
    technical_questions: List[dict] = []
    behavioral_questions: List[dict] = []
    questions_to_ask: List[dict] = []
    
    # Tips
    preparation_tips: List[str] = []
    key_skills_to_highlight: List[str] = []
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True