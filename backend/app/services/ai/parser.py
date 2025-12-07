import PyPDF2
import docx
import io
from typing import Optional

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {str(e)}")

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc_file = io.BytesIO(file_content)
        doc = docx.Document(doc_file)
        
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to parse DOCX: {str(e)}")

def extract_text_from_resume(file_content: bytes, filename: str) -> str:
    """Extract text from resume file (PDF or DOCX)"""
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        return extract_text_from_pdf(file_content)
    elif filename_lower.endswith('.docx') or filename_lower.endswith('.doc'):
        return extract_text_from_docx(file_content)
    else:
        raise ValueError(f"Unsupported file format. Please upload PDF or DOCX. Got: {filename}")

def validate_resume_text(text: str) -> bool:
    """Validate that extracted text looks like a resume"""
    # Basic validation - resume should have some minimum content
    if len(text.strip()) < 100:
        raise ValueError("Resume appears to be too short or empty")
    
    # Check for common resume keywords (at least one should be present)
    resume_keywords = [
        'experience', 'education', 'skills', 'work', 'university', 
        'college', 'degree', 'project', 'software', 'engineer'
    ]
    
    text_lower = text.lower()
    has_keyword = any(keyword in text_lower for keyword in resume_keywords)
    
    if not has_keyword:
        raise ValueError("File doesn't appear to be a resume. Please upload a valid resume.")
    
    return True