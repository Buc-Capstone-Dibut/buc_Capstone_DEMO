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


@dataclass
class LiveInterviewTurnResult:
    user_text: str
    ai_text: str
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
        generate_model: str | None = None,
        voice: str = "Kore",
        output_sample_rate: int = 24000,
        timeout_sec: float = 20.0,
        quota_cooldown_sec: int = 300,
    ):
        super().__init__(api_key=api_key, provider="gemini-live-tts")
        # Keep `model` and `generate_model` for compatibility with existing callers/configs.
        self.model = model
        self.generate_model = (generate_model or model).strip() or "gemini-2.5-flash-preview-tts"
        self.voice = voice
        self.output_sample_rate = output_sample_rate
        self.timeout_sec = timeout_sec
        self._quota_block_until = 0.0
        self._quota_error_streak = 0
        self._quota_cooldown_sec = max(60, int(quota_cooldown_sec))

    @property
    def quota_exhausted(self) -> bool:
        return self.quota_retry_after_sec > 0

    @property
    def quota_retry_after_sec(self) -> int:
        remaining = self._quota_block_until - time.monotonic()
        return max(0, int(remaining))

    def _mark_quota_exhausted(self, exc: Exception) -> None:
        self._quota_error_streak += 1
        multiplier = min(6, self._quota_error_streak)
        cooldown_sec = min(3600, self._quota_cooldown_sec * multiplier)
        self._quota_block_until = time.monotonic() + cooldown_sec
        logger.error(
            "gemini tts quota/resource exhausted; cooldown applied (retry_after=%ss, streak=%s): %s",
            cooldown_sec,
            self._quota_error_streak,
            exc,
        )

    def _mark_quota_recovered(self) -> None:
        if self._quota_error_streak:
            self._quota_error_streak = 0
        self._quota_block_until = 0.0

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

    def _estimate_max_output_tokens(self, text: str) -> int:
        base = int(len(text) * 4.0) + 120
        return max(256, min(1800, base))

    def _tts_generate_config(self, text: str) -> dict[str, Any]:
        return {
            "response_modalities": ["AUDIO"],
            "temperature": 0.0,
            "top_p": 0.9,
            "max_output_tokens": self._estimate_max_output_tokens(text),
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
    ) -> tuple[bytes, int]:
        request_coro = self._client.aio.models.generate_content(
            model=self.generate_model,
            contents=text,
            config=self._tts_generate_config(text),
        )

        if self.timeout_sec and self.timeout_sec > 0:
            response = await asyncio.wait_for(request_coro, timeout=self.timeout_sec)
        else:
            response = await request_coro

        return self._extract_audio_from_generate_response(response)

    async def synthesize_pcm(self, text: str) -> TtsResult:
        if not self.enabled or not text.strip():
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)
        retry_after_sec = self.quota_retry_after_sec
        if retry_after_sec > 0:
            logger.warning("gemini tts skipped due to quota cooldown (retry_after=%ss)", retry_after_sec)
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)

        payload_text = self._sanitize_tts_input(text)
        if not payload_text:
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)

        try:
            payload, sample_rate = await self._synthesize_via_generate_content(payload_text)
        except asyncio.TimeoutError:
            logger.warning(
                "gemini tts generate_content timeout (model=%s, text_len=%s, timeout=%.2fs)",
                self.generate_model,
                len(payload_text),
                self.timeout_sec,
            )
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)
        except Exception as exc:
            if _is_quota_exhausted_error(exc):
                self._mark_quota_exhausted(exc)
                return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)
            logger.exception(
                "gemini tts generate_content failed (model=%s, text_len=%s)",
                self.generate_model,
                len(payload_text),
            )
            return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)

        if payload:
            logger.info(
                "gemini tts generate_content success (model=%s, text_len=%s, sample_rate=%s, audio_bytes=%s)",
                self.generate_model,
                len(payload_text),
                sample_rate,
                len(payload),
            )
            self._mark_quota_recovered()
            return TtsResult(
                audio_pcm_bytes=payload,
                sample_rate=sample_rate or self.output_sample_rate,
                provider=self.provider,
            )

        logger.warning(
            "gemini tts returned empty payload via generate_content (model=%s, text_len=%s)",
            self.generate_model,
            len(payload_text),
        )
        return TtsResult(audio_pcm_bytes=b"", sample_rate=self.output_sample_rate, provider=self.provider)


class GeminiLiveInterviewSession(_GeminiLiveBaseService):
    def __init__(
        self,
        api_key: str | None,
        model: str = "gemini-2.5-flash-native-audio-latest",
        voice: str = "Kore",
        timeout_sec: float = 18.0,
        output_sample_rate: int = 24000,
    ):
        super().__init__(api_key=api_key, provider="gemini-live-single")
        self.model = (model or "").strip() or "gemini-2.5-flash-native-audio-latest"
        self._active_model = self.model
        self.voice = voice
        self.timeout_sec = max(6.0, float(timeout_sec or 18.0))
        self.output_sample_rate = max(8000, int(output_sample_rate or 24000))
        self._session_cm: Any | None = None
        self._session: Any | None = None
        self._session_lock = asyncio.Lock()
        self._turn_lock = asyncio.Lock()
        self._session_instruction: str = ""
        self._connect_block_until = 0.0

    @property
    def connected(self) -> bool:
        return self._session is not None

    @property
    def active_model(self) -> str:
        return self._active_model

    def _build_live_config(self, session_instruction: str) -> dict[str, Any]:
        return {
            "response_modalities": ["AUDIO"],
            "temperature": 0.35,
            "top_p": 0.9,
            "max_output_tokens": 1100,
            "input_audio_transcription": {},
            "output_audio_transcription": {},
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {
                        "voice_name": self.voice,
                    }
                }
            },
            "system_instruction": session_instruction,
        }

    def _compose_turn_text(self, *, turn_prompt: str, text: str) -> str:
        prompt = (turn_prompt or "").strip()
        payload = (text or "").strip()
        if prompt and payload:
            return f"{prompt}\n\n[실행 지시]\n{payload}"
        return prompt or payload

    def _sanitize_model_text(self, text: str) -> str:
        cleaned = text or ""
        cleaned = cleaned.replace("<verbatim>", "").replace("</verbatim>", "")
        cleaned = re.sub(r"`{1,3}", "", cleaned)
        cleaned = re.sub(r"(\*\*|__|~~)", "", cleaned)
        cleaned = re.sub(r"^\s{0,3}#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    def _is_likely_complete_ai_text(self, text: str) -> bool:
        normalized = (text or "").strip().rstrip("\"' ")
        if not normalized:
            return False
        if normalized[-1] in ".?!":
            return True
        complete_endings = (
            "요",
            "니다",
            "습니다",
            "세요",
            "까요",
            "인가요",
            "죠",
            "해 주세요",
            "말씀해 주세요",
            "부탁드립니다",
        )
        return any(normalized.endswith(ending) for ending in complete_endings)

    def _select_best_ai_text(self, output_text: str, model_text: str) -> str:
        candidates = [text for text in (output_text, model_text) if (text or "").strip()]
        if not candidates:
            return ""

        def _score(candidate: str) -> int:
            normalized = self._sanitize_model_text(candidate)
            if not normalized:
                return -1
            bonus = 140 if self._is_likely_complete_ai_text(normalized) else 0
            return len(normalized) + bonus

        best = max(candidates, key=_score)
        return self._sanitize_model_text(best)

    async def close(self) -> None:
        async with self._session_lock:
            session_cm = self._session_cm
            session = self._session
            self._session_cm = None
            self._session = None
            self._session_instruction = ""

        try:
            if session_cm is not None:
                await session_cm.__aexit__(None, None, None)
            elif session is not None and hasattr(session, "close"):
                await session.close()
        except Exception:
            logger.warning("gemini live single session close failed", exc_info=True)

    async def _ensure_connected(self, session_instruction: str) -> bool:
        if not self.enabled:
            return False
        if time.monotonic() < self._connect_block_until:
            return False

        async with self._session_lock:
            if self._session is not None and self._session_instruction == session_instruction:
                return True

        if self._session is not None:
            await self.close()

        async with self._session_lock:
            if self._session is not None and self._session_instruction == session_instruction:
                return True
            last_error: Exception | None = None
            try:
                self._session_cm = self._client.aio.live.connect(
                    model=self.model,
                    config=self._build_live_config(session_instruction),
                )
                self._session = await self._session_cm.__aenter__()
                self._session_instruction = session_instruction
                self._active_model = self.model
                self._connect_block_until = 0.0
                logger.info(
                    "gemini live single session connected (model=%s, voice=%s)",
                    self.model,
                    self.voice,
                )
                return True
            except Exception as exc:
                last_error = exc
                self._session_cm = None
                self._session = None
                self._session_instruction = ""
                logger.exception("gemini live single session connect failed (model=%s)", self.model)

            retry_after = 3
            self._connect_block_until = time.monotonic() + retry_after
            logger.error(
                "gemini live single session unavailable; retries paused (retry_after=%ss, model=%s, error=%s)",
                retry_after,
                self.model,
                last_error,
            )
            return False

    def _collect_input_transcriptions(self, responses: list[Any]) -> list[str]:
        chunks: list[str] = []
        for response in responses:
            server_content = getattr(response, "server_content", None)
            input_transcription = getattr(server_content, "input_transcription", None)
            text = getattr(input_transcription, "text", "")
            if isinstance(text, str) and text.strip():
                chunks.append(text.strip())
        return chunks

    def _build_turn_result(self, responses: list[Any]) -> LiveInterviewTurnResult:
        input_chunks = self._collect_input_transcriptions(responses)
        output_chunks = self._extract_output_transcription_chunks(responses)
        model_text_chunks = self._extract_model_text_chunks(responses)
        audio_chunks, sample_rate = self._extract_audio_chunks(responses)

        user_text = self._merge_transcription_chunks(input_chunks)
        output_text = self._merge_transcription_chunks(output_chunks)
        model_text = self._merge_transcription_chunks(model_text_chunks)
        ai_text = self._select_best_ai_text(output_text, model_text)

        payload = b"".join(audio_chunks)
        detected_rate = int(sample_rate or self.output_sample_rate)
        return LiveInterviewTurnResult(
            user_text=user_text,
            ai_text=ai_text,
            audio_pcm_bytes=payload,
            sample_rate=detected_rate,
            provider=self.provider,
        )

    async def request_text_turn(
        self,
        *,
        session_instruction: str,
        text: str,
        turn_prompt: str = "",
    ) -> LiveInterviewTurnResult:
        if not self.enabled:
            return LiveInterviewTurnResult("", "", b"", self.output_sample_rate, self.provider)

        prompt = self._compose_turn_text(turn_prompt=turn_prompt, text=text)
        if not prompt:
            return LiveInterviewTurnResult("", "", b"", self.output_sample_rate, self.provider)

        connected = await self._ensure_connected(session_instruction)
        if not connected or self._session is None:
            return LiveInterviewTurnResult("", "", b"", self.output_sample_rate, self.provider)

        try:
            async with self._turn_lock:
                await self._session.send_realtime_input(text=prompt)
                responses = await self._receive_until_turn_complete(
                    response_stream=self._session.receive(),
                    timeout_sec=self.timeout_sec,
                )
            result = self._build_turn_result(responses)
            if result.ai_text or result.audio_pcm_bytes:
                return result
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception(
                "gemini live single text turn failed (text_len=%s)",
                len(prompt),
            )
            await self.close()

        return LiveInterviewTurnResult("", "", b"", self.output_sample_rate, self.provider)

    async def request_audio_turn(
        self,
        *,
        session_instruction: str,
        pcm_bytes: bytes,
        sample_rate: int,
        turn_prompt: str = "",
    ) -> LiveInterviewTurnResult:
        if not self.enabled or not pcm_bytes:
            return LiveInterviewTurnResult("", "", b"", self.output_sample_rate, self.provider)

        normalized_rate = max(8000, int(sample_rate or 16000))
        connected = await self._ensure_connected(session_instruction)
        if not connected or self._session is None:
            return LiveInterviewTurnResult("", "", b"", self.output_sample_rate, self.provider)

        try:
            async with self._turn_lock:
                prompt = (turn_prompt or "").strip()
                if prompt:
                    await self._session.send_realtime_input(text=prompt)
                await self._session.send_realtime_input(
                    audio=types.Blob(data=pcm_bytes, mime_type=f"audio/pcm;rate={normalized_rate}")
                )
                await self._session.send_realtime_input(audio_stream_end=True)
                responses = await self._receive_until_turn_complete(
                    response_stream=self._session.receive(),
                    timeout_sec=self.timeout_sec,
                )
            result = self._build_turn_result(responses)
            if result.user_text or result.ai_text or result.audio_pcm_bytes:
                return result
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception(
                "gemini live single audio turn failed (sample_rate=%s, bytes=%s)",
                normalized_rate,
                len(pcm_bytes),
            )
            await self.close()

        return LiveInterviewTurnResult("", "", b"", self.output_sample_rate, self.provider)
