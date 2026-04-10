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
            raise RuntimeError("Gemini service unavailable for interview report generation")

        report = gemini.analyze_interview(
            context=context,
            chat_history=chat_history,
            validator=AnalysisReport,
            retries=1,
        )

        self._service.save_report(session_id, report)
