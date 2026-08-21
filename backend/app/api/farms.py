from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, owned_farm
from app.core.database import get_db
from app.models import Farm, User
from app.schemas import FarmInput, FarmOut


router = APIRouter(prefix="/farms", tags=["Farms"])


@router.get("", response_model=list[FarmOut])
def list_farms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Farm).filter(Farm.user_id == user.id).order_by(Farm.created_at.desc()).all()


@router.post("", response_model=FarmOut, status_code=201)
def create_farm(payload: FarmInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = Farm(user_id=user.id, **payload.model_dump()); db.add(farm); db.commit(); db.refresh(farm); return farm


@router.get("/{farm_id}", response_model=FarmOut)
def get_farm(farm_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return owned_farm(db, farm_id, user.id)


@router.put("/{farm_id}", response_model=FarmOut)
def update_farm(farm_id: int, payload: FarmInput, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = owned_farm(db, farm_id, user.id)
    for key, value in payload.model_dump().items(): setattr(farm, key, value)
    db.commit(); db.refresh(farm); return farm


@router.delete("/{farm_id}", status_code=204)
def delete_farm(farm_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = owned_farm(db, farm_id, user.id); db.delete(farm); db.commit(); return Response(status_code=status.HTTP_204_NO_CONTENT)
