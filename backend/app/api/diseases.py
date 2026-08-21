from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Crop, Symptom, User
from app.schemas import DiseaseAnalyzeRequest
from app.services.disease_service import analyze_symptoms


router = APIRouter(prefix="/diseases", tags=["Disease advisory"])


@router.get("/crops")
def crops(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": crop.id, "name": crop.name, "local_names": crop.local_names} for crop in db.query(Crop).order_by(Crop.name).all()]


@router.get("/symptoms/{crop_id}")
def symptoms(crop_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [{"id": item.id, "name": item.name, "description": item.description} for item in db.query(Symptom).filter(Symptom.crop_id == crop_id).all()]


@router.post("/analyze")
def analyze(payload: DiseaseAnalyzeRequest, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return analyze_symptoms(db, payload.crop_id, payload.symptom_ids)
