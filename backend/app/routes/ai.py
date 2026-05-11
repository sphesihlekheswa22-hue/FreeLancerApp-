import json
import os
import urllib.request

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .. import db
from ..models import Job, Profile, User

ai_bp = Blueprint("ai", __name__)


def _fallback_proposal(*, job: Job, user: User, profile: Profile | None) -> dict:
    skills = (profile.skills if profile else "").strip()
    skill_list = [s.strip() for s in skills.split(",") if s.strip()]
    skill_phrase = ", ".join(skill_list[:5]) if skill_list else "relevant skills"

    expected_price = max(50, int(job.budget or 0))
    if expected_price > 0:
        expected_price = int(round(expected_price * 0.92 / 10.0) * 10)  # slightly under budget, rounded

    estimated_time = "2-4 days"
    cat = (job.category or "").lower()
    if "video" in cat:
        estimated_time = "2-3 days"
    elif "photo" in cat:
        estimated_time = "2 hours + edits"
    elif "tutor" in cat:
        estimated_time = "2-3 sessions"
    elif "web" in cat or "develop" in cat:
        estimated_time = "7-10 days"
    elif "writing" in cat:
        estimated_time = "1-2 days"
    elif "ux" in cat:
        estimated_time = "2 days"

    proposal = (
        f"Hi! I’d love to help with “{job.title}”.\n\n"
        f"Based on your description, I can deliver a clear first draft quickly and iterate with your feedback. "
        f"My experience includes {skill_phrase}.\n\n"
        f"Plan:\n"
        f"- Confirm requirements (style, examples, deadline)\n"
        f"- Deliver a first version\n"
        f"- Apply 1 round of revisions\n\n"
        f"Timeline: {estimated_time}\n"
        f"Price: R{expected_price}\n\n"
        f"If you share any references (links/files), I can start right away."
    )

    return {
        "proposal": proposal,
        "expected_price": expected_price,
        "estimated_time": estimated_time,
        "provider": "template",
    }


def _openai_proposal(*, job: Job, user: User, profile: Profile | None) -> dict | None:
    """
    Optional OpenAI integration via env var OPENAI_API_KEY.
    Returns None if not configured.
    """
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return None

    model = (os.getenv("OPENAI_MODEL") or "gpt-4.1-mini").strip()
    endpoint = (os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1/responses").strip()

    profile_payload = {
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "bio": (profile.bio if profile else ""),
        "skills": (profile.skills if profile else ""),
        "hourly_rate": (profile.hourly_rate if profile else None),
        "pricing_type": (profile.pricing_type if profile else "fixed"),
        "portfolio_url": (profile.portfolio_url if profile else None),
    }

    prompt = (
        "You are a proposal-writing assistant for a student freelance marketplace.\n"
        "Write a concise, professional proposal tailored to the job.\n"
        "Return STRICT JSON with keys: proposal (string), expected_price (integer), estimated_time (string).\n"
        "Currency is ZAR (R). Keep proposal under 180 words.\n\n"
        f"JOB:\n{json.dumps({'title': job.title, 'description': job.description, 'budget': job.budget, 'deadline': job.deadline, 'category': job.category}, ensure_ascii=False)}\n\n"
        f"FREELANCER:\n{json.dumps(profile_payload, ensure_ascii=False)}\n"
    )

    body = {
        "model": model,
        "input": prompt,
        "text": {"format": {"type": "json_object"}},
    }
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            raw = resp.read().decode("utf-8")
    except Exception:
        return None

    try:
        payload = json.loads(raw)
        # OpenAI Responses API: take combined text output
        out_text = ""
        for item in payload.get("output", []) or []:
            if item.get("type") == "message":
                for c in item.get("content", []) or []:
                    if c.get("type") == "output_text":
                        out_text += c.get("text") or ""
        data = json.loads(out_text) if out_text else None
        if not isinstance(data, dict):
            return None
        if not isinstance(data.get("proposal"), str):
            return None
        expected_price = int(data.get("expected_price"))
        estimated_time = str(data.get("estimated_time") or "").strip()
        if not estimated_time:
            return None
        return {
            "proposal": data["proposal"].strip(),
            "expected_price": expected_price,
            "estimated_time": estimated_time,
            "provider": "openai",
            "model": model,
        }
    except Exception:
        return None


@ai_bp.post("/ai/proposal")
@jwt_required()
def proposal_assistant():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return {"error": "not found"}, 404

    data = request.get_json(silent=True) or {}
    job_id = data.get("job_id")
    if job_id is None:
        return {"error": "job_id required"}, 400

    job = db.session.get(Job, int(job_id))
    if not job:
        return {"error": "job not found"}, 404

    profile = user.profile or db.session.get(Profile, user.id)

    ai = _openai_proposal(job=job, user=user, profile=profile)
    if ai:
        return ai
    return _fallback_proposal(job=job, user=user, profile=profile)

