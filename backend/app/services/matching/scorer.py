from typing import List, Dict, Any
import re

# ── Role categories ───────────────────────────────────────────────────
# Maps role keywords to category labels.
# Used to detect role type mismatch between job and user profile.

ROLE_CATEGORIES = {
    "engineering": [
        "software engineer", "software developer", "backend", "frontend",
        "full stack", "fullstack", "full-stack", "data engineer", "devops",
        "platform engineer", "site reliability", "sre", "ml engineer",
        "machine learning engineer", "ai engineer", "infrastructure",
        "embedded", "systems engineer", "cloud engineer", "mobile developer",
        "ios developer", "android developer", "python developer",
        "javascript developer", "typescript developer", "rust developer",
        "golang developer", "java developer",
    ],
    "data": [
        "data analyst", "data scientist", "analytics engineer",
        "business intelligence", "bi developer", "data architect",
        "data engineer", "analytics",
    ],
    "product": [
        "product manager", "product owner", "program manager",
        "project manager", "scrum master",
    ],
    "design": [
        "ux designer", "ui designer", "product designer", "graphic designer",
        "visual designer", "motion designer", "design lead",
    ],
    "marketing": [
        "marketing manager", "content marketing", "growth marketer",
        "seo", "sem", "social media", "brand manager", "copywriter",
        "content creator", "digital marketing", "performance marketing",
        "influencer marketing",
    ],
    "sales": [
        "sales", "account executive", "business development",
        "account manager", "sales manager", "sales rep",
    ],
    "customer_success": [
        "customer success", "client success", "customer support",
        "customer service", "account management", "onboarding specialist",
        "client onboarding", "technical support", "support engineer",
        "help desk",
    ],
    "operations": [
        "operations manager", "operations analyst", "chief of staff",
        "business operations", "revenue operations", "revops",
    ],
    "finance": [
        "financial analyst", "accountant", "controller", "cfo",
        "finance manager", "bookkeeper",
    ],
    "hr": [
        "recruiter", "talent acquisition", "hr manager", "people ops",
        "human resources",
    ],
}

# Hard language requirement patterns
LANGUAGE_REQUIREMENTS = [
    r'\b(fluent|native|proficient|bilingual)\s+(in\s+)?(german|deutsch|french|spanish|portuguese|dutch|italian|polish|swedish|norwegian|danish|finnish)\b',
    r'\b(german|deutsch|french|spanish|portuguese|dutch)\s+(language\s+)?(required|mandatory|must|essential|needed)\b',
    r'\bspeaking\s+(german|deutsch|french|spanish|portuguese|dutch)\b',
    r'\b(german|french|spanish)\s+speaking\b',
    r'\bsprichst\s+deutsch\b',  # German "you speak German"
    r'\bdeutschkenntnisse\b',   # German "German skills"
    r'\bDeutsch\b.*\berforderlich\b',  # German required
]


def detect_role_category(title: str, description: str) -> str:
    """Detect the primary role category from job title and description."""
    text = f"{title} {description[:500]}".lower()

    category_scores = {}
    for category, keywords in ROLE_CATEGORIES.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            category_scores[category] = score

    if not category_scores:
        return "other"

    return max(category_scores, key=category_scores.get)


def detect_user_category(user_skills: List[str], user_experience: List[Dict]) -> str:
    """Infer user's role category from their skills and experience titles."""
    # Build text from experience titles
    experience_titles = " ".join([
        exp.get("title", "") for exp in user_experience
    ]).lower()

    skills_text = " ".join(user_skills).lower()
    combined = f"{experience_titles} {skills_text}"

    # Engineering signals
    eng_signals = [
        "engineer", "developer", "python", "javascript", "typescript",
        "react", "fastapi", "django", "kafka", "airflow", "dbt",
        "docker", "kubernetes", "aws", "postgresql", "mongodb",
        "data pipeline", "etl", "elt", "spark", "hadoop",
    ]

    data_signals = [
        "data engineer", "data analyst", "data scientist", "airflow",
        "kafka", "dbt", "spark", "etl", "pipeline", "lakehouse",
        "medallion", "parquet", "snowflake", "databricks",
    ]

    data_score = sum(1 for s in data_signals if s in combined)
    eng_score = sum(1 for s in eng_signals if s in combined)

    if data_score >= 3:
        return "data"
    if eng_score >= 3:
        return "engineering"

    return "engineering"  # default for tech profiles


def check_hard_blockers(job_description: str) -> Dict[str, bool]:
    """
    Detect hard requirements that are likely blockers.
    Returns dict of blocker type → True if detected.
    """
    text = job_description.lower()
    blockers = {}

    # Language requirements
    for pattern in LANGUAGE_REQUIREMENTS:
        if re.search(pattern, text, re.IGNORECASE):
            blockers["non_english_language_required"] = True
            break

    return blockers


def calculate_skills_match(job_skills: List[str], user_skills: List[str], job_description: str = "") -> float:
    """Calculate skills overlap. Extracts skills from description if job_skills is empty."""

    # Extract skills from description if not provided
    if not job_skills and job_description:
        KNOWN_SKILLS = [
            "python", "javascript", "typescript", "react", "node.js", "next.js",
            "vue", "angular", "java", "go", "rust", "c++", "c#", "ruby", "php",
            "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
            "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
            "fastapi", "django", "flask", "express", "spring",
            "kafka", "airflow", "dbt", "spark", "hadoop", "flink",
            "git", "linux", "graphql", "rest", "grpc",
            "pandas", "numpy", "pytorch", "tensorflow", "scikit-learn",
        ]
        desc_lower = job_description.lower()
        job_skills = [s for s in KNOWN_SKILLS if s in desc_lower]

    if not job_skills or not user_skills:
        return 0.0

    job_norm = {s.lower().strip() for s in job_skills}
    user_norm = {s.lower().strip() for s in user_skills}

    overlap = job_norm.intersection(user_norm)

    if not job_norm:
        return 0.0

    return min((len(overlap) / len(job_norm)) * 100, 100.0)


def calculate_experience_match(
    job_title: str,
    job_description: str,
    user_experience: List[Dict],
    user_skills: List[str],
    job_category: str,
    user_category: str,
) -> float:
    """
    Calculate experience match.
    Penalizes heavily for role category mismatch.
    No artificial base score — starts at 0.
    """

    # Hard penalty for role category mismatch
    COMPATIBLE = {
        "engineering": {"engineering", "data"},
        "data": {"data", "engineering"},
        "product": {"product"},
        "design": {"design"},
        "marketing": {"marketing"},
        "sales": {"sales"},
        "customer_success": {"customer_success"},
        "operations": {"operations"},
        "finance": {"finance"},
        "hr": {"hr"},
        "other": set(ROLE_CATEGORIES.keys()),  # other matches anything
    }

    user_compatible = COMPATIBLE.get(user_category, set())
    if job_category not in user_compatible and job_category != "other":
        # Role mismatch — cap experience score at 20
        return 10.0

    if not user_experience:
        return 20.0

    # Check experience title relevance
    job_text = f"{job_title} {job_description[:300]}".lower()

    # Remove stop words for cleaner matching
    stop_words = {"the", "and", "for", "with", "you", "are", "this", "that",
                  "will", "have", "from", "your", "our", "we", "be", "to",
                  "of", "in", "is", "it", "as", "at", "by", "an", "a"}

    job_words = {w for w in re.findall(r'\b\w+\b', job_text) if w not in stop_words and len(w) > 3}

    relevant_roles = 0
    for exp in user_experience:
        exp_text = f"{exp.get('title', '')} {exp.get('description', '')}".lower()
        exp_words = set(re.findall(r'\b\w+\b', exp_text))
        overlap = job_words.intersection(exp_words)
        if len(overlap) >= 3:
            relevant_roles += 1

    # Score based on relevant experience found
    if relevant_roles >= 2:
        base = 85.0
    elif relevant_roles == 1:
        base = 70.0
    else:
        base = 35.0

    # Boost for matching skills in user's background
    skill_boost = 0
    user_skill_set = {s.lower() for s in user_skills}
    job_lower = job_text.lower()
    for skill in user_skill_set:
        if skill in job_lower:
            skill_boost += 3

    return min(base + skill_boost, 100.0)


def calculate_preferences_match(job: Dict, user_preferences: Dict) -> float:
    """
    Match job against user preferences.
    No artificial floor — if preferences don't match, score is low.
    """
    if not user_preferences:
        return 50.0  # neutral — not 70

    score = 0.0
    total_weight = 0.0

    # Remote preference (weight: 30)
    if "remote_only" in user_preferences:
        total_weight += 30
        if user_preferences["remote_only"] and job.get("remote"):
            score += 30
        elif not user_preferences["remote_only"]:
            score += 30  # not remote-only, any job is fine

    # Job type match (weight: 40)
    job_types = user_preferences.get("job_types", [])
    if job_types:
        total_weight += 40
        job_title = job.get("title", "").lower()
        if any(jt.lower() in job_title for jt in job_types):
            score += 40
        else:
            score += 10  # partial — wrong type

    # Location (weight: 30)
    preferred_locations = user_preferences.get("preferred_locations", [])
    if preferred_locations:
        total_weight += 30
        job_location = job.get("location", "").lower()
        if any(loc.lower() in job_location for loc in preferred_locations):
            score += 30
        elif job.get("remote"):
            score += 25  # remote is fine for any location preference

    if total_weight == 0:
        return 50.0

    return (score / total_weight) * 100


def calculate_match_score(job: Dict, user_profile: Dict) -> Dict[str, Any]:
    """
    Calculate overall match score between job and user profile.

    Weights:
    - Skills match: 50% (most important — concrete and measurable)
    - Experience match: 35% (includes role category penalty)
    - Preferences match: 15% (nice to have)

    Hard blockers cap the score regardless of other signals.
    """
    user_skills = user_profile.get("skills", [])
    user_experience = user_profile.get("experience", [])
    user_preferences = user_profile.get("preferences", {})

    job_title = job.get("title", "")
    job_description = job.get("description", "")
    job_skills = job.get("skills", [])

    # Detect categories
    job_category = detect_role_category(job_title, job_description)
    user_category = detect_user_category(user_skills, user_experience)

    # Check hard blockers
    blockers = check_hard_blockers(job_description)

    # Calculate component scores
    skills_score = calculate_skills_match(job_skills, user_skills, job_description)

    experience_score = calculate_experience_match(
        job_title,
        job_description,
        user_experience,
        user_skills,
        job_category,
        user_category,
    )

    preferences_score = calculate_preferences_match(job, user_preferences)

    # Weighted score
    raw_score = (
        skills_score * 0.50 +
        experience_score * 0.35 +
        preferences_score * 0.15
    )

    # Apply hard blocker penalties
    if blockers.get("non_english_language_required"):
        raw_score = min(raw_score, 25.0)

    final_score = round(raw_score)

    # Matched and missing skills for display
    job_skills_for_display = job_skills or [
        s for s in [
            "python", "typescript", "react", "postgresql", "aws", "docker",
            "kafka", "airflow", "dbt", "fastapi", "node.js", "kubernetes",
        ]
        if s in job_description.lower()
    ]

    job_norm = {s.lower().strip() for s in job_skills_for_display}
    user_norm = {s.lower().strip() for s in user_skills}

    matched = list(job_norm.intersection(user_norm))
    missing = list(job_norm - user_norm)

    return {
        "match_score": final_score,
        "skills_match": round(skills_score),
        "experience_match": round(experience_score),
        "preferences_match": round(preferences_score),
        "matched_skills": matched[:10],
        "missing_skills": missing[:5],
        "job_category": job_category,
        "user_category": user_category,
        "blockers": list(blockers.keys()),
    }