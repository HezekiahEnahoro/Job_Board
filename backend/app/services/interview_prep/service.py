import os
import json
from groq import Groq
from typing import Dict, Any

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_interview_prep(job_title: str, company: str, job_description: str, user_profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate comprehensive interview prep using AI
    
    Args:
        job_title: Job title
        company: Company name
        job_description: Full job description
        user_profile: User's skills, experience, etc.
    
    Returns:
        Dictionary with all prep content
    """
    
    # Extract user skills
    user_skills = user_profile.get("skills", [])
    user_experience = user_profile.get("experience", [])
    
    prompt = f"""You are an expert interview coach. Generate a comprehensive interview preparation guide for this job application.

JOB DETAILS:
Title: {job_title}
Company: {company}
Description: {job_description}

CANDIDATE PROFILE:
Skills: {', '.join(user_skills[:10])}
Experience Level: {len(user_experience)} years

Generate a JSON response with the following structure:
{{
    "company_overview": "2-3 sentence overview of the company and what they do",
    "company_culture": "Description of company culture and values based on job posting",
    "recent_news": ["News item 1", "News item 2", "News item 3"],
    
    "technical_questions": [
        {{"question": "Question text", "topic": "Topic area", "difficulty": "Easy/Medium/Hard", "sample_answer": "Brief answer outline"}},
        // 5-8 questions total
    ],
    
    "behavioral_questions": [
        {{"question": "Question text", "category": "Category", "star_tip": "STAR method tip for this question"}},
        // 5-6 questions total
    ],
    
    "questions_to_ask": [
        {{"question": "Question text", "why_ask": "Why this question is valuable", "category": "Role/Team/Company/Growth"}},
        // 6-8 questions total
    ],
    
    "preparation_tips": [
        "Tip 1",
        "Tip 2",
        // 5-7 tips total
    ],
    
    "key_skills_to_highlight": [
        "Skill 1 from their background that matches job",
        "Skill 2",
        // 5-8 skills
    ]
}}

Focus on:
1. Company-specific questions based on their industry/products
2. Technical questions matching the job requirements
3. Behavioral questions for the role level (junior/mid/senior)
4. Smart questions that show research and interest
5. Actionable preparation tips

Return ONLY valid JSON, no markdown or explanations."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an expert interview preparation coach. Generate detailed, personalized interview prep guides."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        prep_data = json.loads(content)
        
        return prep_data
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
        print(f"Response content: {content}")
        return generate_fallback_prep(job_title, company)
    except Exception as e:
        print(f"❌ Error generating prep: {e}")
        return generate_fallback_prep(job_title, company)


def generate_fallback_prep(job_title: str, company: str) -> Dict[str, Any]:
    """Fallback prep data if AI fails"""
    return {
        "company_overview": f"{company} is hiring for {job_title}. Research their products, mission, and recent news.",
        "company_culture": "Research the company's values, team structure, and work environment on their careers page and LinkedIn.",
        "recent_news": [
            "Check company website for recent announcements",
            "Search LinkedIn for company updates",
            "Review Glassdoor for employee insights"
        ],
        "technical_questions": [
            {"question": "Tell me about your experience with the technologies mentioned in the job description.", "topic": "Experience", "difficulty": "Medium", "sample_answer": "Focus on specific projects and impact"},
            {"question": "How do you approach problem-solving in your work?", "topic": "Problem Solving", "difficulty": "Medium", "sample_answer": "Use a specific example with measurable results"},
        ],
        "behavioral_questions": [
            {"question": "Tell me about a time you faced a challenge at work and how you overcame it.", "category": "Problem Solving", "star_tip": "Situation: Set context. Task: Your responsibility. Action: What you did. Result: Outcome with metrics."},
            {"question": "Describe a situation where you had to work with a difficult team member.", "category": "Teamwork", "star_tip": "Focus on communication, empathy, and positive resolution."},
        ],
        "questions_to_ask": [
            {"question": "What does success look like in this role in the first 6 months?", "why_ask": "Shows you're thinking about impact and expectations", "category": "Role"},
            {"question": "How does the team approach collaboration and knowledge sharing?", "why_ask": "Demonstrates interest in team dynamics", "category": "Team"},
        ],
        "preparation_tips": [
            "Review the job description and match your experience to each requirement",
            "Prepare 3-5 STAR method stories showcasing your skills",
            "Research the company's products, competitors, and recent news",
            "Practice answering common questions out loud",
            "Prepare thoughtful questions about the role and company"
        ],
        "key_skills_to_highlight": [
            "Technical skills matching job requirements",
            "Relevant project experience",
            "Problem-solving abilities",
            "Team collaboration",
            "Communication skills"
        ]
    }