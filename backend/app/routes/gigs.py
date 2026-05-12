from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .. import db
from ..authz import non_admin_required
from ..models import Gig

gigs_bp = Blueprint("gigs", __name__)

@gigs_bp.get("/gigs/<int:gig_id>")
def get_gig(gig_id: int):
    g = db.session.get(Gig, gig_id)
    if not g:
        return {"error": "not found"}, 404
    return {
        "id": g.id,
        "title": g.title,
        "description": g.description,
        "category": g.category,
        "price": g.price,
        "user_id": g.user_id,
        "created_at": g.created_at.isoformat(),
    }


@gigs_bp.get("/gigs")
def list_gigs():
    q = (request.args.get("q") or "").strip().lower()
    category = (request.args.get("category") or "").strip().lower()

    stmt = db.select(Gig).order_by(Gig.created_at.desc())
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Gig.title.ilike(like)) | (Gig.description.ilike(like)))
    if category:
        stmt = stmt.where(Gig.category.ilike(category))

    gigs = db.session.execute(stmt).scalars().all()
    return [
        {
            "id": g.id,
            "title": g.title,
            "description": g.description,
            "category": g.category,
            "price": g.price,
            "user_id": g.user_id,
            "created_at": g.created_at.isoformat(),
        }
        for g in gigs
    ]


@gigs_bp.post("/gigs")
@non_admin_required
def create_gig():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    category = (data.get("category") or "").strip()
    price = data.get("price")

    if not title or not description or not category or price is None:
        return {"error": "title, description, category, price required"}, 400

    try:
        price_int = int(price)
    except Exception:
        return {"error": "price must be an integer"}, 400

    gig = Gig(
        title=title,
        description=description,
        category=category,
        price=price_int,
        user_id=user_id,
    )
    db.session.add(gig)
    db.session.commit()

    return {
        "id": gig.id,
        "title": gig.title,
        "description": gig.description,
        "category": gig.category,
        "price": gig.price,
        "user_id": gig.user_id,
        "created_at": gig.created_at.isoformat(),
    }, 201

