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


def aggregate_samples(samples: list[dict]) -> dict:
    """5Hz 비언어 샘플 집계 — web/lib/interview/face/face-metrics.ts 의 aggregateSamples 와 동일 시맨틱.

    away 플래그/expr 라벨은 이미 클라이언트가 캘리브레이션 기준으로 계산해 둔 값이므로
    재계산하지 않고 그대로 집계만 한다(시선이탈 비율·구간·표정 분포).
    """
    total = len(samples) or 1
    away_count = sum(1 for s in samples if s.get("away"))
    away_segments: list[list[int]] = []
    start = None
    for i, s in enumerate(samples):
        if s.get("away") and start is None:
            start = s.get("tMs")
        if not s.get("away") and start is not None:
            away_segments.append([start, samples[i - 1].get("tMs")])  # 마지막 away 프레임에서 닫는다
            start = None
    if start is not None and samples:
        away_segments.append([start, samples[-1].get("tMs")])
    expr_hist: dict[str, int] = {}
    for s in samples:
        e = s.get("expr", "중립")
        expr_hist[e] = expr_hist.get(e, 0) + 1
    return {
        "awayRatio": away_count / total,
        "awaySegments": away_segments,
        "expressionHistogram": expr_hist,
        "sampleCount": len(samples),
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
        # Back off the poll interval when the queue is empty (the steady state)
        # so the agent doesn't open a fresh Postgres connection every second
        # while idle. Reset to the base interval as soon as work appears.
        idle_interval = self._poll_interval_sec
        max_idle_interval = 10.0
        while not self._stop_event.is_set():
            try:
                job = self._service.reserve_next_report_job()
            except Exception:
                # 잡 예약(claim) 단계에서 Postgres 일시 오류(풀 커넥션 끊김 등)가 나도
                # 워커 스레드를 죽이지 않는다. 예전엔 이 호출이 try 밖이라, 단 한 번의
                # 일시 오류로 스레드가 죽어 이후 모든 리포트 잡이 영영 pending 으로
                # 남았다(면접 후 '계속 생성 중'인데 끝나지 않던 원인). 로그 남기고 재시도.
                logger.exception("report job reserve failed; backing off and retrying")
                self._stop_event.wait(idle_interval)
                idle_interval = min(idle_interval * 2, max_idle_interval)
                continue
            if not job:
                # stop_event.wait() returns early on shutdown (more responsive
                # than time.sleep) and otherwise sleeps the backoff window.
                self._stop_event.wait(idle_interval)
                idle_interval = min(idle_interval * 2, max_idle_interval)
                continue
            idle_interval = self._poll_interval_sec

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
                try:
                    self._service.fail_report_job(job_id, str(exc))
                except Exception:
                    # 실패 마킹 중 DB 오류가 나도 워커 스레드는 계속 살린다.
                    logger.exception("report job fail-marking errored; continuing")

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

        # 비언어(시선·표정) 분석은 부가 기능 — 신호가 없으면 건너뛰고, 어떤 실패도 메인 리포트 잡을 깨뜨리지 않는다.
        self._attach_nonverbal(session_id=session_id, turns=turns, gemini=gemini, report=report)

        self._service.save_report(session_id, report)

    def _attach_nonverbal(
        self,
        *,
        session_id: str,
        turns: list[dict[str, Any]],
        gemini: GeminiService,
        report: dict[str, Any],
    ) -> None:
        """recording_signals 샘플을 집계해 NO-SCORE 비언어 코멘트를 report 에 주입한다.

        - 신호가 없거나 비어 있으면 조용히 건너뛴다(카메라 미사용 세션 등).
        - 전 과정을 try/except 로 감싸 비언어 실패가 메인 리포트 잡을 깨뜨리지 않게 한다.
        - report["nonverbalSummary"] = {overall, perAnswer, awayRatio, awaySegments, expressionHistogram}
        """
        try:
            signals = self._service.get_recording_signals(session_id)
            samples = (signals or {}).get("samples") or []
            if not isinstance(samples, list) or not samples:
                return

            aggregates = aggregate_samples(samples)

            away_ratio = float(aggregates.get("awayRatio") or 0.0)
            away_segments = aggregates.get("awaySegments") or []
            expression_histogram = aggregates.get("expressionHistogram") or {}
            expr_text = ", ".join(f"{label} {count}회" for label, count in expression_histogram.items()) or "정보 없음"
            self._service.save_eval_signals(
                session_id,
                [
                    {
                        "dimension": "eye_contact",
                        "score": 0,
                        "weight": 0,
                        "weighted_score": 0,
                        "evidence": f"시선이탈 비율 {round(away_ratio * 100)}% / 이탈 구간 {len(away_segments)}개 (점수 미반영)",
                        "confidence": 0,
                    },
                    {
                        "dimension": "expression",
                        "score": 0,
                        "weight": 0,
                        "weighted_score": 0,
                        "evidence": f"표정 분포: {expr_text} (점수 미반영)",
                        "confidence": 0,
                    },
                ],
            )

            answers_text = [
                (turn.get("content") or "").strip()
                for turn in turns
                if _normalize_turn_role(turn.get("role")) == "user" and (turn.get("content") or "").strip()
            ]
            summary = gemini.analyze_nonverbal(answers_text, aggregates) if gemini else {"overall": "", "perAnswer": []}

            self._service.save_recording_aggregates(session_id, aggregates)

            report["nonverbalSummary"] = {
                "overall": summary.get("overall", ""),
                "perAnswer": summary.get("perAnswer", []),
                "awayRatio": away_ratio,
                "awaySegments": away_segments,
                "expressionHistogram": expression_histogram,
            }
        except Exception:  # pragma: no cover - 비언어는 부가 기능, 메인 잡을 깨뜨리지 않는다
            logger.exception("nonverbal analysis failed; continuing without it", extra={"session_id": session_id})
