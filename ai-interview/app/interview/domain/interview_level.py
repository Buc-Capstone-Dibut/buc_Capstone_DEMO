from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Literal, cast

InterviewLevel = Literal["new_grad", "junior", "mid", "senior"]

INTERVIEW_LEVEL_LABELS: dict[InterviewLevel, str] = {
    "new_grad": "신입",
    "junior": "주니어",
    "mid": "미들",
    "senior": "시니어",
}
INTERVIEW_LEVELS: tuple[InterviewLevel, ...] = ("new_grad", "junior", "mid", "senior")
SENIOR_TITLE_PATTERN = re.compile(r"\b(senior|staff|principal|architect|lead|manager|head|director)\b", re.IGNORECASE)
MID_TITLE_PATTERN = re.compile(r"\b(mid|senior)\b", re.IGNORECASE)
JUNIOR_TITLE_PATTERN = re.compile(r"\b(junior|associate)\b", re.IGNORECASE)
NEW_GRAD_PATTERN = re.compile(r"(신입|인턴|주니어\s*레벨|entry[-\s]?level|new[-\s]?grad)", re.IGNORECASE)
YEAR_PATTERN = re.compile(r"(19|20)\d{2}")
PRESENT_PATTERN = re.compile(r"(현재|재직\s*중|present|current|now)", re.IGNORECASE)


def normalize_interview_level(value: Any, *, allow_auto: bool = False) -> str:
    normalized = str(value or "").strip().lower().replace("-", "_")
    aliases = {
        "newgrad": "new_grad",
        "graduate": "new_grad",
        "entry": "new_grad",
        "entry_level": "new_grad",
        "new_grad": "new_grad",
        "junior": "junior",
        "mid": "mid",
        "middle": "mid",
        "mid_level": "mid",
        "senior": "senior",
        "auto": "auto",
    }
    resolved = aliases.get(normalized, "")
    if resolved == "auto" and allow_auto:
        return resolved
    if resolved in INTERVIEW_LEVELS:
        return resolved
    return ""


def interview_level_label(level: str | None) -> str:
    normalized = normalize_interview_level(level)
    if not normalized:
        return "자동 추천"
    return INTERVIEW_LEVEL_LABELS[cast(InterviewLevel, normalized)]


def resolve_interview_level(
    job_data: dict[str, Any] | None,
    resume_data: Any,
) -> InterviewLevel:
    normalized_job_data = job_data if isinstance(job_data, dict) else {}
    explicit = normalize_interview_level(normalized_job_data.get("interviewLevel"), allow_auto=True)
    if explicit and explicit != "auto":
        return cast(InterviewLevel, explicit)
    return infer_interview_level(normalized_job_data, resume_data)


def infer_interview_level(
    job_data: dict[str, Any] | None,
    resume_data: Any,
) -> InterviewLevel:
    normalized_job_data = job_data if isinstance(job_data, dict) else {}
    job_blob = " ".join(
        str(item or "")
        for item in (
            normalized_job_data.get("role"),
            normalized_job_data.get("company"),
            normalized_job_data.get("companyDescription"),
            " ".join(_to_string_list(normalized_job_data.get("requirements"))),
            " ".join(_to_string_list(normalized_job_data.get("responsibilities"))),
            " ".join(_to_string_list(normalized_job_data.get("preferred"))),
        )
    )
    titles = " ".join(_extract_position_titles(normalized_job_data, resume_data))
    combined_text = f"{job_blob} {titles}".strip()

    if NEW_GRAD_PATTERN.search(combined_text):
        return "new_grad"
    if SENIOR_TITLE_PATTERN.search(combined_text):
        return "senior"

    experience_years = _estimate_experience_years(resume_data)
    if experience_years >= 7:
        return "senior"
    if experience_years >= 3:
        return "mid"
    if experience_years >= 1:
        return "junior"

    if MID_TITLE_PATTERN.search(combined_text):
        return "mid"
    if JUNIOR_TITLE_PATTERN.search(combined_text):
        return "junior"
    return "new_grad"


def _estimate_experience_years(resume_data: Any) -> int:
    experiences = _extract_resume_experiences(resume_data)
    if not experiences:
        return 0

    total_years = 0
    current_year = datetime.now().year
    for entry in experiences:
        period = str(entry.get("period") or "")
        years = [int(match.group(0)) for match in YEAR_PATTERN.finditer(period)]
        if len(years) >= 2:
            total_years += max(0, years[1] - years[0])
            continue
        if len(years) == 1:
            end_year = current_year if PRESENT_PATTERN.search(period) else years[0] + 1
            total_years += max(0, end_year - years[0])
            continue
        total_years += 1
    return total_years


def _extract_position_titles(job_data: dict[str, Any], resume_data: Any) -> list[str]:
    titles = _to_string_list(job_data.get("role"))
    for entry in _extract_resume_experiences(resume_data):
        titles.extend(_to_string_list(entry.get("position")))
    return titles


def _extract_resume_experiences(resume_data: Any) -> list[dict[str, Any]]:
    if not isinstance(resume_data, dict):
        return []
    parsed = resume_data.get("parsedContent")
    if isinstance(parsed, dict):
        experiences = parsed.get("experience")
        if isinstance(experiences, list):
            return [item for item in experiences if isinstance(item, dict)]
    experiences = resume_data.get("experience")
    if isinstance(experiences, list):
        return [item for item in experiences if isinstance(item, dict)]
    return []


def _to_string_list(value: Any) -> list[str]:
    if isinstance(value, str):
        stripped = value.strip()
        return [stripped] if stripped else []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


__all__ = [
    "INTERVIEW_LEVEL_LABELS",
    "INTERVIEW_LEVELS",
    "InterviewLevel",
    "infer_interview_level",
    "interview_level_label",
    "normalize_interview_level",
    "resolve_interview_level",
]
