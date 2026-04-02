import os
import re
from typing import Dict, List, Any
import PyPDF2
import io
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF bytes"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return ""

def parse_resume_with_ai(resume_text: str) -> Dict[str, Any]:
    """Use Groq AI to parse resume into structured data"""
    
    prompt = f"""You are a resume parser. Extract the following information from this resume and return it as JSON.

Resume Text:
{resume_text}

Extract and return ONLY this JSON structure (no markdown, no explanation):
{{
    "full_name": "extracted full name",
    "email": "extracted email",
    "phone": "extracted phone",
    "location": "extracted location/city",
    "linkedin_url": "extracted LinkedIn URL if present",
    "portfolio_url": "extracted portfolio/website URL if present",
    "github_url": "extracted GitHub URL if present",
    "summary": "extracted professional summary/objective (2-3 sentences)",
    "skills": ["skill1", "skill2", "skill3"],
    "experience": [
        {{
            "title": "Job Title",
            "company": "Company Name",
            "location": "City, State",
            "start_date": "MM/YYYY",
            "end_date": "MM/YYYY or Present",
            "current": false,
            "description": "Brief description",
            "achievements": ["achievement 1", "achievement 2"],
            "technologies": ["tech1", "tech2"]
        }}
    ],
    "education": [
        {{
            "degree": "Degree Name",
            "school": "University Name",
            "location": "City, State",
            "graduation_date": "MM/YYYY",
            "gpa": "3.8/4.0 if mentioned"
        }}
    ],
    "certifications": [
        {{
            "name": "Certification Name",
            "issuer": "Issuing Organization",
            "date": "MM/YYYY"
        }}
    ],
    "languages": [
        {{
            "language": "Language Name",
            "level": "Native/Fluent/Professional/Basic"
        }}
    ]
}}

Important:
- Extract ALL skills mentioned (technical and soft skills)
- For experience, capture achievements as bullet points
- If information is not present, use null or empty array
- Return ONLY valid JSON, nothing else
"""
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=4000
        )
        
        import json
        parsed_data = json.loads(response.choices[0].message.content)
        return parsed_data
        
    except Exception as e:
        print(f"Error parsing resume with AI: {e}")
        return {}

def parse_resume(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Main function to parse resume file"""
    
    # Extract text from PDF
    if filename.lower().endswith('.pdf'):
        resume_text = extract_text_from_pdf(file_bytes)
    else:
        # For .txt or .docx, implement similar extraction
        resume_text = file_bytes.decode('utf-8', errors='ignore')
    
    if not resume_text:
        return {"error": "Could not extract text from resume"}
    
    # Parse with AI
    parsed_data = parse_resume_with_ai(resume_text)
    
    return parsed_data