from werkzeug.security import generate_password_hash

from flask import Blueprint, request

from .. import db
from ..authz import admin_required
from ..models import Application, Gig, Job, Profile, User

admin_bp = Blueprint("admin", __name__)

def _trim(v):
    return (v or "").strip()


@admin_bp.get("/admin/users")
@admin_required
def admin_list_users():
    q = _trim(request.args.get("q")).lower()
    stmt = db.select(User).order_by(User.created_at.desc())
    if q:
        like = f"%{q}%"
        stmt = stmt.where((User.name.ilike(like)) | (User.email.ilike(like)))
    users = db.session.execute(stmt).scalars().all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@admin_bp.post("/admin/users")
@admin_required
def admin_create_user():
    data = request.get_json(silent=True) or {}
    name = _trim(data.get("name"))
    email = _trim(data.get("email")).lower()
    password = _trim(data.get("password"))
    role = (_trim(data.get("role")) or "student").lower()
    if role not in {"student", "admin"}:
        return {"error": "role must be student or admin"}, 400
    if not name or not email or not password:
        return {"error": "name, email, password required"}, 400
    existing = db.session.execute(db.select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        return {"error": "email already exists"}, 400

    u = User(name=name, email=email, password_hash=generate_password_hash(password), role=role)
    db.session.add(u)
    db.session.commit()
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "created_at": u.created_at.isoformat()}, 201


@admin_bp.put("/admin/users/<int:user_id>")
@admin_required
def admin_update_user(user_id: int):
    u = db.session.get(User, user_id)
    if not u:
        return {"error": "not found"}, 404
    data = request.get_json(silent=True) or {}
    if "name" in data:
        u.name = _trim(data.get("name")) or u.name
    if "email" in data:
        email = _trim(data.get("email")).lower()
        if email and email != u.email:
            exists = db.session.execute(db.select(User).where(User.email == email, User.id != u.id)).scalar_one_or_none()
            if exists:
                return {"error": "email already exists"}, 400
            u.email = email
    if "role" in data:
        role = (_trim(data.get("role")) or u.role).lower()
        if role not in {"student", "admin"}:
            return {"error": "role must be student or admin"}, 400
        u.role = role
    if "password" in data and _trim(data.get("password")):
        u.password_hash = generate_password_hash(_trim(data.get("password")))
    db.session.commit()
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "created_at": u.created_at.isoformat()}


@admin_bp.delete("/admin/users/<int:user_id>")
@admin_required
def admin_delete_user(user_id: int):
    u = db.session.get(User, user_id)
    if not u:
        return {"error": "not found"}, 404
    # Delete profile first if exists (FK)
    p = db.session.get(Profile, user_id)
    if p:
        db.session.delete(p)
    db.session.delete(u)
    db.session.commit()
    return {"ok": True}


@admin_bp.get("/admin/jobs")
@admin_required
def admin_list_jobs():
    q = _trim(request.args.get("q")).lower()
    stmt = db.select(Job).order_by(Job.created_at.desc()).limit(200)
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Job.title.ilike(like)) | (Job.category.ilike(like)))
    jobs = db.session.execute(stmt).scalars().all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "category": j.category,
            "budget": j.budget,
            "deadline": j.deadline,
            "status": j.status,
            "user_id": j.user_id,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]


@admin_bp.put("/admin/jobs/<int:job_id>")
@admin_required
def admin_update_job(job_id: int):
    j = db.session.get(Job, job_id)
    if not j:
        return {"error": "not found"}, 404
    data = request.get_json(silent=True) or {}
    if "title" in data:
        j.title = _trim(data.get("title")) or j.title
    if "description" in data:
        j.description = _trim(data.get("description")) or j.description
    if "category" in data:
        j.category = _trim(data.get("category")) or j.category
    if "budget" in data and data.get("budget") is not None and str(data.get("budget")).strip() != "":
        try:
            j.budget = int(data.get("budget"))
        except Exception:
            return {"error": "budget must be an integer"}, 400
    if "deadline" in data:
        j.deadline = _trim(data.get("deadline")) or None
    if "status" in data:
        status = _trim(data.get("status")).lower()
        if status and status not in {"open", "in_progress", "completed", "closed"}:
            return {"error": "invalid status"}, 400
        if status:
            j.status = status
    db.session.commit()
    return {"ok": True}


@admin_bp.get("/admin/gigs")
@admin_required
def admin_list_gigs():
    q = _trim(request.args.get("q")).lower()
    stmt = db.select(Gig).order_by(Gig.created_at.desc()).limit(200)
    if q:
        like = f"%{q}%"
        stmt = stmt.where((Gig.title.ilike(like)) | (Gig.category.ilike(like)))
    gigs = db.session.execute(stmt).scalars().all()
    return [
        {
            "id": g.id,
            "title": g.title,
            "category": g.category,
            "price": g.price,
            "user_id": g.user_id,
            "created_at": g.created_at.isoformat(),
        }
        for g in gigs
    ]


@admin_bp.put("/admin/gigs/<int:gig_id>")
@admin_required
def admin_update_gig(gig_id: int):
    g = db.session.get(Gig, gig_id)
    if not g:
        return {"error": "not found"}, 404
    data = request.get_json(silent=True) or {}
    if "title" in data:
        g.title = _trim(data.get("title")) or g.title
    if "description" in data:
        g.description = _trim(data.get("description")) or g.description
    if "category" in data:
        g.category = _trim(data.get("category")) or g.category
    if "price" in data and data.get("price") is not None and str(data.get("price")).strip() != "":
        try:
            g.price = int(data.get("price"))
        except Exception:
            return {"error": "price must be an integer"}, 400
    db.session.commit()
    return {"ok": True}


@admin_bp.get("/admin/applications")
@admin_required
def admin_list_applications():
    stmt = db.select(Application).order_by(Application.created_at.desc()).limit(200)
    apps = db.session.execute(stmt).scalars().all()
    return [
        {
            "id": a.id,
            "job_id": a.job_id,
            "freelancer_id": a.freelancer_id,
            "status": a.status,
            "expected_price": a.expected_price,
            "estimated_time": a.estimated_time,
            "created_at": a.created_at.isoformat(),
        }
        for a in apps
    ]


@admin_bp.put("/admin/applications/<int:application_id>")
@admin_required
def admin_update_application(application_id: int):
    a = db.session.get(Application, application_id)
    if not a:
        return {"error": "not found"}, 404
    data = request.get_json(silent=True) or {}
    if "status" in data:
        status = _trim(data.get("status")).lower()
        allowed = {"pending", "shortlisted", "accepted", "rejected", "completed"}
        if status not in allowed:
            return {"error": "invalid status"}, 400
        a.status = status
    db.session.commit()
    return {"ok": True}


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

