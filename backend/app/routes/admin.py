from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from .. import db
from ..authz import admin_required
from ..models import Application, Gig, Job, User

admin_bp = Blueprint("admin", __name__)


@admin_bp.delete("/admin/gigs/<int:gig_id>")
@admin_required
def admin_delete_gig(gig_id: int):
    gig = db.session.get(Gig, gig_id)
    if not gig:
        return {"error": "not found"}, 404
    db.session.delete(gig)
    db.session.commit()
    return {"ok": True}


@admin_bp.delete("/admin/jobs/<int:job_id>")
@admin_required
def admin_delete_job(job_id: int):
    job = db.session.get(Job, job_id)
    if not job:
        return {"error": "not found"}, 404
    db.session.delete(job)
    db.session.commit()
    return {"ok": True}


@admin_bp.get("/admin/stats")
@admin_required
def admin_stats():
    total_users = db.session.execute(db.select(db.func.count(User.id))).scalar_one()
    total_jobs = db.session.execute(db.select(db.func.count(Job.id))).scalar_one()
    total_gigs = db.session.execute(db.select(db.func.count(Gig.id))).scalar_one()
    total_apps = db.session.execute(db.select(db.func.count(Application.id))).scalar_one()

    # popular category by job count
    rows = db.session.execute(
        db.select(Job.category, db.func.count(Job.id)).group_by(Job.category).order_by(db.func.count(Job.id).desc()).limit(1)
    ).all()
    most_popular_category = rows[0][0] if rows else None

    active_jobs = db.session.execute(
        db.select(db.func.count(Job.id)).where(Job.status.in_(["open", "in_progress"]))
    ).scalar_one()

    return {
        "total_users": int(total_users),
        "total_jobs": int(total_jobs),
        "total_gigs": int(total_gigs),
        "total_applications": int(total_apps),
        "most_popular_category": most_popular_category,
        "active_jobs": int(active_jobs),
    }

