"""
app/services/matching/scorer.py

Two-stage scoring:
1. keyword_prescore()  — instant, used to filter 1000 jobs down to candidates
2. calculate_match_score() — AI via Groq, used only on the 25 displayed jobs
3. score_jobs_batch() — runs AI scoring in parallel via ThreadPoolExecutor

Flow in matcher.py:
  ALL jobs filtered → keyword prescore → top N candidates → AI score 25 → return
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


# ── Language blockers ─────────────────────────────────────────────────

_LANG_PATTERNS = [
    r'\b(fluent|native|proficient|bilingual)\s+(in\s+)?(german|deutsch|french|spanish|portuguese|dutch|italian|polish|swedish|norwegian|danish|finnish)\b',
    r'\b[BC][12]\s+(level\s+)?(german|deutsch|french|spanish|dutch)\b',
    r'\b(german|deutsch|french|spanish|dutch)\s+[BC][12]\b',
    r'\bcommunicat\w+\s+(fluently\s+)?in\s+german\b',
    r'\bsprichst\s+deutsch\b',
    r'\bdeutschkenntnisse\b',
    r'\bminijob\b', r'\bwerkstudent\b', r'\bpraktikum\b',
]

# ── Role category fast detection ──────────────────────────────────────

_NON_TECH_TITLE_SIGNALS = [
    # Sales / BDR
    "sales", "business development", "account executive", "bdr", "sdr",
    # Customer success
    "customer success", "client success", "onboarding specialist",
    # Marketing
    "marketing", "seo", "content creator", "social media",
    # Finance / Accounting
    "accountant", "buchhalter", "buchhaltung", "controller", "cfo",
    "demand planner", "supply chain", "logistics",
    # Legal
    "jurist", "lawyer", "attorney", "rechtsanwalt", "legal",
    # HR
    "recruiter", "talent acquisition", "hr manager", "people ops",
    # Consulting (non-tech)
    "management consultant", "strategy consultant",
]

_TECH_SKILLS = [
    "python", "typescript", "javascript", "react", "node.js", "next.js",
    "postgresql", "mongodb", "redis", "aws", "docker", "kubernetes",
    "fastapi", "django", "flask", "kafka", "airflow", "dbt", "spark",
    "git", "sql", "pandas", "numpy", "pytorch", "tensorflow",
    "rust", "golang", "java", "c++", "graphql", "grpc",
    "terraform", "ansible", "ci/cd", "github actions",
    "data engineering", "data pipeline", "etl", "elt",
]


def keyword_prescore(job: Dict, user_profile: Dict) -> int:
    """
    Fast keyword pre-score (no AI). Returns 0-100.
    Used to filter 1000 jobs down to ~50 candidates before AI scoring.

    Conservative: prefers false positives (keeps borderline jobs)
    over false negatives (dropping good jobs). AI does final accurate scoring.
    """
    user_skills = {s.lower().strip() for s in user_profile.get("skills", [])}

    title = (job.get("title", "") or "").lower()
    description = (job.get("description", "") or job.get("description_text", "") or "").lower()
    text = f"{title} {description[:600]}"

    # Hard blockers → 0
    for pattern in _LANG_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return 0

    # Non-tech role type in title → 5
    if any(signal in title for signal in _NON_TECH_TITLE_SIGNALS):
        return 5

    # Internship/junior indicators → 5
    junior_signals = [
        "internship", "intern ", "praktikum", "werkstudent",
        "minijob", "trainee", "entry level", "entry-level",
        "aushilfe", "studentenjob",
    ]
    if any(s in text for s in junior_signals):
        return 5

    # Skill overlap scoring
    job_skills = {s for s in _TECH_SKILLS if s in description}
    if not job_skills:
        # No recognizable tech skills in description — uncertain, give 30
        return 30

    overlap = job_skills.intersection(user_skills)
    skill_score = min(int((len(overlap) / len(job_skills)) * 100), 100)

    # Minimum 20 if any tech skills present (don't over-penalize unfamiliar tech)
    return max(skill_score, 20)


# ── AI scoring ────────────────────────────────────────────────────────

def _build_prompt(job: Dict, user_profile: Dict) -> str:
    user_skills = user_profile.get("skills", [])
    user_experience = user_profile.get("experience", [])
    user_preferences = user_profile.get("preferences", {})

    exp_lines = "\n".join([
        f"- {e.get('title', '')} at {e.get('company', '')}"
        for e in user_experience[:4]
    ])

    target_roles = user_preferences.get("job_titles", [])
    targets = ", ".join(target_roles) if target_roles else "software/data engineering"
    skills = ", ".join(user_skills[:30])

    title = job.get("title", "")
    desc = (job.get("description", "") or job.get("description_text", "") or "")[:1200]
    location = job.get("location", "")

    return f"""Professional recruiter scoring job fit. Be strict.

CANDIDATE:
- Target: {targets}
- Skills: {skills}
- Experience:
{exp_lines}

JOB:
- Title: {title}
- Location: {location}
- Description: {desc}

RULES:
1. Non-English language required (German C1/B2, French, Dutch etc) + no evidence candidate speaks it → cap 15
2. Wrong role type (legal, accounting, supply chain, marketing, HR, sales consulting) vs engineering/data background → cap 20
3. Internship/Praktikum/Werkstudent/Minijob + candidate has 2+ years experience → cap 15
4. Genuine match on role + skills → 65-95
5. Partial match → 30-64
6. "Automation" in accounting job ≠ data engineering. Score ACTUAL fit.

Return ONLY JSON (no markdown):
{{"match_score":<0-100>,"skills_match":<0-100>,"experience_match":<0-100>,"preferences_match":<0-100>,"matched_skills":[<strings max 5>],"missing_skills":[<strings max 5>],"reason":"<one sentence>"}}"""


def calculate_match_score(job: Dict, user_profile: Dict) -> Dict[str, Any]:
    """AI score one job. Called in parallel from score_jobs_batch."""
    title = job.get("title", "unknown")
    try:
        response = _get_client().chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": _build_prompt(job, user_profile)}],
            temperature=0.1,
            max_tokens=250,
        )
        content = response.choices[0].message.content.strip()

        # Strip code fences
        if "```" in content:
            for part in content.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    content = part
                    break

        result = json.loads(content)
        score = max(0, min(100, int(result.get("match_score", 0))))
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


def score_jobs_batch(jobs: List[Dict], user_profile: Dict, max_workers: int = 8) -> List[Dict]:
    """AI-score a list of jobs in parallel. Returns jobs with match_score added."""
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
                logger.warning(f"[Scorer] Batch item {idx} failed: {e}")
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


def _fallback_score(job: Dict, user_profile: Dict) -> Dict[str, Any]:
    """Keyword fallback when AI fails. Conservative."""
    user_skills = {s.lower().strip() for s in user_profile.get("skills", [])}
    desc = (job.get("description", "") or job.get("description_text", "") or "").lower()
    job_skills = {s for s in _TECH_SKILLS if s in desc}
    matched = list(job_skills.intersection(user_skills))
    score = min(int((len(matched) / max(len(job_skills), 1)) * 65), 65) if job_skills else 15
    return {
        "match_score": score,
        "skills_match": score,
        "experience_match": 40,
        "preferences_match": 40,
        "matched_skills": matched[:5],
        "missing_skills": [],
        "reason": "Keyword fallback (AI unavailable)",
    }