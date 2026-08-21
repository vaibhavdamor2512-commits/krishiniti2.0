from functools import lru_cache
from pathlib import Path
import secrets

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Krishiniti Smart Crop Advisory"
    api_prefix: str = "/api"
    database_url: str = f"sqlite:///{(BASE_DIR / 'krishiniti.db').as_posix()}"
    jwt_secret: str = secrets.token_urlsafe(32)
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 1440
    demo_mode: bool = True
    weather_api_key: str | None = None
    market_api_key: str | None = None
    google_maps_api_key: str | None = None
    google_earth_engine_project: str | None = None
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
