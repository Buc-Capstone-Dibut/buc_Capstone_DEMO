/**
 * 마이크 float 샘플(기기 기본 48k/44.1k 등)을 16kHz 16bit PCM 으로 줄이고 100ms 단위로 묶는다.
 *
 * 예전에는 512샘플마다 float 배열을 JSON 숫자로 보내 1초에 약 94개·1MB 가 나갔다.
 * 16kHz 16bit·100ms 묶음이면 1초에 10개·약 43KB(base64) 로 줄어 서버 처리와 업로드가 가벼워진다.
 * AudioContext 를 16kHz 로 강제하면 일부 Mac/Chrome 에서 무음이 돼서, 줄이는 일은 여기서 한다.
 */

export const PCM16_TARGET_SAMPLE_RATE = 16000;
/** 100ms — Google STT 스트리밍 권장 프레임 크기. */
export const PCM16_FRAME_SAMPLES = 1600;

export type Pcm16Frame = { pcm16: string; sampleRate: number };

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += step) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + step));
  }
  return btoa(binary);
}

function toPcm16(value: number): number {
  const clamped = value > 1 ? 1 : value < -1 ? -1 : value;
  return clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
}

export class Pcm16StreamEncoder {
  private inputRate = 0;
  private ratio = 1;
  private outputRate = PCM16_TARGET_SAMPLE_RATE;
  /** 아직 출력 샘플로 바꾸지 못한 입력 샘플(구간 경계에 걸친 꼬리). */
  private carry: number[] = [];
  /** carry 안에서 다음 출력 구간이 시작하는 위치(소수 가능). */
  private position = 0;
  private frame = new Int16Array(PCM16_FRAME_SAMPLES);
  private frameLength = 0;

  /** 입력을 받아, 꽉 찬 100ms 프레임들을 돌려준다. */
  push(samples: Float32Array, inputSampleRate: number): Pcm16Frame[] {
    const rate = Number.isFinite(inputSampleRate) && inputSampleRate > 1000 ? inputSampleRate : PCM16_TARGET_SAMPLE_RATE;
    if (rate !== this.inputRate) {
      // 기기 샘플레이트가 바뀌면(마이크 재시작 등) 이전 꼬리는 버리고 새로 시작한다.
      this.inputRate = rate;
      this.ratio = Math.max(1, rate / PCM16_TARGET_SAMPLE_RATE);
      // 16kHz 보다 낮은 기기는 줄이지 않고 그 샘플레이트 그대로 보낸다.
      this.outputRate = Math.min(rate, PCM16_TARGET_SAMPLE_RATE);
      this.frameLength = 0;
      this.carry = [];
      this.position = 0;
    }
    const frames: Pcm16Frame[] = [];
    const input = this.carry.length ? [...this.carry, ...samples] : Array.from(samples);

    // 각 출력 샘플 = 그 출력 구간(ratio 개 입력)의 평균. 평균이 저역 통과 역할을 해 고음 잡음(aliasing)을 줄인다.
    let pos = this.position;
    while (pos + this.ratio <= input.length) {
      const start = Math.floor(pos);
      const end = Math.max(start + 1, Math.floor(pos + this.ratio));
      let sum = 0;
      for (let i = start; i < end; i += 1) sum += input[i];
      this.frame[this.frameLength] = toPcm16(sum / (end - start));
      this.frameLength += 1;
      if (this.frameLength === PCM16_FRAME_SAMPLES) frames.push(this.takeFrame());
      pos += this.ratio;
    }
    const consumed = Math.floor(pos);
    this.carry = input.slice(consumed);
    this.position = pos - consumed;
    return frames;
  }

  /** 100ms 가 안 찬 나머지를 내보낸다(전송·마이크 끄기 직전). 마지막 음절이 잘리지 않게 한다. */
  flush(): Pcm16Frame | null {
    return this.frameLength > 0 ? this.takeFrame() : null;
  }

  /** 모아 둔 소리를 버린다(다시 말하기). 이전 답변 끝이 새 답변 앞에 붙지 않게 한다. */
  reset(): void {
    this.carry = [];
    this.position = 0;
    this.frameLength = 0;
  }

  private takeFrame(): Pcm16Frame {
    const samples = this.frame.slice(0, this.frameLength);
    this.frameLength = 0;
    const bytes = new Uint8Array(samples.length * 2);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < samples.length; i += 1) view.setInt16(i * 2, samples[i], true);
    return { pcm16: encodeBase64(bytes), sampleRate: this.outputRate };
  }
}
