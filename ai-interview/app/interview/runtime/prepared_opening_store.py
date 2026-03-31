from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from threading import Lock

from app.interview.runtime.live_turns import OpeningTurnSpec
from app.interview.runtime.state import AiDeliveryPlan

PREPARED_OPENING_TTL_SEC = 180


@dataclass(frozen=True)
class PreparedOpeningArtifact:
    spec: OpeningTurnSpec
    delivery_plan: AiDeliveryPlan
    spoken_provider: str = ""
    prepared_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


_store: dict[str, PreparedOpeningArtifact] = {}
_lock = Lock()


def _is_expired(artifact: PreparedOpeningArtifact, *, now: datetime | None = None) -> bool:
    anchor = now or datetime.now(timezone.utc)
    prepared_at = artifact.prepared_at
    if prepared_at.tzinfo is None:
        prepared_at = prepared_at.replace(tzinfo=timezone.utc)
    return prepared_at + timedelta(seconds=PREPARED_OPENING_TTL_SEC) <= anchor


def put_prepared_opening(session_id: str, artifact: PreparedOpeningArtifact) -> None:
    normalized = (session_id or "").strip()
    if not normalized:
        return
    with _lock:
        _cleanup_locked()
        _store[normalized] = artifact


def consume_prepared_opening(session_id: str) -> PreparedOpeningArtifact | None:
    normalized = (session_id or "").strip()
    if not normalized:
        return None
    with _lock:
        _cleanup_locked()
        artifact = _store.pop(normalized, None)
    return artifact


def _cleanup_locked() -> None:
    if not _store:
        return
    now = datetime.now(timezone.utc)
    expired = [key for key, artifact in _store.items() if _is_expired(artifact, now=now)]
    for key in expired:
        _store.pop(key, None)


__all__ = [
    "PREPARED_OPENING_TTL_SEC",
    "PreparedOpeningArtifact",
    "consume_prepared_opening",
    "put_prepared_opening",
]
