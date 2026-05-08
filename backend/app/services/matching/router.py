from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.db import get_db
from app.services.auth.dependencies import get_current_user
from app.services.auth.models import User
from .matcher import get_matched_jobs, get_top_matches
from pydantic import BaseModel as PydanticBaseModel

router = APIRouter(prefix="/matching", tags=["matching"])


class ScoreJobRequest(PydanticBaseModel):
    job_id: int


@router.post("/score-job")
def score_single_job(
    payload: ScoreJobRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    AI-score a single job for the current user.
    Called when Quick Apply modal opens — updates job card badge in real time.
    """
    import json
    from sqlalchemy import text
    from app.core import crud
    from app.services.profile.models import UserProfile
    from app.services.matching.scorer import calculate_match_score

    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    job = crud.get_job(db, payload.job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    profile_dict = {
        "summary": profile.summary or "",
        "skills": profile.skills or [],
        "experience": profile.experience or [],
        "education": profile.education or [],
        "certifications": profile.certifications or [],
        "languages": profile.languages or [],
        "preferences": profile.preferences or {},
    }

    job_dict = {
        "title": job.title,
        "description": job.description_text or "",
        "location": job.location or "",
        "remote_flag": job.remote_flag,
    }

    result = calculate_match_score(job_dict, profile_dict)
    score = result["match_score"]

    # Upsert score — never overwrite a resume tailoring score (most accurate)
    db.execute(text("""
        INSERT INTO user_job_scores
            (user_id, job_id, match_score, skills_match,
             experience_match, preferences_match,
             matched_skills, missing_skills, reason, computed_at)
        VALUES
            (:uid, :jid, :score, :sm, :em, :pm,
             CAST(:ms AS jsonb), CAST(:mis AS jsonb), 'ai score on modal open', NOW())
        ON CONFLICT (user_id, job_id) DO UPDATE SET
            match_score      = EXCLUDED.match_score,
            skills_match     = EXCLUDED.skills_match,
            experience_match = EXCLUDED.experience_match,
            matched_skills   = EXCLUDED.matched_skills,
            missing_skills   = EXCLUDED.missing_skills,
            reason           = EXCLUDED.reason,
            computed_at      = NOW()
        WHERE user_job_scores.reason != 'Scored from resume tailoring'
    """), {
        "uid": current_user.id,
        "jid": payload.job_id,
        "score": score,
        "sm": result.get("skills_match", 0),
        "em": result.get("experience_match", 0),
        "pm": result.get("preferences_match", 0),
        "ms": json.dumps(result.get("matched_skills", [])),
        "mis": json.dumps(result.get("missing_skills", [])),
    })
    db.commit()

    return {
        "job_id": payload.job_id,
        "match_score": score,
        "matched_skills": result.get("matched_skills", []),
        "reason": result.get("reason", ""),
    }


@router.get("/jobs")
def get_jobs_with_match_scores(
    q: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    min_match_score: int = Query(0, ge=0, le=100),
    limit: int = Query(25, ge=1, le=500),
    offset: int = Query(0, ge=0),
    skill: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    remote: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_matched_jobs(
        db=db,
        user_id=current_user.id,
        min_match_score=min_match_score,
        limit=limit,
        offset=offset,
        q=q,
        days=days,
        skill=skill,
        location=location,
        remote=remote,
    )


@router.get("/top-matches")
def get_user_top_matches(
    top_k: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return {
        "top_matches": get_top_matches(db, current_user.id, top_k=top_k)
    }