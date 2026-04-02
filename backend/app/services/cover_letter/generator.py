import os
from typing import Dict, Optional
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

def generate_cover_letter_with_ai(
    job_title: str,
    job_description: str,
    company: str,
    user_name: str,
    user_summary: str,
    user_experience: list,
    template_content: Optional[str] = None
) -> str:
    """
    Generate a personalized cover letter using AI
    
    Args:
        job_title: The job title
        job_description: Job description text
        company: Company name
        user_name: User's full name
        user_summary: User's professional summary
        user_experience: List of user's experience dicts
        template_content: Optional template to base the letter on
    
    Returns:
        Generated cover letter text
    """
    
    experience_summary = "\n".join([
        f"- {exp.get('title')} at {exp.get('company')}: {exp.get('description', '')[:200]}"
        for exp in user_experience[:3]
    ])
    
    if template_content:
        prompt = f"""You are a professional cover letter writer. Use this template to create a personalized cover letter.

Template:
{template_content}

Job Details:
- Position: {job_title}
- Company: {company}
- Description: {job_description[:800]}

Candidate Details:
- Name: {user_name}
- Summary: {user_summary}
- Recent Experience:
{experience_summary}

Instructions:
- Replace any {{placeholders}} with actual information
- Keep the template's structure and tone
- Make it specific to this job and company
- Highlight relevant experience
- Show enthusiasm for the role
- 3-4 paragraphs maximum
- Professional but engaging tone

Return ONLY the cover letter, no additional commentary.
"""
    else:
        prompt = f"""You are a professional cover letter writer. Create a compelling cover letter for this job application.

Job Details:
- Position: {job_title}
- Company: {company}
- Description: {job_description[:800]}

Candidate Details:
- Name: {user_name}
- Summary: {user_summary}
- Recent Experience:
{experience_summary}

Instructions:
- Opening: Express specific interest in the company and role
- Body: Highlight 2-3 relevant experiences/achievements
- Closing: Strong call to action
- 3-4 paragraphs maximum
- Professional but engaging tone
- Show you researched the company
- Make it personal, not generic

Format:
Dear Hiring Manager,

[Opening paragraph]

[Body paragraphs]

[Closing paragraph]

Sincerely,
{user_name}

Return ONLY the cover letter, no additional commentary.
"""
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=800
        )
        
        cover_letter = response.choices[0].message.content.strip()
        return cover_letter
        
    except Exception as e:
        print(f"Error generating cover letter: {e}")
        return f"""Dear Hiring Manager,

I am writing to express my interest in the {job_title} position at {company}.

{user_summary}

I would welcome the opportunity to discuss how my skills and experience align with your needs.

Sincerely,
{user_name}"""


def fill_template_placeholders(template: str, values: Dict[str, str]) -> str:
    """
    Fill template placeholders like {{company}}, {{position}}, etc.
    
    Args:
        template: Template string with {{placeholders}}
        values: Dict of placeholder values
    
    Returns:
        Filled template
    """
    result = template
    for key, value in values.items():
        placeholder = f"{{{{{key}}}}}"  # {{key}}
        result = result.replace(placeholder, value)
    return result