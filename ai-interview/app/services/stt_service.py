from __future__ import annotations

import base64
import io
import json
import logging
import queue
import re
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable

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

GENERIC_TECHNICAL_STT_HINTS = (
    "AI 면접",
    "면접 서비스",
    "실시간",
    "실시간 통신",
    "웹소켓",
    "WebSocket",
    "백엔드",
    "프론트엔드",
    "API",
    "REST API",
    "세션 상태",
    "동시 요청",
    "이벤트 처리",
    "비동기",
    "트래픽",
    "응답 시간",
    "지연 시간",
    "성능 지표",
    "TPS",
    "RPS",
    "Redis",
    "Kafka",
    "PostgreSQL",
    "MySQL",
    "Prisma",
    "Supabase",
    "NestJS",
    "Next.js",
    "React",
    "TypeScript",
    "AWS",
    "Docker",
    "Kubernetes",
    "CI/CD",
)

logger = logging.getLogger("dibut.stt")
_GENERIC_HINT_SET = {hint.casefold() for hint in GENERIC_TECHNICAL_STT_HINTS}
_NOISY_HINTS = {
    "프로젝트",
    "경험",
    "역할",
    "업무",
    "기술",
    "기술 스택",
    "요약",
    "summary",
    "description",
}


@dataclass
class SttResult:
    text: str
    provider: str


@dataclass
class StreamingSttEvent:
    text: str
    is_final: bool
    provider: str
    stability: float = 0.0


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


def _to_string_list(value: Any) -> list[str]:
    if isinstance(value, str):
        parts = re.split(r"[,/|·\n]+", value)
        return [part.strip() for part in parts if part and part.strip()]
    if isinstance(value, (list, tuple, set)):
        collected: list[str] = []
        for item in value:
            if isinstance(item, str):
                collected.extend(_to_string_list(item))
            elif isinstance(item, dict):
                for key in ("name", "title", "label", "value", "company", "role", "position", "projectName"):
                    candidate = item.get(key)
                    if isinstance(candidate, str):
                        collected.extend(_to_string_list(candidate))
            elif item is not None:
                text = str(item).strip()
                if text:
                    collected.append(text)
        return collected
    return []


def _normalize_phrase_hint(value: str) -> str:
    normalized = re.sub(r"\s+", " ", (value or "").strip())
    normalized = normalized.strip("()[]{}'\"`")
    if not normalized:
        return ""
    if normalized.casefold() in _NOISY_HINTS:
        return ""
    if len(normalized) < 2 or len(normalized) > 64:
        return ""
    if len(normalized.split()) > 6:
        return ""
    if re.fullmatch(r"[^\w가-힣]+", normalized):
        return ""
    return normalized


def build_session_stt_phrase_hints(
    job_data: dict[str, Any] | None = None,
    resume_data: Any = None,
    *,
    max_hints: int = 72,
) -> list[str]:
    hints: list[str] = []
    seen: set[str] = set()

    def add(value: str) -> None:
        normalized = _normalize_phrase_hint(value)
        if not normalized:
            return
        key = normalized.casefold()
        if key in seen:
            return
        seen.add(key)
        hints.append(normalized)

    for hint in GENERIC_TECHNICAL_STT_HINTS:
        add(hint)

    normalized_job = job_data if isinstance(job_data, dict) else {}
    normalized_resume = resume_data if isinstance(resume_data, dict) else {}

    company = str(normalized_job.get("company") or "").strip()
    role = str(normalized_job.get("role") or normalized_job.get("position") or "").strip()
    if company:
        add(company)
    if role:
        add(role)
    if company and role:
        add(f"{company} {role}")

    for key in (
        "techStack",
        "tech_stack",
        "requirements",
        "skills",
        "preferred",
        "preferredSkills",
        "responsibilities",
        "keywords",
    ):
        for term in _to_string_list(normalized_job.get(key)):
            add(term)

    for key in ("title", "headline", "targetRole", "desiredRole"):
        value = normalized_resume.get(key)
        if isinstance(value, str):
            add(value)

    for key in ("skills", "techStack", "tech_stack"):
        for term in _to_string_list(normalized_resume.get(key)):
            add(term)

    for section_key in ("experience", "experiences", "workExperience", "workExperiences", "projects"):
        section = normalized_resume.get(section_key)
        if not isinstance(section, list):
            continue
        for item in section:
            if not isinstance(item, dict):
                continue
            for key in ("name", "title", "company", "role", "position", "projectName"):
                value = item.get(key)
                if isinstance(value, str):
                    add(value)
            for key in ("skills", "techStack", "tech_stack", "technologies", "stack"):
                for term in _to_string_list(item.get(key)):
                    add(term)

    filtered: list[str] = []
    for hint in hints:
        key = hint.casefold()
        if key in _GENERIC_HINT_SET or any(ch.isdigit() or ch.isalpha() or "\uac00" <= ch <= "\ud7a3" for ch in hint):
            filtered.append(hint)
        if len(filtered) >= max_hints:
            break
    return filtered


class GoogleCloudSttService:
    def __init__(
        self,
        *,
        language_code: str = "ko-KR",
        model: str = "latest_long",
        max_alternatives: int = 5,
        enable_automatic_punctuation: bool = True,
        phrase_hints: Iterable[str] | None = None,
        phrase_hint_boost: float = 12.0,
        quota_project_id: str | None = None,
        service_account_file: str | None = None,
        service_account_json_base64: str | None = None,
        timeout_sec: float = 8.0,
    ):
        self.provider = "google-cloud-stt"
        self.language_code = (language_code or "ko-KR").strip()
        self.model = (model or "latest_long").strip()
        self.max_alternatives = max(1, int(max_alternatives or 1))
        self.enable_automatic_punctuation = bool(enable_automatic_punctuation)
        raw_phrase_hints = list(phrase_hints or GENERIC_TECHNICAL_STT_HINTS)
        self.phrase_hints = [hint.strip() for hint in raw_phrase_hints if (hint or "").strip()]
        self.phrase_hint_boost = max(0.0, float(phrase_hint_boost or 0.0))
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

    def start_streaming_session(
        self,
        *,
        sample_rate: int,
        language: str = "ko-KR",
        phrase_hints: Iterable[str] | None = None,
        phrase_hint_boost: float | None = None,
        on_result: Callable[[StreamingSttEvent], None] | None = None,
    ) -> "GoogleCloudStreamingSttSession | None":
        if not self._client:
            return None
        session_phrase_hints: list[str] = []
        for hint in [*self.phrase_hints, *(phrase_hints or [])]:
            normalized = hint.strip()
            if normalized and normalized not in session_phrase_hints:
                session_phrase_hints.append(normalized)
        return GoogleCloudStreamingSttSession(
            client=self._client,
            provider=self.provider,
            sample_rate=max(8000, int(sample_rate or 16000)),
            language_code=(language or self.language_code or "ko-KR").strip(),
            model=self.model,
            max_alternatives=self.max_alternatives,
            enable_automatic_punctuation=self.enable_automatic_punctuation,
            phrase_hints=session_phrase_hints,
            phrase_hint_boost=self.phrase_hint_boost if phrase_hint_boost is None else max(0.0, float(phrase_hint_boost)),
            timeout_sec=None,
            on_result=on_result,
        )

    def transcribe_wav(
        self,
        wav_bytes: bytes,
        language: str = "ko-KR",
        *,
        phrase_hints: Iterable[str] | None = None,
        phrase_hint_boost: float | None = None,
    ) -> SttResult:
        if not self._client or not wav_bytes:
            return SttResult(text="", provider=self.provider)

        effective_phrase_hints: list[str] = []
        for hint in [*self.phrase_hints, *(phrase_hints or [])]:
            normalized = hint.strip()
            if normalized and normalized not in effective_phrase_hints:
                effective_phrase_hints.append(normalized)
        speech_contexts = None
        if effective_phrase_hints:
            speech_contexts = [
                speech.SpeechContext(
                    phrases=effective_phrase_hints,
                    boost=self.phrase_hint_boost if phrase_hint_boost is None else max(0.0, float(phrase_hint_boost)),
                )
            ]

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=(language or self.language_code or "ko-KR").strip(),
            model=self.model,
            max_alternatives=self.max_alternatives,
            enable_automatic_punctuation=self.enable_automatic_punctuation,
            speech_contexts=speech_contexts,
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


class GoogleCloudStreamingSttSession:
    def __init__(
        self,
        *,
        client: "speech.SpeechClient",
        provider: str,
        sample_rate: int,
        language_code: str,
        model: str,
        max_alternatives: int,
        enable_automatic_punctuation: bool,
        phrase_hints: Iterable[str],
        phrase_hint_boost: float,
        timeout_sec: float | None,
        on_result: Callable[[StreamingSttEvent], None] | None = None,
    ) -> None:
        self._client = client
        self.provider = provider
        self.sample_rate = max(8000, int(sample_rate or 16000))
        self.language_code = (language_code or "ko-KR").strip()
        self.model = (model or "latest_long").strip()
        self.max_alternatives = max(1, int(max_alternatives or 1))
        self.enable_automatic_punctuation = bool(enable_automatic_punctuation)
        self.phrase_hints = [hint.strip() for hint in phrase_hints if (hint or "").strip()]
        self.phrase_hint_boost = max(0.0, float(phrase_hint_boost or 0.0))
        self.timeout_sec = None if timeout_sec is None else max(30.0, float(timeout_sec))
        self._on_result = on_result
        self._audio_queue: "queue.Queue[bytes | None]" = queue.Queue()
        self._closed = threading.Event()
        self._failed = threading.Event()
        self._thread = threading.Thread(target=self._run, name="google-streaming-stt", daemon=True)
        self._thread.start()

    def push_pcm(self, pcm_bytes: bytes) -> None:
        if self._closed.is_set() or not pcm_bytes:
            return
        self._audio_queue.put(bytes(pcm_bytes))

    def close(self, wait_timeout: float = 0.0) -> None:
        if self._closed.is_set():
            if wait_timeout > 0 and self._thread.is_alive():
                self._thread.join(timeout=wait_timeout)
            return
        self._closed.set()
        self._audio_queue.put(None)
        if wait_timeout > 0 and self._thread.is_alive():
            self._thread.join(timeout=wait_timeout)

    def is_closed(self) -> bool:
        return self._closed.is_set()

    def failed(self) -> bool:
        return self._failed.is_set()

    def _streaming_config(self) -> "speech.StreamingRecognitionConfig":
        speech_contexts = None
        if self.phrase_hints:
            speech_contexts = [
                speech.SpeechContext(
                    phrases=self.phrase_hints,
                    boost=self.phrase_hint_boost,
                )
            ]
        recognition_config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=self.sample_rate,
            language_code=self.language_code,
            model=self.model,
            max_alternatives=self.max_alternatives,
            enable_automatic_punctuation=self.enable_automatic_punctuation,
            speech_contexts=speech_contexts,
        )
        return speech.StreamingRecognitionConfig(
            config=recognition_config,
            interim_results=True,
            single_utterance=False,
        )

    def _request_iter(self):
        while True:
            chunk = self._audio_queue.get()
            if chunk is None:
                break
            if not chunk:
                continue
            # About 100 ms of 16-bit mono PCM at 16 kHz keeps interim updates responsive.
            for offset in range(0, len(chunk), 3200):
                part = chunk[offset : offset + 3200]
                if part:
                    yield speech.StreamingRecognizeRequest(audio_content=part)

    def _emit(self, text: str, *, is_final: bool, stability: float = 0.0) -> None:
        if not self._on_result:
            return
        event = StreamingSttEvent(
            text=text,
            is_final=is_final,
            provider=self.provider,
            stability=stability,
        )
        try:
            self._on_result(event)
        except Exception:
            pass

    def _run(self) -> None:
        try:
            request_kwargs: dict[str, Any] = {
                "config": self._streaming_config(),
                "requests": self._request_iter(),
            }
            if self.timeout_sec is not None:
                request_kwargs["timeout"] = self.timeout_sec
            responses = self._client.streaming_recognize(**request_kwargs)
            for response in responses:
                for result in getattr(response, "results", []) or []:
                    alternatives = [
                        (getattr(alternative, "transcript", "") or "").strip()
                        for alternative in (getattr(result, "alternatives", []) or [])
                        if (getattr(alternative, "transcript", "") or "").strip()
                    ]
                    chosen = pick_best_stt_alternative_text(alternatives)
                    if not chosen:
                        continue
                    self._emit(
                        chosen,
                        is_final=bool(getattr(result, "is_final", False)),
                        stability=float(getattr(result, "stability", 0.0) or 0.0),
                    )
        except Exception:
            self._failed.set()
            logger.warning("google streaming STT session failed", exc_info=True)
        finally:
            self._closed.set()


__all__ = [
    "GoogleCloudSttService",
    "GoogleCloudStreamingSttSession",
    "OpenAISttService",
    "StreamingSttEvent",
    "SttResult",
    "build_session_stt_phrase_hints",
    "pick_best_stt_alternative_text",
]
