"""Vertex AI 용 google-genai(신 SDK) Client 빌더.

session_support 의 live 음성용 빌더와 동일한 자격증명 규칙을 텍스트 생성에서도
재사용하기 위한 공용 모듈. (서비스 계정 JSON base64 → 파일 경로 순으로 시도)
"""
from __future__ import annotations

import base64
import json
import logging
from pathlib import Path
from typing import Any

from app.config import settings

logger = logging.getLogger("debut.vertex_genai")

_SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]


def build_vertex_genai_client() -> tuple[Any, str]:
    """Vertex AI 모드의 google-genai Client 를 만들고 (client, project_id) 를 반환한다.

    자격증명/프로젝트가 없으면 RuntimeError — 호출 측에서 AI Studio key 로 폴백한다.
    """
    from google import genai
    from google.oauth2 import service_account

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
            scopes=_SCOPES,
        )
    elif settings.google_application_credentials:
        credential_path = Path(settings.google_application_credentials).expanduser()
        credentials = service_account.Credentials.from_service_account_file(
            str(credential_path),
            scopes=_SCOPES,
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
    # 요청 타임아웃(ms) — 리포트 등 텍스트 생성이 멈춰도 워커를 영영 붙잡지 않게 한다.
    # (generate_content 는 request_options 인자를 받지 않아 클라이언트 레벨에서 건다.)
    from google.genai import types as genai_types

    client = genai.Client(
        vertexai=True,
        project=project_id,
        location=location,
        credentials=credentials,
        http_options=genai_types.HttpOptions(timeout=90_000),
    )
    logger.info(
        "vertex genai client configured (project=%s, location=%s)",
        project_id,
        location,
    )
    return client, project_id
