"""Generate the fixed demo's validated audio once, outside interview requests.

Run from ai-interview with PYTHONPATH=. .venv/bin/python scripts/generate_demo_audio.py.
An optional first-question source and measured acknowledgement boundary let an
editor shorten only that syllable with ffmpeg, preserving the remaining speech.
"""
from __future__ import annotations

import argparse
import asyncio
import base64
import gzip
import hashlib
import json
import subprocess
import wave
from pathlib import Path

from app.config import settings
from app.interview.domain.demo_script import CLOSING_TEXT, DEMO_SCRIPT_ID, OPENING, QUESTIONS
from app.interview.runtime.demo_script_audio import AUDIO_DIRECTORY, demo_audio_key
from app.interview.runtime.demo_script_opening_cache import generate_demo_script_opening_audio


async def main(args: argparse.Namespace) -> None:
    args.output.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
        "scriptId": DEMO_SCRIPT_ID, "voice": settings.gemini_live_tts_voice or "Kore", "lines": {},
    }
    assert manifest["scriptId"] == DEMO_SCRIPT_ID
    assert manifest["voice"] == (settings.gemini_live_tts_voice or "Kore")
    lines = [("opening", OPENING), *[(f"question-{i + 1}", t) for i, t in enumerate(QUESTIONS)], ("closing", CLOSING_TEXT)]
    for label, text in lines:
        key = demo_audio_key(text)
        target = args.output / f"{key}.pcm.gz"
        if not args.force and key in manifest["lines"] and target.exists():
            continue
        if label == "question-1" and args.first_question_source:
            with wave.open(str(args.first_question_source), "rb") as source:
                assert source.getnchannels() == 1 and source.getsampwidth() == 2
                rate = source.getframerate()
                pcm = source.readframes(source.getnframes())
        else:
            audio = await generate_demo_script_opening_audio(text)
            if audio is None:
                raise RuntimeError(f"validated TTS unavailable: {label}")
            rate = audio.sample_rate
            pcm = b"".join(base64.b64decode(chunk) for chunk in audio.chunks)
        edit = None
        if label == "question-1" and args.ack_end_ms:
            boundary = args.ack_end_ms / 1000
            filters = (f"[0:a]asplit=2[h][t];[h]atrim=end={boundary},asetpts=PTS-STARTPTS,atempo=1.6[s];"
                       f"[t]atrim=start={boundary},asetpts=PTS-STARTPTS[r];[s][r]acrossfade=d=0.01")
            pcm = subprocess.run([args.ffmpeg, "-hide_banner", "-loglevel", "error", "-f", "s16le", "-ar", str(rate),
                "-ac", "1", "-i", "pipe:0", "-filter_complex", filters, "-f", "s16le", "pipe:1"],
                input=pcm, stdout=subprocess.PIPE, check=True).stdout
            edit = {"sourceEndMs": args.ack_end_ms, "tempo": 1.6, "crossfadeMs": 10}
        target.write_bytes(gzip.compress(pcm, mtime=0))
        entry = {"label": label, "text": " ".join(text.split()), "sampleRate": rate,
                 "pcmSha256": hashlib.sha256(pcm).hexdigest(), "durationMs": round(len(pcm) / (rate * 2) * 1000)}
        if edit:
            entry["initialAcknowledgementEdit"] = edit
        manifest["lines"][key] = entry
        temporary = manifest_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        temporary.replace(manifest_path)
        print(f"{label}: {entry['durationMs']} ms, {target.stat().st_size} bytes", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=AUDIO_DIRECTORY)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--first-question-source", type=Path)
    parser.add_argument("--ack-end-ms", type=int)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    asyncio.run(main(parser.parse_args()))
