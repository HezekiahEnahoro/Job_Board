from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from .schemas import UserCreate, UserLogin, Token, UserOut
from .crud import create_user, authenticate_user, get_user_by_email
from .utils import create_access_token
from .dependencies import get_current_user
from app.services.email.service import send_welcome_email
from .models import User
from pydantic import BaseModel  # ← For request validation

router = APIRouter(prefix="/auth", tags=["auth"])

# ========== REQUEST SCHEMA (Pydantic) ==========
# This validates the JSON body sent from frontend
class UserUpdate(BaseModel):
    full_name: str | None = None

# ========== EXISTING ENDPOINTS ==========

@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    existing_user = get_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    db_user = create_user(db, user)
    
    try:
        send_welcome_email(db_user.email, db_user.full_name)
    except Exception as e:
        print(f"Warning: Failed to send welcome email: {e}")
    
    return db_user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login and get access token"""
    user = authenticate_user(db, credentials.email, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token({"sub": user.email, "user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user

# ========== NEW ENDPOINTS (ADD THESE) ==========

@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,  # ← Pydantic validates incoming JSON
    current_user: User = Depends(get_current_user),  # ← SQLAlchemy User from DB
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    # Update the SQLAlchemy User object
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    
    # Save to database
    db.commit()
    db.refresh(current_user)
    
    # Return the updated User (FastAPI converts to UserOut schema)
    return current_user

@router.delete("/me")
def delete_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete current user account"""
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}