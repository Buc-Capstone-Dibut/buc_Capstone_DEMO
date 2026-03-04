from __future__ import annotations

import io
import math
import struct
import wave


def _clamp(sample: float) -> float:
    if sample > 1.0:
        return 1.0
    if sample < -1.0:
        return -1.0
    return sample


def float_samples_to_wav_bytes(samples: list[float], sample_rate: int = 16000) -> bytes:
    """Convert mono float32 [-1, 1] samples into a 16-bit PCM WAV payload."""
    if not samples:
        return b""

    pcm_frames = bytearray()
    for sample in samples:
        clamped = _clamp(sample)
        pcm_frames.extend(struct.pack("<h", int(clamped * 32767)))

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(bytes(pcm_frames))
    return buffer.getvalue()


def float_samples_to_pcm16le_bytes(samples: list[float]) -> bytes:
    """Convert mono float32 [-1, 1] samples into raw 16-bit PCM little-endian bytes."""
    if not samples:
        return b""

    pcm_frames = bytearray()
    for sample in samples:
        clamped = _clamp(sample)
        pcm_frames.extend(struct.pack("<h", int(clamped * 32767)))
    return bytes(pcm_frames)


def pcm16le_bytes_to_float_samples(pcm_bytes: bytes) -> list[float]:
    """Decode raw mono 16-bit PCM little-endian bytes to normalized float samples."""
    if not pcm_bytes:
        return []

    usable_length = len(pcm_bytes) - (len(pcm_bytes) % 2)
    if usable_length <= 0:
        return []

    int_samples = struct.unpack("<" + "h" * (usable_length // 2), pcm_bytes[:usable_length])
    return [sample / 32768.0 for sample in int_samples]


def wav_bytes_to_float_samples(wav_bytes: bytes) -> tuple[list[float], int]:
    """Decode mono/stereo 16-bit WAV bytes to normalized float samples."""
    if not wav_bytes:
        return [], 24000

    with wave.open(io.BytesIO(wav_bytes), "rb") as wav_file:
        sample_rate = wav_file.getframerate()
        channels = wav_file.getnchannels()
        sampwidth = wav_file.getsampwidth()
        frame_count = wav_file.getnframes()
        raw_frames = wav_file.readframes(frame_count)

    # Only 16-bit PCM is supported in this pipeline.
    if sampwidth != 2:
        return [], sample_rate

    int_samples = struct.unpack("<" + "h" * (len(raw_frames) // 2), raw_frames)
    if channels == 2:
        # Down-mix stereo to mono.
        mono: list[float] = []
        for i in range(0, len(int_samples), 2):
            mono.append(((int_samples[i] + int_samples[i + 1]) / 2.0) / 32768.0)
        return mono, sample_rate

    mono = [sample / 32768.0 for sample in int_samples]
    return mono, sample_rate


def chunk_float_samples(samples: list[float], chunk_size: int = 4800) -> list[list[float]]:
    if not samples:
        return []
    if chunk_size <= 0:
        return [samples]
    return [samples[i:i + chunk_size] for i in range(0, len(samples), chunk_size)]


class VadSegmenter:
    """
    Lightweight RMS VAD to split user mic stream into utterance segments.
    Input chunks are float32 arrays in range [-1, 1].
    """

    def __init__(
        self,
        sample_rate: int = 16000,
        threshold: float = 0.015,
        silence_ms: int = 700,
        min_speech_ms: int = 350,
        max_segment_ms: int = 10000,
    ):
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.silence_ms = silence_ms
        self.min_speech_ms = min_speech_ms
        self.max_segment_ms = max_segment_ms

        self._buffer: list[float] = []
        self._speech_started = False
        self._trailing_silence_ms = 0.0

    def _chunk_rms(self, chunk: list[float]) -> float:
        if not chunk:
            return 0.0
        power = sum(sample * sample for sample in chunk) / len(chunk)
        return math.sqrt(power)

    def feed(self, chunk: list[float]) -> bytes | None:
        if not chunk:
            return None

        duration_ms = len(chunk) / self.sample_rate * 1000.0
        rms = self._chunk_rms(chunk)
        is_speech = rms >= self.threshold

        # Drop leading silence until speech is detected.
        if not self._speech_started and not is_speech:
            return None

        self._buffer.extend(chunk)

        if is_speech:
            self._speech_started = True
            self._trailing_silence_ms = 0.0
        elif self._speech_started:
            self._trailing_silence_ms += duration_ms

        ready_by_silence = (
            self._speech_started
            and self._trailing_silence_ms >= self.silence_ms
            and len(self._buffer) >= int(self.sample_rate * self.min_speech_ms / 1000.0)
        )
        ready_by_max = len(self._buffer) >= int(self.sample_rate * self.max_segment_ms / 1000.0)

        if not (ready_by_silence or ready_by_max):
            return None

        segment = self._buffer[:]
        self._buffer.clear()
        self._speech_started = False
        self._trailing_silence_ms = 0.0
        return float_samples_to_wav_bytes(segment, sample_rate=self.sample_rate)

    def flush(self) -> bytes | None:
        if not self._buffer:
            return None
        if len(self._buffer) < int(self.sample_rate * self.min_speech_ms / 1000.0):
            self._buffer.clear()
            self._speech_started = False
            self._trailing_silence_ms = 0.0
            return None

        segment = self._buffer[:]
        self._buffer.clear()
        self._speech_started = False
        self._trailing_silence_ms = 0.0
        return float_samples_to_wav_bytes(segment, sample_rate=self.sample_rate)
