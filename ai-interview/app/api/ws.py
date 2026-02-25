from __future__ import annotations

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.interview_service import InterviewService

router = APIRouter(prefix="/v1/interview/ws", tags=["ws"])
service = InterviewService()


@router.websocket("/client")
async def client_ws(websocket: WebSocket):
    await websocket.accept()

    try:
        await websocket.send_json({
            "type": "ready",
            "status": "ok",
            "message": "Dibut interview ws connected",
        })
        await websocket.send_json(
            {
                "type": "set-model-and-conf",
                "vad": "silero(stub)",
                "stt": "google(stub)",
                "tts": "openai(stub)",
                "mode": "skeleton",
            }
        )

        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "invalid json payload",
                })
                continue

            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if msg_type == "health":
                await websocket.send_json({"type": "health", "status": "ok"})
                continue

            if msg_type == "echo":
                await websocket.send_json({"type": "echo", "data": data.get("data")})
                continue

            if msg_type == "init-interview-session":
                session = service.create_session(
                    user_id=None,
                    mode="voice",
                    personality=data.get("style", "professional"),
                    job_data={"raw": data.get("jd", "")},
                    resume_data={"raw": data.get("resume", "")},
                    status="running",
                )
                await websocket.send_json(
                    {
                        "type": "interview-session-created",
                        "client_uid": session["id"],
                        "mode": "voice",
                    }
                )
                await websocket.send_json(
                    {
                        "type": "interview-phase-updated",
                        "phase": "introduction",
                        "guide": "MVP voice skeleton connected",
                        "message": "음성 면접 스켈레톤 세션이 시작되었습니다.",
                    }
                )
                await websocket.send_json(
                    {
                        "type": "full-text",
                        "text": "음성 면접 스켈레톤이 연결되었습니다. 다음 스프린트에서 STT/TTS 파이프라인이 활성화됩니다.",
                    }
                )
                continue

            if msg_type == "mic-audio-data":
                await websocket.send_json({"type": "control", "text": "mic-audio-end"})
                continue

            if msg_type == "raw-audio-data":
                await websocket.send_json({"type": "control", "text": "mic-audio-end"})
                continue

            if msg_type == "update-interview-phase":
                phase = data.get("phase", "introduction")
                await websocket.send_json(
                    {
                        "type": "interview-phase-updated",
                        "phase": phase,
                        "guide": "phase updated (skeleton)",
                        "message": f"면접 단계가 {phase} 로 갱신되었습니다.",
                    }
                )
                continue

            if msg_type == "behavior-data":
                await websocket.send_json(
                    {
                        "type": "control",
                        "text": "warning",
                        "message": "MVP 스켈레톤: behavior-data 수신됨",
                    }
                )
                continue

            await websocket.send_json(
                {
                    "type": "warning",
                    "message": f"unsupported message type: {msg_type}",
                }
            )

    except WebSocketDisconnect:
        return
