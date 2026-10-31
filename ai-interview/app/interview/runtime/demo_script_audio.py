"""Validated, bundled PCM for fixed demo lines; missing entries use live TTS."""
from __future__ import annotations

import gzip
import hashlib
import json
import logging
import zlib
from dataclasses import replace
from functools import lru_cache
from pathlib import Path

from app.config import settings
from app.interview.domain.demo_script import DEMO_SCRIPT_ID
from app.interview.runtime.state import PreparedTtsAudio
from app.interview.runtime.voice_support import pcm16le_bytes_to_base64_chunks

logger = logging.getLogger("dibut.ws")
AUDIO_DIRECTORY = Path(__file__).resolve().parents[2] / "demo_audio"


def demo_audio_key(text: str) -> str:
    return hashlib.sha256(" ".join(text.split()).encode()).hexdigest()


@lru_cache(maxsize=32)
def _load(text: str, voice: str) -> PreparedTtsAudio | None:
    key = demo_audio_key(text)
    try:
        directory = AUDIO_DIRECTORY / voice
        if not (directory / "manifest.json").is_file():
            directory = AUDIO_DIRECTORY
        manifest = json.loads((directory / "manifest.json").read_text())
        if manifest.get("scriptId") != DEMO_SCRIPT_ID or manifest.get("voice") != voice:
            return None
        entry = manifest.get("lines", {}).get(key)
        if not entry or entry.get("text") != " ".join(text.split()):
            return None
        pcm = gzip.decompress((directory / f"{key}.pcm.gz").read_bytes())
        sample_rate = int(entry["sampleRate"])
        if not pcm or len(pcm) % 2 or not 8000 <= sample_rate <= 48000:
            return None
        if hashlib.sha256(pcm).hexdigest() != entry.get("pcmSha256"):
            return None
        chunks, duration = pcm16le_bytes_to_base64_chunks(pcm, sample_rate=sample_rate)
        return PreparedTtsAudio(chunks=chunks, sample_rate=sample_rate,
                                provider="gemini-live-bundled", duration_sec=duration)
    except FileNotFoundError:
        return None
    except (OSError, EOFError, zlib.error, ValueError, TypeError, KeyError):
        logger.warning("bundled demo audio unavailable key=%s", key[:12], exc_info=True)
        return None


def load_demo_script_audio(text: str) -> PreparedTtsAudio | None:
    normalized = " ".join((text or "").split())
    audio = _load(normalized, settings.gemini_live_tts_voice or "Kore")
    return replace(audio, chunks=list(audio.chunks)) if audio is not None else None
