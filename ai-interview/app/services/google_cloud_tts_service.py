from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass

from app.services.voice_pipeline import float_samples_to_pcm16le_bytes, wav_bytes_to_float_samples

try:  # pragma: no cover - optional dependency guard
    from google import auth as google_auth
    from google.api_core import exceptions as google_api_exceptions
    from google.auth.exceptions import DefaultCredentialsError
    from google.cloud import texttospeech
except Exception:  # pragma: no cover - optional dependency fallback
    google_auth = None  # type: ignore[assignment]
    google_api_exceptions = None  # type: ignore[assignment]
    DefaultCredentialsError = Exception  # type: ignore[misc,assignment]
    texttospeech = None  # type: ignore[assignment]

logger = logging.getLogger("dibut.google_cloud_tts")


def _format_tts_failure_message(reason: str) -> str:
    if reason == "quota":
        return "Google Cloud TTS 할당량 제한으로 이번 턴 음성 출력은 생략됩니다."
    if reason == "resource":
        return "Google Cloud TTS 서버 리소스가 부족하거나 일시 장애가 있어 이번 턴 음성 출력은 생략됩니다."
    if reason == "timeout":
        return "Google Cloud TTS 응답 시간이 초과되어 이번 턴 음성 출력은 생략됩니다."
    if reason == "auth":
        return "Google Cloud TTS 인증 또는 quota project 설정이 없어 이번 턴 음성 출력은 생략됩니다."
    if reason == "empty_response":
        return "Google Cloud TTS가 빈 오디오 응답을 반환해 이번 턴 음성 출력은 생략됩니다."
    return "Google Cloud TTS 오디오 생성에 실패했습니다. 이번 턴 음성 출력은 생략됩니다."


def _format_auth_message(detail: str) -> str:
    lowered = (detail or "").lower()
    if "service_disabled" in lowered or "api has not been used" in lowered:
        return "Google Cloud Text-to-Speech API가 프로젝트에서 비활성화되어 이번 턴 음성 출력은 생략됩니다."
    if "quota project" in lowered:
        return "Google Cloud TTS quota project가 설정되지 않아 이번 턴 음성 출력은 생략됩니다."
    return _format_tts_failure_message("auth")


@dataclass
class TtsFailureInfo:
    reason: str
    message: str
    retry_after_sec: int = 0
    model: str = ""
    detail: str = ""


@dataclass
class TtsResult:
    audio_pcm_bytes: bytes
    sample_rate: int
    provider: str
    failure: TtsFailureInfo | None = None


class GoogleCloudTtsService:
    def __init__(
        self,
        *,
        voice_name: str = "ko-KR-Neural2-C",
        language_code: str = "ko-KR",
        quota_project_id: str | None = None,
        output_sample_rate: int = 24000,
        speaking_rate: float = 1.0,
        pitch: float = 0.0,
        timeout_sec: float = 10.0,
        max_input_bytes: int = 4500,
    ):
        self.provider = "google-cloud-tts"
        self.voice_name = (voice_name or "ko-KR-Neural2-C").strip()
        self.language_code = (language_code or "ko-KR").strip()
        self.quota_project_id = (quota_project_id or "").strip() or None
        self.output_sample_rate = max(8000, int(output_sample_rate or 24000))
        self.speaking_rate = float(speaking_rate or 1.0)
        self.pitch = float(pitch or 0.0)
        self.timeout_sec = max(2.0, float(timeout_sec or 10.0))
        self.max_input_bytes = max(512, min(4500, int(max_input_bytes or 4500)))
        self._client = None
        self._init_error: Exception | None = None

        if texttospeech is None:
            self._init_error = RuntimeError("google-cloud-texttospeech dependency is not available")
            return

        try:
            credentials = None
            if google_auth is not None:
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
            self._client = texttospeech.TextToSpeechClient(credentials=credentials)
        except Exception as exc:  # pragma: no cover - environment dependent
            self._init_error = exc

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def _sanitize_tts_input(self, text: str) -> str:
        cleaned = text or ""
        cleaned = cleaned.replace("<verbatim>", "").replace("</verbatim>", "")
        cleaned = re.sub(r"`{1,3}", "", cleaned)
        cleaned = re.sub(r"(\*\*|__|~~)", "", cleaned)
        cleaned = re.sub(r"^\s{0,3}#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"^\s*[-*+]\s+", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    def _classify_failure(self, exc: Exception, *, detail: str = "") -> TtsFailureInfo:
        lowered = str(exc).lower()
        reason = "unknown"

        if (
            isinstance(exc, DefaultCredentialsError)
            or "credentials" in lowered
            or "permission" in lowered
            or "quota project" in lowered
            or "service_disabled" in lowered
        ):
            reason = "auth"
        elif isinstance(exc, asyncio.TimeoutError):
            reason = "timeout"
        elif google_api_exceptions is not None:
            if isinstance(exc, google_api_exceptions.DeadlineExceeded):
                reason = "timeout"
            elif isinstance(exc, (google_api_exceptions.TooManyRequests, google_api_exceptions.ResourceExhausted)):
                reason = "quota"
            elif isinstance(
                exc,
                (
                    google_api_exceptions.ServiceUnavailable,
                    google_api_exceptions.InternalServerError,
                    google_api_exceptions.Aborted,
                ),
            ):
                reason = "resource"
            elif isinstance(
                exc,
                (
                    google_api_exceptions.PermissionDenied,
                    google_api_exceptions.Unauthenticated,
                ),
            ):
                reason = "auth"

        if reason == "unknown":
            if "quota" in lowered or "rate limit" in lowered or "too many requests" in lowered:
                reason = "quota"
            elif "deadline" in lowered or "timeout" in lowered:
                reason = "timeout"
            elif "service unavailable" in lowered or "temporarily unavailable" in lowered or "internal" in lowered:
                reason = "resource"

        message = _format_tts_failure_message(reason)
        if reason == "auth":
            message = _format_auth_message(f"{detail}: {exc}" if detail else str(exc))

        return TtsFailureInfo(
            reason=reason,
            message=message,
            model=self.voice_name,
            detail=f"{detail}: {exc}" if detail else str(exc),
        )

    def _split_tts_segments(self, text: str) -> list[str]:
        normalized = re.sub(r"\s+", " ", (text or "")).strip()
        if not normalized:
            return []

        pieces = [piece.strip() for piece in re.split(r"(?<=[.!?])\s*|(?<=[,;:])\s*", normalized) if piece.strip()]
        if not pieces:
            pieces = [normalized]

        segments: list[str] = []
        current = ""
        for piece in pieces:
            candidate = f"{current} {piece}".strip() if current else piece
            if len(candidate.encode("utf-8")) <= self.max_input_bytes:
                current = candidate
                continue
            if current:
                segments.append(current)
            current = piece

        if current:
            segments.append(current)

        bounded: list[str] = []
        for segment in segments:
            remaining = segment.strip()
            while remaining:
                if len(remaining.encode("utf-8")) <= self.max_input_bytes:
                    bounded.append(remaining)
                    break

                upper = min(len(remaining), self.max_input_bytes)
                while upper > 1 and len(remaining[:upper].encode("utf-8")) > self.max_input_bytes:
                    upper -= 1
                split_at = remaining.rfind(" ", 0, upper)
                if split_at > max(8, upper // 3):
                    upper = split_at

                piece = remaining[:upper].strip()
                if not piece:
                    piece = remaining[:1]
                    upper = 1

                bounded.append(piece)
                remaining = remaining[upper:].lstrip()

        return [segment for segment in bounded if segment]

    def _build_request(self, text: str):
        return texttospeech.SynthesizeSpeechRequest(
            input=texttospeech.SynthesisInput(text=text),
            voice=texttospeech.VoiceSelectionParams(
                language_code=self.language_code,
                name=self.voice_name,
            ),
            audio_config=texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.LINEAR16,
                sample_rate_hertz=self.output_sample_rate,
                speaking_rate=self.speaking_rate,
                pitch=self.pitch,
            ),
        )

    def _synthesize_once(self, text: str) -> tuple[bytes, int]:
        if self._client is None:
            raise self._init_error or RuntimeError("Google Cloud TTS client is not initialized")

        response = self._client.synthesize_speech(
            request=self._build_request(text),
            timeout=self.timeout_sec,
        )
        audio_bytes = bytes(response.audio_content or b"")
        if not audio_bytes:
            return b"", self.output_sample_rate

        if audio_bytes.startswith(b"RIFF"):
            samples, sample_rate = wav_bytes_to_float_samples(audio_bytes)
            if samples:
                return float_samples_to_pcm16le_bytes(samples), sample_rate

        if len(audio_bytes) % 2 == 0:
            return audio_bytes, self.output_sample_rate

        return b"", self.output_sample_rate

    async def synthesize_pcm(self, text: str) -> TtsResult:
        if not text.strip():
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)

        if not self.enabled:
            failure = self._classify_failure(self._init_error or RuntimeError("Google Cloud TTS unavailable"))
            logger.warning("google cloud tts unavailable (%s)", failure.detail)
            return TtsResult(
                audio_pcm_bytes=b"",
                sample_rate=self.output_sample_rate,
                provider=self.provider,
                failure=failure,
            )

        payload_text = self._sanitize_tts_input(text)
        if not payload_text:
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)

        segments = self._split_tts_segments(payload_text)
        if not segments:
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)

        merged_audio: list[bytes] = []
        sample_rate = self.output_sample_rate

        for idx, segment in enumerate(segments, start=1):
            try:
                segment_audio, sample_rate = await asyncio.to_thread(self._synthesize_once, segment)
            except Exception as exc:
                failure = self._classify_failure(exc, detail=f"segment={idx}/{len(segments)} text_len={len(segment)}")
                log_method = logger.warning if failure.reason in {"quota", "resource", "timeout", "auth"} else logger.exception
                log_method(
                    "google cloud tts synthesis failed (segment=%s/%s, reason=%s, voice=%s, detail=%s)",
                    idx,
                    len(segments),
                    failure.reason,
                    self.voice_name,
                    failure.detail,
                )
                return TtsResult(
                    audio_pcm_bytes=b"",
                    sample_rate=self.output_sample_rate,
                    provider=self.provider,
                    failure=failure,
                )

            if not segment_audio:
                failure = TtsFailureInfo(
                    reason="empty_response",
                    message=_format_tts_failure_message("empty_response"),
                    model=self.voice_name,
                    detail=f"segment={idx}/{len(segments)}",
                )
                logger.warning(
                    "google cloud tts returned empty audio payload (segment=%s/%s, voice=%s)",
                    idx,
                    len(segments),
                    self.voice_name,
                )
                return TtsResult(
                    audio_pcm_bytes=b"",
                    sample_rate=self.output_sample_rate,
                    provider=self.provider,
                    failure=failure,
                )

            merged_audio.append(segment_audio)

        payload = b"".join(merged_audio)
        logger.info(
            "google cloud tts success (segments=%s, voice=%s, sample_rate=%s, audio_bytes=%s)",
            len(segments),
            self.voice_name,
            sample_rate,
            len(payload),
        )
        return TtsResult(
            audio_pcm_bytes=payload,
            sample_rate=sample_rate,
            provider=self.provider,
        )
