import os
import json
import time
from openai import OpenAI
from typing import Dict, List, Optional

# MOCK MODE for testing without OpenAI credits
MOCK_AI = os.getenv("MOCK_AI", "false").lower() == "true"

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_resume_match(resume_text: str, job_title: str, job_description: str, company: str) -> Dict:
    """Analyze resume match against job description"""
    start_time = time.time()
    
    # MOCK RESPONSE FOR TESTING
    if MOCK_AI:
        time.sleep(2)  # Simulate API delay
        return {
            "match_score": 78.5,
            "missing_keywords": ["React", "TypeScript", "Kubernetes", "AWS"],
            "strengths": ["Python", "FastAPI", "PostgreSQL", "RESTful APIs", "Git"],
            "suggestions": "Your backend Python skills are strong and align well with this role. To improve your match score, consider: 1) Adding any React or frontend experience to your resume, 2) Highlighting work with cloud services like AWS, 3) Including specific metrics like API response times or performance improvements you've achieved.",
            "analysis_time_seconds": round(time.time() - start_time, 2)
        }
    
    prompt = f"""You are an expert ATS (Applicant Tracking System) and resume analyzer. 

Analyze this resume against the job posting and provide a detailed assessment.

**Job Information:**
- Title: {job_title}
- Company: {company}
- Description: {job_description[:2000]}  # Limit to first 2000 chars

**Resume:**
{resume_text[:4000]}  # Limit to first 4000 chars

Provide your analysis in the following JSON format:
{{
  "match_score": <number 0-100>,
  "missing_keywords": [<array of important keywords/skills missing from resume>],
  "strengths": [<array of strong matching skills/experience>],
  "suggestions": "<specific actionable advice to improve match>"
}}

Be honest but constructive. Focus on technical skills, experience relevance, and keyword optimization.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Cheap and fast
            messages=[
                {"role": "system", "content": "You are an expert resume analyzer and career coach. Provide honest, actionable feedback in valid JSON format only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        analysis_time = time.time() - start_time
        
        return {
            "match_score": float(result.get("match_score", 0)),
            "missing_keywords": result.get("missing_keywords", []),
            "strengths": result.get("strengths", []),
            "suggestions": result.get("suggestions", ""),
            "analysis_time_seconds": round(analysis_time, 2)
        }
    
    except Exception as e:
        print(f"❌ OpenAI API error: {e}")
        raise ValueError(f"AI analysis failed: {str(e)}")


def generate_cover_letter(
    resume_text: str, 
    job_title: str, 
    job_description: str, 
    company: str,
    user_name: Optional[str] = None
) -> str:
    """Generate a tailored cover letter"""
    
    prompt = f"""Write a professional, compelling cover letter for this job application.

**Job Information:**
- Title: {job_title}
- Company: {company}
- Description: {job_description[:2000]}

**Candidate's Resume:**
{resume_text[:4000]}

**Candidate's Name:** {user_name or "Applicant"}

Write a cover letter that:
1. Shows genuine interest in the role and company
2. Highlights relevant experience from the resume
3. Explains why they're a great fit
4. Is professional but personable
5. Is 250-350 words

Do not use placeholders like [Company] or [Your Name]. Use the actual information provided.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional career coach who writes compelling, authentic cover letters."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=800
        )
        
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        print(f"❌ OpenAI API error: {e}")
        raise ValueError(f"Cover letter generation failed: {str(e)}")