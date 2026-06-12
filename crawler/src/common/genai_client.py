"""Vertex AI(우선) → AI Studio key 폴백으로 google-genai(신 SDK) Client 를 만드는 공용 빌더.

ai-interview 백엔드(app/services/vertex_genai.py)와 동일한 자격증명 규칙을 따른다:
  1) GOOGLE_SERVICE_ACCOUNT_JSON_B64 / GEMINI_SERVICE_ACCOUNT_JSON_BASE64 (base64)
  2) GOOGLE_APPLICATION_CREDENTIALS (서비스 계정 JSON 파일 경로)
  3) ADC (환경에 잡혀 있으면)

GOOGLE_GENAI_USE_VERTEXAI=true 면 Vertex(GCP 크레딧, AI Studio prepayment 와 무관),
아니면 GEMINI_API_KEY(AI Studio) 로 폴백한다. 둘 다 없으면 None.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any

from loguru import logger

from src.common.config.settings import GEMINI_API_KEY

_SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]

_CLIENT: Any = None
_INITIALIZED = False


def _use_vertex() -> bool:
    return (os.getenv("GOOGLE_GENAI_USE_VERTEXAI") or "").strip().lower() == "true"


def _load_vertex_credentials():
    """base64 → 파일 경로 순. 모두 없으면 None(ADC 시도)."""
    from google.oauth2 import service_account

    b64 = (
        (os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON_B64") or "").strip()
        or (os.getenv("GEMINI_SERVICE_ACCOUNT_JSON_BASE64") or "").strip()
    )
    if b64:
        info = json.loads(base64.b64decode(b64).decode("utf-8"))
        return service_account.Credentials.from_service_account_info(info, scopes=_SCOPES)

    keyfile = (os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or "").strip()
    if keyfile:
        path = Path(keyfile).expanduser()
        if path.exists():
            return service_account.Credentials.from_service_account_file(str(path), scopes=_SCOPES)

    return None  # ADC


def _build_vertex_client():
    from google import genai

    credentials = _load_vertex_credentials()
    project = (
        (os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GOOGLE_VERTEX_PROJECT") or "").strip()
        or (getattr(credentials, "project_id", None) or "").strip()
    )
    if not project:
        raise RuntimeError("Vertex AI project ID is missing")

    location = (
        os.getenv("GOOGLE_CLOUD_LOCATION") or os.getenv("GOOGLE_VERTEX_LOCATION") or ""
    ).strip() or "us-central1"

    client = genai.Client(
        vertexai=True,
        project=project,
        location=location,
        credentials=credentials,
    )
    logger.info(f"🧠 Gemini via Vertex AI (project={project}, location={location})")
    return client


def get_genai_client() -> Any | None:
    """프로세스 단위로 캐시된 google-genai Client.

    Vertex 우선 → 실패 시 AI Studio key → 둘 다 없으면 None.
    """
    global _CLIENT, _INITIALIZED
    if _INITIALIZED:
        return _CLIENT
    _INITIALIZED = True

    if _use_vertex():
        try:
            _CLIENT = _build_vertex_client()
            return _CLIENT
        except Exception as e:
            logger.error(f"❌ Vertex client 초기화 실패 — AI Studio key 로 폴백: {e}")

    if GEMINI_API_KEY:
        from google import genai

        _CLIENT = genai.Client(api_key=GEMINI_API_KEY)
        logger.info("🧠 Gemini via AI Studio API key")
        return _CLIENT

    logger.warning("⚠️ Gemini 백엔드 없음 (Vertex/AI Studio 모두 미설정)")
    return None
