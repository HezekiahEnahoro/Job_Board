"""
app/services/matching/scorer.py
Two-stage scoring: keyword_prescore() → fast filter, calculate_match_score() → AI
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


_LANG_PATTERNS = [
    r'\b(fluent|native|proficient|bilingual)\s+(in\s+)?(german|deutsch|french|spanish|portuguese|dutch|italian|polish|swedish|norwegian|danish|finnish)\b',
    r'\b[BC][12]\s+(level\s+)?(german|deutsch|french|spanish|dutch)\b',
    r'\b(german|deutsch|french|spanish|dutch)\s+[BC][12]\b',
    r'\bcommunicat\w+\s+(fluently\s+)?in\s+german\b',
    r'\bsprichst\s+deutsch\b',
    r'\bdeutschkenntnisse\b',
    r'\bminijob\b', r'\bwerkstudent\b', r'\bpraktikum\b',
]

# EXPANDED — covers all wrong-role cases seen in production
_NON_TECH_TITLE_SIGNALS = [
    # Sales
    "sales", "business development", "account executive", "bdr", "sdr",
    # Customer success
    "customer success", "client success", "onboarding specialist",
    # Marketing / Creative
    "marketing", "seo", "content creator", "social media",
    "art director", "creative director", "graphic designer",
    "brand manager", "copywriter", "content manager",
    # Finance / Risk
    "accountant", "buchhalter", "buchhaltung", "controller", "cfo",
    "demand planner", "supply chain", "logistics",
    "credit risk", "fraud operations", "risk strategist",
    "financial crimes", "pricing analyst", "fp&a",
    # Legal
    "jurist", "lawyer", "attorney", "rechtsanwalt", "legal",
    # HR
    "recruiter", "talent acquisition", "hr manager", "people ops",
    # Admin / Non-tech ops
    "administrative", "coordinator", "workplace technology",
    "office manager", "executive assistant", "operations associate",
    "business operations", "strategy lead", "strategy manager",
    # Founder / Trades
    "co-founder", "cofounder", "craftsmen", "local services",
    # Non-tech consulting
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
    user_skills = {s.lower().strip() for s in user_profile.get("skills", [])}
    title = (job.get("title", "") or "").lower()
    description = (job.get("description", "") or job.get("description_text", "") or "").lower()
    text = f"{title} {description[:600]}"

    for pattern in _LANG_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return 0

    if any(signal in title for signal in _NON_TECH_TITLE_SIGNALS):
        return 5

    junior_signals = [
        "internship", "intern ", "praktikum", "werkstudent",
        "minijob", "trainee", "entry level", "entry-level", "aushilfe",
    ]
    if any(s in text for s in junior_signals):
        return 5

    job_skills = {s for s in _TECH_SKILLS if s in description}
    if not job_skills:
        return 30

    overlap = job_skills.intersection(user_skills)
    return max(min(int((len(overlap) / len(job_skills)) * 100), 100), 20)


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

    return f"""Professional recruiter scoring job fit. Be strict and accurate.

CANDIDATE:
- Target: {targets}
- Skills: {skills}
- Experience:
{exp_lines}

JOB:
- Title: {title}
- Location: {location}
- Description: {desc}

RULES (follow exactly):
1. Non-English language required (German C1/B2, French, Dutch) + no evidence candidate speaks it → score 10
2. Wrong role type vs engineering/data background → score 10-20:
   - Design/Creative: art director, creative director, graphic designer, brand manager
   - Administrative: administrative coordinator, office manager, executive assistant, workplace
   - Finance/Risk: credit risk, fraud operations, risk strategist, fp&a, pricing analyst, financial crimes
   - Sales: sales rep, BDR, SDR, account executive, business development representative
   - Legal/HR/Marketing/Trades → 10-20
3. Internship/Praktikum/Werkstudent/Minijob + 2+ years experience → score 10
4. Single generic skill match only (just git, just react, just python) on non-engineering role → max 15
5. Genuine engineering/data role + 3+ skill overlap → 70-88
6. Genuine engineering/data role + 1-2 skills → 45-69
7. Adjacent technical role + overlap → 35-55
8. NEVER return 100 or 99. Maximum score is 90. Reserve 85-90 for near-perfect fits only.
9. Having git does not make someone an Art Director or Fraud Analyst.

Return ONLY JSON, no markdown:
{{"match_score":<0-90>,"skills_match":<0-100>,"experience_match":<0-100>,"preferences_match":<0-100>,"matched_skills":[<strings max 5>],"missing_skills":[<strings max 5>],"reason":"<one sentence>"}}"""


def calculate_match_score(job: Dict, user_profile: Dict) -> Dict[str, Any]:
    title = job.get("title", "unknown")
    title_lower = title.lower()

    # Code-level bypass — don't waste an AI call on obviously wrong roles
    if any(signal in title_lower for signal in _NON_TECH_TITLE_SIGNALS):
        return {
            "match_score": 8,
            "skills_match": 5, "experience_match": 5, "preferences_match": 5,
            "matched_skills": [], "missing_skills": [],
            "reason": "Role type mismatch — not an engineering/data role",
        }

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
        # Hard cap at 90 — prompt alone is not reliable enough
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


def score_jobs_batch(jobs: List[Dict], user_profile: Dict, max_workers: int = 8) -> List[Dict]:
    if not jobs:
        return jobs
    results = [None] * len(jobs)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(calculate_match_score, job, user_profile): idx for idx, job in enumerate(jobs)}
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


def _fallback_score(job: Dict, user_profile: Dict) -> Dict[str, Any]:
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