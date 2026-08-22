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
    return {"field_id": field.id, "area_acres": field.area, "weather": weather, "recommendations": results, "data_mode": "demo", "optimization_type": "recommendation"}


def run_optimization(payload: RecommendationRequest, user: User, db: Session):
    field = owned_field(db, payload.field_id, user.id)
    weather = get_weather_provider().get_weather(field.latitude, field.longitude)
    
    # Get initial recommendations
    initial_results = recommend_crops(db, field, field.soil, weather, payload.season, field.irrigation_available if payload.irrigation_available is None else payload.irrigation_available)
    
    # OPTIMIZATION ALGORITHM: Multi-objective optimization for profit maximization
    # Different weighting than recommendation - focus on profit with risk constraints
    
    optimization_results = []
    for item in initial_results:
        # Optimization scoring with different weights:
        # - Profit focus: 40% (vs 10% in recommendation)
        # - Risk constraint: 25% (vs 10% in recommendation) 
        # - Market opportunity: 20% (vs 10% in recommendation)
        # - Resource efficiency: 15% (new factor)
        
        profit_score = min(1.0, item["expected_profit"] / 100000)  # Normalize to 0-1
        risk_penalty = item["risk_score"]  # Higher risk = lower score
        market_score = item["market_price"] / 10000  # Normalize to 0-1
        resource_efficiency = item["suitability_score"] / 100  # Already normalized
        
        # Calculate optimization score
        optimization_score = (
            profit_score * 0.40 +           # 40% weight on profit
            (1 - risk_penalty) * 0.25 +     # 25% weight on risk avoidance
            market_score * 0.20 +            # 20% weight on market price
            resource_efficiency * 0.15       # 15% weight on resource efficiency
        ) * 100
        
        # Risk-adjusted optimization score
        risk_adjusted_optimization = optimization_score * (1 - item["risk_score"] * 0.3)
        
        # Generate optimization-specific explanation
        optimization_explanation = []
        optimization_explanation.append(f"Profit optimization mode selected (score: {optimization_score:.1f}/100)")
        optimization_explanation.append(f"Expected profit: ₹{item['expected_profit']:.0f} per acre")
        optimization_explanation.append(f"Risk level: {item['risk_label']} (penalty applied: {item['risk_score']*100:.0f}%)")
        optimization_explanation.append(f"Market opportunity: {'Favorable' if market_score > 0.6 else 'Moderate'} (price: ₹{item['market_price']}/quintal)")
        optimization_explanation.append(f"Resource efficiency: {'High' if resource_efficiency > 0.7 else 'Moderate'}")
        
        optimization_results.append({
            "crop_id": item["crop_id"],
            "crop_name": item["crop_name"],
            "local_names": item["local_names"],
            "suitability_score": item["suitability_score"],
            "expected_yield": item["expected_yield"],
            "market_price": item["market_price"],
            "expected_revenue": item["expected_revenue"],
            "total_cost": item["total_cost"],
            "expected_profit": item["expected_profit"],
            "risk_score": item["risk_score"],
            "risk_label": item["risk_label"],
            "risk_adjusted_score": item["risk_adjusted_score"],
            "optimization_score": round(optimization_score, 1),
            "risk_adjusted_optimization": round(risk_adjusted_optimization, 1),
            "explanation": optimization_explanation,
            "model": "multi-objective-optimization-v1",
            "ndvi_used": item.get("ndvi_used"),
            "ndvi_score": item.get("ndvi_score"),
            "disclaimer": "Optimization based on current data. Market conditions and actual yields may vary.",
        })
    
    # Sort by risk-adjusted optimization score
    optimization_results.sort(key=lambda x: x["risk_adjusted_optimization"], reverse=True)
    
    # Save to database
    db.query(Recommendation).filter(Recommendation.field_id == field.id, Recommendation.user_id == user.id).delete()
    for item in optimization_results:
        db.add(Recommendation(
            user_id=user.id, 
            field_id=field.id, 
            crop_id=item["crop_id"], 
            suitability_score=item["suitability_score"], 
            expected_yield=item["expected_yield"], 
            expected_revenue=item["expected_revenue"], 
            total_cost=item["total_cost"], 
            expected_profit=item["expected_profit"], 
            risk_score=item["risk_score"], 
            risk_adjusted_score=item["risk_adjusted_score"], 
            explanation=item["explanation"]
        ))
    db.commit()
    
    return {
        "field_id": field.id, 
        "area_acres": field.area, 
        "weather": weather, 
        "recommendations": optimization_results, 
        "data_mode": "demo",
        "optimization_type": "profit-optimization",
        "optimization_method": "multi-objective-with-risk-constraints"
    }


@router.post("/crops/recommend")
def recommend(payload: RecommendationRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return run_recommendation(payload, user, db)


@router.post("/profit/optimize")
def optimize(payload: RecommendationRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return run_optimization(payload, user, db)
