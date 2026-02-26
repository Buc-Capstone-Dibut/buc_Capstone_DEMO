from __future__ import annotations

from functools import lru_cache
from datetime import datetime, timezone
import re
from typing import Any

from fastapi import APIRouter, File, Form, Header, HTTPException, Request, UploadFile

from app.config import settings
from app.schemas.interview import (
    AnalysisReport,
    AnalyzeRequest,
    ChatRequest,
    ParseJobRequest,
    PortfolioAnalyzeRequest,
    PortfolioSessionStartRequest,
    SessionStartRequest,
)
from app.services.interview_service import InterviewService
from app.services.llm_gemini import GeminiService, RepoAnalysisError
from app.services.report_agent import ReportAgent

router = APIRouter(prefix="/v1/interview", tags=["interview"])
service = InterviewService()
report_agent = ReportAgent(
    interview_service=service,
    gemini_factory=lambda: get_gemini_service(),
)

DEFAULT_TARGET_DURATION_SEC = 7 * 60
MIN_TARGET_DURATION_SEC = 5 * 60
MAX_TARGET_DURATION_SEC = 10 * 60
DEFAULT_CLOSING_THRESHOLD_SEC = 60
MIN_CLOSING_THRESHOLD_SEC = 30
MAX_CLOSING_THRESHOLD_SEC = 120
AVERAGE_TURN_SEC = 75
MIN_DYNAMIC_QUESTIONS = 4
MAX_DYNAMIC_QUESTIONS = 9
SESSION_GRACE_SEC = 20
CLOSING_ANNOUNCE_PREFIX = "시간 관계상 마지막 질문 드리겠습니다."
CLOSING_SENTENCE = "수고하셨습니다. 이것으로 모든 면접을 마치겠습니다."


def _clamp_target_duration(duration_sec: int | None) -> int:
    value = int(duration_sec or DEFAULT_TARGET_DURATION_SEC)
    return max(MIN_TARGET_DURATION_SEC, min(MAX_TARGET_DURATION_SEC, value))


def _clamp_closing_threshold(threshold_sec: int | None) -> int:
    value = int(threshold_sec or DEFAULT_CLOSING_THRESHOLD_SEC)
    return max(MIN_CLOSING_THRESHOLD_SEC, min(MAX_CLOSING_THRESHOLD_SEC, value))


def _estimated_total_questions(target_duration_sec: int) -> int:
    estimated = round(target_duration_sec / AVERAGE_TURN_SEC)
    return max(MIN_DYNAMIC_QUESTIONS, min(MAX_DYNAMIC_QUESTIONS, estimated))


def _phase_for_question_index(question_index: int, is_closing: bool = False) -> str:
    if is_closing:
        return "closing"
    if question_index <= 1:
        return "introduction"
    if question_index == 2:
        return "experience"
    if question_index == 3:
        return "technical"
    return "problem_solving"


def _elapsed_seconds(started_at: datetime | None) -> int:
    if not isinstance(started_at, datetime):
        return 0
    anchor = started_at if started_at.tzinfo else started_at.replace(tzinfo=timezone.utc)
    diff = datetime.now(timezone.utc) - anchor.astimezone(timezone.utc)
    return max(0, int(diff.total_seconds()))


def _build_runtime_meta(
    target_duration_sec: int,
    closing_threshold_sec: int,
    elapsed_sec: int,
    model_count: int,
    estimated_total_questions: int,
    closing_announced: bool,
    completed: bool,
    finish_reason: str = "",
) -> dict[str, Any]:
    remaining_sec = max(0, target_duration_sec - elapsed_sec)
    progress = int(round((elapsed_sec / max(1, target_duration_sec)) * 100))
    return {
        "targetDurationSec": target_duration_sec,
        "closingThresholdSec": closing_threshold_sec,
        "elapsedSec": elapsed_sec,
        "remainingSec": remaining_sec,
        "timeProgressPercent": max(0, min(100, progress)),
        "estimatedTotalQuestions": estimated_total_questions,
        "questionCount": model_count,
        "isClosingPhase": closing_announced or remaining_sec <= closing_threshold_sec,
        "interviewComplete": completed,
        "finishReason": finish_reason,
    }


def _resolve_completion_reason(
    *,
    session_status: str,
    closing_announced: bool,
    elapsed_sec: int,
    target_duration_sec: int,
    model_count: int,
) -> str:
    if closing_announced:
        return "closing_answer_submitted"
    if elapsed_sec >= target_duration_sec + SESSION_GRACE_SEC:
        return "time_limit_reached"
    if model_count >= MAX_DYNAMIC_QUESTIONS:
        return "question_cap_reached"
    if session_status == "completed":
        return "already_completed"
    return ""


def _latest_user_answer(messages: list[dict[str, Any]]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            return (message.get("parts") or "").strip()
    return ""


def _build_answer_quality_hint(answer: str) -> str:
    text = (answer or "").strip()
    if not text:
        return "직전 답변 없음: 기본 난이도로 질문하세요."

    length = len(text)
    has_metric = bool(re.search(r"\d+[%건명개번일월년]|\d+\s*(ms|sec|s|배)", text))
    has_structure = bool(re.search(r"(문제|원인|해결|결과|배운 점|회고|기여)", text))

    hints: list[str] = []
    if length < 60:
        hints.append("답변이 매우 짧습니다. 추가 맥락과 구체 사례를 요구하세요.")
    elif length < 140:
        hints.append("핵심은 있으나 디테일이 부족할 수 있습니다. 근거와 의사결정 기준을 캐물으세요.")
    else:
        hints.append("답변 길이는 충분합니다. 깊이와 재현 가능성을 검증하세요.")

    if not has_metric:
        hints.append("수치화된 성과나 지표를 반드시 다시 요청하세요.")
    if not has_structure:
        hints.append("문제-행동-결과 구조(STAR)에 맞춰 다시 답변하도록 유도하세요.")

    return " ".join(hints)


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
    target_duration_sec = _clamp_target_duration(payload.targetDurationSec)
    closing_threshold_sec = _clamp_closing_threshold(payload.closingThresholdSec)
    session = service.create_session(
        user_id=x_user_id,
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
    payload: ChatRequest,
    x_user_id: str | None = Header(default=None),
):
    try:
        gemini = get_gemini_service()
        session_id = payload.sessionId
        message_dicts = [m.model_dump() for m in payload.messages]
        requested_target_duration_sec = _clamp_target_duration(payload.targetDurationSec)
        requested_closing_threshold_sec = _clamp_closing_threshold(payload.closingThresholdSec)

        if not session_id:
            created = service.create_session(
                user_id=x_user_id,
                mode="chat",
                personality=payload.personality,
                job_data=payload.jobData,
                resume_data=payload.resumeData,
                status="in_progress",
                target_duration_sec=requested_target_duration_sec,
                closing_threshold_sec=requested_closing_threshold_sec,
            )
            session_id = created["id"]
        else:
            existing = service.get_session(session_id)
            if not existing:
                created = service.create_session(
                    user_id=x_user_id,
                    mode="chat",
                    personality=payload.personality,
                    job_data=payload.jobData,
                    resume_data=payload.resumeData,
                    status="in_progress",
                    target_duration_sec=requested_target_duration_sec,
                    closing_threshold_sec=requested_closing_threshold_sec,
                )
                session_id = created["id"]

        service.append_missing_history(session_id, message_dicts)

        context = {
            "jobData": payload.jobData,
            "resumeData": payload.resumeData,
            "personality": payload.personality or "professional",
        }

        session = service.get_session(session_id) or {}
        target_duration_sec = _clamp_target_duration(
            session.get("target_duration_sec") or requested_target_duration_sec
        )
        closing_threshold_sec = _clamp_closing_threshold(
            session.get("closing_threshold_sec") or requested_closing_threshold_sec
        )
        elapsed_sec = _elapsed_seconds(session.get("started_at"))
        estimated_total_questions = _estimated_total_questions(target_duration_sec)
        model_count = len([m for m in message_dicts if m.get("role") == "model"])
        closing_announced = bool(session.get("closing_announced", False))

        completion_reason = ""
        if closing_announced:
            completion_reason = "closing_answer_submitted"
        elif elapsed_sec >= target_duration_sec + SESSION_GRACE_SEC:
            completion_reason = "time_limit_reached"
        elif model_count >= MAX_DYNAMIC_QUESTIONS:
            completion_reason = "question_cap_reached"
        elif session.get("status") == "completed":
            completion_reason = "already_completed"

        if completion_reason:
            final_text = f"면접 시간이 종료되어 마무리하겠습니다. {CLOSING_SENTENCE}"
            turns = service.get_turns(session_id)
            last_turn = turns[-1] if turns else {}
            if last_turn.get("role") != "model" or CLOSING_SENTENCE not in (last_turn.get("content") or ""):
                service.append_turn(
                    session_id=session_id,
                    role="model",
                    content=final_text,
                    channel="text",
                    payload={
                        "phase": "closing",
                        "finish_reason": completion_reason,
                        "channel": "text",
                    },
                )
            service.update_session_status(session_id, "completed", current_phase="closing")
            meta = _build_runtime_meta(
                target_duration_sec=target_duration_sec,
                closing_threshold_sec=closing_threshold_sec,
                elapsed_sec=elapsed_sec,
                model_count=model_count,
                estimated_total_questions=estimated_total_questions,
                closing_announced=closing_announced,
                completed=True,
                finish_reason=completion_reason,
            )
            return {
                "success": True,
                "data": {
                    "role": "model",
                    "parts": final_text,
                },
                "sessionId": session_id,
                "interviewComplete": True,
                "meta": meta,
            }

        planned_questions = session.get("planned_questions") or []

        if not planned_questions:
            planned_questions = gemini.build_interview_plan(context=context, retries=1)
            service.set_planned_questions(session_id, planned_questions)

        question_index = model_count + 1
        remaining_sec = max(0, target_duration_sec - elapsed_sec)
        should_announce_closing = (
            remaining_sec <= closing_threshold_sec
            or question_index >= estimated_total_questions
            or question_index >= MAX_DYNAMIC_QUESTIONS
        )
        phase = _phase_for_question_index(question_index, is_closing=should_announce_closing)

        answer_quality_hint = _build_answer_quality_hint(_latest_user_answer(message_dicts))
        generated = gemini.generate_next_question_structured(
            context=context,
            chat_history=message_dicts,
            question_index=question_index,
            planned_questions=planned_questions,
            current_phase=phase,
            answer_quality_hint=answer_quality_hint,
            total_questions=question_index if should_announce_closing else estimated_total_questions,
        )
        ai_response = generated.get("question", "").strip()
        resolved_phase = "closing" if should_announce_closing else (generated.get("phase") or phase)

        if should_announce_closing:
            if CLOSING_ANNOUNCE_PREFIX not in ai_response:
                ai_response = f"{CLOSING_ANNOUNCE_PREFIX} {ai_response}".strip()
            if CLOSING_SENTENCE not in ai_response:
                ai_response = f"{ai_response} {CLOSING_SENTENCE}".strip()
            service.set_closing_announced(session_id, True)

        service.update_session_status(session_id, "in_progress", current_phase=resolved_phase)

        service.append_turn(
            session_id=session_id,
            role="model",
            content=ai_response,
            channel="text",
            payload={
                "phase": resolved_phase,
                "question_index": question_index,
                "rationale": generated.get("rationale", ""),
                "expectedSignal": generated.get("expectedSignal", ""),
                "answer_quality_hint": answer_quality_hint,
                "remaining_sec": remaining_sec,
                "target_duration_sec": target_duration_sec,
                "closing_threshold_sec": closing_threshold_sec,
                "estimated_total_questions": estimated_total_questions,
            },
        )

        meta = _build_runtime_meta(
            target_duration_sec=target_duration_sec,
            closing_threshold_sec=closing_threshold_sec,
            elapsed_sec=elapsed_sec,
            model_count=question_index,
            estimated_total_questions=estimated_total_questions,
            closing_announced=should_announce_closing,
            completed=False,
            finish_reason="closing_soon" if should_announce_closing else "",
        )

        return {
            "success": True,
            "data": {
                "role": "model",
                "parts": ai_response,
            },
            "sessionId": session_id,
            "interviewComplete": False,
            "meta": meta,
        }
    except Exception as exc:
        message = str(exc)
        if "429" in message or "quota" in message.lower():
            raise HTTPException(status_code=429, detail="현재 AI 사용량이 많아 답변이 지연되고 있습니다. 약 1분 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=f"AI Error: {message}")


@router.post("/analyze")
async def analyze(payload: AnalyzeRequest):
    try:
        gemini = get_gemini_service()
        message_dicts = [m.model_dump() for m in payload.messages]

        context = {
            "jobData": payload.jobData,
            "resumeData": payload.resumeData,
            "personality": payload.personality or "professional",
        }

        analysis = gemini.analyze_interview(
            context=context,
            chat_history=message_dicts,
            validator=AnalysisReport,
            retries=1,
        )

        if payload.sessionId:
            service.append_missing_history(payload.sessionId, message_dicts)
            service.save_report(payload.sessionId, analysis)
            service.update_session_status(payload.sessionId, "completed", current_phase="closing")

        return {
            "success": True,
            "data": analysis,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis Error: {exc}")


@router.get("/sessions")
async def list_sessions(
    x_user_id: str | None = Header(default=None),
    session_type: str | None = None,
    limit: int = 20,
):
    sessions = service.list_sessions_for_user(
        user_id=x_user_id,
        limit=min(limit, 50),
        session_type=session_type if session_type in ("live_interview", "portfolio_defense") else None,
    )
    return {"success": True, "data": sessions}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    detail = service.get_session_detail(session_id)
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
        user_id=x_user_id,
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
    payload: ChatRequest,
    x_user_id: str | None = Header(default=None),
):
    """포트폴리오 디펜스 세션 내 대화 턴"""
    try:
        gemini = get_gemini_service()
        session_id = payload.sessionId

        if not session_id:
            raise HTTPException(status_code=400, detail="sessionId is required")

        existing = service.get_session(session_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Portfolio session not found")

        message_dicts = [m.model_dump() for m in payload.messages]
        service.append_missing_history(session_id, message_dicts)
        job_data = existing.get("job_payload", {}) or {}

        model_count = len([m for m in message_dicts if m.get("role") == "model"])
        target_duration_sec = _clamp_target_duration(existing.get("target_duration_sec") or DEFAULT_TARGET_DURATION_SEC)
        closing_threshold_sec = _clamp_closing_threshold(
            existing.get("closing_threshold_sec") or DEFAULT_CLOSING_THRESHOLD_SEC
        )
        elapsed_sec = _elapsed_seconds(existing.get("started_at"))
        estimated_total_questions = _estimated_total_questions(target_duration_sec)
        closing_announced = bool(existing.get("closing_announced", False))

        completion_reason = _resolve_completion_reason(
            session_status=existing.get("status", "created"),
            closing_announced=closing_announced,
            elapsed_sec=elapsed_sec,
            target_duration_sec=target_duration_sec,
            model_count=model_count,
        )

        if completion_reason:
            final_text = f"포트폴리오 디펜스 면접을 마치겠습니다. {CLOSING_SENTENCE}"
            turns = service.get_turns(session_id)
            last_turn = turns[-1] if turns else {}
            if last_turn.get("role") != "model" or CLOSING_SENTENCE not in (last_turn.get("content") or ""):
                service.append_turn(
                    session_id=session_id,
                    role="model",
                    content=final_text,
                    channel="text",
                    payload={
                        "portfolio": True,
                        "phase": "closing",
                        "finish_reason": completion_reason,
                    },
                )
                turns = service.get_turns(session_id)

            service.update_session_status(session_id, "completed", current_phase="closing")

            # 포트폴리오 완료 시 리포트 에이전트 큐에 적재 (비동기 후처리).
            try:
                report_agent.enqueue(session_id=session_id, session_type="portfolio_defense")
            except Exception:
                # 큐 적재 실패해도 세션 완료 응답은 정상 반환
                pass

            meta = _build_runtime_meta(
                target_duration_sec=target_duration_sec,
                closing_threshold_sec=closing_threshold_sec,
                elapsed_sec=elapsed_sec,
                model_count=model_count,
                estimated_total_questions=estimated_total_questions,
                closing_announced=closing_announced,
                completed=True,
                finish_reason=completion_reason,
            )

            return {
                "success": True,
                "data": {"role": "model", "parts": final_text},
                "sessionId": session_id,
                "isComplete": True,
                "meta": meta,
            }

        question_index = model_count + 1
        remaining_sec = max(0, target_duration_sec - elapsed_sec)
        should_announce_closing = (
            remaining_sec <= closing_threshold_sec
            or question_index >= estimated_total_questions
            or question_index >= MAX_DYNAMIC_QUESTIONS
        )

        repo_context = {
            "repoUrl": job_data.get("repoUrl", ""),
            "readmeSummary": job_data.get("readmeSummary", ""),
            "treeSummary": job_data.get("treeSummary", ""),
            "infraHypotheses": job_data.get("infraHypotheses", []),
            "detectedTopics": job_data.get("detectedTopics", []),
        }
        focus = job_data.get("focus", ["architecture", "infra", "ai-usage"])

        result = gemini.generate_portfolio_defense_question(
            repo_context=repo_context,
            chat_history=message_dicts,
            topic_focus=focus,
            personality=payload.personality or "professional",
        )
        question = result.get("question", "").strip()

        if should_announce_closing:
            if CLOSING_ANNOUNCE_PREFIX not in question:
                question = f"{CLOSING_ANNOUNCE_PREFIX} {question}".strip()
            if CLOSING_SENTENCE not in question:
                question = f"{question} {CLOSING_SENTENCE}".strip()
            service.set_closing_announced(session_id, True)

        current_phase = "closing" if should_announce_closing else "technical"
        service.update_session_status(session_id, "in_progress", current_phase=current_phase)
        service.append_turn(
            session_id=session_id,
            role="model",
            content=question,
            channel="text",
            payload={
                "portfolio": True,
                "phase": current_phase,
                "targetDimension": result.get("targetDimension", "design_intent"),
                "question_index": question_index,
                "remaining_sec": remaining_sec,
                "target_duration_sec": target_duration_sec,
                "closing_threshold_sec": closing_threshold_sec,
                "estimated_total_questions": estimated_total_questions,
            },
        )

        meta = _build_runtime_meta(
            target_duration_sec=target_duration_sec,
            closing_threshold_sec=closing_threshold_sec,
            elapsed_sec=elapsed_sec,
            model_count=question_index,
            estimated_total_questions=estimated_total_questions,
            closing_announced=should_announce_closing,
            completed=False,
            finish_reason="closing_soon" if should_announce_closing else "",
        )

        return {
            "success": True,
            "data": {"role": "model", "parts": question},
            "sessionId": session_id,
            "isComplete": False,
            "meta": meta,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Portfolio Chat Error: {exc}")
