from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, owned_field
from app.core.database import get_db
from app.models import User
from app.providers import get_satellite_provider
from app.services.ndvi_service import interpret_ndvi


router = APIRouter(prefix="/ndvi", tags=["NDVI"])


def history_for(field):
    return get_satellite_provider().get_ndvi_history(field.polygon)


@router.get("/{field_id}")
def current_ndvi(field_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = owned_field(db, field_id, user.id); history = history_for(field); current = history[-1]; previous = history[-2]
    return {**current, "previous_ndvi": previous["average_ndvi"], "trend": round(current["average_ndvi"] - previous["average_ndvi"], 2), "interpretation": interpret_ndvi(current["average_ndvi"], previous["average_ndvi"])}


@router.get("/{field_id}/history")
def ndvi_history(field_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = owned_field(db, field_id, user.id); return {"field_id": field.id, "records": history_for(field), "source": "Mock Sentinel-2 series in demo mode"}
