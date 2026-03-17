from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

REPORT_SCHEMA_VERSION = "v2"


def _to_unix_timestamp(value: Any) -> int:
    if isinstance(value, datetime):
        anchor = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return int(anchor.timestamp())
    return 0


def _normalize_turn_role(role: Any) -> str:
    normalized = str(role or "").strip().lower()
    if normalized in {"model", "ai", "assistant", "interviewer"}:
        return "model"
    return "user"


def _sanitize_text_list(items: Any) -> list[str]:
    if not isinstance(items, list):
        return []
    return [str(item).strip() for item in items if str(item or "").strip()]


def _format_timeline_time(seconds: int) -> str:
    safe = max(0, int(seconds))
    minutes = safe // 60
    remains = safe % 60
    return f"{minutes:02d}:{remains:02d}"


def coerce_report_document(payload: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    if "schemaVersion" in payload and "compatAnalysis" in payload:
        return payload
    return {}


def build_timeline_entries(
    turns: list[dict[str, Any]],
    *,
    target_duration_sec: int,
    paused_duration_sec: int,
) -> list[dict[str, Any]]:
    effective_duration_sec = max(1, int(target_duration_sec or 0) - max(0, int(paused_duration_sec or 0)))
    normalized_turns = [dict(turn) for turn in turns if str(turn.get("content") or "").strip()]
    user_turns = [turn for turn in normalized_turns if _normalize_turn_role(turn.get("role")) == "user"]

    if not user_turns:
        return []

    exact_timestamps = [
        turn.get("created_at")
        for turn in normalized_turns
        if isinstance(turn.get("created_at"), datetime)
    ]
    first_timestamp = min(exact_timestamps) if exact_timestamps else None
    last_timestamp = max(exact_timestamps) if exact_timestamps else None
    recorded_span_sec = 0
    if first_timestamp and last_timestamp:
        recorded_span_sec = max(1, int((last_timestamp - first_timestamp).total_seconds()))
    scale_ratio = (
        effective_duration_sec / recorded_span_sec
        if recorded_span_sec > effective_duration_sec and recorded_span_sec > 0
        else 1
    )

    timeline: list[dict[str, Any]] = []
    for index, turn in enumerate(user_turns, start=1):
        turn_position = next(
            (position for position, candidate in enumerate(normalized_turns) if candidate is turn),
            len(normalized_turns),
        )
        prompt = ""
        for candidate in reversed(normalized_turns[:turn_position]):
            if _normalize_turn_role(candidate.get("role")) == "model":
                prompt = str(candidate.get("content") or "").strip()
                break

        if first_timestamp and isinstance(turn.get("created_at"), datetime):
            elapsed_sec = int((turn["created_at"] - first_timestamp).total_seconds() * scale_ratio)
            time_sec = max(0, min(effective_duration_sec, elapsed_sec))
        else:
            time_sec = round((index / max(1, len(user_turns))) * effective_duration_sec)

        exchange_index = int(turn.get("exchange_index") or index)
        phase = str(turn.get("phase") or "").strip()
        phase_label = phase or ("introduction" if index == 1 else "closing" if index == len(user_turns) else "discussion")

        timeline.append(
            {
                "id": f"exchange-{exchange_index}",
                "exchangeIndex": exchange_index,
                "timeSec": time_sec,
                "timeLabel": _format_timeline_time(time_sec),
                "phase": phase,
                "phaseLabel": phase_label,
                "prompt": prompt or "이전 질문 맥락이 없는 응답입니다.",
                "answer": str(turn.get("content") or "").strip(),
                "timestamp": _to_unix_timestamp(turn.get("created_at")),
                "hasExactTimestamp": bool(first_timestamp),
            }
        )

    return timeline


def _build_default_report_view(
    *,
    session: dict[str, Any],
    compat_analysis: dict[str, Any],
    timeline: list[dict[str, Any]],
    comparison_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    job_payload = session.get("job_payload") or {}
    session_type = str(session.get("session_type") or "live_interview")
    feedback = compat_analysis.get("feedback") or {}
    strengths = _sanitize_text_list(compat_analysis.get("strengths") or feedback.get("strengths"))
    improvements = _sanitize_text_list(compat_analysis.get("improvements") or feedback.get("improvements"))
    next_actions = _sanitize_text_list(compat_analysis.get("nextActions") or improvements[:3])

    return {
        "sessionType": session_type,
        "company": job_payload.get("company", ""),
        "role": job_payload.get("role", ""),
        "repoUrl": job_payload.get("repoUrl", ""),
        "summary": compat_analysis.get("summary") or compat_analysis.get("fitSummary") or "",
        "strengths": strengths,
        "improvements": improvements,
        "nextActions": next_actions,
        "timeline": timeline,
        "rubric": compat_analysis.get("rubricScores") or {},
        "comparisonPayload": comparison_payload or {},
    }


def build_report_document(
    *,
    session: dict[str, Any],
    turns: list[dict[str, Any]],
    compat_analysis: dict[str, Any],
    comparison_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    existing = coerce_report_document(compat_analysis)
    if existing:
        timeline = existing.get("timeline")
        if not isinstance(timeline, list):
            timeline = build_timeline_entries(
                turns,
                target_duration_sec=int(session.get("target_duration_sec") or 0),
                paused_duration_sec=int(session.get("paused_duration_sec") or 0),
            )
        existing["timeline"] = timeline
        existing["generationMeta"] = {
            **(existing.get("generationMeta") or {}),
            "sessionType": session.get("session_type", "live_interview"),
            "turnCount": len(turns),
            "questionCount": sum(1 for turn in turns if _normalize_turn_role(turn.get("role")) == "model"),
            "generatedAt": existing.get("generationMeta", {}).get("generatedAt") or int(datetime.now(timezone.utc).timestamp()),
        }
        if comparison_payload:
            existing["comparisonPayload"] = comparison_payload
        return existing

    timeline = build_timeline_entries(
        turns,
        target_duration_sec=int(session.get("target_duration_sec") or 0),
        paused_duration_sec=int(session.get("paused_duration_sec") or 0),
    )
    generation_meta = {
        "generatedAt": int(datetime.now(timezone.utc).timestamp()),
        "sessionType": session.get("session_type", "live_interview"),
        "turnCount": len(turns),
        "questionCount": sum(1 for turn in turns if _normalize_turn_role(turn.get("role")) == "model"),
        "timelineCount": len(timeline),
        "source": "report-agent",
    }
    return {
        "schemaVersion": REPORT_SCHEMA_VERSION,
        "compatAnalysis": compat_analysis,
        "reportView": _build_default_report_view(
            session=session,
            compat_analysis=compat_analysis,
            timeline=timeline,
            comparison_payload=comparison_payload,
        ),
        "timeline": timeline,
        "generationMeta": generation_meta,
        "comparisonPayload": comparison_payload or {},
    }
