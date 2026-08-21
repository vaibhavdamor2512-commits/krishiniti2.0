from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, owned_field
from app.core.database import get_db
from app.models import User
from app.providers import get_weather_provider
from app.services.irrigation_service import irrigation_advisory
from app.services.translation_service import translate_code


router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/{field_id}")
def weather(field_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = owned_field(db, field_id, user.id)
    data = get_weather_provider().get_weather(field.latitude, field.longitude)
    irrigation = irrigation_advisory(field.soil.moisture, data["rain_probability"], data["rainfall"], data["temperature"])
    irrigation["localized_message"] = translate_code(irrigation["code"], user.preferred_language, irrigation["message"])
    return {**data, "irrigation_advisory": irrigation}
