from __future__ import annotations

DEFAULT_TARGET_DURATION_SEC = 10 * 60
MIN_TARGET_DURATION_SEC = 5 * 60
MAX_TARGET_DURATION_SEC = 15 * 60

DEFAULT_CLOSING_THRESHOLD_SEC = 60
MIN_CLOSING_THRESHOLD_SEC = 30
MAX_CLOSING_THRESHOLD_SEC = 120

# 한 턴(질문+답변) 평균 소요 추정치 — '예상 총 질문 수' 표시/페이스 안내용.
# 실제 답변이 짧으면 더 많은 질문이 들어가므로 보수적으로 낮춰 잡는다.
AVERAGE_TURN_SEC = 55
MIN_DYNAMIC_QUESTIONS = 4
# 질문 개수 상한(안전 한도). 종료는 기본적으로 시간 기준이며, 이 값은 답변이 매우 짧을 때만
# 닿는 천장이다. (10~15분 동안 답변이 빨라도 면접이 일찍 끝나지 않도록 넉넉히)
MAX_DYNAMIC_QUESTIONS = 14
SESSION_GRACE_SEC = 20
RECONNECT_GRACE_SEC = 60


def clamp_target_duration(duration_sec: int | None) -> int:
    value = int(duration_sec or DEFAULT_TARGET_DURATION_SEC)
    return max(MIN_TARGET_DURATION_SEC, min(MAX_TARGET_DURATION_SEC, value))


def clamp_closing_threshold(threshold_sec: int | None) -> int:
    value = int(threshold_sec or DEFAULT_CLOSING_THRESHOLD_SEC)
    return max(MIN_CLOSING_THRESHOLD_SEC, min(MAX_CLOSING_THRESHOLD_SEC, value))


def estimated_total_questions(target_duration_sec: int) -> int:
    estimated = round(target_duration_sec / AVERAGE_TURN_SEC)
    return max(MIN_DYNAMIC_QUESTIONS, min(MAX_DYNAMIC_QUESTIONS, estimated))
