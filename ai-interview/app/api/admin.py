from __future__ import annotations

import io
import math
import wave

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.config import settings
from app.schemas.interview import TtsRequest
from app.services.gemini_live_voice_service import GeminiLiveSttService, GeminiLiveTtsService
from app.services.interview_service import InterviewService
from app.services.voice_pipeline import float_samples_to_wav_bytes, pcm16le_bytes_to_float_samples

router = APIRouter(prefix="/admin", tags=["admin"])
service = InterviewService()
stt_service = GeminiLiveSttService(
    api_key=settings.gemini_api_key,
    model=settings.gemini_live_stt_model,
)
tts_service = GeminiLiveTtsService(
    api_key=settings.gemini_api_key,
    model=settings.gemini_live_tts_model,
    voice=settings.gemini_live_tts_voice,
)


def _make_silence_wav(duration_sec: float = 1.0, sample_rate: int = 24000) -> bytes:
    frame_count = int(duration_sec * sample_rate)
    amplitude = 0

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        frames = bytearray()
        for _ in range(frame_count):
            sample = int(amplitude * math.sin(0))
            frames += sample.to_bytes(2, byteorder="little", signed=True)
        wav_file.writeframes(bytes(frames))

    return buffer.getvalue()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "active_sessions": service.count_active_sessions(),
    }


@router.get("/sessions")
async def sessions():
    return service.list_sessions(limit=200)


@router.get("/sessions/{session_id}")
async def session_detail(session_id: str):
    detail = service.get_session_detail(session_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Session not found")
    return detail


@router.post("/debug/stt")
async def debug_stt(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    if stt_service.enabled and audio_bytes:
        result = await stt_service.transcribe_wav(audio_bytes, "ko")
        return {"text": result.text, "provider": result.provider}
    return {
        "text": f"[STT stub] '{file.filename}' 파일이 업로드되었습니다. GEMINI_API_KEY 설정 시 실제 STT가 동작합니다.",
        "provider": "stub",
    }


@router.post("/debug/tts")
async def debug_tts(payload: TtsRequest):
    if tts_service.enabled and payload.text.strip():
        result = await tts_service.synthesize_pcm(payload.text)
        pcm_samples = pcm16le_bytes_to_float_samples(result.audio_pcm_bytes)
        wav_bytes = (
            float_samples_to_wav_bytes(pcm_samples, sample_rate=result.sample_rate)
            if pcm_samples
            else _make_silence_wav()
        )
    else:
        wav_bytes = _make_silence_wav()
    return Response(content=wav_bytes, media_type="audio/wav")
