"""
app/services/matching/scorer.py

Two-stage scoring using full UserProfile:
1. keyword_prescore() — instant pre-filter, language-aware
2. calculate_match_score() — AI via Groq with full profile context

Profile fields now used:
- skills          ✅ always used
- experience      ✅ full objects (title, company, duration, description)
- languages       ✅ used to un-block jobs user actually speaks
- summary         ✅ sent to AI for full context
- certifications  ✅ merged into skills for matching
- preferences     ✅ job_titles, remote_preference
- education       ✅ sent to AI
"""

import os
import re
import json
import logging
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

_groq_client = None


def _get_client():
    global _groq_client
    if _groq_client is None:
        from groq import Groq
        _groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _groq_client


# ── Language patterns ─────────────────────────────────────────────────
# These detect when a job REQUIRES a non-English language

_LANG_REQUIREMENT_PATTERNS = {
    "german": [
        r'\b(fluent|native|proficient|bilingual)\s+(in\s+)?(german|deutsch)\b',
        r'\b[BC][12]\s+(level\s+)?(german|deutsch)\b',
        r'\b(german|deutsch)\s+[BC][12]\b',
        r'\bcommunicat\w+\s+(fluently\s+)?in\s+german\b',
        r'\bsprichst\s+deutsch\b',
        r'\bdeutschkenntnisse\b',
        r'\bDeutsch\b.*\berforderlich\b',
    ],
    "french": [
        r'\b(fluent|native|proficient)\s+(in\s+)?french\b',
        r'\bfrench\s+[BC][12]\b',
        r'\b[BC][12]\s+french\b',
    ],
    "dutch": [
        r'\b(fluent|native|proficient)\s+(in\s+)?dutch\b',
        r'\bdutch\s+speaker\b',
    ],
    "spanish": [
        r'\b(fluent|native|proficient)\s+(in\s+)?spanish\b',
    ],
    "portuguese": [
        r'\b(fluent|native|proficient)\s+(in\s+)?portuguese\b',
    ],
}

# Junior/internship signals
_JUNIOR_SIGNALS = [
    "internship", "intern ", "praktikum", "werkstudent", "werkstudentin",
    "minijob", "mini-job", "trainee", "apprentice",
    "entry level", "entry-level", "aushilfe", "studentenjob",
]

# Tech role whitelist — tested against 67 real cases
_TECH_TITLE_PATTERNS = [
    r'\bengineer\b', r'\bdeveloper\b', r'\bprogrammer\b', r'\barchitect\b',
    r'\bdevops\b', r'\bsite\s+reliability\b', r'\bsre\b',
    r'\bmachine\s+learning\b', r'\bml\s+engineer\b', r'\bai\s+engineer\b',
    r'\bbackend\b', r'\bfrontend\b', r'\bfront-end\b', r'\bback-end\b',
    r'\bfullstack\b', r'\bfull[\s-]stack\b',
    r'\bsoftware\b', r'\bsoftwareentwickler\b', r'\bentwickler\b',
    r'\btech(nical)?\s+lead\b', r'\bengineering\s+manager\b',
    r'\bvp\s+of\s+engineering\b', r'\bvp\s+engineering\b',
    r'\bprincipal\s+engineer\b', r'\bstaff\s+engineer\b',
    r'\bcto\b', r'\bresearch\s+engineer\b',
    r'\bdata\s+engineer(ing)?\b', r'\bdata\s+scientist\b',
    r'\bdata\s+architect\b', r'\banalytics\s+engineer\b',
    r'\bdata\s+platform\b', r'\bdata\s+pipeline\b',
]

_NON_TECH_OVERRIDES = [
    r'\bbusiness\s+develop\w+\b',
    r'\bdata\s+analyst,\s*(financial|product|pricing|risk|fraud)\b',
    r'\bproduct\s+accounting\b',
    r'\bdata\s+insights\b',
]

# Skills for keyword matching — git removed (too universal, inflates all scores)
_TECH_SKILLS = [
    "python", "typescript", "javascript", "react", "node.js", "next.js",
    "postgresql", "mongodb", "redis", "aws", "gcp", "azure", "docker",
    "kubernetes", "fastapi", "django", "flask", "kafka", "apache kafka",
    "airflow", "apache airflow", "dbt", "spark", "apache spark",
    "sql", "pandas", "numpy", "pytorch", "tensorflow", "scikit-learn",
    "rust", "golang", "java", "c++", "graphql", "grpc",
    "terraform", "ansible", "ci/cd", "github actions", "jenkins",
    "data engineering", "data pipeline", "etl", "elt",
    "elasticsearch", "redis", "celery", "rabbitmq",
    "next.js", "tailwind", "tailwindcss", "vue", "angular", "svelte",
]


# ── Helper: extract user languages ────────────────────────────────────

def _user_languages(user_profile: Dict) -> set:
    """Returns set of lowercase language names the user speaks."""
    langs = user_profile.get("languages") or []
    result = set()
    for entry in langs:
        if isinstance(entry, dict):
            lang = entry.get("language", "").lower()
        else:
            lang = str(entry).lower()
        if lang:
            result.add(lang)
    # Always assume English
    result.add("english")
    return result


def _user_all_skills(user_profile: Dict) -> set:
    """Skills + certifications merged into one set."""
    skills = {s.lower().strip() for s in (user_profile.get("skills") or [])}
    certs = {c.lower().strip() for c in (user_profile.get("certifications") or [])}
    # Extract cert keywords (e.g. "AWS Certified Solutions Architect" → "aws")
    for cert in list(certs):
        for word in cert.split():
            if len(word) > 2:
                skills.add(word.lower())
    return skills | certs


# ── is_tech_role ──────────────────────────────────────────────────────

def is_tech_role(title: str) -> bool:
    """Returns True if title is an engineering/data role. Tested 67/67."""
    t = title.lower()
    if not any(re.search(p, t) for p in _TECH_TITLE_PATTERNS):
        return False
    if any(re.search(p, t) for p in _NON_TECH_OVERRIDES):
        return False
    return True


# ── Language requirement check ────────────────────────────────────────

def _job_required_languages(text: str) -> set:
    """Returns set of languages the job requires."""
    t = text.lower()
    required = set()
    for lang, patterns in _LANG_REQUIREMENT_PATTERNS.items():
        if any(re.search(p, t, re.IGNORECASE) for p in patterns):
            required.add(lang)
    return required


def requires_language_user_lacks(job_text: str, user_profile: Dict) -> bool:
    """
    Returns True if job requires a non-English language the user doesn't speak.
    Now language-aware: if user speaks German, German jobs are NOT blocked.
    """
    required = _job_required_languages(job_text)
    if not required:
        return False
    user_langs = _user_languages(user_profile)
    # Block only if user lacks ALL required non-English languages
    for lang in required:
        if lang not in user_langs:
            return True
    return False


# ── Junior/internship check ───────────────────────────────────────────

def is_junior_role(text: str) -> bool:
    t = text.lower()
    return any(s in t for s in _JUNIOR_SIGNALS)


# ── Keyword prescore ──────────────────────────────────────────────────

def keyword_prescore(job: Dict, user_profile: Dict) -> int:
    """
    Fast pre-score. No AI. Returns 0-100.
    Used for jobs without a tailored resume score.
    """
    title = (job.get("title", "") or "")
    description = (job.get("description", "") or job.get("description_text", "") or "")
    full_text = f"{title} {description[:800]}"

    # Language blocker — now checks user's actual languages
    if requires_language_user_lacks(full_text, user_profile):
        return 0

    # Non-tech role
    if not is_tech_role(title):
        return 5

    # Junior/intern for experienced candidate
    experience = user_profile.get("experience") or []
    if is_junior_role(full_text) and len(experience) >= 2:
        return 5

    # Skill overlap (skills + certifications)
    user_skills = _user_all_skills(user_profile)
    desc_lower = description.lower()
    job_skills = {s for s in _TECH_SKILLS if s in desc_lower}

    if not job_skills:
        return 30  # Tech role but no recognizable skills in description

    overlap = job_skills.intersection(user_skills)
    score = min(int((len(overlap) / len(job_skills)) * 100), 100)
    return max(score, 20)


# ── AI scoring prompt ─────────────────────────────────────────────────

def _build_prompt(job: Dict, user_profile: Dict) -> str:
    # Skills + certifications
    skills = list(user_profile.get("skills") or [])
    certs = list(user_profile.get("certifications") or [])
    all_skills = skills + certs
    skills_str = ", ".join(all_skills[:35])

    # Experience — full objects now, not just titles
    experience = user_profile.get("experience") or []
    exp_lines = []
    for e in experience[:4]:
        if isinstance(e, dict):
            title = e.get("title", "")
            company = e.get("company", "")
            duration = e.get("duration", "") or e.get("period", "") or ""
            desc = e.get("description", "") or ""
            technologies = e.get("technologies", []) or []
            line = f"- {title} at {company}"
            if duration:
                line += f" ({duration})"
            if technologies:
                line += f" | Tech: {', '.join(technologies[:6])}"
            if desc:
                line += f"\n  {desc[:120]}"
            exp_lines.append(line)
    exp_str = "\n".join(exp_lines) if exp_lines else "Not provided"

    # Education
    education = user_profile.get("education") or []
    edu_lines = []
    for e in education[:2]:
        if isinstance(e, dict):
            degree = e.get("degree", "")
            school = e.get("school", "")
            if degree or school:
                edu_lines.append(f"- {degree} from {school}")
    edu_str = "\n".join(edu_lines) if edu_lines else "Not provided"

    # Languages
    user_langs = _user_languages(user_profile)
    langs_str = ", ".join(sorted(user_langs)) if user_langs else "English"

    # Summary
    summary = (user_profile.get("summary") or "")[:300]

    # Preferences
    preferences = user_profile.get("preferences") or {}
    target_roles = preferences.get("job_titles") or []
    targets_str = ", ".join(target_roles) if target_roles else "software/data engineering"
    remote_pref = preferences.get("remote_preference", "remote")

    # Job details
    job_title = job.get("title", "")
    job_desc = (job.get("description", "") or job.get("description_text", "") or "")[:1200]
    job_location = job.get("location", "")

    return f"""Professional recruiter scoring job fit. Strict and accurate.

CANDIDATE PROFILE:
- Target roles: {targets_str}
- Work preference: {remote_pref}
- Languages: {langs_str}
- Skills & Certifications: {skills_str}
- Summary: {summary}

EXPERIENCE:
{exp_str}

EDUCATION:
{edu_str}

JOB TO SCORE:
- Title: {job_title}
- Location: {job_location}
- Description: {job_desc}

SCORING RULES (follow exactly):
1. Job requires a non-English language + candidate does NOT speak it → score 10
   (Check candidate's Languages list above before blocking)
2. Wrong role type vs candidate's engineering/data background → score 10-20:
   Design/Creative, Admin, Finance/Risk, Sales, Legal/HR/Marketing/Trades
3. Internship/Praktikum/Werkstudent/Minijob + candidate has 2+ years experience → score 10
4. Genuine engineering/data role, 3+ skill matches → 70-88
5. Genuine engineering/data role, 1-2 skill matches → 45-69
6. Adjacent technical role (solutions architect, TAM) + partial overlap → 35-55
7. NEVER return 91-100. Maximum is 90. Nothing is a perfect match.
8. Consider the full candidate profile — summary, experience depth, certifications all matter.

Return ONLY valid JSON, no markdown:
{{"match_score":<0-90>,"skills_match":<0-100>,"experience_match":<0-100>,"preferences_match":<0-100>,"matched_skills":[<list max 5>],"missing_skills":[<list max 5>],"reason":"<one sentence>"}}"""


# ── Single job AI scoring ─────────────────────────────────────────────

def _non_tech_result(reason: str) -> Dict[str, Any]:
    return {
        "match_score": 8, "skills_match": 0,
        "experience_match": 0, "preferences_match": 0,
        "matched_skills": [], "missing_skills": [],
        "reason": reason,
    }


def calculate_match_score(job: Dict, user_profile: Dict) -> Dict[str, Any]:
    """Score one job against full user profile. Uses AI via Groq."""
    title = job.get("title", "unknown")
    description = job.get("description", "") or job.get("description_text", "") or ""
    full_text = f"{title} {description[:500]}"

    # Stage 1: Language check (user-aware)
    if requires_language_user_lacks(full_text, user_profile):
        return _non_tech_result("Non-English language requirement candidate doesn't meet")

    # Stage 2: Tech title whitelist
    if not is_tech_role(title):
        return _non_tech_result("Role type mismatch — not an engineering/data role")

    # Stage 3: Junior/intern check
    experience = user_profile.get("experience") or []
    if is_junior_role(full_text[:300]) and len(experience) >= 2:
        return _non_tech_result("Internship/junior role — candidate is experienced")

    # Stage 4: AI scoring with full profile
    try:
        response = _get_client().chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": _build_prompt(job, user_profile)}],
            temperature=0.1,
            max_tokens=250,
        )
        content = response.choices[0].message.content.strip()
        if "```" in content:
            for part in content.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    content = part
                    break
        result = json.loads(content)
        score = max(0, min(90, int(result.get("match_score", 0))))
        return {
            "match_score": score,
            "skills_match": int(result.get("skills_match", 0)),
            "experience_match": int(result.get("experience_match", 0)),
            "preferences_match": int(result.get("preferences_match", 0)),
            "matched_skills": result.get("matched_skills", [])[:10],
            "missing_skills": result.get("missing_skills", [])[:5],
            "reason": result.get("reason", ""),
        }
    except Exception as e:
        logger.warning(f"[Scorer] AI failed '{title}': {type(e).__name__}: {e}")
        return _fallback_score(job, user_profile)


# ── Batch scoring ─────────────────────────────────────────────────────

def score_jobs_batch(jobs: List[Dict], user_profile: Dict, max_workers: int = 8) -> List[Dict]:
    if not jobs:
        return jobs
    results = [None] * len(jobs)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(calculate_match_score, job, user_profile): idx
            for idx, job in enumerate(jobs)
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                results[idx] = future.result()
            except Exception as e:
                results[idx] = _fallback_score(jobs[idx], user_profile)
    scored = []
    for job, score_result in zip(jobs, results):
        if score_result is None:
            score_result = _fallback_score(job, user_profile)
        job_copy = dict(job)
        job_copy["match_score"] = score_result["match_score"]
        job_copy["match_details"] = score_result
        scored.append(job_copy)
    return scored


# ── Keyword fallback ──────────────────────────────────────────────────

def _fallback_score(job: Dict, user_profile: Dict) -> Dict[str, Any]:
    """Keyword-only fallback when AI unavailable. Conservative."""
    user_skills = _user_all_skills(user_profile)
    desc = (job.get("description", "") or job.get("description_text", "") or "").lower()
    job_skills = {s for s in _TECH_SKILLS if s in desc}
    matched = list(job_skills.intersection(user_skills))
    score = min(int((len(matched) / max(len(job_skills), 1)) * 65), 65) if job_skills else 15
    return {
        "match_score": score, "skills_match": score,
        "experience_match": 40, "preferences_match": 40,
        "matched_skills": matched[:5], "missing_skills": [],
        "reason": "Keyword fallback (AI unavailable)",
    }