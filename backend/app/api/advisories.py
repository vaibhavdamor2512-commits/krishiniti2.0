from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, owned_field
from app.core.database import get_db
from app.models import Advisory, User


router = APIRouter(prefix="/advisories", tags=["Advisories"])


@router.get("/{field_id}")
def advisories(field_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = owned_field(db, field_id, user.id)
    return db.query(Advisory).filter(Advisory.field_id == field.id, Advisory.language.in_([user.preferred_language, "en"])).order_by(Advisory.created_at.desc()).all()
