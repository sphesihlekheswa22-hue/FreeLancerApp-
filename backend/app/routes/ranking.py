from flask import Blueprint
from sqlalchemy import desc

from .. import db
from ..models import Profile, User

ranking_bp = Blueprint("ranking", __name__)


def badge_for(profile: Profile | None) -> str:
    rating = profile.rating if profile else 0
    completed = profile.completed_jobs if profile else 0
    if rating >= 4 and completed >= 10:
        return "Expert"
    if rating >= 3 and completed >= 3:
        return "Skilled"
    return "Beginner"


@ranking_bp.get("/top-freelancers")
def top_freelancers():
    stmt = (
        db.select(User, Profile)
        .join(Profile, Profile.user_id == User.id)
        .order_by(desc(Profile.rating), desc(Profile.completed_jobs))
        .limit(20)
    )
    rows = db.session.execute(stmt).all()
    out = []
    for u, p in rows:
        out.append(
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "rating": p.rating,
                "completed_jobs": p.completed_jobs,
                "skills": p.skills,
                "portfolio_url": p.portfolio_url,
                "badge": badge_for(p),
            }
        )
    return out

