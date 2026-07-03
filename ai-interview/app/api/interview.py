from __future__ import annotations

import asyncio
import logging
from functools import lru_cache
from typing import Any

import httpx
from fastapi import APIRouter, File, Form, Header, HTTPException, Request, UploadFile

from app.config import settings
from app.interview.domain.pacing import (
    clamp_closing_threshold,
    clamp_target_duration,
    estimated_total_questions,
)
from app.schemas.interview import (
    ParseJobRequest,
    PortfolioAnalyzeRequest,
    PortfolioSessionStartRequest,
    SessionStartRequest,
)
from app.services.interview_service import InterviewService
from app.services.llm_gemini import GeminiService, RepoAnalysisError
from app.interview.reporting import ReportAgent
from app.interview.runtime.prepared_opening import prepare_opening_artifact_from_session
from app.interview.runtime.prepared_opening_store import (
    PREPARED_OPENING_TTL_SEC,
    put_prepared_opening,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/interview", tags=["interview"])
service = InterviewService()
report_agent = ReportAgent(
    interview_service=service,
    gemini_factory=lambda: get_gemini_service(),
)


def _require_authenticated_user(user_id: str | None) -> str:
    normalized = (user_id or "").strip()
    if not normalized:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return normalized


def _clamp_target_duration(duration_sec: int | None) -> int:
    return clamp_target_duration(duration_sec)


def _clamp_closing_threshold(threshold_sec: int | None) -> int:
    return clamp_closing_threshold(threshold_sec)


def _estimated_total_questions(target_duration_sec: int) -> int:
    return estimated_total_questions(target_duration_sec)


@lru_cache
def get_gemini_service() -> GeminiService:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is missing")
    return GeminiService(api_key=settings.gemini_api_key, model_name=settings.gemini_model)


@router.post("/parse-job")
async def parse_job(payload: ParseJobRequest):
    if not payload.url:
        raise HTTPException(status_code=400, detail="URL is required")

    def _fallback_data(description: str) -> dict[str, Any]:
        return {
            "title": "채용 공고 (AI 분석 불가)",
            "company": "채용 공고",
            "description": description[:3000],
            "responsibilities": ["AI 분석 실패 - 본문을 참고해주세요"],
            "requirements": [],
            "preferred": [],
            "techStack": [],
            "culture": [],
            "url": payload.url,
        }

    clean_context = ""
    try:
        gemini = get_gemini_service()
        # Offload blocking httpx fetch + Gemini calls to a worker thread so the
        # asyncio event loop stays free for other concurrent requests.
        clean_context = await asyncio.to_thread(gemini.fetch_url_text, payload.url)
    except httpx.HTTPError as exc:
        logger.warning("parse-job fetch failed (url=%s): %s", payload.url, exc)
        return {"success": False, "error": "FETCH_FAILED", "data": _fallback_data("")}
    except Exception as exc:
        logger.warning("parse-job fetch unexpected error (url=%s): %s", payload.url, exc)
        return {"success": False, "error": "FETCH_FAILED", "data": _fallback_data("")}

    try:
        data = await asyncio.to_thread(
            gemini.parse_job_from_text, payload.url, clean_context
        )
        return {"success": True, "data": data}
    except Exception as exc:
        message = str(exc)
        if "429" in message or "quota" in message.lower():
            error_code = "LLM_QUOTA"
        else:
            error_code = "PARSE_FAILED"
        logger.warning("parse-job parse failed (url=%s, code=%s): %s", payload.url, error_code, message)
        return {"success": False, "error": error_code, "data": _fallback_data(clean_context)}


@router.post("/parse-resume")
async def parse_resume(
    request: Request,
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
):
    raw_text = text

    if not file and not raw_text:
        try:
            body = await request.json()
            raw_text = body.get("text")
        except Exception:
            raw_text = None

    if not file and not raw_text:
        raise HTTPException(status_code=400, detail="데이터를 입력하거나 파일을 업로드해주세요.")

    try:
        gemini = get_gemini_service()

        if file:
            file_bytes = await file.read()
            file_name = (file.filename or "").lower()
            if file.content_type == "application/pdf" or file_name.endswith(".pdf"):
                raw_text = await asyncio.to_thread(
                    gemini.extract_text_from_pdf, file_bytes
                )
            else:
                raw_text = file_bytes.decode("utf-8", errors="ignore")

        if not raw_text:
            raise HTTPException(status_code=400, detail="이력서 텍스트를 추출하지 못했습니다.")

        data = await asyncio.to_thread(gemini.parse_resume_from_text, raw_text)

        return {
            "success": True,
            "data": data,
        }
    except HTTPException:
        raise
    except Exception as exc:
        message = str(exc)
        if "429" in message or "quota" in message.lower():
            raise HTTPException(status_code=429, detail="현재 AI 분석 사용량이 많습니다. 약 30초~1분 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=message)


@router.post("/session/start")
async def start_session(
    payload: SessionStartRequest,
    x_user_id: str | None = Header(default=None),
):
    user_id = _require_authenticated_user(x_user_id)
    target_duration_sec = _clamp_target_duration(payload.targetDurationSec)
    closing_threshold_sec = _clamp_closing_threshold(payload.closingThresholdSec)
    session = await asyncio.to_thread(
        service.create_session,
        user_id=user_id,
        mode=payload.mode,
        personality=payload.personality,
        job_data=payload.jobData,
        resume_data=payload.resumeData,
        status="created",
        target_duration_sec=target_duration_sec,
        closing_threshold_sec=closing_threshold_sec,
    )

    return {
        "success": True,
        "data": {
            "sessionId": session["id"],
            "mode": session.get("mode", payload.mode),
            "status": session.get("status", "created"),
            "targetDurationSec": session.get("target_duration_sec", target_duration_sec),
            "closingThresholdSec": session.get("closing_threshold_sec", closing_threshold_sec),
            "estimatedTotalQuestions": _estimated_total_questions(target_duration_sec),
        },
    }


@router.post("/chat")
async def chat(
    x_user_id: str | None = Header(default=None),
):
    _require_authenticated_user(x_user_id)
    raise HTTPException(
        status_code=410,
        detail="채팅 면접 모드는 비활성화되었습니다. 영상 면접을 사용해 주세요.",
    )


@router.post("/analyze")
async def analyze(
    x_user_id: str | None = Header(default=None),
):
    _require_authenticated_user(x_user_id)
    raise HTTPException(
        status_code=410,
        detail="이 경로는 더 이상 사용되지 않습니다. 면접 결과는 세션 리포트에서 조회해 주세요.",
    )


@router.get("/sessions")
async def list_sessions(
    x_user_id: str | None = Header(default=None),
    session_type: str | None = None,
    limit: int = 20,
):
    user_id = _require_authenticated_user(x_user_id)
    sessions = await asyncio.to_thread(
        service.list_sessions_for_user,
        user_id=user_id,
        limit=min(limit, 50),
        session_type=session_type if session_type in ("live_interview", "portfolio_defense") else None,
    )
    return {"success": True, "data": sessions}


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    x_user_id: str | None = Header(default=None),
):
    user_id = _require_authenticated_user(x_user_id)
    detail = await asyncio.to_thread(service.get_session_detail, session_id, user_id=user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Session not found")
    return detail


@router.post("/sessions/{session_id}/prepare-opening")
async def prepare_session_opening(
    session_id: str,
    x_user_id: str | None = Header(default=None),
):
    user_id = _require_authenticated_user(x_user_id)
    session = await asyncio.to_thread(service.get_session, session_id, user_id=user_id, require_owner=True)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session_status = str(session.get("status") or "")
    if session_status == "completed":
        raise HTTPException(status_code=409, detail="Completed session only")

    turns = await asyncio.to_thread(service.get_turns, session_id)
    if turns:
        return {
            "success": True,
            "data": {
                "sessionId": session_id,
                "prepared": False,
                "reason": "session_already_started",
            },
        }

    artifact = await prepare_opening_artifact_from_session(session)
    if artifact is None:
        return {
            "success": True,
            "data": {
                "sessionId": session_id,
                "prepared": False,
                "reason": "opening_unavailable",
            },
        }

    put_prepared_opening(session_id, artifact)
    return {
        "success": True,
        "data": {
            "sessionId": session_id,
            "prepared": True,
            "turnId": artifact.spec.turn_id,
            "expiresInSec": PREPARED_OPENING_TTL_SEC,
        },
    }


@router.get("/sessions/{session_id}/report-status")
async def session_report_status(
    session_id: str,
    x_user_id: str | None = Header(default=None),
):
    """리포트 생성 상태 — 백그라운드 작업 polling 용 경량 엔드포인트.

    웹의 BackgroundJobsRunner 가 5초마다 호출한다.
    반환 형태는 포트폴리오 status 엔드포인트와 동일: {status, stage, cancelReason}
    """
    user_id = _require_authenticated_user(x_user_id)
    session = await asyncio.to_thread(service.get_session, session_id, user_id=user_id, require_owner=True)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    job = await asyncio.to_thread(service.get_report_job, session_id)
    # report job 상태 값: pending / running / done / failed (reporting/repository.py)
    job_status = str((job or {}).get("status") or "")
    if job_status in {"pending", "running"}:
        status = "running"
    elif job_status == "done":
        status = "completed"
    elif job_status == "failed":
        status = "failed"
    else:
        # job 이 없는 종결 구간. get_session raw row 에는 'analysis' 키가 없으므로
        # 예전 'analysis' 폴백은 항상 running 을 반환해 무한 폴링을 만들었다.
        # 세션이 completed 인데 job 이 없으면 enqueue 되지 못한 것으로 보고 'failed' 를
        # 반환해 폴링을 끊는다(프론트의 retry-report 버튼으로 복구 가능). 그 외는 running.
        session_status = str(session.get("status") or "")
        status = "failed" if session_status == "completed" else "running"

    return {
        "status": status,
        "stage": {"label": "리포트 생성 중", "progress": None} if status == "running" else None,
        "cancelReason": None,
    }


@router.post("/sessions/{session_id}/retry-report")
async def retry_session_report(
    session_id: str,
    x_user_id: str | None = Header(default=None),
):
    user_id = _require_authenticated_user(x_user_id)
    session = await asyncio.to_thread(service.get_session, session_id, user_id=user_id, require_owner=True)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session.get("status") or "") != "completed":
        raise HTTPException(status_code=409, detail="Completed session only")

    job = await asyncio.to_thread(
        service.enqueue_report_job,
        session_id=session_id,
        session_type=str(session.get("session_type") or "live_interview"),
        force=True,
    )
    return {"success": True, "data": {"status": job.get("status", "pending")}}


@router.post("/sessions/{session_id}/complete")
async def complete_session(
    session_id: str,
    x_user_id: str | None = Header(default=None),
):
    user_id = _require_authenticated_user(x_user_id)
    session = await asyncio.to_thread(service.get_session, session_id, user_id=user_id, require_owner=True)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if str(session.get("status") or "") != "completed":
        await asyncio.to_thread(service.update_session_status, session_id, "completed", "closing")
        session = await asyncio.to_thread(service.get_session, session_id, user_id=user_id, require_owner=True) or session

    report_enqueued = True
    report_job = await asyncio.to_thread(service.get_report_job, session_id)
    if not report_job or str(report_job.get("status") or "") == "failed":
        try:
            report_job = await asyncio.to_thread(
                service.enqueue_report_job,
                session_id=session_id,
                session_type=str(session.get("session_type") or "live_interview"),
            )
        except Exception:
            # 세션 completed 는 유지하고 enqueue 실패만 흡수한다 —
            # retry-report 엔드포인트로 리포트를 복구할 수 있다.
            logger.error("report job enqueue failed (session=%s)", session_id, exc_info=True)
            report_enqueued = False

    return {
        "success": True,
        "data": {
            "status": str(session.get("status") or "completed"),
            "reportStatus": str((report_job or {}).get("status") or "pending"),
            "reportEnqueued": report_enqueued,
        },
    }


@router.get("/health")
async def interview_health() -> dict[str, Any]:
    return {"status": "ok"}


# ── LiveKit Token ─────────────────────────────────────────

@router.post("/livekit/token")
async def livekit_token(
    payload: dict,
    x_user_id: str | None = Header(default=None),
) -> dict[str, Any]:
    """LiveKit 룸 접속 토큰 발급 — Next.js BFF가 직접 발급하므로 FastAPI 경유도 지원"""
    # 실제 토큰 발급은 Next.js BFF(livekit-server-sdk)에서 처리.
    # 이 엔드포인트는 FastAPI 경유 옵션을 위한 placeholder.
    raise HTTPException(
        status_code=501,
        detail="LiveKit token should be generated via the Next.js BFF /api/interview/livekit/token",
    )


# ── Portfolio Defense ─────────────────────────────────────

@router.post("/portfolio/analyze-public-repo")
async def portfolio_analyze_public_repo(
    payload: PortfolioAnalyzeRequest,
    x_user_id: str | None = Header(default=None),
):
    _require_authenticated_user(x_user_id)
    try:
        gemini = get_gemini_service()
        result = await asyncio.to_thread(gemini.analyze_public_repo, payload.repoUrl)
        return {"success": True, "data": result}
    except RepoAnalysisError as exc:
        return {"success": False, "error": exc.code}
    except ValueError as exc:
        return {"success": False, "error": str(exc)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Repo Analysis Error: {exc}")


@router.post("/portfolio/session/start")
async def portfolio_session_start(
    payload: PortfolioSessionStartRequest,
    x_user_id: str | None = Header(default=None),
):
    user_id = _require_authenticated_user(x_user_id)
    target_duration_sec = _clamp_target_duration(payload.targetDurationSec)
    closing_threshold_sec = _clamp_closing_threshold(payload.closingThresholdSec)
    portfolio_job_payload = {
        "repoUrl": payload.repoUrl,
        "focus": payload.focus,
        "interviewType": payload.interviewType,
        "interviewTypeLabel": payload.interviewTypeLabel,
        "questionFocus": payload.questionFocus,
        "reportLens": payload.reportLens,
        "interviewTypeBlogTags": payload.interviewTypeBlogTags,
        "readmeSummary": payload.readmeSummary,
        "treeSummary": payload.treeSummary,
        "infraHypotheses": payload.infraHypotheses,
        "detectedTopics": payload.detectedTopics,
    }

    session = await asyncio.to_thread(
        service.create_session,
        user_id=user_id,
        mode=payload.mode,
        personality="professional",
        job_data=portfolio_job_payload,
        resume_data={},
        status="created",
        session_type="portfolio_defense",
        target_duration_sec=target_duration_sec,
        closing_threshold_sec=closing_threshold_sec,
    )

    if payload.readmeSummary or payload.treeSummary or payload.infraHypotheses:
        try:
            await asyncio.to_thread(
                service.save_portfolio_source,
                session_id=session["id"],
                repo_url=payload.repoUrl,
                readme_snapshot=payload.readmeSummary,
                tree_snapshot=payload.treeSummary,
                infra_files_snapshot="\n".join(payload.infraHypotheses),
                analysis_status="completed",
            )
        except Exception:
            # 면접 세션 생성은 유지하고 소스 저장 실패만 무시(관측 가능하게 로깅)
            logger.warning(
                "portfolio source save failed (session=%s)", session["id"], exc_info=True
            )

    return {
        "success": True,
        "data": {
            "sessionId": session["id"],
            "sessionType": "portfolio_defense",
            "rubricWeights": {"designIntent": 60, "codeQuality": 10, "aiUsage": 30},
            "targetDurationSec": session.get("target_duration_sec", target_duration_sec),
            "closingThresholdSec": session.get("closing_threshold_sec", closing_threshold_sec),
            "estimatedTotalQuestions": _estimated_total_questions(target_duration_sec),
        },
    }


@router.post("/portfolio/chat")
async def portfolio_chat(
    x_user_id: str | None = Header(default=None),
):
    _require_authenticated_user(x_user_id)
    raise HTTPException(
        status_code=410,
        detail="포트폴리오 채팅 면접 모드는 비활성화되었습니다. 영상 면접을 사용해 주세요.",
    )
