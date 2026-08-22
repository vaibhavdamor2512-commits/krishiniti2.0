from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Crop, Symptom, User
from app.schemas import DiseaseAnalyzeRequest
from app.services.disease_service import analyze_symptoms
from app.services.image_recognition_service import ImageRecognitionError, SUPPORTED_IMAGE_TYPES, get_disease_recognizer
from app.core.config import settings


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


@router.post("/analyze-image")
async def analyze_image(
    crop_id: int = Form(...),
    image: UploadFile = File(...),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if image.content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG or WebP crop image.")
    max_bytes = settings.disease_image_max_mb * 1024 * 1024
    content = await image.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"The image must be {settings.disease_image_max_mb} MB or smaller.")
    crop = db.get(Crop, crop_id)
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found.")
    try:
        result = get_disease_recognizer().analyze(content, crop.name)
    except ImageRecognitionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {**result, "filename": image.filename, "size_bytes": len(content)}
