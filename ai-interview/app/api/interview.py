from __future__ import annotations

from functools import lru_cache
from typing import Any

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

    clean_context = ""
    try:
        gemini = get_gemini_service()
        clean_context = gemini.fetch_url_text(payload.url)
        data = gemini.parse_job_from_text(payload.url, clean_context)

        return {
            "success": True,
            "data": data,
        }
    except Exception:
        return {
            "success": True,
            "data": {
                "title": "채용 공고 (AI 분석 불가)",
                "company": "채용 공고",
                "description": clean_context[:3000],
                "responsibilities": ["AI 분석 실패 - 본문을 참고해주세요"],
                "requirements": [],
                "preferred": [],
                "techStack": [],
                "culture": [],
                "url": payload.url,
            },
        }


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
                raw_text = gemini.extract_text_from_pdf(file_bytes)
            else:
                raw_text = file_bytes.decode("utf-8", errors="ignore")

        if not raw_text:
            raise HTTPException(status_code=400, detail="이력서 텍스트를 추출하지 못했습니다.")

        data = gemini.parse_resume_from_text(raw_text)

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
    session = service.create_session(
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
    sessions = service.list_sessions_for_user(
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
    detail = service.get_session_detail(session_id, user_id=user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Session not found")
    return detail


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
async def portfolio_analyze_public_repo(payload: PortfolioAnalyzeRequest):
    try:
        gemini = get_gemini_service()
        result = gemini.analyze_public_repo(payload.repoUrl)
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
        "readmeSummary": payload.readmeSummary,
        "treeSummary": payload.treeSummary,
        "infraHypotheses": payload.infraHypotheses,
        "detectedTopics": payload.detectedTopics,
    }

    session = service.create_session(
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
            service.save_portfolio_source(
                session_id=session["id"],
                repo_url=payload.repoUrl,
                readme_snapshot=payload.readmeSummary,
                tree_snapshot=payload.treeSummary,
                infra_files_snapshot="\n".join(payload.infraHypotheses),
                analysis_status="completed",
            )
        except Exception:
            # 면접 세션 생성은 유지하고 소스 저장 실패만 무시
            pass

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
