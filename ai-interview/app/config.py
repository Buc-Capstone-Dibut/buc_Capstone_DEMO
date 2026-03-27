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
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    google_cloud_project: str | None = Field(default=None, alias="GOOGLE_CLOUD_PROJECT")
    google_application_credentials: str | None = Field(
        default=None,
        alias="GOOGLE_APPLICATION_CREDENTIALS",
    )
    gemini_service_account_json_base64: str | None = Field(
        default=None,
        alias="GEMINI_SERVICE_ACCOUNT_JSON_BASE64",
    )
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")
    openai_stt_model: str = Field(default="whisper-1", alias="OPENAI_STT_MODEL")
    google_cloud_stt_model: str = Field(default="latest_long", alias="GOOGLE_CLOUD_STT_MODEL")
    google_cloud_stt_language_code: str = Field(default="ko-KR", alias="GOOGLE_CLOUD_STT_LANGUAGE_CODE")
    google_cloud_stt_max_alternatives: int = Field(default=5, alias="GOOGLE_CLOUD_STT_MAX_ALTERNATIVES")
    google_cloud_stt_phrase_hint_boost: float = Field(default=16.0, alias="GOOGLE_CLOUD_STT_PHRASE_HINT_BOOST")
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
    voice_runtime_architecture: str = Field(
        default="hybrid",
        alias="VOICE_RUNTIME_ARCHITECTURE",
    )
    voice_parallel_stt_enabled: bool = Field(
        default=False,
        alias="VOICE_PARALLEL_STT_ENABLED",
    )

    # Simple RMS-based VAD controls (milliseconds / normalized float threshold)
    voice_vad_threshold: float = Field(default=0.017, alias="VOICE_VAD_THRESHOLD")
    voice_vad_speech_start_ms: int = Field(default=150, alias="VOICE_VAD_SPEECH_START_MS")
    voice_vad_silence_ms: int = Field(default=560, alias="VOICE_VAD_SILENCE_MS")
    voice_min_speech_ms: int = Field(default=280, alias="VOICE_MIN_SPEECH_MS")
    voice_vad_min_utterance_ms: int = Field(default=850, alias="VOICE_VAD_MIN_UTTERANCE_MS")
    voice_vad_short_utterance_silence_ms: int = Field(
        default=1000,
        alias="VOICE_VAD_SHORT_UTTERANCE_SILENCE_MS",
    )
    voice_max_segment_ms: int = Field(default=24000, alias="VOICE_MAX_SEGMENT_MS")
    voice_turn_end_grace_ms: int = Field(default=90, alias="VOICE_TURN_END_GRACE_MS")
    voice_short_answer_max_duration_ms: int = Field(
        default=2400,
        alias="VOICE_SHORT_ANSWER_MAX_DURATION_MS",
    )
    voice_min_answer_chars: int = Field(default=10, alias="VOICE_MIN_ANSWER_CHARS")
    voice_ai_echo_guard_ms: int = Field(default=1600, alias="VOICE_AI_ECHO_GUARD_MS")
    voice_enable_ai_question_repair: bool = Field(
        default=True,
        alias="VOICE_ENABLE_AI_QUESTION_REPAIR",
    )
    voice_enable_ai_audio_recovery: bool = Field(
        default=True,
        alias="VOICE_ENABLE_AI_AUDIO_RECOVERY",
    )

    @field_validator(
        "database_url",
        "openai_api_key",
        "gemini_api_key",
        "google_cloud_project",
        "google_application_credentials",
        "gemini_service_account_json_base64",
        "github_token",
        "livekit_url",
        "livekit_api_key",
        "livekit_api_secret",
        mode="before",
    )
    @classmethod
    def sanitize_secret_placeholders(cls, value: str | None) -> str | None:
        return _normalize_optional_secret(value)

    @field_validator("voice_runtime_architecture", mode="before")
    @classmethod
    def normalize_runtime_architecture(cls, value: str | None) -> str:
        normalized = (value or "hybrid").strip().lower()
        if normalized in {"live", "live_only", "live-only", "liveonly"}:
            return "live-only"
        return "hybrid"

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
