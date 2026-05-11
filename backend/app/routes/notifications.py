from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from .. import db
from ..models import Notification

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.get("/notifications")
@jwt_required()
def list_notifications():
    user_id = int(get_jwt_identity())
    stmt = (
        db.select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    items = db.session.execute(stmt).scalars().all()
    return [
        {
            "id": n.id,
            "type": n.type,
            "message": n.message,
            "link": n.link,
            "is_read": bool(n.is_read),
            "created_at": n.created_at.isoformat(),
        }
        for n in items
    ]


@notifications_bp.post("/notifications/<int:notification_id>/read")
@jwt_required()
def mark_read(notification_id: int):
    user_id = int(get_jwt_identity())
    n = db.session.get(Notification, notification_id)
    if not n or n.user_id != user_id:
        return {"error": "not found"}, 404
    n.is_read = 1
    db.session.commit()
    return {"ok": True}


@notifications_bp.post("/notifications/read-all")
@jwt_required()
def read_all():
    user_id = int(get_jwt_identity())
    db.session.execute(
        db.update(Notification).where(Notification.user_id == user_id).values(is_read=1)
    )
    db.session.commit()
    return {"ok": True}

