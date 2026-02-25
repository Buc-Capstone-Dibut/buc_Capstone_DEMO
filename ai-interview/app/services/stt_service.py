from __future__ import annotations

import io
from dataclasses import dataclass

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
