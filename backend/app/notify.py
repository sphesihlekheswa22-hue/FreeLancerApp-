from __future__ import annotations

from . import db
from .models import Notification


def notify(*, user_id: int, type: str, message: str, link: str | None = None) -> None:
    n = Notification(user_id=user_id, type=type, message=message[:300], link=link)
    db.session.add(n)

