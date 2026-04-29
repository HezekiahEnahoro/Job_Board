from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.db import get_db
from .schemas import UserCreate, UserLogin, Token, UserOut
from .crud import create_user, authenticate_user, get_user_by_email
from .utils import create_access_token
from .dependencies import get_current_user
from app.services.email.service import send_welcome_email
from .models import User
from pydantic import BaseModel


router = APIRouter(prefix="/auth", tags=["auth"])


class UserUpdate(BaseModel):
    full_name: str | None = None


# ── Signup ────────────────────────────────────────────────────────────
# FIX: was returning UserOut (user only, no token).
# Frontend had to call POST /auth/login immediately after — 2 round trips.
# Now returns Token (access_token + token_type) so the frontend is
# authenticated in a single call. Drops 300-800ms from signup time.

class SignupResponse(Token):
    """Token + user info so frontend doesn't need a follow-up /auth/me call."""
    user: UserOut


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(
    user: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    existing_user = get_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    db_user = create_user(db, user)

    # Generate token immediately — same as login
    access_token = create_access_token({"sub": db_user.email, "user_id": db_user.id})

    # Welcome email in background — never blocks the response
    background_tasks.add_task(send_welcome_email_safe, db_user.email, db_user.full_name)

    # Return token + user so frontend has everything in one response
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user,
    }


def send_welcome_email_safe(email: str, name: str):
    try:
        send_welcome_email(email, name)
    except Exception as e:
        print(f"Background task: Failed to send welcome email: {e}")


# ── Login ─────────────────────────────────────────────────────────────

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token({"sub": user.email, "user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}


# ── Current user ──────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me")
def delete_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}