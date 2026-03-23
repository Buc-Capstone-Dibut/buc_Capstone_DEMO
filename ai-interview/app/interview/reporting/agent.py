from __future__ import annotations

import logging
import threading
import time
from typing import Any, Callable

from app.schemas.interview import AnalysisReport
from app.services.interview_service import InterviewService
from app.services.llm_gemini import GeminiService

logger = logging.getLogger("dibut.report-agent")


def _normalize_turn_role(role: Any) -> str:
    normalized = str(role or "").strip().lower()
    if normalized in {"model", "ai", "assistant", "interviewer"}:
        return "model"
    return "user"


def _build_fallback_best_practices(turns: list[dict[str, Any]]) -> list[dict[str, str]]:
    pairs: list[dict[str, str]] = []
    last_prompt = ""
    for turn in turns:
        content = str(turn.get("content") or "").strip()
        if not content:
            continue
        role = _normalize_turn_role(turn.get("role"))
        if role == "model":
            last_prompt = content
            continue
        pairs.append(
            {
                "question": last_prompt or "이번 면접에서 설명한 핵심 경험은 무엇인가요?",
                "userAnswer": content,
                "refinedAnswer": "결론, 맡은 역할, 선택 이유, 결과 순서로 한 번 더 압축해 설명해 보세요.",
                "reason": "AI 상세 분석이 지연되어 기본 보완 답변으로 대체했습니다.",
            }
        )
        if len(pairs) >= 4:
            break
    return pairs


def _build_fallback_live_interview_report(
    session: dict[str, Any],
    turns: list[dict[str, Any]],
) -> dict[str, Any]:
    user_turns = [
        str(turn.get("content") or "").strip()
        for turn in turns
        if _normalize_turn_role(turn.get("role")) == "user" and str(turn.get("content") or "").strip()
    ]
    answered_count = len(user_turns)
    job_payload = session.get("job_payload") or {}
    role = str(job_payload.get("role") or "지원 직무").strip()

    strengths = []
    if answered_count >= 3:
        strengths.append("여러 질문에 연속적으로 답변하며 면접 흐름을 유지했습니다.")
    if user_turns:
        strengths.append("실제 경험을 기반으로 답변하려는 방향성이 보였습니다.")
    if not strengths:
        strengths.append("면접 기록을 기준으로 기본 리포트를 구성했습니다.")

    improvements = [
        "답변 첫 문장에서 결론과 핵심 성과를 먼저 제시해 보세요.",
        "구현 설명 뒤에 지표나 결과 수치를 한 문장으로 연결해 보세요.",
    ]
    next_actions = [
        "대표 프로젝트 2개를 STAR 형식으로 다시 정리하기",
        "성능/협업/장애 대응 질문별로 수치 중심 답변 한 문장씩 준비하기",
    ]

    return {
        "overallScore": min(85, 52 + answered_count * 4),
        "passProbability": min(82, 48 + answered_count * 4),
        "evaluation": {
            "jobFit": min(80, 55 + answered_count * 3),
            "logic": min(80, 56 + answered_count * 3),
            "communication": min(78, 54 + answered_count * 3),
            "attitude": min(82, 58 + answered_count * 2),
        },
        "sentimentTimeline": [],
        "habits": [],
        "feedback": {
            "strengths": strengths,
            "improvements": improvements,
        },
        "bestPractices": _build_fallback_best_practices(turns),
        "summary": f"AI 리포트 생성이 지연되어 {role} 기준 기본 리포트로 대체했습니다.",
        "fitSummary": "세부 분석이 지연되어도 면접 기록을 기반으로 핵심 답변 흐름은 확인할 수 있습니다.",
        "strengths": strengths,
        "improvements": improvements,
        "nextActions": next_actions,
    }


class ReportAgent:
    def __init__(
        self,
        *,
        interview_service: InterviewService,
        gemini_factory: Callable[[], GeminiService | None],
        poll_interval_sec: float = 1.0,
    ) -> None:
        self._service = interview_service
        self._gemini_factory = gemini_factory
        self._poll_interval_sec = poll_interval_sec
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True, name="report-agent")
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)

    def enqueue(self, session_id: str, session_type: str) -> None:
        self._service.enqueue_report_job(session_id=session_id, session_type=session_type)

    def _run_loop(self) -> None:
        while not self._stop_event.is_set():
            job = self._service.reserve_next_report_job()
            if not job:
                time.sleep(self._poll_interval_sec)
                continue

            job_id = job["id"]
            session_id = job.get("session_id")
            session_type = job.get("session_type", "live_interview")
            attempts = int(job.get("attempts") or 0)
            started_at = time.monotonic()
            logger.info(
                "report job started",
                extra={
                    "job_id": job_id,
                    "session_id": session_id,
                    "session_type": session_type,
                    "attempt": attempts,
                },
            )
            try:
                self._process_job(job)
                self._service.complete_report_job(job_id)
                logger.info(
                    "report job completed",
                    extra={
                        "job_id": job_id,
                        "session_id": session_id,
                        "session_type": session_type,
                        "attempt": attempts,
                        "duration_ms": int((time.monotonic() - started_at) * 1000),
                    },
                )
            except Exception as exc:  # pragma: no cover - defensive runtime behavior
                logger.exception(
                    "report job failed",
                    extra={
                        "job_id": job_id,
                        "session_id": session_id,
                        "session_type": session_type,
                        "attempt": attempts,
                        "duration_ms": int((time.monotonic() - started_at) * 1000),
                    },
                )
                self._service.fail_report_job(job_id, str(exc))

    def _process_job(self, job: dict[str, Any]) -> None:
        session_id = job["session_id"]
        session_type = job.get("session_type", "live_interview")
        gemini = self._gemini_factory()

        session = self._service.get_session(session_id)
        if not session:
            raise RuntimeError(f"Session not found: {session_id}")

        turns = self._service.get_turns(session_id)
        chat_history = [
            {
                "role": "model" if turn.get("role") in {"model", "ai"} else "user",
                "parts": (turn.get("content") or "").strip(),
            }
            for turn in turns
            if (turn.get("content") or "").strip()
        ]
        context = {
            "jobData": session.get("job_payload") or {},
            "resumeData": session.get("resume_payload") or {},
            "personality": session.get("personality", "professional"),
        }

        if session_type == "portfolio_defense":
            report = gemini.analyze_weighted(
                context=session.get("job_payload") or {},
                chat_history=chat_history,
                session_type=session_type,
            )
            comparison_payload = {
                "sessionType": session_type,
                "repoUrl": (session.get("job_payload") or {}).get("repoUrl", ""),
            }
            self._service.save_comparison_report(session_id, report, comparison_payload)
            return

        if not gemini:
            logger.warning(
                "gemini service missing; deferring interview report until analysis service is available",
                extra={"session_id": session_id, "session_type": session_type},
            )
            raise RuntimeError("Gemini interview analysis service unavailable")

        try:
            report = gemini.analyze_interview(
                context=context,
                chat_history=chat_history,
                validator=AnalysisReport,
                retries=1,
            )
        except Exception as exc:
            logger.exception(
                "gemini interview report generation failed; keeping report job pending for retry",
                extra={"session_id": session_id, "session_type": session_type},
            )
            raise RuntimeError("Gemini interview analysis failed") from exc
        self._service.save_report(session_id, report)
