import gzip
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.interview.domain.demo_script import CLOSING_TEXT, DEMO_SCRIPT_ID, OPENING, QUESTIONS
from app.interview.runtime import demo_script_audio as audio


class BundledDemoAudioTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        patcher = patch.object(audio, "AUDIO_DIRECTORY", self.root)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.addCleanup(audio._load.cache_clear)
        audio._load.cache_clear()
        self.text = "네. 고정 질문입니다."
        self.key = audio.demo_audio_key(self.text)
        pcm = b"\x01\x00" * 3200
        self.manifest = {"scriptId": DEMO_SCRIPT_ID, "voice": audio.settings.gemini_live_tts_voice or "Kore",
            "lines": {self.key: {"text": self.text, "sampleRate": 16000, "pcmSha256": hashlib.sha256(pcm).hexdigest()}}}
        (self.root / f"{self.key}.pcm.gz").write_bytes(gzip.compress(pcm))
        self.write_manifest()

    def write_manifest(self):
        (self.root / "manifest.json").write_text(json.dumps(self.manifest))
        audio._load.cache_clear()

    def test_returns_independent_playback_chunks_without_generation(self):
        first = audio.load_demo_script_audio(self.text)
        self.assertIsNotNone(first)
        self.assertAlmostEqual(first.duration_sec, 0.2)
        first.chunks.clear()
        self.assertTrue(audio.load_demo_script_audio(self.text).chunks)

    def test_changed_text_voice_and_corrupt_pcm_use_live_fallback(self):
        self.assertIsNone(audio.load_demo_script_audio(self.text + " 변경"))
        self.manifest["voice"] = "DifferentVoice"
        self.write_manifest()
        self.assertIsNone(audio.load_demo_script_audio(self.text))
        self.manifest["voice"] = audio.settings.gemini_live_tts_voice or "Kore"
        self.manifest["lines"][self.key]["pcmSha256"] = "invalid"
        self.write_manifest()
        self.assertIsNone(audio.load_demo_script_audio(self.text))


class ShippedDemoAudioTests(unittest.TestCase):
    def test_every_script_line_has_valid_bundled_audio(self):
        audio._load.cache_clear()
        for text in [OPENING, *QUESTIONS, CLOSING_TEXT]:
            with self.subTest(text=text):
                prepared = audio.load_demo_script_audio(text)
                self.assertTrue(prepared is not None, "missing or stale bundled line")
                self.assertGreater(prepared.duration_sec, 1)
