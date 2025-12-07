from sqlalchemy.orm import Session
from sqlalchemy import select
from .models import User
from .schemas import UserCreate
from .utils import hash_password, verify_password

def create_user(db: Session, user: UserCreate) -> User:
    """Create a new user"""
    db_user = User(
        email=user.email,
        hashed_password=hash_password(user.password),
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_email(db: Session, email: str) -> User | None:
    """Get user by email"""
    return db.scalar(select(User).where(User.email == email))

def get_user_by_id(db: Session, user_id: int) -> User | None:
    """Get user by ID"""
    return db.scalar(select(User).where(User.id == user_id))

def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Authenticate a user with email and password"""
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user