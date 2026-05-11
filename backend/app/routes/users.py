from flask import Blueprint, request

from .. import db
from ..authz import admin_required
from ..models import Profile, Review, User

users_bp = Blueprint("users", __name__)


@users_bp.get("/users")
@admin_required
def list_users():
    q = (request.args.get("q") or "").strip().lower()
    stmt = db.select(User).order_by(User.created_at.desc())
    if q:
        like = f"%{q}%"
        stmt = stmt.where((User.name.ilike(like)) | (User.email.ilike(like)))

    users = db.session.execute(stmt).scalars().all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@users_bp.get("/users/<int:user_id>")
def get_user(user_id: int):
    user = db.session.get(User, user_id)
    if not user:
        return {"error": "not found"}, 404

    profile = user.profile or db.session.get(Profile, user_id)
    rating = profile.rating if profile else 0
    completed_jobs = profile.completed_jobs if profile else 0

    # lightweight: return last 5 reviews
    stmt = (
        db.select(Review)
        .where(Review.reviewed_user_id == user_id)
        .order_by(Review.created_at.desc())
        .limit(5)
    )
    reviews = db.session.execute(stmt).scalars().all()

    return {
        "user": {"id": user.id, "name": user.name, "email": user.email},
        "profile": {
            "bio": profile.bio if profile else "",
            "skills": profile.skills if profile else "",
            "rating": rating,
            "completed_jobs": completed_jobs,
            "profile_picture_url": profile.profile_picture_url if profile else None,
            "portfolio_url": profile.portfolio_url if profile else None,
        },
        "reviews": [
            {
                "id": r.id,
                "reviewer_id": r.reviewer_id,
                "reviewed_user_id": r.reviewed_user_id,
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews
        ],
    }

