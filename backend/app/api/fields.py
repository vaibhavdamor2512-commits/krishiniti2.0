from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, owned_farm, owned_field
from app.core.database import get_db
from app.models import Field, SoilData, User
from app.schemas import FieldInput, FieldOut, FieldUpdate, SoilInput
from app.services.field_service import calculate_area_acres, polygon_centroid, validate_polygon


router = APIRouter(prefix="/fields", tags=["Fields"])
DEMO_SOIL = SoilInput(nitrogen=75, phosphorus=42, potassium=55, ph=6.8, soil_type="Loamy", moisture=38)


def apply_soil(db: Session, field: Field, soil):
    if not soil: return
    values = soil.model_dump()
    if field.soil:
        for key, value in values.items(): setattr(field.soil, key, value)
    else:
        db.add(SoilData(field=field, **values))


@router.get("/farm/{farm_id}", response_model=list[FieldOut])
def list_fields(farm_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = owned_farm(db, farm_id, user.id); return farm.fields


@router.get("/{field_id}", response_model=FieldOut)
def get_field(field_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return owned_field(db, field_id, user.id)


@router.post("", response_model=FieldOut, status_code=201)
def create_field(payload: FieldInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = owned_farm(db, payload.farm_id, user.id)
    try:
        polygon = validate_polygon(payload.polygon); area = calculate_area_acres(polygon); lat, lon = polygon_centroid(polygon)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    field = Field(farm_id=farm.id, name=payload.name, polygon=polygon, area=area, latitude=lat, longitude=lon, current_crop=payload.current_crop, sowing_date=payload.sowing_date, irrigation_available=payload.irrigation_available)
    db.add(field); apply_soil(db, field, payload.soil or DEMO_SOIL); db.commit(); db.refresh(field); return field


@router.put("/{field_id}", response_model=FieldOut)
def update_field(field_id: int, payload: FieldUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = owned_field(db, field_id, user.id); values = payload.model_dump(exclude_unset=True)
    soil = payload.soil if "soil" in values else None; values.pop("soil", None)
    if payload.polygon is not None:
        try:
            values["polygon"] = validate_polygon(payload.polygon); values["area"] = calculate_area_acres(values["polygon"]); values["latitude"], values["longitude"] = polygon_centroid(values["polygon"])
        except ValueError as exc: raise HTTPException(status_code=422, detail=str(exc)) from exc
    for key, value in values.items(): setattr(field, key, value)
    apply_soil(db, field, soil); db.commit(); db.refresh(field); return field


@router.delete("/{field_id}", status_code=204)
def delete_field(field_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    field = owned_field(db, field_id, user.id); db.delete(field); db.commit(); return Response(status_code=status.HTTP_204_NO_CONTENT)
