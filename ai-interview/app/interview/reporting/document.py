from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

REPORT_SCHEMA_VERSION = "v2"

TYPE_NAMES = {
    "AAAA": "시스템 엔지니어형",
    "AAAB": "아키텍트형",
    "AABA": "혁신 엔지니어형",
    "AABB": "전략가형",
    "ABAA": "장인형 개발자",
    "ABAB": "코드 아키텍트형",
    "ABBA": "실험적 빌더형",
    "ABBB": "기술 전략가형",
    "BAAA": "인프라 엔지니어형",
    "BAAB": "운영 설계형",
    "BABA": "플랫폼 빌더형",
    "BABB": "플랫폼 전략형",
    "BBAA": "디버깅 전문가형",
    "BBAB": "운영 개발자형",
    "BBBA": "빌더형",
    "BBBB": "스타트업 엔지니어형",
}

DIBEOT_AXES = [
    {
        "key": "approach",
        "title": "문제 접근 방식",
        "left": "구조형",
        "right": "탐색형",
    },
    {
        "key": "scope",
        "title": "사고 범위",
        "left": "시스템형",
        "right": "구현형",
    },
    {
        "key": "decision",
        "title": "의사결정 전략",
        "left": "안정형",
        "right": "실험형",
    },
    {
        "key": "execution",
        "title": "실행 방식",
        "left": "구축형",
        "right": "조정형",
    },
]


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


def _clamp_score(value: float) -> int:
    return max(0, min(100, round(value)))


def _resolve_role_bias(role: Any) -> int:
    source = str(role or "").strip().lower()
    if re.search(r"(backend|platform|infra|data|security|devops)", source):
        return 68
    if re.search(r"(frontend|product|mobile|ui)", source):
        return 44
    return 55


def _get_axis_label(axis_key: str, value: int) -> str:
    for axis in DIBEOT_AXES:
        if axis["key"] == axis_key:
            return axis["left"] if value >= 50 else axis["right"]
    return ""


def _get_type_code(axes: dict[str, int]) -> str:
    return "".join("A" if axes.get(axis["key"], 0) >= 50 else "B" for axis in DIBEOT_AXES)


def _sanitize_habits(items: Any) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []
    habits: list[dict[str, Any]] = []
    for item in items:
        habit = str((item or {}).get("habit") or "").strip()
        if not habit:
            continue
        habits.append(
            {
                "habit": habit,
                "count": max(0, int((item or {}).get("count") or 0)),
                "severity": str((item or {}).get("severity") or "low").strip().lower(),
            }
        )
    return habits


def _sanitize_question_findings(items: Any) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []

    result: list[dict[str, Any]] = []
    for item in items:
        question = str((item or {}).get("question") or "").strip()
        user_answer = str((item or {}).get("userAnswer") or "").strip()
        if not question and not user_answer:
            continue
        result.append(
            {
                "question": question,
                "userAnswer": user_answer,
                "strengths": _sanitize_text_list((item or {}).get("strengths")),
                "improvements": _sanitize_text_list((item or {}).get("improvements")),
                "refinedAnswer": str((item or {}).get("refinedAnswer") or "").strip(),
                "followUpQuestion": str((item or {}).get("followUpQuestion") or "").strip(),
                "evidence": _sanitize_text_list((item or {}).get("evidence")),
                "confidence": max(0, min(100, int((item or {}).get("confidence") or 0))),
            }
        )
    return result


def _sanitize_competency_coverage(items: Any) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []

    result: list[dict[str, Any]] = []
    for item in items:
        competency = str((item or {}).get("competency") or "").strip()
        if not competency:
            continue
        result.append(
            {
                "competency": competency,
                "score": max(0, min(100, int((item or {}).get("score") or 0))),
                "evidence": str((item or {}).get("evidence") or "").strip(),
                "confidence": max(0, min(100, int((item or {}).get("confidence") or 0))),
            }
        )
    return result


def _sanitize_jd_coverage(items: Any) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []

    result: list[dict[str, Any]] = []
    for item in items:
        requirement = str((item or {}).get("requirement") or "").strip()
        if not requirement:
            continue
        result.append(
            {
                "requirement": requirement,
                "matched": bool((item or {}).get("matched")),
                "evidence": str((item or {}).get("evidence") or "").strip(),
                "confidence": max(0, min(100, int((item or {}).get("confidence") or 0))),
            }
        )
    return result


def _build_profile(
    compat_analysis: dict[str, Any],
    *,
    role: str,
    question_findings: list[dict[str, Any]],
    competency_coverage: list[dict[str, Any]],
    jd_coverage: list[dict[str, Any]],
) -> dict[str, Any] | None:
    evaluation = compat_analysis.get("evaluation")
    if not isinstance(evaluation, dict):
        return None

    required_scores = ("jobFit", "logic", "communication", "attitude")
    if not all(isinstance(evaluation.get(key), (int, float)) for key in required_scores):
        return None

    habits = _sanitize_habits(compat_analysis.get("habits"))
    high_severity_habit_count = sum(1 for habit in habits if habit.get("severity") == "high")
    role_bias = _resolve_role_bias(role)

    axes = {
        "approach": _clamp_score(
            float(evaluation.get("logic") or 0) * 0.62
            + float(evaluation.get("jobFit") or 0) * 0.2
            + len(compat_analysis.get("bestPractices") or []) * 4
            - high_severity_habit_count * 4
        ),
        "scope": _clamp_score(
            role_bias
            + float(evaluation.get("logic") or 0) * 0.12
            + float(evaluation.get("jobFit") or 0) * 0.08
        ),
        "decision": _clamp_score(
            float(evaluation.get("attitude") or 0) * 0.5
            + float(evaluation.get("logic") or 0) * 0.2
            + float(evaluation.get("communication") or 0) * 0.12
        ),
        "execution": _clamp_score(
            (100 - role_bias) * 0.6
            + float(evaluation.get("communication") or 0) * 0.18
            + float(evaluation.get("jobFit") or 0) * 0.16
        ),
    }

    type_labels = [_get_axis_label(axis["key"], axes[axis["key"]]) for axis in DIBEOT_AXES]
    type_code = _get_type_code(axes)
    top_competency = max(competency_coverage, key=lambda item: item.get("score", 0), default={})
    matched_requirements = [item for item in jd_coverage if item.get("matched")]
    representative_finding = question_findings[0] if question_findings else {}

    axis_evidence = [
        {
            "axisKey": "approach",
            "title": "문제 접근 방식",
            "description": (
                f"논리력 {int(evaluation.get('logic') or 0)}점을 기준으로 보면, "
                f"{(_sanitize_text_list(representative_finding.get('strengths')) or _sanitize_text_list(representative_finding.get('evidence')) or ['답변을 먼저 구조화해서 설명하는 흐름']) [0]} "
                f"장면이 보여 {type_labels[0]} 성향이 더 강하게 읽혔습니다."
            ),
        },
        {
            "axisKey": "scope",
            "title": "사고 범위",
            "description": (
                f"{role or '직무'} 맥락에서 "
                f"{(top_competency.get('evidence') or '직무 연결성과 설명 범위를 함께 본 결과')} "
                f"흐름이 보여 {type_labels[1]} 축으로 해석했습니다."
            ),
        },
        {
            "axisKey": "decision",
            "title": "의사결정 전략",
            "description": (
                f"태도 {int(evaluation.get('attitude') or 0)}점과 "
                f"{(matched_requirements[0].get('evidence') if matched_requirements else '답변에서 드러난 선택 근거')} "
                f"기준으로 보면 {type_labels[2]} 성향이 더 선명했습니다."
            ),
        },
        {
            "axisKey": "execution",
            "title": "실행 방식",
            "description": (
                f"전달력 {int(evaluation.get('communication') or 0)}점과 "
                f"{(representative_finding.get('userAnswer') or top_competency.get('evidence') or '실제 구현 장면을 설명한 답변')} "
                f"을 함께 보면 {type_labels[3]} 축으로 읽혔습니다."
            ),
        },
    ]

    return {
        "axes": axes,
        "typeCode": type_code,
        "typeName": TYPE_NAMES.get(type_code, "요약 리포트"),
        "typeLabels": type_labels,
        "axisEvidence": axis_evidence,
    }


def _build_delivery_insights(
    *,
    compat_analysis: dict[str, Any],
    question_findings: list[dict[str, Any]],
    competency_coverage: list[dict[str, Any]],
    jd_coverage: list[dict[str, Any]],
) -> list[str]:
    insights: list[str] = []
    habits = _sanitize_habits(compat_analysis.get("habits"))

    if competency_coverage:
        strongest = max(competency_coverage, key=lambda item: item.get("score", 0))
        evidence = str(strongest.get("evidence") or "").strip()
        insights.append(
            f"{strongest.get('competency')} 역량은 {int(strongest.get('score') or 0)}점으로 읽혔고, {evidence or '답변 근거가 비교적 선명했습니다.'}"
        )

    if jd_coverage:
        matched_count = sum(1 for item in jd_coverage if item.get("matched"))
        insights.append(
            f"JD 핵심 요구사항은 {matched_count}/{len(jd_coverage)}개가 실제 답변에서 직접 확인됐습니다."
        )

    if habits:
        total_count = sum(int(item.get("count") or 0) for item in habits)
        top_habit = habits[0].get("habit")
        insights.append(f"습관어는 총 {total_count}회 감지됐고, 가장 자주 보인 표현은 '{top_habit}'였습니다.")
    elif question_findings:
        first_improvement = _sanitize_text_list(question_findings[0].get("improvements"))
        insights.append(
            first_improvement[0]
            if first_improvement
            else "답변 초반에 결론을 먼저 제시하면 전달력이 더 선명해질 수 있습니다."
        )

    while len(insights) < 3:
        insights.append(
            [
                "답변 첫 문장에서 결론과 선택 이유를 먼저 붙이면 전달력이 더 또렷해집니다.",
                "구현 설명 뒤에 실제 결과나 지표를 이어주면 직무 연결성이 더 선명해집니다.",
                "질문이 길어질수록 마지막 한 문장으로 핵심을 다시 정리하는 편이 좋습니다.",
            ][len(insights)]
        )

    return insights[:3]


def _build_analysis_quality(
    *,
    analysis_mode: str,
    timeline: list[dict[str, Any]],
    question_findings: list[dict[str, Any]],
    competency_coverage: list[dict[str, Any]],
    jd_coverage: list[dict[str, Any]],
) -> dict[str, Any]:
    question_confidences = [
        int(item.get("confidence") or 0)
        for item in question_findings
        if int(item.get("confidence") or 0) > 0
    ]
    competency_confidences = [
        int(item.get("confidence") or 0)
        for item in competency_coverage
        if int(item.get("confidence") or 0) > 0
    ]
    jd_confidences = [
        int(item.get("confidence") or 0)
        for item in jd_coverage
        if int(item.get("confidence") or 0) > 0
    ]
    confidence_values = question_confidences + competency_confidences + jd_confidences
    confidence_score = round(sum(confidence_values) / len(confidence_values)) if confidence_values else 0

    grounded_question_count = sum(
        1
        for item in question_findings
        if _sanitize_text_list(item.get("evidence")) or _sanitize_text_list(item.get("strengths")) or _sanitize_text_list(item.get("improvements"))
    )
    matched_requirement_count = sum(1 for item in jd_coverage if item.get("matched"))
    direct_evidence_count = (
        sum(1 for item in question_findings if _sanitize_text_list(item.get("evidence")))
        + sum(1 for item in competency_coverage if str(item.get("evidence") or "").strip())
        + sum(1 for item in jd_coverage if str(item.get("evidence") or "").strip())
    )

    completeness_score = 0
    if question_findings:
        completeness_score += 40
    if competency_coverage:
        completeness_score += 25
    if jd_coverage:
        completeness_score += 25
    if timeline:
        completeness_score += 10
    completeness_score = _clamp_score(completeness_score)

    if analysis_mode != "full":
        level = "summary"
        label = "요약 리포트"
    elif confidence_score >= 75 and completeness_score >= 75:
        level = "high"
        label = "높음"
    elif confidence_score >= 50 and completeness_score >= 45:
        level = "medium"
        label = "보통"
    else:
        level = "low"
        label = "부분 분석"

    warnings: list[str] = []
    if analysis_mode == "full" and not question_findings:
        warnings.append("질문별 근거 분석 데이터가 아직 충분하지 않습니다.")
    if analysis_mode == "full" and not competency_coverage:
        warnings.append("역량 커버리지 분석이 포함되지 않았습니다.")
    if analysis_mode == "full" and not jd_coverage:
        warnings.append("JD 요구사항 커버리지 분석이 포함되지 않았습니다.")
    if analysis_mode == "full" and not confidence_values:
        warnings.append("개별 confidence 점수가 없어 신뢰도는 보수적으로 표시됩니다.")

    return {
        "score": confidence_score,
        "level": level,
        "label": label,
        "completenessScore": completeness_score,
        "questionFindingCount": len(question_findings),
        "groundedQuestionCount": grounded_question_count,
        "competencyCount": len(competency_coverage),
        "jdRequirementCount": len(jd_coverage),
        "matchedRequirementCount": matched_requirement_count,
        "directEvidenceCount": direct_evidence_count,
        "warnings": warnings,
    }


def _is_missing_report_value(value: Any) -> bool:
    return value in (None, "", [], {})


def _merge_report_view(base: dict[str, Any], defaults: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in defaults.items():
        if _is_missing_report_value(merged.get(key)):
            merged[key] = value
    return merged


def _extract_analysis_meta(payload: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    meta = payload.get("analysisMeta")
    if isinstance(meta, dict):
        return meta
    return {}


def _resolve_analysis_mode(payload: dict[str, Any] | None) -> str:
    if not isinstance(payload, dict):
        return "full"

    analysis_mode = str(
        payload.get("analysisMode")
        or _extract_analysis_meta(payload).get("analysisMode")
        or "full"
    ).strip()

    if analysis_mode in {"full", "summary", "fallback_basic"}:
        return analysis_mode
    return "full"


def _resolve_fallback_reason(payload: dict[str, Any] | None) -> str:
    if not isinstance(payload, dict):
        return ""

    value = payload.get("fallbackReason") or _extract_analysis_meta(payload).get("fallbackReason")
    return str(value or "").strip()


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
    analysis_mode = _resolve_analysis_mode(compat_analysis)
    feedback = compat_analysis.get("feedback") or {}
    strengths = _sanitize_text_list(compat_analysis.get("strengths") or feedback.get("strengths"))
    improvements = _sanitize_text_list(compat_analysis.get("improvements") or feedback.get("improvements"))
    next_actions = _sanitize_text_list(compat_analysis.get("nextActions") or improvements[:3])
    question_findings = _sanitize_question_findings(compat_analysis.get("questionFindings"))
    competency_coverage = _sanitize_competency_coverage(compat_analysis.get("competencyCoverage"))
    jd_coverage = _sanitize_jd_coverage(compat_analysis.get("jdCoverage"))
    role = str(job_payload.get("role") or "")
    profile = _build_profile(
        compat_analysis,
        role=role,
        question_findings=question_findings,
        competency_coverage=competency_coverage,
        jd_coverage=jd_coverage,
    )
    delivery_insights = _build_delivery_insights(
        compat_analysis=compat_analysis,
        question_findings=question_findings,
        competency_coverage=competency_coverage,
        jd_coverage=jd_coverage,
    )
    analysis_quality = _build_analysis_quality(
        analysis_mode=analysis_mode,
        timeline=timeline,
        question_findings=question_findings,
        competency_coverage=competency_coverage,
        jd_coverage=jd_coverage,
    )

    return {
        "sessionType": session_type,
        "analysisMode": analysis_mode,
        "company": job_payload.get("company", ""),
        "role": role,
        "repoUrl": job_payload.get("repoUrl", ""),
        "summary": compat_analysis.get("summary") or compat_analysis.get("fitSummary") or "",
        "strengths": strengths,
        "improvements": improvements,
        "nextActions": next_actions,
        "timeline": timeline,
        "questionFindings": question_findings,
        "competencyCoverage": competency_coverage,
        "jdCoverage": jd_coverage,
        "profile": profile or {},
        "deliveryInsights": delivery_insights,
        "analysisQuality": analysis_quality,
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
    analysis_mode = _resolve_analysis_mode(compat_analysis)
    fallback_reason = _resolve_fallback_reason(compat_analysis)

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
        existing_report_view = existing.get("reportView")
        default_report_view = _build_default_report_view(
            session=session,
            compat_analysis=existing.get("compatAnalysis") or {},
            timeline=timeline,
            comparison_payload=comparison_payload or existing.get("comparisonPayload") or {},
        )
        if not isinstance(existing_report_view, dict):
            existing_report_view = default_report_view
        else:
            existing_report_view = _merge_report_view(existing_report_view, default_report_view)
        existing_report_view["sessionType"] = session.get("session_type", "live_interview")
        existing_report_view["analysisMode"] = existing_report_view.get("analysisMode") or analysis_mode
        existing["reportView"] = existing_report_view
        existing["generationMeta"] = {
            **(existing.get("generationMeta") or {}),
            "sessionType": session.get("session_type", "live_interview"),
            "turnCount": len(turns),
            "questionCount": sum(1 for turn in turns if _normalize_turn_role(turn.get("role")) == "model"),
            "timelineCount": len(timeline),
            "analysisMode": existing.get("generationMeta", {}).get("analysisMode") or analysis_mode,
            "analysisQuality": existing.get("generationMeta", {}).get("analysisQuality")
            or default_report_view.get("analysisQuality")
            or {},
            "generatedAt": existing.get("generationMeta", {}).get("generatedAt") or int(datetime.now(timezone.utc).timestamp()),
        }
        if fallback_reason:
            existing["generationMeta"]["fallbackReason"] = fallback_reason
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
        "analysisMode": analysis_mode,
        "analysisQuality": _build_analysis_quality(
            analysis_mode=analysis_mode,
            timeline=timeline,
            question_findings=_sanitize_question_findings(compat_analysis.get("questionFindings")),
            competency_coverage=_sanitize_competency_coverage(compat_analysis.get("competencyCoverage")),
            jd_coverage=_sanitize_jd_coverage(compat_analysis.get("jdCoverage")),
        ),
        "source": "report-agent",
    }
    if fallback_reason:
        generation_meta["fallbackReason"] = fallback_reason
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
