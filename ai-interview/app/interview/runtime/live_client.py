from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable

from app.interview.domain.interview_memory import extract_memory_keywords
from app.interview.runtime.state import PreparedTtsAudio, VoiceWsState
from app.services.gemini_live_voice_service import GeminiLiveInterviewSession
from app.services.voice_pipeline import float_samples_to_pcm16le_bytes, wav_bytes_to_float_samples


def _normalize_audio_text_signature(text: str) -> str:
    return re.sub(r"[^0-9A-Za-z가-힣]", "", (text or "").lower())


def _is_semantically_same_audio_text(raw_text: str, sanitized_text: str) -> bool:
    if not raw_text or not sanitized_text:
        return False
    return _normalize_audio_text_signature(raw_text) == _normalize_audio_text_signature(sanitized_text)


def build_live_session_instruction(
    state: VoiceWsState,
    *,
    compact_context_text: Callable[..., str],
) -> str:
    personality = (state.personality or "professional").strip()
    job_brief = compact_context_text(state.job_data, max_chars=900)
    resume_brief = compact_context_text(state.resume_data, max_chars=900)
    target_min = max(1, int(state.target_duration_sec // 60))
    return (
        "당신은 한국어 AI 면접관 Dibut입니다.\n"
        "절대 규칙:\n"
        "1) 매 턴 기본적으로 질문 1개만 한다(질문은 마지막 문장에 위치). 단, 운영 메모에 질문 없이 종료하라고 명시된 종료 턴은 예외다.\n"
        "2) 메타발화(예: 지시/프롬프트 설명/영어 문장/마크다운/별표) 금지.\n"
        "3) 답변이 짧거나 불완전하면 다음 질문 대신 '이어서 조금만 더 말씀해 주세요.'를 말한다.\n"
        "4) 지원자 답변을 직접 대신 말하지 않는다.\n"
        "5) 질문은 구체적이고 검증 가능한 꼬리질문 위주로 한다.\n"
        "6) 각 턴은 2~4문장으로 구성하고, 전체 길이는 대략 80~220자 내에서 자연스럽게 말한다.\n"
        "7) 운영 지시는 내부 참고용이다. 절대 그대로 읽거나 설명하지 말고 질문 생성 제어에만 사용한다.\n"
        "8) 직전 답변의 키워드/기술명/수치 중 최소 1개를 다음 질문 문장에 직접 언급한다.\n"
        "9) 직전 답변을 더 깊게 검증할 필요가 있으면 같은 질문 축을 한 번 더 파고들 수 있다. 질문 유형을 기계적으로 바꾸지 않는다.\n"
        "10) 지원자 방금 답변과 무관한 새 주제로 갑자기 전환하지 않는다.\n"
        f"면접 스타일: {personality}\n"
        f"권장 면접 길이: 약 {target_min}분\n"
        f"채용 맥락 요약: {job_brief}\n"
        f"지원자 요약: {resume_brief}\n"
        "출력은 자연스러운 한국어 음성 문장으로만 생성한다."
    )


def build_live_turn_prompt(
    state: VoiceWsState,
    *,
    question_type: str | None = None,
    answer_quality_hint: str = "",
    user_text: str = "",
    extra_instruction: str = "",
    question_type_label: Callable[[str | None], str],
    build_memory_snapshot: Callable[..., str],
    compact_context_text: Callable[..., str],
) -> str:
    parts: list[str] = ["다음 조건을 참고해 이번 면접관 발화를 구성하세요."]
    if question_type:
        parts.append(f"- 우선 질문 유형: {question_type_label(question_type)}")
    recent_type_labels = ", ".join(question_type_label(item) for item in state.recent_question_types[-3:])
    if recent_type_labels:
        parts.append(f"- 최근 사용한 질문 유형: {recent_type_labels}")
    memory_snapshot = build_memory_snapshot(state)
    if memory_snapshot:
        parts.append(f"- 최근 면접 메모: {memory_snapshot}")
    quality_hint = (answer_quality_hint or state.last_answer_quality_hint or "").strip()
    if quality_hint:
        parts.append(f"- 직전 답변 검증 포인트: {quality_hint}")
    else:
        parts.append("- 직전 답변에서 수치, 근거, 의사결정 기준이 빠졌다면 그 부분을 우선 검증할 것")
    if user_text:
        parts.append(f"- 참고 사용자 답변: {compact_context_text(user_text, max_chars=240)}")
        keywords = extract_memory_keywords(user_text, max_items=4)
        if keywords:
            parts.append(f"- 다음 질문 문장에는 답변의 핵심 키워드 중 최소 1개를 직접 포함: {', '.join(keywords)}")
    else:
        parts.append("- 방금 입력된 사용자 음성 답변의 고유명사/기술명/수치 중 최소 1개를 질문 문장에 직접 포함할 것")
    if extra_instruction:
        parts.append(f"- 추가 요청: {extra_instruction}")
    parts.append("- 방금 답변에서 아직 검증되지 않은 핵심 축이 남아 있으면 새 주제로 바꾸지 말고 같은 축을 더 깊게 파고들 것")
    parts.append("- 답변을 요약만 하지 말고, 방금 답변의 구체 디테일을 파고드는 꼬리질문으로 이어갈 것")
    parts.append("- 위 조건은 내부 참고용이며, 실제 출력은 자연스러운 한국어 음성 문장만 생성할 것")
    return re.sub(r"\n{3,}", "\n\n", "\n".join(parts)).strip()


def get_or_create_live_interview(
    state: VoiceWsState,
    *,
    create_live_interview_session: Callable[[], GeminiLiveInterviewSession],
) -> GeminiLiveInterviewSession:
    if state.live_interview is None:
        state.live_interview = create_live_interview_session()
    return state.live_interview


@dataclass(frozen=True)
class LiveClientDeps:
    create_live_interview_session: Callable[[], GeminiLiveInterviewSession]
    build_session_instruction: Callable[[VoiceWsState], str]
    build_turn_prompt: Callable[..., str]
    to_prepared_tts_audio_from_pcm: Callable[..., PreparedTtsAudio | None]
    sanitize_ai_turn_text: Callable[[str], str]
    looks_like_complete_ai_question: Callable[[str], bool]


async def request_live_text_turn(
    state: VoiceWsState,
    *,
    text: str,
    question_type: str | None = None,
    extra_instruction: str = "",
    user_text: str = "",
    deps: LiveClientDeps,
) -> tuple[str, PreparedTtsAudio | None]:
    live = deps.create_live_interview_session()
    if not live.enabled:
        return "", None

    try:
        result = await live.request_text_turn(
            session_instruction=deps.build_session_instruction(state),
            turn_prompt=deps.build_turn_prompt(
                state,
                question_type=question_type,
                user_text=user_text,
                extra_instruction=extra_instruction,
            ),
            text=text,
        )
        prepared = deps.to_prepared_tts_audio_from_pcm(
            result.audio_pcm_bytes,
            sample_rate=result.sample_rate,
            provider=result.provider,
        )
        return (result.ai_text or "").strip(), prepared
    finally:
        await live.close()


async def request_live_audio_turn(
    state: VoiceWsState,
    *,
    wav_bytes: bytes,
    question_type: str | None = None,
    answer_quality_hint: str = "",
    prompt_user_text: str = "",
    extra_instruction: str = "",
    deps: LiveClientDeps,
) -> tuple[str, str, PreparedTtsAudio | None, str]:
    live = get_or_create_live_interview(state, create_live_interview_session=deps.create_live_interview_session)
    if not live.enabled:
        return "", "", None, ""

    samples, sample_rate = wav_bytes_to_float_samples(wav_bytes)
    if not samples:
        return "", "", None, ""

    pcm_bytes = float_samples_to_pcm16le_bytes(samples)
    result = await live.request_audio_turn(
        session_instruction=deps.build_session_instruction(state),
        turn_prompt=deps.build_turn_prompt(
            state,
            question_type=question_type,
            answer_quality_hint=answer_quality_hint,
            user_text=prompt_user_text,
            extra_instruction=extra_instruction,
        ),
        pcm_bytes=pcm_bytes,
        sample_rate=sample_rate,
    )
    prepared = deps.to_prepared_tts_audio_from_pcm(
        result.audio_pcm_bytes,
        sample_rate=result.sample_rate,
        provider=result.provider,
    )
    return (
        (result.user_text or "").strip(),
        (result.ai_text or "").strip(),
        prepared,
        result.provider,
    )


async def repair_ai_turn_if_truncated(
    *,
    ai_text: str,
    prepared_tts: PreparedTtsAudio | None,
    deps: LiveClientDeps,
) -> tuple[str, PreparedTtsAudio | None]:
    raw_text = (ai_text or "").strip()
    text = deps.sanitize_ai_turn_text(raw_text)
    if text != raw_text and not _is_semantically_same_audio_text(raw_text, text):
        prepared_tts = None
    if not text:
        return "", None
    if not deps.looks_like_complete_ai_question(text):
        prepared_tts = None
    return text, prepared_tts
