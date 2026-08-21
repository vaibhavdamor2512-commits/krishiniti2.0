class YieldPredictor:
    model_name = "transparent-baseline-v1"

    def predict(self, crop, suitability_score: float, ndvi: float | None = None) -> float:
        ndvi_factor = 1.0 if ndvi is None else max(0.75, min(1.15, ndvi / 0.6))
        suitability_factor = 0.72 + (suitability_score / 100) * 0.36
        return round(crop.base_yield * suitability_factor * ndvi_factor, 2)


yield_predictor = YieldPredictor()
