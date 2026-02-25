from __future__ import annotations

from dataclasses import dataclass

from openai import OpenAI


@dataclass
class TtsResult:
    audio_wav_bytes: bytes
    provider: str


class OpenAITtsService:
    def __init__(
        self,
        api_key: str | None,
        model: str = "tts-1",
        voice: str = "alloy",
    ):
        self.model = model
        self.voice = voice
        self.provider = "openai"
        self._client: OpenAI | None = OpenAI(api_key=api_key) if api_key else None

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def synthesize_wav(self, text: str) -> TtsResult:
        if not self._client or not text.strip():
            return TtsResult(audio_wav_bytes=b"", provider=self.provider)

        response = self._client.audio.speech.create(
            model=self.model,
            voice=self.voice,
            input=text,
            response_format="wav",
        )

        wav_bytes: bytes = b""
        if hasattr(response, "read"):
            wav_bytes = response.read()  # type: ignore[assignment]
        elif hasattr(response, "content"):
            wav_bytes = response.content  # type: ignore[assignment]
        elif isinstance(response, (bytes, bytearray)):
            wav_bytes = bytes(response)

        return TtsResult(audio_wav_bytes=wav_bytes, provider=self.provider)
