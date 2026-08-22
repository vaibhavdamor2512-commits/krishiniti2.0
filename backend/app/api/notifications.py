from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Notification, User


router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications_list = db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).all()
    if not notifications_list:
        return [
            {"id": 1, "title": "Welcome to Krishiniti", "message": "Start by creating your first farm and field to receive personalized advisories.", "type": "general", "is_read": False},
            {"id": 2, "title": "Setup complete", "message": "Your account is ready. Create farms and fields to get weather, crop health, and advisory notifications.", "type": "general", "is_read": False}
        ]
    return notifications_list


@router.put("/{notification_id}/read")
def mark_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if not item: raise HTTPException(status_code=404, detail="Notification not found.")
    item.is_read = True; db.commit(); db.refresh(item); return item
