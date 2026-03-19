import os
import json
import time
import requests
from typing import Dict, Optional

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if GROQ_API_KEY:
    print("✅ Groq AI configured")
else:
    print("⚠️ GROQ_API_KEY not set")


def analyze_resume_match(resume_text: str, job_title: str, job_description: str, company: str) -> Dict:
    """Analyze resume using Groq (Llama 3.3 70B)"""
    
    if not GROQ_API_KEY:
        raise ValueError("AI service not configured")
    
    start_time = time.time()
    
    prompt = f"""Analyze this resume against the job posting.

Job: {job_title} at {company}
Description: {job_description[:2000]}

Resume: {resume_text[:4000]}

Return ONLY valid JSON:
{{
  "match_score": 75,
  "missing_keywords": ["keyword1", "keyword2"],
  "strengths": ["strength1", "strength2"],
  "suggestions": "advice here"
}}"""

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "You are an expert resume analyzer. Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 1200,
                "response_format": {"type": "json_object"}
            },
            timeout=30
        )
        response.raise_for_status()
        
        text = response.json()['choices'][0]['message']['content']
        result = json.loads(text)
        
        return {
            "match_score": float(result.get("match_score", 50)),
            "missing_keywords": result.get("missing_keywords", [])[:10],
            "strengths": result.get("strengths", [])[:10],
            "suggestions": result.get("suggestions", "No suggestions."),
            "analysis_time_seconds": round(time.time() - start_time, 2)
        }
    
    except Exception as e:
        print(f"❌ Error: {e}")
        raise ValueError(f"AI analysis failed: {str(e)}")


def generate_cover_letter(
    resume_text: str, 
    job_title: str, 
    job_description: str, 
    company: str,
    user_name: Optional[str] = None
) -> str:
    """Generate cover letter using Groq"""
    
    if not GROQ_API_KEY:
        raise ValueError("AI service not configured")
    
    prompt = f"""Write a professional cover letter.

Job: {job_title} at {company}
Description: {job_description[:1500]}
Resume: {resume_text[:3000]}
Name: {user_name or "Applicant"}

Write 3-4 paragraphs (250-350 words). Professional but personable."""

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "You are a professional career coach."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.8,
                "max_tokens": 900
            },
            timeout=30
        )
        response.raise_for_status()
        
        return response.json()['choices'][0]['message']['content'].strip()
    
    except Exception as e:
        print(f"❌ Error: {e}")
        raise ValueError(f"Cover letter failed: {str(e)}")