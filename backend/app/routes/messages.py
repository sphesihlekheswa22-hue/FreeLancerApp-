from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_

from .. import db
from ..models import Message
from ..notify import notify

messages_bp = Blueprint("messages", __name__)


@messages_bp.post("/messages")
@jwt_required()
def send_message():
    sender_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    receiver_id = data.get("receiver_id")
    message_text = (data.get("message_text") or "").strip()
    if receiver_id is None or not message_text:
        return {"error": "receiver_id and message_text required"}, 400

    msg = Message(
        sender_id=sender_id,
        receiver_id=int(receiver_id),
        message_text=message_text,
    )
    db.session.add(msg)
    notify(
        user_id=int(receiver_id),
        type="message",
        message="New message received.",
        link=f"/messages",
    )
    db.session.commit()

    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "message_text": msg.message_text,
        "timestamp": msg.timestamp.isoformat(),
    }, 201


@messages_bp.get("/messages")
@jwt_required()
def get_thread():
    """
    Get conversation thread with another user: /api/messages?with_user_id=2
    """
    user_id = int(get_jwt_identity())
    with_user_id = request.args.get("with_user_id")
    if not with_user_id:
        return {"error": "with_user_id required"}, 400
    other_id = int(with_user_id)

    stmt = (
        db.select(Message)
        .where(
            ((Message.sender_id == user_id) & (Message.receiver_id == other_id))
            | ((Message.sender_id == other_id) & (Message.receiver_id == user_id))
        )
        .order_by(Message.timestamp.asc())
    )

    msgs = db.session.execute(stmt).scalars().all()
    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "message_text": m.message_text,
            "timestamp": m.timestamp.isoformat(),
        }
        for m in msgs
    ]


@messages_bp.get("/inbox")
@jwt_required()
def inbox():
    """
    Lightweight inbox: list unique conversation partners with their latest message.
    """
    user_id = int(get_jwt_identity())

    stmt = (
        db.select(Message)
        .where(or_(Message.sender_id == user_id, Message.receiver_id == user_id))
        .order_by(Message.timestamp.desc())
    )
    msgs = db.session.execute(stmt).scalars().all()

    seen: set[int] = set()
    out = []
    for m in msgs:
        other = m.receiver_id if m.sender_id == user_id else m.sender_id
        if other in seen:
            continue
        seen.add(other)
        out.append(
            {
                "with_user_id": other,
                "last_message": {
                    "id": m.id,
                    "sender_id": m.sender_id,
                    "receiver_id": m.receiver_id,
                    "message_text": m.message_text,
                    "timestamp": m.timestamp.isoformat(),
                },
            }
        )

    return out

