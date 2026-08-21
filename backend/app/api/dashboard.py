from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Farm, Field, Notification, User
from app.providers import get_satellite_provider, get_weather_provider
from app.services.irrigation_service import irrigation_advisory
from app.services.ndvi_service import interpret_ndvi


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = db.query(Field).join(Farm).filter(Farm.user_id == user.id).first()
    if not field: return {"empty": True, "message": "Create a farm and field to begin."}
    weather = get_weather_provider().get_weather(field.latitude, field.longitude)
    history = get_satellite_provider().get_ndvi_history(field.polygon)
    ndvi = history[-1]["average_ndvi"]; previous = history[-2]["average_ndvi"]
    irrigation = irrigation_advisory(field.soil.moisture, weather["rain_probability"], weather["rainfall"], weather["temperature"])
    unread = db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read.is_(False)).count()
    return {"empty": False, "farmer": user.name, "farm": {"id": field.farm.id, "name": field.farm.name}, "field": {"id": field.id, "name": field.name, "area": field.area, "current_crop": field.current_crop, "soil_moisture": field.soil.moisture}, "weather": weather, "ndvi": {"current": ndvi, "previous": previous, "trend": round(ndvi-previous, 2), **interpret_ndvi(ndvi, previous)}, "today_advisory": irrigation, "unread_notifications": unread, "data_mode": "demo"}
