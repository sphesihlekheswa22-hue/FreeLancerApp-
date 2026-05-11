from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .. import db
from ..models import Application, Job, Profile, User
from ..notify import notify

applications_bp = Blueprint("applications", __name__)


@applications_bp.post("/apply")
@jwt_required()
def apply_to_job():
    freelancer_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    job_id = data.get("job_id")
    proposal = (data.get("proposal") or "").strip()
    expected_price = data.get("expected_price")
    estimated_time = (data.get("estimated_time") or "").strip()

    if job_id is None or not proposal or expected_price is None or not estimated_time:
        return {"error": "job_id, proposal, expected_price, estimated_time required"}, 400

    job = db.session.get(Job, int(job_id))
    if not job:
        return {"error": "job not found"}, 404

    try:
        expected_price_int = int(expected_price)
    except Exception:
        return {"error": "expected_price must be an integer"}, 400

    app = Application(
        job_id=job.id,
        freelancer_id=freelancer_id,
        proposal=proposal,
        expected_price=expected_price_int,
        estimated_time=estimated_time,
        status="pending",
    )
    db.session.add(app)
    notify(
        user_id=job.user_id,
        type="application_received",
        message=f"New proposal received for '{job.title}'.",
        link=f"/applications",
    )
    notify(
        user_id=freelancer_id,
        type="application_submitted",
        message=f"Your application for '{job.title}' was submitted.",
        link=f"/jobs/{job.id}",
    )
    db.session.commit()

    return {
        "id": app.id,
        "job_id": app.job_id,
        "freelancer_id": app.freelancer_id,
        "proposal": app.proposal,
        "expected_price": app.expected_price,
        "estimated_time": app.estimated_time,
        "status": app.status,
        "created_at": app.created_at.isoformat(),
    }, 201


@applications_bp.get("/applications")
@jwt_required()
def list_my_job_applications():
    """
    Returns applications *to jobs I posted*.
    """
    user_id = int(get_jwt_identity())

    # Enriched response: include job + freelancer profile details
    stmt = (
        db.select(Application, Job, User, Profile)
        .join(Job, Job.id == Application.job_id)
        .join(User, User.id == Application.freelancer_id)
        .outerjoin(Profile, Profile.user_id == User.id)
        .where(Job.user_id == user_id)
        .order_by(Application.created_at.desc())
    )

    rows = db.session.execute(stmt).all()
    out = []
    for a, job, u, p in rows:
        out.append(
            {
                "id": a.id,
                "job": {
                    "id": job.id,
                    "title": job.title,
                    "budget": job.budget,
                    "deadline": job.deadline,
                    "user_id": job.user_id,
                },
                "freelancer": {
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "profile": {
                        "bio": p.bio if p else "",
                        "skills": p.skills if p else "",
                        "rating": p.rating if p else 0,
                        "completed_jobs": p.completed_jobs if p else 0,
                        "profile_picture_url": p.profile_picture_url if p else None,
                        "portfolio_url": p.portfolio_url if p else None,
                    },
                },
                "proposal": a.proposal,
                "expected_price": a.expected_price,
                "estimated_time": a.estimated_time,
                "status": a.status,
                "created_at": a.created_at.isoformat(),
            }
        )

    return out


@applications_bp.get("/my-applications")
@jwt_required()
def list_my_sent_applications():
    """
    Returns applications I have submitted as a freelancer.
    Enriched response: include job + job owner basic info.
    """
    user_id = int(get_jwt_identity())

    stmt = (
        db.select(Application, Job, User)
        .join(Job, Job.id == Application.job_id)
        .join(User, User.id == Job.user_id)
        .where(Application.freelancer_id == user_id)
        .order_by(Application.created_at.desc())
    )

    rows = db.session.execute(stmt).all()
    out = []
    for a, job, owner in rows:
        out.append(
            {
                "id": a.id,
                "job": {
                    "id": job.id,
                    "title": job.title,
                    "budget": job.budget,
                    "deadline": job.deadline,
                    "user_id": job.user_id,
                },
                "client": {"id": owner.id, "name": owner.name, "email": owner.email},
                "proposal": a.proposal,
                "expected_price": a.expected_price,
                "estimated_time": a.estimated_time,
                "status": a.status,
                "created_at": a.created_at.isoformat(),
            }
        )

    return out


@applications_bp.post("/applications/<int:application_id>/status")
@jwt_required()
def set_application_status(application_id: int):
    """
    Job owner can accept/reject.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    status = (data.get("status") or "").strip().lower()

    allowed = {"pending", "shortlisted", "accepted", "rejected", "completed"}
    if status not in allowed:
        return {"error": "invalid status"}, 400

    app = db.session.get(Application, application_id)
    if not app:
        return {"error": "application not found"}, 404

    job = db.session.get(Job, app.job_id)
    if not job or job.user_id != user_id:
        return {"error": "forbidden"}, 403

    app.status = status
    notify(
        user_id=app.freelancer_id,
        type="application_status",
        message=f"Your proposal for '{job.title}' is now {status}.",
        link=f"/applications",
    )
    db.session.commit()

    return {"id": app.id, "status": app.status}

