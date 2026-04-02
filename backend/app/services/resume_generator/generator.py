import os
from typing import Dict, List, Any
from groq import Groq

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

def tailor_summary_to_job(
    original_summary: str,
    job_title: str,
    job_description: str,
    user_experience: List[Dict]
) -> str:
    """
    Use AI to rewrite user's summary to emphasize relevant experience for this job
    """
    
    prompt = f"""You are a professional resume writer. Rewrite this person's professional summary to be perfectly tailored for the job they're applying to.

Original Summary:
{original_summary}

Job Title: {job_title}

Job Description:
{job_description[:1000]}  # First 1000 chars

User's Experience:
{[f"{exp.get('title')} at {exp.get('company')}" for exp in user_experience[:3]]}

Instructions:
- Keep it 2-3 sentences
- Emphasize skills and experience relevant to THIS job
- Use keywords from the job description naturally
- Maintain professional tone
- Don't lie or add skills they don't have
- Make it compelling and achievement-focused

Return ONLY the tailored summary, nothing else.
"""
    
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=300
        )
        
        tailored = response.choices[0].message.content.strip()
        return tailored
        
    except Exception as e:
        print(f"Error tailoring summary: {e}")
        return original_summary  # Fallback to original


def reorder_experience_by_relevance(
    experience: List[Dict],
    job_title: str,
    job_description: str
) -> List[Dict]:
    """
    Reorder experience to show most relevant jobs first
    """
    
    if not experience:
        return []
    
    job_keywords = set(job_description.lower().split()[:100])  # Top 100 keywords
    job_title_words = set(job_title.lower().split())
    
    # Score each experience by relevance
    scored_experience = []
    for exp in experience:
        score = 0
        
        exp_title = exp.get("title", "").lower()
        exp_desc = exp.get("description", "").lower()
        exp_tech = " ".join(exp.get("technologies", [])).lower()
        
        # Score based on title match
        if any(word in exp_title for word in job_title_words):
            score += 10
        
        # Score based on description keyword overlap
        exp_words = set(f"{exp_desc} {exp_tech}".split())
        overlap = len(job_keywords.intersection(exp_words))
        score += overlap
        
        scored_experience.append((score, exp))
    
    # Sort by score (highest first)
    scored_experience.sort(key=lambda x: x[0], reverse=True)
    
    # Return reordered experience
    return [exp for score, exp in scored_experience]


def highlight_relevant_skills(
    user_skills: List[str],
    job_description: str
) -> Dict[str, List[str]]:
    """
    Categorize skills into matched and other
    """
    
    job_desc_lower = job_description.lower()
    
    matched_skills = []
    other_skills = []
    
    for skill in user_skills:
        if skill.lower() in job_desc_lower:
            matched_skills.append(skill)
        else:
            other_skills.append(skill)
    
    return {
        "matched": matched_skills,
        "other": other_skills
    }


def generate_tailored_resume(
    user_profile: Dict,
    job: Dict,
    match_score: int
) -> Dict[str, Any]:
    """
    Generate a tailored resume for a specific job
    
    Returns:
        {
            "tailored_summary": "...",
            "highlighted_skills": ["Python", "React", ...],
            "reordered_experience": [...],
            "match_score": 85,
            "ai_changes": {
                "summary_changed": true,
                "experience_reordered": true,
                "skills_highlighted": true
            }
        }
    """
    
    # Tailor summary
    tailored_summary = tailor_summary_to_job(
        user_profile.get("summary", ""),
        job.get("title", ""),
        job.get("description", ""),
        user_profile.get("experience", [])
    )
    
    # Reorder experience
    reordered_experience = reorder_experience_by_relevance(
        user_profile.get("experience", []),
        job.get("title", ""),
        job.get("description", "")
    )
    
    # Highlight skills
    skills_categorized = highlight_relevant_skills(
        user_profile.get("skills", []),
        job.get("description", "")
    )
    
    # Combine matched skills first, then others
    highlighted_skills = skills_categorized["matched"] + skills_categorized["other"]
    
    return {
        "tailored_summary": tailored_summary,
        "highlighted_skills": highlighted_skills,
        "reordered_experience": reordered_experience,
        "match_score": match_score,
        "ai_changes": {
            "summary_changed": tailored_summary != user_profile.get("summary", ""),
            "experience_reordered": reordered_experience != user_profile.get("experience", []),
            "skills_highlighted": len(skills_categorized["matched"]) > 0
        }
    }