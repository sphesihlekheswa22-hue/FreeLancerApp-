import uuid
from pathlib import Path

from flask import Blueprint, abort, current_app, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from .. import db
from ..models import Profile, User

profile_bp = Blueprint("profile", __name__)

ALLOWED_PHOTO_EXT = frozenset({".jpg", ".jpeg", ".png", ".gif", ".webp"})
MAX_PHOTO_BYTES = 3 * 1024 * 1024


def _uploads_dir() -> Path:
    p = Path(current_app.instance_path) / "uploads"
    p.mkdir(parents=True, exist_ok=True)
    return p


@profile_bp.get("/uploads/<filename>")
def serve_profile_upload(filename: str):
    if "/" in filename or "\\" in filename or filename.startswith("."):
        abort(404)
    base = Path(filename).name
    if base != filename:
        abort(404)
    path = _uploads_dir() / base
    if not path.is_file():
        abort(404)
    return send_file(path)


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
    if "profile_picture_url" in data:
        profile.profile_picture_url = (data.get("profile_picture_url") or "").strip() or None
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


@profile_bp.post("/profile/photo")
@jwt_required()
def upload_profile_photo():
    if "file" not in request.files:
        return {"error": "file required"}, 400
    file = request.files["file"]
    if not file or not file.filename:
        return {"error": "file required"}, 400
    cl = request.content_length
    if cl is not None and cl > MAX_PHOTO_BYTES:
        return {"error": "file too large (max 3MB)"}, 400

    safe_name = secure_filename(file.filename)
    if not safe_name:
        return {"error": "invalid filename"}, 400
    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_PHOTO_EXT:
        return {"error": "allowed types: jpg, png, gif, webp"}, 400

    fname = f"{uuid.uuid4().hex}{ext}"
    dest = _uploads_dir() / fname
    file.save(dest)
    try:
        if dest.stat().st_size > MAX_PHOTO_BYTES:
            dest.unlink(missing_ok=True)
            return {"error": "file too large (max 3MB)"}, 400
    except OSError:
        dest.unlink(missing_ok=True)
        return {"error": "upload failed"}, 500

    url = f"/api/uploads/{fname}"
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        dest.unlink(missing_ok=True)
        return {"error": "not found"}, 404
    profile = db.session.get(Profile, user_id)
    if not profile:
        profile = Profile(user_id=user_id, bio="", skills="", rating=0, completed_jobs=0)
        db.session.add(profile)
    profile.profile_picture_url = url
    db.session.commit()
    return {"profile_picture_url": url}

