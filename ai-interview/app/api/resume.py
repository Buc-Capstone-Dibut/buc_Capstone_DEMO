"""Resume-related FastAPI endpoints.

이력서 AI 가공/정렬 (한국식 A4 fit) 엔드포인트.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from app.api.interview import get_gemini_service
from app.schemas.resume import ResumeNormalizeRequest, ResumePayload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/resume", tags=["resume"])


def _merge_with_original(
    original: dict[str, Any],
    normalized: dict[str, Any],
) -> dict[str, Any]:
    """가공 결과에서 누락된 키는 원본 값으로 보강한다.

    Gemini 응답이 사용자 입력을 일부 누락하더라도 정보 손실이 발생하지 않도록 안전망 역할.
    """
    required_keys = (
        "personalInfo",
        "education",
        "experience",
        "projects",
        "skills",
        "selfIntroduction",
        "coverLetters",
    )
    merged: dict[str, Any] = dict(normalized or {})

    for key in required_keys:
        if key not in merged or merged.get(key) in (None, ""):
            if key in original:
                merged[key] = original[key]
            else:
                # 합리적인 기본값으로 보강.
                if key == "personalInfo":
                    merged[key] = {}
                elif key == "selfIntroduction":
                    merged[key] = ""
                else:
                    merged[key] = []

    # timeline 은 입력이 있을 때만 유지.
    if "timeline" in original and "timeline" not in merged:
        merged["timeline"] = original["timeline"]

    return merged


@router.post("/normalize")
async def normalize_resume(request: ResumeNormalizeRequest) -> dict[str, Any]:
    """이력서 payload를 한국식 A4 양식에 맞춰 Gemini로 정렬·다듬는다."""
    try:
        # Pydantic 모델 → dict 로 직렬화 (Gemini 프롬프트에 그대로 주입).
        original_payload = request.payload.model_dump(exclude_none=False)
        options = request.options.model_dump(exclude_none=False)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        gemini = get_gemini_service()
    except RuntimeError as exc:
        logger.error("Gemini service unavailable: %s", exc)
        raise HTTPException(status_code=500, detail=f"AI 서비스 초기화 실패: {exc}")

    try:
        raw_result = gemini.normalize_resume_payload(
            payload=original_payload,
            options=options,
            retries=1,
        )
    except ValueError as exc:
        message = str(exc)
        logger.warning("Resume normalize JSON parse error: %s", message)
        raise HTTPException(
            status_code=422,
            detail=f"AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요. ({message})",
        )
    except Exception as exc:  # pragma: no cover - 외부 호출 실패 경로
        message = str(exc)
        logger.exception("Resume normalize failed")
        if "429" in message or "quota" in message.lower():
            raise HTTPException(
                status_code=429,
                detail="현재 AI 분석 사용량이 많습니다. 잠시 후 다시 시도해주세요.",
            )
        raise HTTPException(status_code=500, detail=f"AI 가공 실패: {message}")

    merged = _merge_with_original(original_payload, raw_result)

    # 한 번 더 ResumePayload 로 검증해 web 측 타입 안정성을 확보한다.
    try:
        validated = ResumePayload.model_validate(merged).model_dump(exclude_none=False)
    except ValidationError as exc:
        logger.warning("Resume normalize validation fallback: %s", exc)
        # Pydantic 검증 실패 시에도 가공 결과는 살려서 반환한다.
        validated = merged

    return {"success": True, "data": validated}
