from __future__ import annotations

import io
import math
import wave

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.schemas.interview import TtsRequest
from app.services.interview_service import InterviewService

router = APIRouter(prefix="/admin", tags=["admin"])
service = InterviewService()


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
    _ = await file.read()
    return {
        "text": f"[STT stub] '{file.filename}' 파일이 업로드되었습니다. 다음 스프린트에서 실제 STT가 연결됩니다.",
    }


@router.post("/debug/tts")
async def debug_tts(payload: TtsRequest):
    _ = payload.text
    wav_bytes = _make_silence_wav()
    return Response(content=wav_bytes, media_type="audio/wav")
