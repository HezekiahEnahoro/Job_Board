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
- 3 paragraphs maximum
- Return ONLY the cover letter text, no commentary.
"""
    else:
        prompt = f"""Write a cover letter for this job application. It must sound like a real person wrote it — not a template, not AI.

STRICT RULES — violating any of these makes the letter unusable:
- Do NOT start with "I am excited", "I am writing to", "I am thrilled", or any variation
- Do NOT use: "leverage", "utilize", "I would welcome the opportunity", "Thank you for considering"
- Do NOT use "Dear Hiring Manager" — use no salutation at all, just start the letter
- Do NOT end with "Sincerely" or any sign-off — just end the last paragraph naturally
- Maximum 3 short paragraphs
- First sentence must be specific to this company or role — not generic
- Reference actual requirements from the job description
- Reference actual experience from the candidate's background
- Sound direct and confident, not eager or apologetic

Job:
- Role: {job_title}
- Company: {company}
- Description: {job_description[:800]}

Candidate:
- Name: {user_name}
- Background: {user_summary}
- Experience:
{experience_summary}

Return ONLY the cover letter body — 3 paragraphs, no salutation, no sign-off.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=600
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Error generating cover letter: {e}")
        # Minimal fallback — better than the old generic one
        return f"""{company} caught my attention for the {job_title} role because of the specific work described in the listing.

{user_summary}

I'd like to talk about how my background fits what you're building. Happy to connect at your convenience."""


def fill_template_placeholders(template: str, values: Dict[str, str]) -> str:
    result = template
    for key, value in values.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, value)
    return result