from flask import Blueprint, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash

from .. import db
from ..models import Profile, User

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return {"error": "name, email, password required"}, 400

    existing = db.session.execute(db.select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        return {"error": "email already registered"}, 409

    user = User(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        role="student",
    )
    db.session.add(user)
    db.session.flush()

    profile = Profile(user_id=user.id, bio="", skills="", rating=0, completed_jobs=0)
    db.session.add(profile)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return {"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = db.session.execute(db.select(User).where(User.email == email)).scalar_one_or_none()
    if not user or not check_password_hash(user.password_hash, password):
        return {"error": "invalid credentials"}, 401

    token = create_access_token(identity=str(user.id))
    return {"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return {"error": "not found"}, 404

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "profile": {
            "bio": user.profile.bio if user.profile else "",
            "skills": user.profile.skills if user.profile else "",
            "rating": user.profile.rating if user.profile else 0,
            "completed_jobs": user.profile.completed_jobs if user.profile else 0,
            "profile_picture_url": user.profile.profile_picture_url if user.profile else None,
        },
    }

