import os
from typing import Dict, Optional
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)


def _strip_resume_bleed(content: str) -> str:
    """
    Strip any resume sections that the AI accidentally appends.
    This happens when the prompt includes user_summary and the model
    echoes it back with a "Professional Summary" header.
    """
    bleed_markers = [
        "Professional Summary",
        "Skills\n",
        "Experience\n",
        "Education\n",
        "References\n",
        "Sincerely,",
        "Best regards,",
        "Kind regards,",
        "Yours sincerely,",
    ]
    for marker in bleed_markers:
        if marker in content:
            content = content[:content.index(marker)].strip()
    return content


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
- Return ONLY the cover letter text, no commentary, no resume sections.
"""
    else:
        prompt = f"""Write a cover letter for this job application. It must sound like a real person wrote it — not a template, not AI.

STRICT RULES — violating any of these makes the letter unusable:
- Do NOT start with "I am excited", "I am writing to", "I am thrilled", or any variation
- Do NOT use: "leverage", "utilize", "unique blend", "to boot", "I would welcome the opportunity", "Thank you for considering"
- Do NOT use "Dear Hiring Manager" — no salutation at all, just start the letter
- Do NOT end with "Sincerely", "Best regards", or any sign-off — end the last paragraph naturally on a confident note
- Do NOT append resume sections — no "Professional Summary", "Skills", "Experience" headers at the end
- Maximum 3 short paragraphs
- First sentence must be specific to this company or role — not generic
- Reference actual requirements from the job description
- Reference actual experience from the candidate's background
- Sound direct and confident, not eager or apologetic
- End on a specific statement about contribution, not a generic "looking forward to discussing"
- Third paragraph must name one specific thing from the job description you will contribute to — not generic statements about 'scalable applications' or 'meaningful impact'
- Never use 'seasoned', 'proven track record', 'make a significant contribution', 'drive meaningful impact', 'high-quality standards'

Job:
- Role: {job_title}
- Company: {company}
- Description: {job_description[:800]}

Candidate:
- Name: {user_name}
- Background: {user_summary[:400]}
- Experience:
{experience_summary}

Return ONLY the 3-paragraph cover letter body. Nothing before it, nothing after it.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=300  # reduced — 3 paragraphs needs 300-400 tokens max
        )

        content = response.choices[0].message.content.strip()

        # Always strip resume bleed regardless of template mode
        content = _strip_resume_bleed(content)

        return content

    except Exception as e:
        print(f"Error generating cover letter: {e}")
        return f"""{company} caught my attention for the {job_title} role because of the specific work described in the listing.

{user_summary[:300]}

My background in building production applications maps directly to what you're looking for. I'd be glad to talk through the specifics."""


def fill_template_placeholders(template: str, values: Dict[str, str]) -> str:
    result = template
    for key, value in values.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, value)
    return result