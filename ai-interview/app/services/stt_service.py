from __future__ import annotations

import base64
import io
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from app.interview.domain.turn_text import (
    looks_like_degraded_user_transcript,
    score_user_transcript_text,
    sanitize_user_turn_text,
)

try:  # pragma: no cover - optional dependency guard
    from google import auth as google_auth
    from google.api_core import exceptions as google_api_exceptions
    from google.auth.exceptions import DefaultCredentialsError
    from google.cloud import speech
    from google.oauth2 import service_account
except Exception:  # pragma: no cover - optional dependency fallback
    google_auth = None  # type: ignore[assignment]
    google_api_exceptions = None  # type: ignore[assignment]
    DefaultCredentialsError = Exception  # type: ignore[misc,assignment]
    service_account = None  # type: ignore[assignment]
    speech = None  # type: ignore[assignment]

from openai import OpenAI


@dataclass
class SttResult:
    text: str
    provider: str


class OpenAISttService:
    def __init__(self, api_key: str | None, model: str = "whisper-1"):
        self.model = model
        self.provider = "openai"
        self._client: OpenAI | None = OpenAI(api_key=api_key) if api_key else None

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def transcribe_bytes(
        self,
        audio_bytes: bytes,
        filename: str = "speech.wav",
        language: str = "ko",
    ) -> SttResult:
        if not self._client or not audio_bytes:
            return SttResult(text="", provider=self.provider)

        file_obj = io.BytesIO(audio_bytes)
        file_obj.name = filename

        response = self._client.audio.transcriptions.create(
            model=self.model,
            file=file_obj,
            language=language,
        )
        text = getattr(response, "text", "") or ""
        return SttResult(text=text.strip(), provider=self.provider)

    def transcribe_wav(self, wav_bytes: bytes, language: str = "ko") -> SttResult:
        return self.transcribe_bytes(
            audio_bytes=wav_bytes,
            filename="speech.wav",
            language=language,
        )


def pick_best_stt_alternative_text(candidates: Iterable[str]) -> str:
    normalized_candidates: list[str] = []
    for candidate in candidates:
        normalized = sanitize_user_turn_text(candidate)
        if normalized and normalized not in normalized_candidates:
            normalized_candidates.append(normalized)
    if not normalized_candidates:
        return ""
    return max(
        normalized_candidates,
        key=lambda candidate: (
            0 if looks_like_degraded_user_transcript(candidate) else 1,
            int(
                round(
                    score_user_transcript_text(candidate)
                    / max(1, len(re.findall(r"[0-9A-Za-z가-힣]", candidate)))
                    * 100
                )
            ),
            score_user_transcript_text(candidate),
            len(candidate),
        ),
    )


class GoogleCloudSttService:
    def __init__(
        self,
        *,
        language_code: str = "ko-KR",
        model: str = "latest_short",
        max_alternatives: int = 3,
        enable_automatic_punctuation: bool = True,
        quota_project_id: str | None = None,
        service_account_file: str | None = None,
        service_account_json_base64: str | None = None,
        timeout_sec: float = 8.0,
    ):
        self.provider = "google-cloud-stt"
        self.language_code = (language_code or "ko-KR").strip()
        self.model = (model or "latest_short").strip()
        self.max_alternatives = max(1, int(max_alternatives or 1))
        self.enable_automatic_punctuation = bool(enable_automatic_punctuation)
        self.quota_project_id = (quota_project_id or "").strip() or None
        self.service_account_file = (service_account_file or "").strip() or None
        self.service_account_json_base64 = (service_account_json_base64 or "").strip() or None
        self.timeout_sec = max(2.0, float(timeout_sec or 8.0))
        self._client = None
        self._init_error: Exception | None = None

        if speech is None:
            self._init_error = RuntimeError("google-cloud-speech dependency is not available")
            return

        try:
            credentials = None
            if self.service_account_file and service_account is not None:
                credential_path = Path(self.service_account_file).expanduser()
                credentials = service_account.Credentials.from_service_account_file(
                    str(credential_path),
                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                )
                quota_project = (
                    self.quota_project_id
                    or getattr(credentials, "quota_project_id", None)
                    or getattr(credentials, "project_id", None)
                )
                if quota_project and hasattr(credentials, "with_quota_project"):
                    credentials = credentials.with_quota_project(quota_project)
                    self.quota_project_id = quota_project
            elif self.service_account_json_base64 and service_account is not None:
                decoded = base64.b64decode(self.service_account_json_base64)
                info = json.loads(decoded.decode("utf-8"))
                credentials = service_account.Credentials.from_service_account_info(
                    info,
                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                )
                quota_project = self.quota_project_id or getattr(credentials, "project_id", None)
                if quota_project and hasattr(credentials, "with_quota_project"):
                    credentials = credentials.with_quota_project(quota_project)
                    self.quota_project_id = quota_project
            elif google_auth is not None:
                credentials, detected_project = google_auth.default(
                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                )
                effective_quota_project = (
                    self.quota_project_id
                    or getattr(credentials, "quota_project_id", None)
                    or detected_project
                )
                if (
                    effective_quota_project
                    and getattr(credentials, "quota_project_id", None) != effective_quota_project
                    and hasattr(credentials, "with_quota_project")
                ):
                    credentials = credentials.with_quota_project(effective_quota_project)
                    self.quota_project_id = effective_quota_project

            self._client = speech.SpeechClient(credentials=credentials)
        except Exception as exc:  # pragma: no cover - environment dependent
            self._init_error = exc

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def transcribe_wav(self, wav_bytes: bytes, language: str = "ko-KR") -> SttResult:
        if not self._client or not wav_bytes:
            return SttResult(text="", provider=self.provider)

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=(language or self.language_code or "ko-KR").strip(),
            model=self.model,
            max_alternatives=self.max_alternatives,
            enable_automatic_punctuation=self.enable_automatic_punctuation,
        )
        audio = speech.RecognitionAudio(content=wav_bytes)

        try:
            response = self._client.recognize(
                config=config,
                audio=audio,
                timeout=self.timeout_sec,
            )
        except Exception:
            if google_api_exceptions is None:
                raise
            raise

        alternatives: list[str] = []
        for result in getattr(response, "results", []) or []:
            for alternative in getattr(result, "alternatives", []) or []:
                transcript = (getattr(alternative, "transcript", "") or "").strip()
                if transcript:
                    alternatives.append(transcript)

        return SttResult(
            text=pick_best_stt_alternative_text(alternatives),
            provider=self.provider,
        )


__all__ = [
    "GoogleCloudSttService",
    "OpenAISttService",
    "SttResult",
    "pick_best_stt_alternative_text",
]
