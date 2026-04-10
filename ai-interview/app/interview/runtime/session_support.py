from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from typing import TYPE_CHECKING, Any

from app.config import settings
from app.services.gemini_live_voice_service import GeminiLiveInterviewSession

if TYPE_CHECKING:
    from app.services.gemini_live_voice_service import GeminiLiveSttService, GeminiLiveTtsService
    from app.services.stt_service import GoogleCloudSttService


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


@lru_cache(maxsize=1)
def get_parallel_stt_service() -> GoogleCloudSttService:
    from app.services.stt_service import GoogleCloudSttService

    service_account_json_base64 = (
        (settings.google_service_account_json_b64 or "").strip()
        or (settings.gemini_service_account_json_base64 or "").strip()
        or None
    )

    return GoogleCloudSttService(
        model=(settings.google_cloud_stt_model or "").strip() or "latest_long",
        language_code=(settings.google_cloud_stt_language_code or "").strip() or "ko-KR",
        max_alternatives=max(1, int(settings.google_cloud_stt_max_alternatives or 1)),
        phrase_hint_boost=max(0.0, float(settings.google_cloud_stt_phrase_hint_boost or 0.0)),
        quota_project_id=(settings.google_cloud_project or "").strip() or None,
        service_account_file=(settings.google_application_credentials or "").strip() or None,
        service_account_json_base64=service_account_json_base64,
    )


def build_parallel_stt_phrase_hints(job_data: dict[str, Any] | None, resume_data: Any) -> list[str]:
    from app.services.stt_service import build_session_stt_phrase_hints

    return build_session_stt_phrase_hints(job_data=job_data, resume_data=resume_data)


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
    "get_parallel_stt_service",
    "build_parallel_stt_phrase_hints",
    "latest_user_answer",
]
