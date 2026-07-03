from __future__ import annotations

import logging
import time
import uuid

import websockets.http11
import websockets.legacy.http

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

# 브라우저는 localhost 쿠키를 포트 구분 없이 WS 핸드셰이크에 실어 보낸다.
# 누적된 dev 쿠키(supabase JWT 등)로 Cookie 한 줄이 기본 한도 8192B를 넘으면
# websockets 파서가 라우팅 전에 400 을 던져 면접 WS 가 전부 거부된다(재현·실측).
# 한도는 호출 시점에 읽는 모듈 전역이라 여기서 상향한다. uvicorn --ws auto 는
# legacy 구현을 쓰므로 legacy.http 가 실제 경로, http11 은 sansio/향후 대비.
# 32768 초과는 asyncio StreamReader(read_limit//2) 가 별도로 막으므로 그 이상은 무의미.
websockets.legacy.http.MAX_LINE_LENGTH = max(websockets.legacy.http.MAX_LINE_LENGTH, 32768)
websockets.http11.MAX_LINE_LENGTH = max(websockets.http11.MAX_LINE_LENGTH, 32768)

from app.api.admin import router as admin_router
from app.api.interview import report_agent as interview_report_agent
from app.api.interview import router as interview_router
from app.api.resume import router as resume_router
from app.api.ws import router as ws_router
from app.config import settings
from app.db.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("dibut.api")

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def structured_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4())[:8])
    user_id = request.headers.get("x-user-id", "-")
    session_id = request.query_params.get("session_id", "-")

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)

    logger.info(
        "request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "user_id": user_id,
            "session_id": session_id,
        },
    )
    return response


@app.on_event("startup")
def startup_event() -> None:
    logger.info(
        "voice runtime flags architecture=%s ai_question_repair=%s ai_audio_recovery=%s",
        settings.voice_runtime_architecture,
        settings.voice_enable_ai_question_repair,
        settings.voice_enable_ai_audio_recovery,
    )
    init_db()
    interview_report_agent.start()


@app.on_event("shutdown")
def shutdown_event() -> None:
    interview_report_agent.stop()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(interview_router)
app.include_router(admin_router)
app.include_router(ws_router)
app.include_router(resume_router)
