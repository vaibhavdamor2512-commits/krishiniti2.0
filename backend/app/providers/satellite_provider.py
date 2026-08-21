from abc import ABC, abstractmethod
from datetime import date, timedelta

from app.core.config import settings


class SatelliteProvider(ABC):
    @abstractmethod
    def get_ndvi_history(self, polygon: list, days: int = 84) -> list[dict]: ...


class MockSatelliteProvider(SatelliteProvider):
    def get_ndvi_history(self, polygon: list, days: int = 84) -> list[dict]:
        values = [0.31, 0.38, 0.46, 0.54, 0.61, 0.66, 0.69, 0.67]
        today = date.today()
        return [{"observation_date": (today - timedelta(days=(len(values)-1-i)*12)).isoformat(), "average_ndvi": value, "minimum_ndvi": round(max(0, value-0.13), 2), "maximum_ndvi": round(min(1, value+0.12), 2), "cloud_percentage": 8 + (i % 3) * 4, "provider": "demo-sentinel-2"} for i, value in enumerate(values)]


class EarthEngineProvider(SatelliteProvider):
    def get_ndvi_history(self, polygon: list, days: int = 84) -> list[dict]:
        raise RuntimeError("Earth Engine provider is not configured")


def get_satellite_provider() -> SatelliteProvider:
    return MockSatelliteProvider() if settings.demo_mode or not settings.google_earth_engine_project else EarthEngineProvider()
