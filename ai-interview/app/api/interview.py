from __future__ import annotations

from functools import lru_cache
import re
from typing import Any

from fastapi import APIRouter, File, Form, Header, HTTPException, Request, UploadFile

from app.config import settings
from app.schemas.interview import (
    AnalysisReport,
    AnalyzeRequest,
    ChatRequest,
    ParseJobRequest,
    SessionStartRequest,
)
from app.services.interview_service import InterviewService
from app.services.llm_gemini import GeminiService

router = APIRouter(prefix="/v1/interview", tags=["interview"])
service = InterviewService()
PHASE_BY_INDEX: dict[int, str] = {
    1: "introduction",
    2: "experience",
    3: "technical",
    4: "problem_solving",
    5: "closing",
}
CLOSING_SENTENCE = "수고하셨습니다. 이것으로 모든 면접을 마치겠습니다."


def _phase_for_question_index(question_index: int) -> str:
    return PHASE_BY_INDEX.get(question_index, "closing")


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
    session = service.create_session(
        user_id=x_user_id,
        mode=payload.mode,
        personality=payload.personality,
        job_data=payload.jobData,
        resume_data=payload.resumeData,
        status="created",
    )

    return {
        "success": True,
        "data": {
            "sessionId": session["id"],
            "mode": session.get("mode", payload.mode),
            "status": session.get("status", "created"),
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

        if not session_id:
            created = service.create_session(
                user_id=x_user_id,
                mode="chat",
                personality=payload.personality,
                job_data=payload.jobData,
                resume_data=payload.resumeData,
                status="in_progress",
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
                )
                session_id = created["id"]

        service.append_missing_history(session_id, message_dicts)

        context = {
            "jobData": payload.jobData,
            "resumeData": payload.resumeData,
            "personality": payload.personality or "professional",
        }

        session = service.get_session(session_id) or {}
        planned_questions = session.get("planned_questions") or []

        if not planned_questions:
            planned_questions = gemini.build_interview_plan(context=context, retries=1)
            service.set_planned_questions(session_id, planned_questions)

        model_count = len([m for m in message_dicts if m.get("role") == "model"])
        question_index = model_count + 1
        phase = _phase_for_question_index(question_index)

        if model_count >= 5:
            service.update_session_status(session_id, "completed", current_phase="closing")
            return {
                "success": True,
                "data": {
                    "role": "model",
                    "parts": f"면접이 종료되었습니다. {CLOSING_SENTENCE}",
                },
                "sessionId": session_id,
            }

        answer_quality_hint = _build_answer_quality_hint(_latest_user_answer(message_dicts))
        generated = gemini.generate_next_question_structured(
            context=context,
            chat_history=message_dicts,
            question_index=question_index,
            planned_questions=planned_questions,
            current_phase=phase,
            answer_quality_hint=answer_quality_hint,
        )
        ai_response = generated.get("question", "").strip()
        resolved_phase = generated.get("phase") or phase

        if question_index == 5 and CLOSING_SENTENCE not in ai_response:
            ai_response = f"{ai_response} {CLOSING_SENTENCE}".strip()

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
            },
        )
        if question_index >= 5:
            service.update_session_status(session_id, "completed", current_phase="closing")

        return {
            "success": True,
            "data": {
                "role": "model",
                "parts": ai_response,
            },
            "sessionId": session_id,
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


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    detail = service.get_session_detail(session_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Session not found")
    return detail


@router.get("/health")
async def interview_health() -> dict[str, Any]:
    return {"status": "ok"}
