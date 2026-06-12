from __future__ import annotations

import base64
import json
import logging
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any

from app.config import settings
from app.services.gemini_live_voice_service import GeminiLiveInterviewSession

logger = logging.getLogger("debut.session_support")

if TYPE_CHECKING:
    from app.services.gemini_live_voice_service import GeminiLiveSttService, GeminiLiveTtsService
    from app.services.stt_service import GoogleCloudSttService


def _build_vertex_live_client() -> tuple[Any, str]:
    from google import genai
    from google.oauth2 import service_account

    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    credentials = None

    service_account_json_base64 = (
        (settings.google_service_account_json_b64 or "").strip()
        or (settings.gemini_service_account_json_base64 or "").strip()
    )
    if service_account_json_base64:
        decoded = base64.b64decode(service_account_json_base64)
        info = json.loads(decoded.decode("utf-8"))
        credentials = service_account.Credentials.from_service_account_info(
            info,
            scopes=scopes,
        )
    elif settings.google_application_credentials:
        credential_path = Path(settings.google_application_credentials).expanduser()
        credentials = service_account.Credentials.from_service_account_file(
            str(credential_path),
            scopes=scopes,
        )
    else:
        raise RuntimeError("Vertex AI requires a Google service account credential")

    project_id = (
        (settings.google_cloud_project or "").strip()
        or (getattr(credentials, "project_id", None) or "").strip()
    )
    if not project_id:
        raise RuntimeError("Vertex AI project ID is missing")

    location = (settings.google_cloud_location or "").strip() or "us-central1"
    client = genai.Client(
        vertexai=True,
        project=project_id,
        location=location,
        credentials=credentials,
    )
    logger.info(
        "gemini live client configured for Vertex AI (project=%s, location=%s)",
        project_id,
        location,
    )
    return client, project_id


@lru_cache(maxsize=1)
def _shared_vertex_live_client() -> Any | None:
    """STT/TTS 등 여러 서비스가 공유할 Vertex genai 클라이언트.

    google_genai_use_vertexai 가 꺼져 있거나 자격증명이 없으면 None → 호출 측이
    AI Studio api_key 로 폴백한다.
    """
    if not settings.google_genai_use_vertexai:
        return None
    try:
        client, _project_id = _build_vertex_live_client()
        return client
    except Exception:
        logger.exception(
            "failed to configure shared Vertex AI client; falling back to API key"
        )
        return None


def create_live_interview_session() -> GeminiLiveInterviewSession:
    if settings.google_genai_use_vertexai:
        try:
            client, _project_id = _build_vertex_live_client()
        except Exception:
            logger.exception(
                "failed to configure Vertex AI Gemini Live client; falling back to API key"
            )
        else:
            return GeminiLiveInterviewSession(
                api_key=None,
                client=client,
                model=(
                    (settings.gemini_vertex_live_model or "").strip()
                    or "gemini-live-2.5-flash-native-audio"
                ),
                voice=(settings.gemini_live_tts_voice or "Kore"),
                timeout_sec=30.0,
            )

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

    # Vertex 모드면 native-audio live 모델을, 아니면 기존 AI Studio TTS 모델을 쓴다.
    vertex_client = _shared_vertex_live_client()
    if vertex_client is not None:
        model_name = (
            (settings.gemini_vertex_live_model or "").strip()
            or "gemini-live-2.5-flash-native-audio"
        )
    else:
        model_name = (
            (settings.gemini_tts_model or settings.gemini_live_tts_model or "").strip()
            or "gemini-2.5-flash-preview-tts"
        )
    return GeminiLiveTtsService(
        api_key=settings.gemini_api_key,
        client=vertex_client,
        model=model_name,
        generate_model=model_name,
        voice=(settings.gemini_live_tts_voice or "Kore"),
        timeout_sec=16.0,
    )


@lru_cache(maxsize=1)
def get_live_stt_service() -> GeminiLiveSttService:
    from app.services.gemini_live_voice_service import GeminiLiveSttService

    vertex_client = _shared_vertex_live_client()
    if vertex_client is not None:
        model_name = (
            (settings.gemini_vertex_live_model or "").strip()
            or "gemini-live-2.5-flash-native-audio"
        )
    else:
        model_name = (
            (settings.gemini_live_stt_model or "").strip()
            or "gemini-2.5-flash-native-audio-latest"
        )
    return GeminiLiveSttService(
        api_key=settings.gemini_api_key,
        client=vertex_client,
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
