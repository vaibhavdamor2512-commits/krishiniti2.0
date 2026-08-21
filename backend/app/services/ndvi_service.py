def calculate_ndvi(nir: float, red: float) -> float:
    denominator = nir + red
    return 0.0 if denominator == 0 else round((nir - red) / denominator, 4)


def interpret_ndvi(value: float, previous: float | None = None) -> dict:
    if value > .65: label, tone = "Healthy vegetation", "good"
    elif value >= .45: label, tone = "Moderate / good vegetation", "moderate"
    elif value >= .25: label, tone = "Potential vegetation stress", "watch"
    else: label, tone = "Low vegetation signal", "alert"
    decline = previous is not None and previous - value >= .1
    return {
        "label": label, "status": tone, "significant_decline": decline,
        "message": "Potential vegetation stress detected. Consider checking irrigation, weather conditions, nutrient status and visible crop symptoms." if decline else "Continue monitoring alongside field observations.",
        "disclaimer": "Vegetation condition indicator — thresholds are configurable and are not a confirmed crop diagnosis.",
    }
