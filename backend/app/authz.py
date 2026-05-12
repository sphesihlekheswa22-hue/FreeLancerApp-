from functools import wraps

from flask_jwt_extended import get_jwt_identity, jwt_required

from . import db
from .models import User


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        if not user or user.role != "admin":
            return {"error": "forbidden"}, 403
        return fn(*args, **kwargs)

    return wrapper


def non_admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        if not user or user.role == "admin":
            return {"error": "forbidden"}, 403
        return fn(*args, **kwargs)

    return wrapper
