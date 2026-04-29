import os
import io
import json
from typing import Dict, Any
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text from PDF bytes using pdfplumber.
    Much more reliable than PyPDF2 for real-world CVs with
    formatting, columns, icons, and non-standard fonts.
    """
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text(layout=True)
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts).strip()
    except ImportError:
        # Fallback to PyPDF2 if pdfplumber not installed
        # Run: pip install pdfplumber
        print("⚠️  pdfplumber not installed, falling back to PyPDF2")
        return _extract_text_pypdf2(file_bytes)
    except Exception as e:
        print(f"pdfplumber extraction failed: {e}, trying PyPDF2 fallback")
        return _extract_text_pypdf2(file_bytes)


def _extract_text_pypdf2(file_bytes: bytes) -> str:
    """PyPDF2 fallback — less reliable but kept as safety net."""
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(
            page.extract_text() or "" for page in reader.pages
        ).strip()
    except Exception as e:
        print(f"PyPDF2 extraction also failed: {e}")
        return ""


def parse_resume_with_ai(resume_text: str) -> Dict[str, Any]:
    """Use Groq AI to parse resume text into structured data."""

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
            max_tokens=4000,
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"AI parsing failed: {e}")
        return {}


def parse_resume(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Main entry point — extract text then parse with AI."""

    # Extract text based on file type
    if filename.lower().endswith(".pdf"):
        resume_text = extract_text_from_pdf(file_bytes)
    elif filename.lower().endswith(".docx"):
        resume_text = _extract_text_docx(file_bytes)
    else:
        # Plain text fallback
        resume_text = file_bytes.decode("utf-8", errors="ignore")

    if not resume_text or len(resume_text.strip()) < 50:
        print(f"⚠️  Extracted text too short ({len(resume_text)} chars) — PDF may be image-based")
        return {"error": "Could not extract text from resume. Make sure it's a text-based PDF, not a scanned image."}

    print(f"✅ Extracted {len(resume_text)} characters from {filename}")

    return parse_resume_with_ai(resume_text)


def _extract_text_docx(file_bytes: bytes) -> str:
    """Extract text from .docx files."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
    except ImportError:
        print("python-docx not installed: pip install python-docx")
        return ""
    except Exception as e:
        print(f"DOCX extraction failed: {e}")
        return ""