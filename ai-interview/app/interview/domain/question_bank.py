from __future__ import annotations

import re
from typing import Any, Literal

InterviewTrack = Literal["posting", "role"]

ROLE_TRACK_COMPANY_MARKERS = (
    "직무 기반 모의면접",
    "직무 기반",
    "공통 직무 기준",
)
ROLE_TRACK_TEXT_MARKERS = (
    "직무를 기준으로 질문을 구성",
    "공통 직무 기준으로 질문을 구성",
    "범주의 공통 직무 기준",
)
POSTING_URL_KEYS = (
    "sourceUrl",
    "postingUrl",
    "jobPostingUrl",
    "targetUrl",
    "originalUrl",
    "url",
)
TRACK_KEYS = (
    "interviewTrack",
    "setupTrack",
    "track",
)
GENERIC_COMPANY_VALUES = {
    "",
    "unknown company",
    "unknown",
    "회사 정보 없음",
    "기업 정보 없음",
    "모의면접",
}


def normalize_track_value(value: Any) -> InterviewTrack | None:
    normalized = re.sub(r"\s+", "_", str(value or "").strip().lower())
    if normalized in {"posting", "job_posting", "jd", "company", "공고", "공고_기반"}:
        return "posting"
    if normalized in {"role", "role_based", "job_role", "직무", "직무_기반"}:
        return "role"
    return None


def _text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (list, tuple, set)):
        return " ".join(_text(item) for item in value if _text(item)).strip()
    if isinstance(value, dict):
        return " ".join(_text(item) for item in value.values() if _text(item)).strip()
    return str(value or "").strip()


def is_explicit_role_track_job(job_data: dict[str, Any] | None) -> bool:
    normalized_job_data = job_data if isinstance(job_data, dict) else {}

    for key in TRACK_KEYS:
        explicit = normalize_track_value(normalized_job_data.get(key))
        if explicit == "role":
            return True
        if explicit == "posting":
            return False

    company = _text(normalized_job_data.get("company"))
    if any(marker in company for marker in ROLE_TRACK_COMPANY_MARKERS):
        return True

    role = _text(normalized_job_data.get("role"))
    description = _text(normalized_job_data.get("companyDescription") or normalized_job_data.get("description"))
    combined = f"{role} {description}"
    return any(marker in combined for marker in ROLE_TRACK_TEXT_MARKERS)


def infer_interview_track(
    job_data: dict[str, Any] | None,
    *,
    session_type: str = "live_interview",
) -> InterviewTrack:
    if session_type == "portfolio_defense":
        return "role"

    normalized_job_data = job_data if isinstance(job_data, dict) else {}
    for key in TRACK_KEYS:
        explicit = normalize_track_value(normalized_job_data.get(key))
        if explicit:
            return explicit

    if is_explicit_role_track_job(normalized_job_data):
        return "role"

    if any(_text(normalized_job_data.get(key)) for key in POSTING_URL_KEYS):
        return "posting"

    company = _text(normalized_job_data.get("company")).lower()
    if company and company not in GENERIC_COMPANY_VALUES:
        return "posting"

    return "role"


def interview_track_label(track: InterviewTrack) -> str:
    if track == "posting":
        return "공고 기반 실제 면접"
    return "직무 기반 모의면접"


__all__ = [
    "InterviewTrack",
    "infer_interview_track",
    "interview_track_label",
    "is_explicit_role_track_job",
    "normalize_track_value",
]
