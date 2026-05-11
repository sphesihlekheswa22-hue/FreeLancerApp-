from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .. import db
from ..models import Profile, User

profile_bp = Blueprint("profile", __name__)


@profile_bp.get("/profile")
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return {"error": "not found"}, 404
    profile = user.profile or db.session.get(Profile, user_id)

    return {
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
        "profile": {
            "bio": profile.bio if profile else "",
            "skills": profile.skills if profile else "",
            "rating": profile.rating if profile else 0,
            "completed_jobs": profile.completed_jobs if profile else 0,
            "profile_picture_url": profile.profile_picture_url if profile else None,
            "portfolio_url": profile.portfolio_url if profile else None,
            "hourly_rate": profile.hourly_rate if profile else None,
            "pricing_type": profile.pricing_type if profile else "fixed",
        },
    }


@profile_bp.put("/profile")
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    bio = (data.get("bio") or "").strip()
    skills = (data.get("skills") or "").strip()
    profile_picture_url = (data.get("profile_picture_url") or "").strip() or None
    portfolio_url = (data.get("portfolio_url") or "").strip() or None
    hourly_rate = data.get("hourly_rate")
    pricing_type = (data.get("pricing_type") or "").strip().lower() or "fixed"
    if pricing_type not in {"fixed", "hourly"}:
        return {"error": "pricing_type must be fixed or hourly"}, 400

    profile = db.session.get(Profile, user_id)
    if not profile:
        profile = Profile(user_id=user_id, bio="", skills="", rating=0, completed_jobs=0)
        db.session.add(profile)

    profile.bio = bio
    profile.skills = skills
    profile.profile_picture_url = profile_picture_url
    profile.portfolio_url = portfolio_url
    profile.pricing_type = pricing_type
    profile.hourly_rate = int(hourly_rate) if hourly_rate is not None and hourly_rate != "" else None
    db.session.commit()

    return {
        "bio": profile.bio,
        "skills": profile.skills,
        "rating": profile.rating,
        "completed_jobs": profile.completed_jobs,
        "profile_picture_url": profile.profile_picture_url,
        "portfolio_url": profile.portfolio_url,
        "hourly_rate": profile.hourly_rate,
        "pricing_type": profile.pricing_type,
    }

