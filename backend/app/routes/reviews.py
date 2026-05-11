from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .. import db
from ..models import Profile, Review

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.get("/reviews")
def list_reviews():
    reviewed_user_id = request.args.get("user_id")
    if not reviewed_user_id:
        return {"error": "user_id required"}, 400

    stmt = (
        db.select(Review)
        .where(Review.reviewed_user_id == int(reviewed_user_id))
        .order_by(Review.created_at.desc())
    )
    reviews = db.session.execute(stmt).scalars().all()
    return [
        {
            "id": r.id,
            "reviewer_id": r.reviewer_id,
            "reviewed_user_id": r.reviewed_user_id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat(),
        }
        for r in reviews
    ]


@reviews_bp.post("/reviews")
@jwt_required()
def create_review():
    reviewer_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    reviewed_user_id = data.get("reviewed_user_id")
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip() or None

    if reviewed_user_id is None or rating is None:
        return {"error": "reviewed_user_id and rating required"}, 400

    try:
        rating_int = int(rating)
    except Exception:
        return {"error": "rating must be an integer"}, 400

    if rating_int < 1 or rating_int > 5:
        return {"error": "rating must be between 1 and 5"}, 400

    review = Review(
        reviewer_id=reviewer_id,
        reviewed_user_id=int(reviewed_user_id),
        rating=rating_int,
        comment=comment,
    )
    db.session.add(review)

    # Naive recalculation for demo: average rating stored as int (rounded)
    db.session.flush()
    stmt = db.select(Review).where(Review.reviewed_user_id == int(reviewed_user_id))
    reviews = db.session.execute(stmt).scalars().all()
    avg = round(sum(r.rating for r in reviews) / max(len(reviews), 1))

    profile = db.session.get(Profile, int(reviewed_user_id))
    if profile:
        profile.rating = int(avg)

    db.session.commit()

    return {
        "id": review.id,
        "reviewer_id": review.reviewer_id,
        "reviewed_user_id": review.reviewed_user_id,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at.isoformat(),
    }, 201

