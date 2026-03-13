from __future__ import annotations

from functools import cached_property
from urllib.parse import urlparse

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PLACEHOLDER_TOKENS = (
    "your_gemini_api_key",
    "your_livekit_api_key",
    "your_livekit_api_secret",
    "your-livekit-cloud.livekit.cloud",
    "<project-ref>",
    "<password>",
    "changeme",
    "replace_me",
)


def _normalize_optional_secret(value: str | None) -> str | None:
    if value is None:
        return None

    candidate = value.strip()
    if not candidate:
        return None

    lowered = candidate.lower()
    if lowered in {"none", "null", "undefined"}:
        return None
    if lowered.startswith("your_") or lowered.startswith("your-"):
        return None
    if any(token in lowered for token in PLACEHOLDER_TOKENS):
        return None
    return candidate


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Dibut AI Interview API"
    app_version: str = "0.1.0"

    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")
    github_token: str | None = Field(default=None, alias="GITHUB_TOKEN")

    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    # LiveKit (optional — used only if STT/TTS pipeline is enabled)
    livekit_url: str | None = Field(default=None, alias="LIVEKIT_URL")
    livekit_api_key: str | None = Field(default=None, alias="LIVEKIT_API_KEY")
    livekit_api_secret: str | None = Field(default=None, alias="LIVEKIT_API_SECRET")

    # Gemini Live voice pipeline providers
    gemini_live_stt_model: str = Field(
        default="gemini-2.5-flash-native-audio-latest",
        alias="GEMINI_LIVE_STT_MODEL",
    )
    gemini_live_tts_model: str = Field(
        default="gemini-2.5-flash-native-audio-latest",
        alias="GEMINI_LIVE_TTS_MODEL",
    )
    gemini_tts_model: str = Field(
        default="gemini-2.5-flash-preview-tts",
        alias="GEMINI_TTS_MODEL",
    )
    gemini_live_tts_voice: str = Field(default="Kore", alias="GEMINI_LIVE_TTS_VOICE")

    # Simple RMS-based VAD controls (milliseconds / normalized float threshold)
    voice_vad_threshold: float = Field(default=0.015, alias="VOICE_VAD_THRESHOLD")
    voice_vad_speech_start_ms: int = Field(default=180, alias="VOICE_VAD_SPEECH_START_MS")
    voice_vad_silence_ms: int = Field(default=760, alias="VOICE_VAD_SILENCE_MS")
    voice_min_speech_ms: int = Field(default=350, alias="VOICE_MIN_SPEECH_MS")
    voice_vad_min_utterance_ms: int = Field(default=1200, alias="VOICE_VAD_MIN_UTTERANCE_MS")
    voice_vad_short_utterance_silence_ms: int = Field(
        default=1800,
        alias="VOICE_VAD_SHORT_UTTERANCE_SILENCE_MS",
    )
    voice_max_segment_ms: int = Field(default=24000, alias="VOICE_MAX_SEGMENT_MS")
    voice_turn_end_grace_ms: int = Field(default=140, alias="VOICE_TURN_END_GRACE_MS")
    voice_short_answer_max_duration_ms: int = Field(
        default=2400,
        alias="VOICE_SHORT_ANSWER_MAX_DURATION_MS",
    )
    voice_min_answer_chars: int = Field(default=10, alias="VOICE_MIN_ANSWER_CHARS")
    voice_ai_echo_guard_ms: int = Field(default=1600, alias="VOICE_AI_ECHO_GUARD_MS")

    @field_validator(
        "database_url",
        "gemini_api_key",
        "github_token",
        "livekit_url",
        "livekit_api_key",
        "livekit_api_secret",
        mode="before",
    )
    @classmethod
    def sanitize_secret_placeholders(cls, value: str | None) -> str | None:
        return _normalize_optional_secret(value)

    @cached_property
    def cors_origin_list(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        expanded = set(origins)

        for origin in origins:
            parsed = urlparse(origin)
            hostname = (parsed.hostname or "").strip().lower()
            if hostname not in {"localhost", "127.0.0.1"}:
                continue

            sibling_host = "127.0.0.1" if hostname == "localhost" else "localhost"
            if not parsed.scheme:
                continue

            port = f":{parsed.port}" if parsed.port else ""
            expanded.add(f"{parsed.scheme}://{hostname}{port}")
            expanded.add(f"{parsed.scheme}://{sibling_host}{port}")

        return sorted(expanded)


settings = Settings()
