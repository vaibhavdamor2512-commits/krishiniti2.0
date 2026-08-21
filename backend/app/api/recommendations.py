from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, owned_field
from app.core.database import get_db
from app.models import Recommendation, User
from app.providers import get_weather_provider
from app.schemas import RecommendationRequest
from app.services.crop_service import recommend_crops


router = APIRouter(tags=["Recommendations"])


def run_recommendation(payload: RecommendationRequest, user: User, db: Session):
    field = owned_field(db, payload.field_id, user.id)
    weather = get_weather_provider().get_weather(field.latitude, field.longitude)
    results = recommend_crops(db, field, field.soil, weather, payload.season, field.irrigation_available if payload.irrigation_available is None else payload.irrigation_available)
    db.query(Recommendation).filter(Recommendation.field_id == field.id, Recommendation.user_id == user.id).delete()
    for item in results:
        db.add(Recommendation(user_id=user.id, field_id=field.id, crop_id=item["crop_id"], suitability_score=item["suitability_score"], expected_yield=item["expected_yield"], expected_revenue=item["expected_revenue"], total_cost=item["total_cost"], expected_profit=item["expected_profit"], risk_score=item["risk_score"], risk_adjusted_score=item["risk_adjusted_score"], explanation=item["explanation"]))
    db.commit()
    return {"field_id": field.id, "area_acres": field.area, "weather": weather, "recommendations": results, "data_mode": "demo"}


@router.post("/crops/recommend")
def recommend(payload: RecommendationRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return run_recommendation(payload, user, db)


@router.post("/profit/optimize")
def optimize(payload: RecommendationRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return run_recommendation(payload, user, db)
