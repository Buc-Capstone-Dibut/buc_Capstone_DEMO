from __future__ import annotations

from itertools import count

_AI_TURN_SEQ = count(1)


def next_ai_turn_id(session_id: str) -> str:
    return f"{session_id}:{next(_AI_TURN_SEQ)}"


__all__ = ["next_ai_turn_id"]
