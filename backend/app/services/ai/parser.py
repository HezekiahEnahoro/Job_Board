import io
from PyPDF2 import PdfReader
from docx import Document

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_file = io.BytesIO(file_content)
        reader = PdfReader(pdf_file)
        
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {str(e)}")


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        docx_file = io.BytesIO(file_content)
        doc = Document(docx_file)
        
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to parse DOCX: {str(e)}")


def extract_text_from_resume(file_content: bytes, filename: str) -> str:
    """
    Extract text from resume file (PDF or DOCX)
    Uses filename extension to determine type
    """
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        return extract_text_from_pdf(file_content)
    elif filename_lower.endswith('.docx'):
        return extract_text_from_docx(file_content)
    else:
        raise ValueError("Unsupported file format. Please upload PDF or DOCX.")


def validate_resume_text(text: str) -> bool:
    """
    Validate that extracted text looks like a resume
    """
    if not text or len(text) < 100:
        return False
    
    # Check for common resume keywords
    resume_keywords = [
        'experience', 'education', 'skills', 'work', 'university',
        'college', 'job', 'project', 'developer', 'engineer',
        'manager', 'email', 'phone', 'address'
    ]
    
    text_lower = text.lower()
    matches = sum(1 for keyword in resume_keywords if keyword in text_lower)
    
    # At least 3 resume-related keywords should be present
    return matches >= 3