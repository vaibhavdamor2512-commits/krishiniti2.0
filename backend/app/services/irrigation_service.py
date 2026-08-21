def irrigation_advisory(soil_moisture: float, rain_probability: float, rainfall: float, temperature: float, water_requirement: str = "medium") -> dict:
    if soil_moisture < 30 and rain_probability < 40:
        code, severity, message = "LOW_SOIL_MOISTURE", "high", "Soil moisture is low and significant rainfall is not expected. Irrigation may be required soon."
    elif soil_moisture < 50 and (rain_probability >= 50 or rainfall >= 5):
        code, severity, message = "DELAY_IRRIGATION", "moderate", "Rain is expected. Consider delaying irrigation and monitor soil moisture before watering."
    elif soil_moisture >= 65:
        code, severity, message = "HIGH_SOIL_MOISTURE", "low", "Soil moisture is high. Avoid unnecessary irrigation and continue monitoring."
    else:
        code, severity, message = "MONITOR_MOISTURE", "low", "Soil moisture is moderate. Monitor the field and irrigate only if conditions become drier."
    return {"code": code, "severity": severity, "message": message, "advisory_only": True}
