from __future__ import annotations

import asyncio
import base64
import logging
import re
import time
from dataclasses import dataclass
from typing import Any

from app.services.voice_pipeline import (
    float_samples_to_pcm16le_bytes,
    wav_bytes_to_float_samples,
)

try:  # pragma: no cover - import guard for optional dependency
    from google import genai
    from google.genai import types
except Exception:  # pragma: no cover - optional dependency fallback
    genai = None  # type: ignore[assignment]
    types = None  # type: ignore[assignment]

logger = logging.getLogger("dibut.gemini_live_voice")

PCM_RATE_PATTERN = re.compile(r"rate=(\d+)")


def _is_quota_exhausted_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return (
        "resource_exhausted" in text
        or "quota exceeded" in text
        or ("429" in text and "quota" in text)
    )


@dataclass
class SttResult:
    text: str
    provider: str


@dataclass
class TtsResult:
    audio_pcm_bytes: bytes
    sample_rate: int
    provider: str


class _GeminiLiveBaseService:
    def __init__(self, api_key: str | None, provider: str = "gemini-live"):
        self.provider = provider
        self._client = genai.Client(api_key=api_key) if api_key and genai is not None else None

    @property
    def enabled(self) -> bool:
        return self._client is not None and types is not None

    async def _receive_until_turn_complete(
        self,
        response_stream: Any,
        timeout_sec: float,
    ) -> list[Any]:
        responses: list[Any] = []
        while True:
            try:
                response = await asyncio.wait_for(response_stream.__anext__(), timeout=timeout_sec)
            except StopAsyncIteration:
                break
            except asyncio.TimeoutError:
                break

            responses.append(response)
            server_content = getattr(response, "server_content", None)
            if bool(getattr(server_content, "turn_complete", False)):
                break

        return responses

    def _extract_model_text_chunks(self, responses: list[Any]) -> list[str]:
        chunks: list[str] = []
        for response in responses:
            server_content = getattr(response, "server_content", None)
            model_turn = getattr(server_content, "model_turn", None)
            parts = getattr(model_turn, "parts", None) or []
            for part in parts:
                text = getattr(part, "text", None)
                if isinstance(text, str) and text.strip():
                    chunks.append(text.strip())
        return chunks

    def _extract_output_transcription_chunks(self, responses: list[Any]) -> list[str]:
        chunks: list[str] = []
        for response in responses:
            server_content = getattr(response, "server_content", None)
            output_transcription = getattr(server_content, "output_transcription", None)
            text = getattr(output_transcription, "text", "")
            if isinstance(text, str) and text.strip():
                chunks.append(text.strip())
        return chunks

    def _merge_transcription_chunks(self, chunks: list[str]) -> str:
        merged = ""
        for chunk in chunks:
            text = (chunk or "").strip()
            if not text:
                continue
            if merged and text.startswith(merged):
                merged = text
            else:
                merged += text
        return merged.strip()

    def _blob_to_bytes(self, raw: Any) -> bytes:
        if isinstance(raw, (bytes, bytearray)):
            return bytes(raw)
        if isinstance(raw, str):
            try:
                return base64.b64decode(raw, validate=False)
            except Exception:
                return b""
        return b""

    def _extract_audio_from_parts(
        self,
        parts: list[Any],
        initial_sample_rate: int = 24000,
    ) -> tuple[list[bytes], int]:
        chunks: list[bytes] = []
        detected_sample_rate = initial_sample_rate

        for part in parts:
            inline_data = getattr(part, "inline_data", None)
            raw = getattr(inline_data, "data", None)
            mime_type = getattr(inline_data, "mime_type", "") or ""
            blob_bytes = self._blob_to_bytes(raw)
            if not blob_bytes:
                continue

            lowered_mime = str(mime_type).lower()
            if lowered_mime.startswith("audio/wav"):
                wav_samples, wav_rate = wav_bytes_to_float_samples(blob_bytes)
                if wav_samples:
                    detected_sample_rate = wav_rate
                    chunks.append(float_samples_to_pcm16le_bytes(wav_samples))
                continue

            if "audio/pcm" in lowered_mime:
                matched = PCM_RATE_PATTERN.search(lowered_mime)
                if matched:
                    try:
                        detected_sample_rate = int(matched.group(1))
                    except ValueError:
                        pass
            chunks.append(blob_bytes)

        return chunks, detected_sample_rate

    def _extract_audio_chunks(self, responses: list[Any]) -> tuple[list[bytes], int]:
        chunks: list[bytes] = []
        detected_sample_rate = 24000

        for response in responses:
            server_content = getattr(response, "server_content", None)
            model_turn = getattr(server_content, "model_turn", None)
            parts = getattr(model_turn, "parts", None) or []
            part_chunks, detected_sample_rate = self._extract_audio_from_parts(parts, detected_sample_rate)
            if part_chunks:
                chunks.extend(part_chunks)
                continue

            # SDK/environment에 따라 audio payload가 response.data(bytes/base64)로만 내려오는 경우가 있다.
            raw_data = getattr(response, "data", None)
            blob_bytes = self._blob_to_bytes(raw_data)
            if blob_bytes:
                chunks.append(blob_bytes)

        return chunks, detected_sample_rate

    def _extract_audio_from_generate_response(self, response: Any) -> tuple[bytes, int]:
        detected_sample_rate = 24000
        chunks: list[bytes] = []

        candidates = getattr(response, "candidates", None) or []
        for candidate in candidates:
            content = getattr(candidate, "content", None)
            parts = getattr(content, "parts", None) or []
            part_chunks, detected_sample_rate = self._extract_audio_from_parts(parts, detected_sample_rate)
            if part_chunks:
                chunks.extend(part_chunks)

        if not chunks:
            raw_data = getattr(response, "data", None)
            blob_bytes = self._blob_to_bytes(raw_data)
            if blob_bytes:
                chunks.append(blob_bytes)

        return b"".join(chunks), detected_sample_rate


class GeminiLiveSttService(_GeminiLiveBaseService):
    def __init__(
        self,
        api_key: str | None,
        model: str = "gemini-2.5-flash-native-audio-latest",
        timeout_sec: float = 2.5,
    ):
        super().__init__(api_key=api_key)
        self.model = model
        self.timeout_sec = timeout_sec

    async def transcribe_wav(self, wav_bytes: bytes, language: str = "ko") -> SttResult:
        if not wav_bytes:
            return SttResult(text="", provider=self.provider)

        samples, sample_rate = wav_bytes_to_float_samples(wav_bytes)
        if not samples:
            return SttResult(text="", provider=self.provider)

        pcm_bytes = float_samples_to_pcm16le_bytes(samples)
        return await self.transcribe_pcm(pcm_bytes, sample_rate=sample_rate, language=language)

    async def transcribe_pcm(
        self,
        pcm_bytes: bytes,
        sample_rate: int = 16000,
        language: str = "ko",
    ) -> SttResult:
        if not self.enabled or not pcm_bytes:
            return SttResult(text="", provider=self.provider)

        config = {
            "response_modalities": ["AUDIO"],
            "input_audio_transcription": {},
            "output_audio_transcription": {},
            "system_instruction": (
                "You are a strict speech-to-text engine. "
                f"Transcribe the user's speech in {language} only. "
                "Do not summarize, do not answer, and do not add extra explanation."
            ),
        }

        try:
            async with self._client.aio.live.connect(model=self.model, config=config) as session:
                await session.send_realtime_input(
                    audio=types.Blob(data=pcm_bytes, mime_type=f"audio/pcm;rate={sample_rate}")
                )
                await session.send_realtime_input(audio_stream_end=True)

                responses = await self._receive_until_turn_complete(
                    response_stream=session.receive(),
                    timeout_sec=self.timeout_sec,
                )
        except Exception:
            logger.exception("gemini live stt failed")
            return SttResult(text="", provider=self.provider)

        input_transcripts: list[str] = []
        output_transcripts: list[str] = []

        for response in responses:
            server_content = getattr(response, "server_content", None)
            input_transcription = getattr(server_content, "input_transcription", None)
            input_text = getattr(input_transcription, "text", "")
            if isinstance(input_text, str) and input_text.strip():
                input_transcripts.append(input_text.strip())

            output_transcription = getattr(server_content, "output_transcription", None)
            output_text = getattr(output_transcription, "text", "")
            if isinstance(output_text, str) and output_text.strip():
                output_transcripts.append(output_text.strip())

        if input_transcripts:
            final_text = self._merge_transcription_chunks(input_transcripts)
        elif output_transcripts:
            final_text = self._merge_transcription_chunks(output_transcripts)
        else:
            model_text_chunks = self._extract_model_text_chunks(responses)
            final_text = " ".join(model_text_chunks).strip()

        return SttResult(text=final_text, provider=self.provider)


class GeminiLiveTtsService(_GeminiLiveBaseService):
    def __init__(
        self,
        api_key: str | None,
        model: str = "gemini-2.5-flash-preview-tts",
        voice: str = "Kore",
        output_sample_rate: int = 24000,
        timeout_sec: float = 10.0,
    ):
        super().__init__(api_key=api_key)
        self.model = model
        self.voice = voice
        self.output_sample_rate = output_sample_rate
        self.timeout_sec = timeout_sec
        self._quota_exhausted = False

    @property
    def quota_exhausted(self) -> bool:
        return self._quota_exhausted

    def _estimate_max_output_tokens(self, text: str, boost: int = 0) -> int:
        base = int(len(text) * 4.0) + 120 + boost
        return max(256, min(1800, base))

    def _tts_generate_config(self, text: str, boost: int = 0) -> dict[str, Any]:
        return {
            "response_modalities": ["AUDIO"],
            "temperature": 0.0,
            "top_p": 0.9,
            "max_output_tokens": self._estimate_max_output_tokens(text, boost=boost),
            "automatic_function_calling": {"disable": True},
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {
                        "voice_name": self.voice,
                    }
                }
            },
        }

    async def _synthesize_via_generate_content(
        self,
        text: str,
        boost: int = 0,
        timeout_override: float | None = None,
    ) -> tuple[bytes, int]:
        # NOTE:
        # If timeout is too short, upstream requests can still succeed shortly after timeout
        # while this task has already failed, which looks like "200 OK but no audio".
        # Keep timeout generous to avoid premature fallback.
        timeout_sec = self.timeout_sec if timeout_override is None else timeout_override
        request_coro = self._client.aio.models.generate_content(
            model=self.model,
            contents=text,
            config=self._tts_generate_config(text, boost=boost),
        )

        if timeout_sec and timeout_sec > 0:
            response = await asyncio.wait_for(request_coro, timeout=timeout_sec)
        else:
            response = await request_coro

        return self._extract_audio_from_generate_response(response)

    def _split_tts_segments(self, text: str, max_chars: int = 120) -> list[str]:
        normalized = re.sub(r"\s+", " ", (text or "")).strip()
        if not normalized:
            return []

        # Prefer sentence boundaries first, then merge into bounded chunks.
        pieces = [p.strip() for p in re.split(r"(?<=[.!?])\s+|(?<=[,;:])\s+", normalized) if p.strip()]
        if not pieces:
            pieces = [normalized]

        segments: list[str] = []
        current = ""
        for piece in pieces:
            candidate = f"{current} {piece}".strip() if current else piece
            if len(candidate) <= max_chars:
                current = candidate
                continue
            if current:
                segments.append(current)
            current = piece

        if current:
            segments.append(current)

        # Hard cut for very long token-without-boundary cases.
        bounded: list[str] = []
        for segment in segments:
            if len(segment) <= max_chars:
                bounded.append(segment)
                continue
            for idx in range(0, len(segment), max_chars):
                bounded.append(segment[idx:idx + max_chars].strip())

        return [s for s in bounded if s]

    def _whole_text_budget_sec(self, text_len: int) -> float:
        # Dynamic budget: long prompts need more time, but cap to avoid blocking turns too long.
        estimate = 9.0 + (text_len / 140.0) * 3.0
        return max(9.0, min(16.0, estimate))

    async def _generate_with_retries(
        self,
        target_text: str,
        boosts: tuple[int, ...],
        *,
        max_total_sec: float | None = None,
    ) -> tuple[bytes, int]:
        started_at = time.monotonic()
        for attempt_idx, boost in enumerate(boosts, start=1):
            timeout_override: float | None = None
            if max_total_sec is not None:
                elapsed = time.monotonic() - started_at
                remaining = max_total_sec - elapsed
                if remaining <= 0:
                    logger.warning("gemini tts retry budget exhausted (text_len=%s)", len(target_text))
                    return b"", self.output_sample_rate
                timeout_override = min(self.timeout_sec, max(0.8, remaining))

            try:
                payload, sample_rate = await self._synthesize_via_generate_content(
                    target_text,
                    boost=boost,
                    timeout_override=timeout_override,
                )
            except asyncio.TimeoutError:
                logger.warning(
                    "gemini tts generate_content timeout (attempt=%s, text_len=%s)",
                    attempt_idx,
                    len(target_text),
                )
                payload, sample_rate = b"", self.output_sample_rate
            except Exception as exc:
                if _is_quota_exhausted_error(exc):
                    logger.error("gemini tts quota exhausted; server-side TTS disabled for this process")
                    self._quota_exhausted = True
                    return b"", self.output_sample_rate
                logger.exception("gemini tts generate_content failed")
                payload, sample_rate = b"", self.output_sample_rate

            if payload:
                return payload, sample_rate or self.output_sample_rate

            logger.warning(
                "gemini tts returned empty payload via generate_content (attempt=%s, text_len=%s)",
                attempt_idx,
                len(target_text),
            )
            if attempt_idx < len(boosts):
                await asyncio.sleep(0.2 * attempt_idx)

        return b"", self.output_sample_rate

    async def synthesize_pcm(self, text: str) -> TtsResult:
        if not self.enabled or not text.strip():
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)
        if self._quota_exhausted:
            logger.warning("gemini tts skipped due to quota exhausted state")
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)

        payload_text = re.sub(r"\s+", " ", text).strip()
        if not payload_text:
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)

        text_len = len(payload_text)
        segments = self._split_tts_segments(payload_text, max_chars=120)
        use_segmented_first = len(segments) > 1 and text_len >= 180

        if not use_segmented_first:
            # Natural voice priority for short/mid text.
            whole_payload, whole_rate = await self._generate_with_retries(
                payload_text,
                boosts=(0,),
                max_total_sec=11.0,
            )
            if whole_payload:
                return TtsResult(audio_pcm_bytes=whole_payload, sample_rate=whole_rate, provider=self.provider)

        # For long text (or full-text failure), synthesize by segments.
        # IMPORTANT: return only when every segment succeeded (no partial/mid-sentence audio).
        if not segments:
            logger.error("gemini tts has no segments")
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)

        merged: list[bytes] = []
        sample_rate_final = self.output_sample_rate
        for segment in segments:
            seg_payload, seg_rate = await self._generate_with_retries(
                segment,
                boosts=(0,),
                max_total_sec=11.0,
            )
            if not seg_payload:
                logger.error("gemini tts segmented synthesis failed (segment_len=%s)", len(segment))
                return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)
            merged.append(seg_payload)
            sample_rate_final = seg_rate

        merged_payload = b"".join(merged)
        if not merged_payload:
            logger.error("gemini tts merged segmented payload is empty")
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)

        return TtsResult(audio_pcm_bytes=merged_payload, sample_rate=sample_rate_final, provider=self.provider)
