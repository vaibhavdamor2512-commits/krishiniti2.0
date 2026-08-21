from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import Farm, Field, User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    user_id = decode_access_token(token)
    user = db.get(User, user_id) if user_id else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please sign in to continue.", headers={"WWW-Authenticate": "Bearer"})
    return user


def owned_farm(db: Session, farm_id: int, user_id: int) -> Farm:
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == user_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found.")
    return farm


def owned_field(db: Session, field_id: int, user_id: int) -> Field:
    field = db.query(Field).join(Farm).filter(Field.id == field_id, Farm.user_id == user_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found.")
    return field
