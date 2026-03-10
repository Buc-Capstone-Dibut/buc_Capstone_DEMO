from __future__ import annotations

from app.config import settings
from app.interview.runtime.state import VoiceWsState


def retune_vad_for_next_turn(
    state: VoiceWsState,
    *,
    utterance_duration_ms: float,
    short_answer: bool,
) -> None:
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
        silence_ms += 260
        short_silence_ms += 320
        turn_end_grace_ms += 180
    elif avg_ms >= 5200:
        silence_ms += 220
        short_silence_ms += 260
        turn_end_grace_ms += 140
    elif avg_ms >= 3200:
        silence_ms += 120
        short_silence_ms += 160
        turn_end_grace_ms += 80
    elif avg_ms and avg_ms <= 1800:
        silence_ms -= 80
        short_silence_ms -= 120
        turn_end_grace_ms -= 80

    if state.short_reprompt_streak >= 2:
        silence_ms += 140
        short_silence_ms += 180
        turn_end_grace_ms += 120

    silence_ms = max(500, min(short_silence_ms, silence_ms))
    short_silence_ms = max(silence_ms + 120, min(2600, short_silence_ms))
    turn_end_grace_ms = max(800, min(2200, turn_end_grace_ms))

    state.turn_end_grace_sec = turn_end_grace_ms / 1000.0
    state.vad.reconfigure(
        silence_ms=silence_ms,
        short_utterance_silence_ms=short_silence_ms,
    )


__all__ = ["retune_vad_for_next_turn"]
