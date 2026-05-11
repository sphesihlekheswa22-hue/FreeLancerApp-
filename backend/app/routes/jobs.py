from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .. import db
from ..models import Job, JobUpdate, User
from ..notify import notify

jobs_bp = Blueprint("jobs", __name__)

@jobs_bp.get("/jobs/<int:job_id>")
def get_job(job_id: int):
    j = db.session.get(Job, job_id)
    if not j:
        return {"error": "not found"}, 404
    return {
        "id": j.id,
        "title": j.title,
        "description": j.description,
        "budget": j.budget,
        "deadline": j.deadline,
        "user_id": j.user_id,
        "created_at": j.created_at.isoformat(),
        "category": j.category,
        "status": j.status,
        "progress": j.progress,
        "in_progress_notes": j.in_progress_notes,
    }


@jobs_bp.get("/jobs")
def list_jobs():
    q = (request.args.get("q") or "").strip().lower()
    category = (request.args.get("category") or "").strip().lower()
    status = (request.args.get("status") or "").strip().lower()

    stmt = db.select(Job).order_by(Job.created_at.desc())
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Job.title.ilike(like)) | (Job.description.ilike(like)))
    if category:
        stmt = stmt.where(Job.category.ilike(category))
    if status:
        stmt = stmt.where(Job.status.ilike(status))

    # budget range
    min_budget = request.args.get("min_budget")
    max_budget = request.args.get("max_budget")
    if min_budget:
        stmt = stmt.where(Job.budget >= int(min_budget))
    if max_budget:
        stmt = stmt.where(Job.budget <= int(max_budget))

    sort = (request.args.get("sort") or "").strip().lower()
    if sort == "highest_budget":
        stmt = stmt.order_by(Job.budget.desc(), Job.created_at.desc())
    elif sort == "lowest_budget":
        stmt = stmt.order_by(Job.budget.asc(), Job.created_at.desc())

    jobs = db.session.execute(stmt).scalars().all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "description": j.description,
            "budget": j.budget,
            "deadline": j.deadline,
            "category": j.category,
            "status": j.status,
            "user_id": j.user_id,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]


@jobs_bp.post("/jobs")
@jwt_required()
def create_job():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    budget = data.get("budget")
    deadline = (data.get("deadline") or "").strip() or None
    category = (data.get("category") or "").strip() or "General"

    if not title or not description or budget is None:
        return {"error": "title, description, budget required"}, 400

    try:
        budget_int = int(budget)
    except Exception:
        return {"error": "budget must be an integer"}, 400

    job = Job(
        title=title,
        description=description,
        budget=budget_int,
        deadline=deadline,
        category=category,
        status="open",
        user_id=user_id,
    )
    db.session.add(job)
    db.session.commit()

    # Notify other users that a new job is available (simple broadcast for demo).
    # This keeps the UI lively without requiring a subscription system.
    other_users = (
        db.session.execute(db.select(User).where(User.id != user_id).limit(50)).scalars().all()
    )
    for u in other_users:
        notify(
            user_id=u.id,
            type="job_available",
            message=f"New job posted: '{job.title}'.",
            link=f"/jobs/{job.id}",
        )

    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "budget": job.budget,
        "deadline": job.deadline,
        "category": job.category,
        "status": job.status,
        "user_id": job.user_id,
        "created_at": job.created_at.isoformat(),
    }, 201


@jobs_bp.put("/jobs/<int:job_id>")
@jwt_required()
def update_job(job_id: int):
    user_id = int(get_jwt_identity())
    job = db.session.get(Job, job_id)
    if not job:
        return {"error": "not found"}, 404
    if job.user_id != user_id:
        return {"error": "forbidden"}, 403

    data = request.get_json(silent=True) or {}
    if "title" in data:
        job.title = (data.get("title") or "").strip()
    if "description" in data:
        job.description = (data.get("description") or "").strip()
    if "budget" in data and data.get("budget") is not None:
        job.budget = int(data.get("budget"))
    if "deadline" in data:
        job.deadline = (data.get("deadline") or "").strip() or None
    if "category" in data:
        job.category = (data.get("category") or "").strip() or "General"
    if "status" in data:
        status = (data.get("status") or "").strip().lower()
        if status not in {"open", "in_progress", "completed", "cancelled"}:
            return {"error": "invalid status"}, 400
        job.status = status
        notify(
            user_id=job.user_id,
            type="job_status",
            message=f"Job '{job.title}' status changed to {status}.",
            link=f"/jobs/{job.id}",
        )

    if "progress" in data and data.get("progress") is not None:
        job.progress = max(0, min(100, int(data.get("progress"))))
    if "in_progress_notes" in data:
        job.in_progress_notes = (data.get("in_progress_notes") or "").strip()

    db.session.commit()
    return {"ok": True}


@jobs_bp.post("/jobs/<int:job_id>/updates")
@jwt_required()
def add_job_update(job_id: int):
    user_id = int(get_jwt_identity())
    job = db.session.get(Job, job_id)
    if not job:
        return {"error": "not found"}, 404
    if job.user_id != user_id:
        return {"error": "forbidden"}, 403

    data = request.get_json(silent=True) or {}
    note = (data.get("note") or "").strip()
    progress = data.get("progress")
    if not note or progress is None:
        return {"error": "note and progress required"}, 400

    upd = JobUpdate(job_id=job.id, note=note, progress=max(0, min(100, int(progress))))
    db.session.add(upd)
    job.progress = upd.progress
    if job.status == "open":
        job.status = "in_progress"

    db.session.commit()
    notify(
        user_id=job.user_id,
        type="job_update",
        message=f"Job update added for '{job.title}'.",
        link=f"/jobs/{job.id}",
    )
    return {"ok": True}


@jobs_bp.get("/jobs/<int:job_id>/updates")
def list_job_updates(job_id: int):
    job = db.session.get(Job, job_id)
    if not job:
        return {"error": "not found"}, 404
    stmt = db.select(JobUpdate).where(JobUpdate.job_id == job_id).order_by(JobUpdate.created_at.desc())
    items = db.session.execute(stmt).scalars().all()
    return [
        {
            "id": u.id,
            "job_id": u.job_id,
            "note": u.note,
            "progress": u.progress,
            "created_at": u.created_at.isoformat(),
        }
        for u in items
    ]


@jobs_bp.delete("/jobs/<int:job_id>")
@jwt_required()
def delete_job(job_id: int):
    user_id = int(get_jwt_identity())
    job = db.session.get(Job, job_id)
    if not job:
        return {"error": "not found"}, 404
    if job.user_id != user_id:
        return {"error": "forbidden"}, 403
    db.session.delete(job)
    db.session.commit()
    return {"ok": True}

