from collections import defaultdict

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import and_, func, or_

from .. import db
from ..authz import non_admin_required
from ..models import Application, Job, Message, User
from ..notify import notify

messages_bp = Blueprint("messages", __name__)


def _pair_allowed_for_messaging(user_a: int, user_b: int) -> bool:
    """Messaging is only for job owner ↔ freelancer pairs with an accepted proposal."""
    if user_a == user_b:
        return False
    stmt = (
        db.select(Application.id)
        .join(Job, Job.id == Application.job_id)
        .where(
            Application.status == "accepted",
            or_(
                and_(Job.user_id == user_a, Application.freelancer_id == user_b),
                and_(Job.user_id == user_b, Application.freelancer_id == user_a),
            ),
        )
        .limit(1)
    )
    return db.session.execute(stmt).scalar_one_or_none() is not None


def _unread_from_other(*, me: int, other: int) -> int:
    """Messages the other user sent after my last outbound message to them (simple unread proxy)."""
    last_out = db.session.execute(
        db.select(Message.timestamp)
        .where(Message.sender_id == me, Message.receiver_id == other)
        .order_by(Message.timestamp.desc())
        .limit(1)
    ).scalar_one_or_none()
    q = db.select(func.count(Message.id)).where(
        Message.sender_id == other,
        Message.receiver_id == me,
    )
    if last_out is not None:
        q = q.where(Message.timestamp > last_out)
    return int(db.session.execute(q).scalar_one() or 0)


@messages_bp.post("/messages")
@non_admin_required
def send_message():
    sender_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    receiver_id = data.get("receiver_id")
    message_text = (data.get("message_text") or "").strip()
    if receiver_id is None or not message_text:
        return {"error": "receiver_id and message_text required"}, 400

    rid = int(receiver_id)
    if not _pair_allowed_for_messaging(sender_id, rid):
        return {
            "error": "Messaging is only available after your proposal is accepted for this project.",
        }, 403

    msg = Message(
        sender_id=sender_id,
        receiver_id=rid,
        message_text=message_text,
    )
    db.session.add(msg)
    notify(
        user_id=rid,
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

    if not _pair_allowed_for_messaging(user_id, other_id):
        return {"error": "Messaging is only available after a proposal is accepted for this project."}, 403

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
        if not _pair_allowed_for_messaging(user_id, other):
            continue
        seen.add(other)
        out.append(
            {
                "with_user_id": other,
                "unread_count": _unread_from_other(me=user_id, other=other),
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


@messages_bp.get("/messaging/partners")
@jwt_required()
def messaging_partners():
    """
    Users you may message: accepted proposal pairs (job owner ↔ freelancer).
    Used to start new threads before any message exists.
    """
    user_id = int(get_jwt_identity())

    stmt = (
        db.select(Application, Job)
        .join(Job, Job.id == Application.job_id)
        .where(Application.status == "accepted")
        .where(or_(Job.user_id == user_id, Application.freelancer_id == user_id))
    )
    rows = db.session.execute(stmt).all()

    by_other: dict[int, list[dict]] = defaultdict(list)
    other_ids: set[int] = set()
    for app, job in rows:
        other_id = job.user_id if app.freelancer_id == user_id else app.freelancer_id
        other_ids.add(other_id)
        by_other[other_id].append(
            {
                "application_id": app.id,
                "job_id": job.id,
                "job_title": job.title,
            }
        )

    if not other_ids:
        return []

    users = db.session.execute(db.select(User).where(User.id.in_(other_ids))).scalars().all()
    by_uid = {u.id: u for u in users}

    out = []
    for oid in sorted(other_ids):
        u = by_uid.get(oid)
        out.append(
            {
                "user": {"id": oid, "name": u.name if u else f"User #{oid}"},
                "jobs": by_other[oid],
            }
        )
    return out

