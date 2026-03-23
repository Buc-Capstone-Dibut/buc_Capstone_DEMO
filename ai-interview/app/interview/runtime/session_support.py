from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from typing import TYPE_CHECKING, Any

from app.config import settings
from app.services.gemini_live_voice_service import GeminiLiveInterviewSession

if TYPE_CHECKING:
    from app.services.gemini_live_voice_service import GeminiLiveSttService, GeminiLiveTtsService


def create_live_interview_session() -> GeminiLiveInterviewSession:
    model_name = (settings.gemini_live_stt_model or "").strip() or "gemini-2.5-flash-native-audio-latest"
    return GeminiLiveInterviewSession(
        api_key=settings.gemini_api_key,
        model=model_name,
        voice=(settings.gemini_live_tts_voice or "Kore"),
        timeout_sec=30.0,
    )


@lru_cache(maxsize=1)
def get_fallback_tts_service() -> GeminiLiveTtsService:
    from app.services.gemini_live_voice_service import GeminiLiveTtsService

    model_name = (settings.gemini_tts_model or settings.gemini_live_tts_model or "").strip() or "gemini-2.5-flash-preview-tts"
    return GeminiLiveTtsService(
        api_key=settings.gemini_api_key,
        model=model_name,
        generate_model=model_name,
        voice=(settings.gemini_live_tts_voice or "Kore"),
        timeout_sec=16.0,
    )


@lru_cache(maxsize=1)
def get_live_stt_service() -> GeminiLiveSttService:
    from app.services.gemini_live_voice_service import GeminiLiveSttService

    model_name = (settings.gemini_live_stt_model or "").strip() or "gemini-2.5-flash-native-audio-latest"
    return GeminiLiveSttService(
        api_key=settings.gemini_api_key,
        model=model_name,
        timeout_sec=6.0,
    )


def get_fallback_stt_service() -> GeminiLiveSttService:
    return get_live_stt_service()


def elapsed_seconds(started_at: datetime | None) -> int:
    if not isinstance(started_at, datetime):
        return 0
    anchor = started_at if started_at.tzinfo else started_at.replace(tzinfo=timezone.utc)
    diff = datetime.now(timezone.utc) - anchor.astimezone(timezone.utc)
    return max(0, int(diff.total_seconds()))


def latest_user_answer(messages: list[dict[str, Any]]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            return (message.get("parts") or "").strip()
    return ""


__all__ = [
    "create_live_interview_session",
    "elapsed_seconds",
    "get_live_stt_service",
    "get_fallback_stt_service",
    "get_fallback_tts_service",
    "latest_user_answer",
]
