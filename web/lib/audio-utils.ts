const MIC_CAPTURE_WORKLET_URL = "/worklets/mic-capture-processor.js";
const MIC_CAPTURE_BUFFER_SIZE = 512;
const DEFAULT_CAPTURE_SAMPLE_RATE = 16000;

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: AudioWorkletNode | null = null;
  private silentGain: GainNode | null = null;
  private onAudioData: (data: Float32Array, sampleRate: number) => void;
  private onCaptureState?: (stage: string, details?: Record<string, unknown>) => void;

  constructor(
    onAudioData: (data: Float32Array, sampleRate: number) => void,
    onCaptureState?: (stage: string, details?: Record<string, unknown>) => void,
  ) {
    this.onAudioData = onAudioData;
    this.onCaptureState = onCaptureState;
  }

  async start() {
    try {
      // Chrome 자동 처리에 맡김 — 16000 sampleRate 강제 / 모든 constraint 명시 시
      // 일부 Mac 환경에서 mic 가 무음만 보내는 케이스가 있어 audio: true 로 단순화.
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const settings = this.mediaStream.getAudioTracks()[0]?.getSettings();
      this.onCaptureState?.("mic.media-ready", {
        sampleRate: settings?.sampleRate, channelCount: settings?.channelCount,
        echoCancellation: settings?.echoCancellation, noiseSuppression: settings?.noiseSuppression,
        autoGainControl: settings?.autoGainControl,
      });

      const AudioContextClass =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext is not supported in this browser.");
      }

      // AudioContext sampleRate 강제 제거 — device native rate 그대로 사용.
      // 16000 강제 시 일부 Mac/Chrome 조합에서 resample 이 무음 만들어내는 케이스 있음.
      this.audioContext = new AudioContextClass({
        latencyHint: "interactive",
      });
      this.onCaptureState?.("mic.context-created", { state: this.audioContext.state, sampleRate: this.audioContext.sampleRate });
      this.audioContext.onstatechange = () => {
        this.onCaptureState?.("mic.context-state", { state: this.audioContext?.state });
      };

      if (!this.audioContext.audioWorklet) {
        throw new Error("AudioWorklet is not supported in this browser.");
      }

      await this.audioContext.audioWorklet.addModule(MIC_CAPTURE_WORKLET_URL);
      this.onCaptureState?.("mic.worklet-ready");
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = new AudioWorkletNode(this.audioContext, "mic-capture-processor", {
        channelCount: 1,
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: {
          bufferSize: MIC_CAPTURE_BUFFER_SIZE,
        },
      });

      this.processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
        const payload = event.data;
        if (!(payload instanceof Float32Array) || payload.length === 0) return;
        this.onAudioData(payload, this.getSampleRate());
      };

      this.silentGain = this.audioContext.createGain();
      this.silentGain.gain.value = 0;
      this.source.connect(this.processor);
      this.processor.connect(this.silentGain);
      this.silentGain.connect(this.audioContext.destination);
    } catch (error) {
      console.error("Failed to start audio recording:", error);
      this.stop();
      throw error;
    }
  }

  stop() {
    if (this.processor) {
      try {
        this.processor.port.postMessage({ type: "flush" });
      } catch {
        // No-op; the context may already be closing.
      }
      this.processor.disconnect();
      this.processor.port.onmessage = null;
      this.processor = null;
    }
    if (this.silentGain) {
      this.silentGain.disconnect();
      this.silentGain = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
  }

  getSampleRate(): number {
    const rate = this.audioContext?.sampleRate;
    return Number.isFinite(rate) && rate && rate > 1000 ? rate : DEFAULT_CAPTURE_SAMPLE_RATE;
  }
}
