from typing import List, Dict, Any
import re

def calculate_skills_match(job_skills: List[str], user_skills: List[str]) -> float:
    """Calculate skills overlap percentage"""
    if not job_skills or not user_skills:
        return 0.0
    
    # Normalize skills (lowercase, strip spaces)
    job_skills_norm = {skill.lower().strip() for skill in job_skills}
    user_skills_norm = {skill.lower().strip() for skill in user_skills}
    
    # Calculate overlap
    overlap = job_skills_norm.intersection(user_skills_norm)
    
    if not job_skills_norm:
        return 0.0
    
    # Percentage of job skills that user has
    match_percentage = (len(overlap) / len(job_skills_norm)) * 100
    
    return min(match_percentage, 100.0)


def calculate_experience_match(job_title: str, job_description: str, user_experience: List[Dict]) -> float:
    """Calculate experience relevance using keyword matching"""
    if not user_experience:
        return 0.0
    
    # Extract keywords from job
    job_text = f"{job_title} {job_description}".lower()
    
    # Common job level keywords
    level_keywords = {
        "senior": ["senior", "lead", "principal", "staff"],
        "mid": ["mid", "intermediate", "ii", "iii"],
        "junior": ["junior", "entry", "associate", "i"]
    }
    
    # Detect job level
    job_level = "mid"  # default
    for level, keywords in level_keywords.items():
        if any(kw in job_text for kw in keywords):
            job_level = level
            break
    
    # Calculate years of experience from user profile
    total_years = 0
    relevant_experience = 0
    
    for exp in user_experience:
        # Estimate years (simplified - you can improve this)
        if exp.get("start_date") and exp.get("end_date"):
            # This is simplified - parse dates properly in production
            total_years += 1  # Assume 1 year per job for now
        
        # Check if experience is relevant
        exp_text = f"{exp.get('title', '')} {exp.get('description', '')}".lower()
        exp_technologies = [t.lower() for t in exp.get("technologies", [])]
        
        # Check for keyword overlap
        if any(keyword in exp_text for keyword in job_text.split()[:20]):  # Top 20 keywords
            relevant_experience += 1
    
    # Score based on experience level match
    experience_score = 50.0  # base score
    
    if job_level == "senior" and total_years >= 5:
        experience_score = 90.0
    elif job_level == "mid" and 2 <= total_years <= 7:
        experience_score = 85.0
    elif job_level == "junior" and total_years <= 3:
        experience_score = 80.0
    
    # Boost score if relevant experience exists
    if relevant_experience > 0:
        experience_score += min(relevant_experience * 10, 20)
    
    return min(experience_score, 100.0)


def calculate_preferences_match(job: Dict, user_preferences: Dict) -> float:
    """Calculate how well job matches user preferences"""
    if not user_preferences:
        return 70.0  # neutral score if no preferences
    
    score = 0.0
    total_checks = 0
    
    # Remote preference
    if user_preferences.get("remote_only"):
        total_checks += 1
        if job.get("remote"):
            score += 100
    
    # Location preference
    preferred_locations = user_preferences.get("preferred_locations", [])
    if preferred_locations:
        total_checks += 1
        job_location = job.get("location", "").lower()
        if any(loc.lower() in job_location for loc in preferred_locations):
            score += 100
        elif job.get("remote"):  # Remote jobs match any location
            score += 80
    
    # Salary preference
    salary_min = user_preferences.get("salary_min")
    if salary_min:
        total_checks += 1
        # This is simplified - extract salary from job description in production
        # For now, give neutral score
        score += 70
    
    # Job types (Full Stack, Backend, etc.)
    job_types = user_preferences.get("job_types", [])
    if job_types:
        total_checks += 1
        job_title = job.get("title", "").lower()
        if any(jt.lower() in job_title for jt in job_types):
            score += 100
        else:
            score += 40
    
    if total_checks == 0:
        return 70.0
    
    return score / total_checks


def calculate_match_score(job: Dict, user_profile: Dict) -> Dict[str, Any]:
    """
    Calculate overall match score between job and user profile
    
    Returns:
        {
            "match_score": 85,
            "skills_match": 90,
            "experience_match": 80,
            "preferences_match": 85,
            "matched_skills": ["Python", "React"],
            "missing_skills": ["AWS", "Docker"]
        }
    """
    # Extract job skills from description
    job_skills = job.get("skills", [])
    if not job_skills and job.get("description"):
        # Extract skills from description (simplified)
        # In production, use NLP or predefined skill list
        common_skills = [
            "Python", "JavaScript", "React", "Node.js", "TypeScript",
            "Java", "Go", "Rust", "C++", "SQL", "PostgreSQL", "MongoDB",
            "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git",
            "FastAPI", "Django", "Flask", "Next.js", "Vue", "Angular"
        ]
        description_lower = job.get("description", "").lower()
        job_skills = [skill for skill in common_skills if skill.lower() in description_lower]
    
    # Get user data
    user_skills = user_profile.get("skills", [])
    user_experience = user_profile.get("experience", [])
    user_preferences = user_profile.get("preferences", {})
    
    # Calculate individual scores
    skills_score = calculate_skills_match(job_skills, user_skills)
    experience_score = calculate_experience_match(
        job.get("title", ""),
        job.get("description", ""),
        user_experience
    )
    preferences_score = calculate_preferences_match(job, user_preferences)
    
    # Weighted average
    match_score = (
        skills_score * 0.4 +
        experience_score * 0.3 +
        preferences_score * 0.3
    )
    
    # Matched and missing skills
    job_skills_norm = {skill.lower().strip() for skill in job_skills}
    user_skills_norm = {skill.lower().strip() for skill in user_skills}
    
    matched_skills = list(job_skills_norm.intersection(user_skills_norm))
    missing_skills = list(job_skills_norm - user_skills_norm)
    
    return {
        "match_score": round(match_score),
        "skills_match": round(skills_score),
        "experience_match": round(experience_score),
        "preferences_match": round(preferences_score),
        "matched_skills": matched_skills[:10],  # Top 10
        "missing_skills": missing_skills[:5],   # Top 5
    }