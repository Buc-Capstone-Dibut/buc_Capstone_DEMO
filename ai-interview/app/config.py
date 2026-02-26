from __future__ import annotations

from functools import cached_property

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PLACEHOLDER_TOKENS = (
    "your_gemini_api_key",
    "your_livekit_api_key",
    "your_livekit_api_secret",
    "your_openai_api_key",
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
    gemini_model: str = Field(default="gemini-1.5-flash", alias="GEMINI_MODEL")
    github_token: str | None = Field(default=None, alias="GITHUB_TOKEN")

    cors_origins: str = Field(default="http://localhost:3000", alias="CORS_ORIGINS")

    # LiveKit (optional — used only if STT/TTS pipeline is enabled)
    livekit_url: str | None = Field(default=None, alias="LIVEKIT_URL")
    livekit_api_key: str | None = Field(default=None, alias="LIVEKIT_API_KEY")
    livekit_api_secret: str | None = Field(default=None, alias="LIVEKIT_API_SECRET")

    # Voice pipeline providers
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_stt_model: str = Field(default="whisper-1", alias="OPENAI_STT_MODEL")
    openai_tts_model: str = Field(default="tts-1", alias="OPENAI_TTS_MODEL")
    openai_tts_voice: str = Field(default="alloy", alias="OPENAI_TTS_VOICE")

    # Simple RMS-based VAD controls (milliseconds / normalized float threshold)
    voice_vad_threshold: float = Field(default=0.015, alias="VOICE_VAD_THRESHOLD")
    voice_vad_silence_ms: int = Field(default=700, alias="VOICE_VAD_SILENCE_MS")
    voice_min_speech_ms: int = Field(default=350, alias="VOICE_MIN_SPEECH_MS")
    voice_max_segment_ms: int = Field(default=10000, alias="VOICE_MAX_SEGMENT_MS")

    @field_validator(
        "database_url",
        "gemini_api_key",
        "github_token",
        "livekit_url",
        "livekit_api_key",
        "livekit_api_secret",
        "openai_api_key",
        mode="before",
    )
    @classmethod
    def sanitize_secret_placeholders(cls, value: str | None) -> str | None:
        return _normalize_optional_secret(value)

    @cached_property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
