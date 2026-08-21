from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field as PydanticField, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    name: str = PydanticField(min_length=2, max_length=120)
    mobile: str = PydanticField(min_length=8, max_length=20)
    password: str = PydanticField(min_length=6, max_length=72)
    location: str = ""
    farm_size: float = PydanticField(default=0, ge=0)
    preferred_language: str = "en"

    @field_validator("preferred_language")
    @classmethod
    def validate_language(cls, value: str):
        if value not in {"en", "hi", "gu", "pa"}:
            raise ValueError("Supported languages are en, hi, gu and pa")
        return value


class LoginRequest(BaseModel):
    mobile: str
    password: str


class UserOut(ORMModel):
    id: int; name: str; mobile: str; location: str; farm_size: float; preferred_language: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class FarmInput(BaseModel):
    name: str = PydanticField(min_length=2, max_length=120)
    location: str = PydanticField(min_length=2, max_length=180)
    total_area: float = PydanticField(default=0, ge=0)
    latitude: float = PydanticField(ge=-90, le=90)
    longitude: float = PydanticField(ge=-180, le=180)


class FarmOut(ORMModel):
    id: int; name: str; location: str; total_area: float; latitude: float; longitude: float; created_at: datetime


class SoilInput(BaseModel):
    nitrogen: float = PydanticField(ge=0, le=300)
    phosphorus: float = PydanticField(ge=0, le=300)
    potassium: float = PydanticField(ge=0, le=300)
    ph: float = PydanticField(ge=0, le=14)
    soil_type: str
    moisture: float = PydanticField(ge=0, le=100)


class FieldInput(BaseModel):
    farm_id: int
    name: str = PydanticField(min_length=2, max_length=120)
    polygon: list[list[float]]
    current_crop: str | None = None
    sowing_date: date | None = None
    irrigation_available: bool = True
    soil: SoilInput | None = None


class FieldUpdate(BaseModel):
    name: str | None = None; polygon: list[list[float]] | None = None
    current_crop: str | None = None; sowing_date: date | None = None
    irrigation_available: bool | None = None; soil: SoilInput | None = None


class SoilOut(ORMModel):
    nitrogen: float; phosphorus: float; potassium: float; ph: float; soil_type: str; moisture: float


class FieldOut(ORMModel):
    id: int; farm_id: int; name: str; polygon: list; latitude: float; longitude: float; area: float
    current_crop: str | None; sowing_date: date | None; irrigation_available: bool; soil: SoilOut | None = None


class RecommendationRequest(BaseModel):
    field_id: int
    season: str = "Kharif"
    irrigation_available: bool | None = None


class DiseaseAnalyzeRequest(BaseModel):
    crop_id: int
    symptom_ids: list[int] = PydanticField(min_length=1)


class LanguageUpdate(BaseModel):
    preferred_language: str
