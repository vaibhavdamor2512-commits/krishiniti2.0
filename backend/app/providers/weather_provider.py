from abc import ABC, abstractmethod
from datetime import datetime, timezone

from app.core.config import settings


class WeatherProvider(ABC):
    @abstractmethod
    def get_weather(self, latitude: float, longitude: float) -> dict: ...


class MockWeatherProvider(WeatherProvider):
    def get_weather(self, latitude: float, longitude: float) -> dict:
        return {
            "temperature": 31.2, "humidity": 68, "rainfall": 8.0,
            "rain_probability": 62, "wind_speed": 11.4,
            "forecast_summary": "Partly cloudy with evening showers",
            "weather_risk": "medium", "provider": "demo",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


class RealWeatherProvider(WeatherProvider):
    def get_weather(self, latitude: float, longitude: float) -> dict:
        # A production integration can be added here without changing API callers.
        raise RuntimeError("Real weather provider is not configured")


def get_weather_provider() -> WeatherProvider:
    return MockWeatherProvider() if settings.demo_mode or not settings.weather_api_key else RealWeatherProvider()
