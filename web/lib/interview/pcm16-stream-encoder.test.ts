import assert from "node:assert/strict";
import test from "node:test";
import { PCM16_FRAME_SAMPLES, Pcm16StreamEncoder } from "./pcm16-stream-encoder";

function decode(frame: { pcm16: string }): Int16Array {
  const bytes = Buffer.from(frame.pcm16, "base64");
  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
}

function sine(rate: number, seconds: number, hz: number, amplitude = 0.5): Float32Array {
  const out = new Float32Array(Math.round(rate * seconds));
  for (let i = 0; i < out.length; i += 1) out[i] = Math.sin((2 * Math.PI * hz * i) / rate) * amplitude;
  return out;
}

function feedInChunks(encoder: Pcm16StreamEncoder, samples: Float32Array, rate: number, chunk = 512) {
  const frames = [];
  for (let offset = 0; offset < samples.length; offset += chunk) {
    frames.push(...encoder.push(samples.subarray(offset, offset + chunk), rate));
  }
  const tail = encoder.flush();
  if (tail) frames.push(tail);
  return frames;
}

for (const rate of [48000, 44100]) {
  test(`${rate}Hz 마이크 1초가 16kHz 100ms 프레임 10개, 샘플 16000개로 줄어든다`, () => {
    const frames = feedInChunks(new Pcm16StreamEncoder(), sine(rate, 1, 440), rate);
    const total = frames.reduce((sum, frame) => sum + decode(frame).length, 0);
    assert.ok(Math.abs(total - 16000) <= 1, `total=${total}`);
    assert.ok(frames.slice(0, -1).every((frame) => decode(frame).length === PCM16_FRAME_SAMPLES));
    assert.ok(frames.every((frame) => frame.sampleRate === 16000));
    // 말소리 대역(440Hz)은 크기가 거의 그대로 남는다 → VAD 기준(RMS)이 바뀌지 않는다.
    const samples = frames.flatMap((frame) => Array.from(decode(frame), (v) => v / 32768));
    const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
    assert.ok(Math.abs(rms - 0.5 / Math.SQRT2) < 0.01, `rms=${rms}`);
  });
}

test("16kHz 를 넘는 고음(12kHz)은 평균에 걸러져 크게 줄어든다", () => {
  const frames = feedInChunks(new Pcm16StreamEncoder(), sine(48000, 0.5, 12000), 48000);
  const samples = frames.flatMap((frame) => Array.from(decode(frame), (v) => v / 32768));
  const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length);
  assert.ok(rms < 0.2, `rms=${rms}`);
});

test("flush 는 100ms 가 안 찬 나머지를 내보내고, reset 은 모아 둔 소리를 버린다", () => {
  const encoder = new Pcm16StreamEncoder();
  assert.deepEqual(encoder.push(sine(48000, 0.05, 440), 48000), []);
  const tail = encoder.flush();
  assert.ok(tail && decode(tail).length === 800);
  assert.equal(encoder.flush(), null);

  encoder.push(sine(48000, 0.05, 440), 48000);
  encoder.reset();
  assert.equal(encoder.flush(), null);
});

test("16kHz 보다 낮은 기기는 줄이지 않고 그 샘플레이트로 보낸다", () => {
  const frames = feedInChunks(new Pcm16StreamEncoder(), sine(8000, 0.5, 440), 8000);
  assert.ok(frames.every((frame) => frame.sampleRate === 8000));
  assert.equal(frames.reduce((sum, frame) => sum + decode(frame).length, 0), 4000);
});
