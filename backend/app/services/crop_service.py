from sqlalchemy.orm import Session

from app.models import Crop
from app.providers import get_market_provider
from app.services.profit_service import calculate_profit
from app.services.yield_service import yield_predictor


def range_score(value: float, minimum: float, maximum: float) -> float:
    if minimum <= value <= maximum:
        return 1.0
    span = max(maximum - minimum, 1)
    distance = minimum - value if value < minimum else value - maximum
    return max(0.0, 1 - distance / span)


def recommend_crops(db: Session, field, soil, weather: dict, season: str, irrigation_available: bool) -> list[dict]:
    crops = db.query(Crop).all()
    market = get_market_provider()
    results = []
    max_price = max([c.base_market_price for c in crops] or [1])
    water_risk = {"low": 0.08, "medium": 0.18, "high": 0.32}
    for crop in crops:
        req = crop.requirements
        nutrient = sum([range_score(soil.nitrogen, req.min_n, req.max_n), range_score(soil.phosphorus, req.min_p, req.max_p), range_score(soil.potassium, req.min_k, req.max_k)]) / 3
        ph = range_score(soil.ph, req.min_ph, req.max_ph)
        soil_type = 1.0 if soil.soil_type.lower() in [s.lower() for s in req.suitable_soil_types] else 0.55
        soil_score = nutrient * 0.55 + ph * 0.3 + soil_type * 0.15
        temp_score = range_score(weather["temperature"], req.min_temperature, req.max_temperature)
        rain_score = range_score(weather["rainfall"] * 12, req.min_rainfall, req.max_rainfall)
        weather_score = temp_score * 0.65 + rain_score * 0.35
        season_score = 1.0 if crop.season.lower() in {season.lower(), "year-round"} else 0.45
        water_score = 1.0 if crop.water_requirement == "low" or irrigation_available else (0.72 if crop.water_requirement == "medium" else 0.35)
        market_score = crop.base_market_price / max_price
        yield_score = min(crop.base_yield / 32, 1)
        risk = min(0.85, water_risk[crop.water_requirement] + (1-weather_score)*0.35 + (1-market_score)*0.12)
        suitability = 100 * (soil_score*.25 + weather_score*.20 + season_score*.15 + water_score*.10 + yield_score*.10 + market_score*.10 + (1-risk)*.10)
        expected_yield = yield_predictor.predict(crop, suitability)
        financials = calculate_profit(expected_yield, market.get_price(crop), crop.costs.total, field.area, risk)
        reasons = []
        reasons.append("Soil pH and nutrients are within a favorable range" if soil_score >= .72 else "Soil conditions are partly suitable; nutrient management may help")
        reasons.append("Temperature and rainfall outlook are favorable" if weather_score >= .72 else "Weather fit is moderate and should be monitored")
        reasons.append("Water need matches available irrigation" if water_score >= .85 else "Water availability may limit performance")
        reasons.append("Sample market value supports the profit estimate")
        results.append({
            "crop_id": crop.id, "crop_name": crop.name, "local_names": crop.local_names,
            "suitability_score": round(suitability, 1), "expected_yield": expected_yield,
            "market_price": market.get_price(crop), **financials, "risk_score": round(risk, 2),
            "risk_label": "Low" if risk < .25 else "Medium" if risk < .5 else "High",
            "explanation": reasons, "model": yield_predictor.model_name,
            "disclaimer": "Estimated values — not guaranteed returns.",
        })
    return sorted(results, key=lambda item: item["risk_adjusted_score"], reverse=True)
