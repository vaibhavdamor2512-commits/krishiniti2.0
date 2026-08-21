from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    mobile: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    location: Mapped[str] = mapped_column(String(180), default="")
    farm_size: Mapped[float] = mapped_column(Float, default=0)
    preferred_language: Mapped[str] = mapped_column(String(5), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    farms: Mapped[list["Farm"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Farm(Base):
    __tablename__ = "farms"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(180))
    total_area: Mapped[float] = mapped_column(Float, default=0)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user: Mapped[User] = relationship(back_populates="farms")
    fields: Mapped[list["Field"]] = relationship(back_populates="farm", cascade="all, delete-orphan")


class Field(Base):
    __tablename__ = "fields"
    id: Mapped[int] = mapped_column(primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    polygon: Mapped[list] = mapped_column(JSON)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    area: Mapped[float] = mapped_column(Float)
    current_crop: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sowing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    irrigation_available: Mapped[bool] = mapped_column(Boolean, default=True)
    farm: Mapped[Farm] = relationship(back_populates="fields")
    soil: Mapped["SoilData | None"] = relationship(back_populates="field", cascade="all, delete-orphan", uselist=False)


class SoilData(Base):
    __tablename__ = "soil_data"
    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id"), unique=True)
    nitrogen: Mapped[float] = mapped_column(Float)
    phosphorus: Mapped[float] = mapped_column(Float)
    potassium: Mapped[float] = mapped_column(Float)
    ph: Mapped[float] = mapped_column(Float)
    soil_type: Mapped[str] = mapped_column(String(60))
    moisture: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    field: Mapped[Field] = relationship(back_populates="soil")


class Crop(Base):
    __tablename__ = "crops"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    local_names: Mapped[dict] = mapped_column(JSON, default=dict)
    season: Mapped[str] = mapped_column(String(40))
    water_requirement: Mapped[str] = mapped_column(String(20))
    base_market_price: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(Text)
    base_yield: Mapped[float] = mapped_column(Float, default=8)
    requirements: Mapped["CropRequirement"] = relationship(back_populates="crop", uselist=False, cascade="all, delete-orphan")
    costs: Mapped["CropCost"] = relationship(back_populates="crop", uselist=False, cascade="all, delete-orphan")


class CropRequirement(Base):
    __tablename__ = "crop_requirements"
    id: Mapped[int] = mapped_column(primary_key=True)
    crop_id: Mapped[int] = mapped_column(ForeignKey("crops.id"), unique=True)
    min_n: Mapped[float] = mapped_column(Float); max_n: Mapped[float] = mapped_column(Float)
    min_p: Mapped[float] = mapped_column(Float); max_p: Mapped[float] = mapped_column(Float)
    min_k: Mapped[float] = mapped_column(Float); max_k: Mapped[float] = mapped_column(Float)
    min_ph: Mapped[float] = mapped_column(Float); max_ph: Mapped[float] = mapped_column(Float)
    min_temperature: Mapped[float] = mapped_column(Float); max_temperature: Mapped[float] = mapped_column(Float)
    min_rainfall: Mapped[float] = mapped_column(Float); max_rainfall: Mapped[float] = mapped_column(Float)
    suitable_soil_types: Mapped[list] = mapped_column(JSON)
    crop: Mapped[Crop] = relationship(back_populates="requirements")


class CropCost(Base):
    __tablename__ = "crop_costs"
    id: Mapped[int] = mapped_column(primary_key=True)
    crop_id: Mapped[int] = mapped_column(ForeignKey("crops.id"), unique=True)
    seed_cost: Mapped[float] = mapped_column(Float); fertilizer_cost: Mapped[float] = mapped_column(Float)
    pesticide_cost: Mapped[float] = mapped_column(Float); irrigation_cost: Mapped[float] = mapped_column(Float)
    labour_cost: Mapped[float] = mapped_column(Float); other_cost: Mapped[float] = mapped_column(Float)
    crop: Mapped[Crop] = relationship(back_populates="costs")

    @property
    def total(self) -> float:
        return self.seed_cost + self.fertilizer_cost + self.pesticide_cost + self.irrigation_cost + self.labour_cost + self.other_cost


class MarketPrice(Base):
    __tablename__ = "market_prices"
    id: Mapped[int] = mapped_column(primary_key=True)
    crop_id: Mapped[int] = mapped_column(ForeignKey("crops.id"), index=True)
    location: Mapped[str] = mapped_column(String(180))
    price: Mapped[float] = mapped_column(Float)
    date: Mapped[date] = mapped_column(Date, default=date.today)


class WeatherData(Base):
    __tablename__ = "weather_data"
    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id"), index=True)
    temperature: Mapped[float] = mapped_column(Float); humidity: Mapped[float] = mapped_column(Float)
    rainfall: Mapped[float] = mapped_column(Float); wind_speed: Mapped[float] = mapped_column(Float)
    forecast_summary: Mapped[str] = mapped_column(String(180)); rain_probability: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SatelliteObservation(Base):
    __tablename__ = "satellite_observations"
    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id"), index=True)
    observation_date: Mapped[date] = mapped_column(Date); cloud_percentage: Mapped[float] = mapped_column(Float)
    provider: Mapped[str] = mapped_column(String(80))


class NdviRecord(Base):
    __tablename__ = "ndvi_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id"), index=True)
    observation_date: Mapped[date] = mapped_column(Date)
    average_ndvi: Mapped[float] = mapped_column(Float); minimum_ndvi: Mapped[float] = mapped_column(Float); maximum_ndvi: Mapped[float] = mapped_column(Float)


class Disease(Base):
    __tablename__ = "diseases"
    id: Mapped[int] = mapped_column(primary_key=True)
    crop_id: Mapped[int] = mapped_column(ForeignKey("crops.id"), index=True)
    name: Mapped[str] = mapped_column(String(120)); description: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(30)); prevention: Mapped[str] = mapped_column(Text); management: Mapped[str] = mapped_column(Text)


class Symptom(Base):
    __tablename__ = "symptoms"
    id: Mapped[int] = mapped_column(primary_key=True)
    crop_id: Mapped[int] = mapped_column(ForeignKey("crops.id"), index=True)
    name: Mapped[str] = mapped_column(String(100)); description: Mapped[str] = mapped_column(Text)


class DiseaseSymptom(Base):
    __tablename__ = "disease_symptoms"
    __table_args__ = (UniqueConstraint("disease_id", "symptom_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    disease_id: Mapped[int] = mapped_column(ForeignKey("diseases.id"), index=True)
    symptom_id: Mapped[int] = mapped_column(ForeignKey("symptoms.id"), index=True)
    importance: Mapped[float] = mapped_column(Float, default=1)


class Recommendation(Base):
    __tablename__ = "recommendations"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id"), index=True)
    crop_id: Mapped[int] = mapped_column(ForeignKey("crops.id"), index=True)
    suitability_score: Mapped[float] = mapped_column(Float); expected_yield: Mapped[float] = mapped_column(Float)
    expected_revenue: Mapped[float] = mapped_column(Float); total_cost: Mapped[float] = mapped_column(Float)
    expected_profit: Mapped[float] = mapped_column(Float); risk_score: Mapped[float] = mapped_column(Float)
    risk_adjusted_score: Mapped[float] = mapped_column(Float); explanation: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Advisory(Base):
    __tablename__ = "advisories"
    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id"), index=True)
    type: Mapped[str] = mapped_column(String(50)); message: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(30)); language: Mapped[str] = mapped_column(String(5), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(140)); message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50)); is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
