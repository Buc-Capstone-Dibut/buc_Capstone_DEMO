from __future__ import annotations

from app.config import settings
from app.interview.runtime.state import VoiceWsState


def retune_vad_for_next_turn(
    state: VoiceWsState,
    *,
    utterance_duration_ms: float,
    short_answer: bool,
) -> None:
    architecture = (settings.voice_runtime_architecture or "").strip().lower()
    live_only = architecture == "live-only"
    if utterance_duration_ms > 0:
        state.recent_user_durations_ms.append(float(utterance_duration_ms))
        if len(state.recent_user_durations_ms) > 5:
            state.recent_user_durations_ms = state.recent_user_durations_ms[-5:]

    if short_answer:
        state.short_reprompt_streak = min(state.short_reprompt_streak + 1, 3)
    else:
        state.short_reprompt_streak = 0

    recent = state.recent_user_durations_ms[-3:]
    avg_ms = sum(recent) / len(recent) if recent else 0.0
    silence_ms = settings.voice_vad_silence_ms
    short_silence_ms = settings.voice_vad_short_utterance_silence_ms
    turn_end_grace_ms = settings.voice_turn_end_grace_ms

    if short_answer:
        if live_only:
            silence_ms -= 30
            short_silence_ms -= 70
            turn_end_grace_ms -= 10
        else:
            silence_ms -= 70
            short_silence_ms -= 180
            turn_end_grace_ms -= 30
    elif avg_ms >= 5200:
        silence_ms += 30
        short_silence_ms += 40
        turn_end_grace_ms += 10
    elif avg_ms >= 3200:
        silence_ms += 15
        short_silence_ms += 20
        turn_end_grace_ms += 5
    elif avg_ms and avg_ms <= 1800:
        silence_ms -= 35
        short_silence_ms -= 80
        turn_end_grace_ms -= 20

    if state.short_reprompt_streak >= 2:
        if live_only:
            silence_ms -= 10
            short_silence_ms -= 20
            turn_end_grace_ms -= 5
        else:
            silence_ms -= 20
            short_silence_ms -= 40
            turn_end_grace_ms -= 10

    silence_floor = 560 if live_only else 420
    short_silence_floor = 1000 if live_only else 560
    short_gap_floor = 180 if live_only else 140
    grace_floor = 90 if live_only else 60
    grace_cap = 220 if live_only else 180

    silence_ms = max(silence_floor, min(short_silence_ms - 120, silence_ms))
    short_silence_ms = max(max(silence_ms + short_gap_floor, short_silence_floor), min(1800, short_silence_ms))
    turn_end_grace_ms = max(grace_floor, min(grace_cap, turn_end_grace_ms))

    state.turn_end_grace_sec = turn_end_grace_ms / 1000.0
    state.vad.reconfigure(
        silence_ms=silence_ms,
        short_utterance_silence_ms=short_silence_ms,
    )


__all__ = ["retune_vad_for_next_turn"]
