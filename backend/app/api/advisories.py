from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, owned_field
from app.core.database import get_db
from app.models import Advisory, User


router = APIRouter(prefix="/advisories", tags=["Advisories"])


@router.get("/{field_id}")
def advisories(field_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = owned_field(db, field_id, user.id)
    advisories_list = db.query(Advisory).filter(Advisory.field_id == field.id, Advisory.language.in_([user.preferred_language, "en"])).order_by(Advisory.created_at.desc()).all()
    if not advisories_list:
        return [
            {"id": 1, "type": "irrigation", "severity": "moderate", "message": "Check soil moisture before irrigating. Monitor weather conditions."},
            {"id": 2, "type": "crop_health", "severity": "low", "message": "Regular field checks recommended. Monitor crop growth and any signs of stress."}
        ]
    return advisories_list
