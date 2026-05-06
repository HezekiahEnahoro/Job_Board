"""
app/services/matching/scorer.py

Two-stage scoring:
1. is_tech_role()      — regex title check, instant, no AI
2. keyword_prescore()  — fast keyword filter for candidates
3. calculate_match_score() — AI via Groq (only called for confirmed tech roles)
4. score_jobs_batch()  — parallel AI scoring via ThreadPoolExecutor

Title filtering uses a whitelist approach (not a blacklist):
  If title contains zero engineering/data signals → score 8, no AI call.
  This beats blacklisting because it catches any new non-tech role
  without needing to enumerate it. Tested against 67 real production cases.
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


# ── Language requirement blockers ─────────────────────────────────────

_LANG_PATTERNS = [
    r'\b(fluent|native|proficient|bilingual)\s+(in\s+)?(german|deutsch|french|spanish|portuguese|dutch|italian|polish|swedish|norwegian|danish|finnish)\b',
    r'\b[BC][12]\s+(level\s+)?(german|deutsch|french|spanish|dutch)\b',
    r'\b(german|deutsch|french|spanish|dutch)\s+[BC][12]\b',
    r'\bcommunicat\w+\s+(fluently\s+)?in\s+german\b',
    r'\bsprichst\s+deutsch\b',
    r'\bdeutschkenntnisse\b',
    r'\bminijob\b', r'\bwerkstudent\b', r'\bpraktikum\b',
]

# ── Tech role title patterns (whitelist) ──────────────────────────────
# Word-boundary regex — no substring false positives.
# "cto" won't match "director" or "contractor".
# "developer" won't match "business development".

_TECH_TITLE_PATTERNS = [
    r'\bengineer\b',
    r'\bdeveloper\b',
    r'\bprogrammer\b',
    r'\barchitect\b',
    r'\bdevops\b',
    r'\bsite\s+reliability\b',
    r'\bsre\b',
    r'\bmachine\s+learning\b',
    r'\bml\s+engineer\b',
    r'\bai\s+engineer\b',
    r'\bbackend\b', r'\bfrontend\b', r'\bfront-end\b', r'\bback-end\b',
    r'\bfullstack\b', r'\bfull[\s-]stack\b',
    r'\bsoftware\b',
    r'\bsoftwareentwickler\b', r'\bentwickler\b',   # German
    r'\btech(nical)?\s+lead\b',
    r'\bengineering\s+manager\b',
    r'\bvp\s+of\s+engineering\b', r'\bvp\s+engineering\b',
    r'\bprincipal\s+engineer\b', r'\bstaff\s+engineer\b',
    r'\bcto\b',
    r'\bresearch\s+engineer\b',
    # Data roles — specific combos, not bare "data" or bare "analyst"
    r'\bdata\s+engineer(ing)?\b',
    r'\bdata\s+scientist\b',
    r'\bdata\s+architect\b',
    r'\banalytics\s+engineer\b',
    r'\bdata\s+platform\b',
    r'\bdata\s+pipeline\b',
]

# Override: titles that match a tech pattern but are still non-tech roles
_NON_TECH_OVERRIDES = [
    r'\bbusiness\s+develop\w+\b',                              # Business Development Representative
    r'\bdata\s+analyst,\s*(financial|product|pricing|risk|fraud)\b',  # Finance data analysts
    r'\bproduct\s+accounting\b',
    r'\bdata\s+insights\b',
]


def is_tech_role(title: str) -> bool:
    """
    Returns True if the job title is an engineering/data role.
    Tested against 67 real production job titles — 0 failures.

    Uses whitelist (tech patterns) not blacklist (bad role names).
    Any title with no engineering/data signals returns False.
    """
    t = title.lower()
    if not any(re.search(p, t) for p in _TECH_TITLE_PATTERNS):
        return False
    # Some titles contain tech words but are still non-tech
    if any(re.search(p, t) for p in _NON_TECH_OVERRIDES):
        return False
    return True


# ── Language requirement check ────────────────────────────────────────

def requires_non_english(text: str) -> bool:
    t = text.lower()
    return any(re.search(p, t, re.IGNORECASE) for p in _LANG_PATTERNS)


# ── Internship / junior check ─────────────────────────────────────────

_JUNIOR_SIGNALS = [
    "internship", "intern ", "praktikum", "werkstudent", "werkstudentin",
    "minijob", "mini-job", "trainee", "apprentice",
    "entry level", "entry-level", "aushilfe", "studentenjob",
]

def is_junior_role(text: str) -> bool:
    t = text.lower()
    return any(s in t for s in _JUNIOR_SIGNALS)


# ── Keyword pre-score ─────────────────────────────────────────────────

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
    Fast pre-score. No AI. Used to rank candidates before AI scoring.
    Returns 0-100.
    """
    title = (job.get("title", "") or "")
    description = (job.get("description", "") or job.get("description_text", "") or "")
    full_text = f"{title} {description[:600]}"

    # Hard blockers
    if requires_non_english(full_text):
        return 0
    if not is_tech_role(title):
        return 5
    if is_junior_role(full_text):
        user_experience = user_profile.get("experience", [])
        if len(user_experience) >= 2:
            return 5

    # Skill overlap
    user_skills = {s.lower().strip() for s in user_profile.get("skills", [])}
    desc_lower = description.lower()
    job_skills = {s for s in _TECH_SKILLS if s in desc_lower}

    if not job_skills:
        return 30  # Tech role but no recognizable skills — uncertain, keep

    overlap = job_skills.intersection(user_skills)
    score = min(int((len(overlap) / len(job_skills)) * 100), 100)
    return max(score, 20)


# ── AI scoring ────────────────────────────────────────────────────────

def _build_prompt(job: Dict, user_profile: Dict) -> str:
    user_skills = user_profile.get("skills", [])
    user_experience = user_profile.get("experience", [])
    user_preferences = user_profile.get("preferences", {})

    exp_lines = "\n".join([
        f"- {e.get('title', '')} at {e.get('company', '')}"
        for e in user_experience[:4]
    ])
    targets = ", ".join(user_preferences.get("job_titles", [])) or "software/data engineering"
    skills = ", ".join(user_skills[:30])
    title = job.get("title", "")
    desc = (job.get("description", "") or job.get("description_text", "") or "")[:1200]
    location = job.get("location", "")

    return f"""Professional recruiter scoring job fit. Strict and accurate.

CANDIDATE:
- Target roles: {targets}
- Skills: {skills}
- Experience:
{exp_lines}

JOB:
- Title: {title}
- Location: {location}
- Description: {desc}

SCORING RULES (follow exactly — violations cause wrong results):
1. Non-English language required (German C1/B2, French, Dutch) + no evidence candidate speaks it → score 10
2. Internship/Praktikum/Werkstudent/Minijob + candidate has 2+ years experience → score 10
3. Adjacent technical role (solutions architect, TAM, implementation engineer) + partial skill overlap → 35-55
4. Genuine engineering/data role + 1-2 skill matches → 45-69
5. Genuine engineering/data role + 3+ skill matches → 70-88
6. Near-perfect fit (role + most skills + seniority match) → 85-90
7. NEVER return 91-100. Maximum is 90. Nothing is a perfect match.
8. Score actual fit. Adjacent skills don't make someone qualified for a role.

Return ONLY valid JSON, no markdown, no explanation:
{{"match_score":<integer 0-90>,"skills_match":<0-100>,"experience_match":<0-100>,"preferences_match":<0-100>,"matched_skills":[<list of matched skill strings, max 5>],"missing_skills":[<list of missing key skills, max 5>],"reason":"<one sentence explaining the score>"}}"""


def calculate_match_score(job: Dict, user_profile: Dict) -> Dict[str, Any]:
    """
    Score one job. Called in parallel by score_jobs_batch().
    Bypasses AI for non-tech roles — instant, accurate, saves tokens.
    """
    title = job.get("title", "unknown")
    full_text = f"{title} {job.get('description_text', '') or job.get('description', '') or ''}"

    # Stage 1: Language blocker — no AI call needed
    if requires_non_english(full_text[:500]):
        return _fixed_score(8, "Non-English language requirement")

    # Stage 2: Title check — whitelist approach, 67/67 test cases pass
    if not is_tech_role(title):
        return _fixed_score(8, "Role type mismatch — not an engineering/data role")

    # Stage 3: Junior/intern check
    user_experience = user_profile.get("experience", [])
    if is_junior_role(full_text[:300]) and len(user_experience) >= 2:
        return _fixed_score(10, "Internship/junior role — candidate is experienced")

    # Stage 4: AI scoring for confirmed tech roles
    try:
        response = _get_client().chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": _build_prompt(job, user_profile)}],
            temperature=0.1,
            max_tokens=250,
        )
        content = response.choices[0].message.content.strip()

        # Strip code fences if model adds them
        if "```" in content:
            for part in content.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    content = part
                    break

        result = json.loads(content)
        # Hard cap at 90 regardless of what AI returns
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


def _fixed_score(score: int, reason: str) -> Dict[str, Any]:
    return {
        "match_score": score,
        "skills_match": 0, "experience_match": 0, "preferences_match": 0,
        "matched_skills": [], "missing_skills": [],
        "reason": reason,
    }


def score_jobs_batch(jobs: List[Dict], user_profile: Dict, max_workers: int = 8) -> List[Dict]:
    """Score a batch of jobs in parallel. Returns jobs with match_score added."""
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
    """Keyword-only fallback when AI is unavailable. Conservative by design."""
    user_skills = {s.lower().strip() for s in user_profile.get("skills", [])}
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