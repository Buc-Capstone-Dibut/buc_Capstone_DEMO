class MicCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const requestedBufferSize = options?.processorOptions?.bufferSize;
    this.bufferSize = Number.isFinite(requestedBufferSize) ? Math.max(256, requestedBufferSize) : 2048;
    this.pending = new Float32Array(this.bufferSize);
    this.pendingLength = 0;

    this.port.onmessage = (event) => {
      if (event?.data?.type === "flush") {
        this.flush();
      }
    };
  }

  pushChunk(input) {
    let offset = 0;
    while (offset < input.length) {
      const writable = Math.min(this.bufferSize - this.pendingLength, input.length - offset);
      this.pending.set(input.subarray(offset, offset + writable), this.pendingLength);
      this.pendingLength += writable;
      offset += writable;

      if (this.pendingLength >= this.bufferSize) {
        const payload = new Float32Array(this.pending);
        this.port.postMessage(payload, [payload.buffer]);
        this.pendingLength = 0;
      }
    }
  }

  flush() {
    if (!this.pendingLength) return;
    const payload = this.pending.slice(0, this.pendingLength);
    this.port.postMessage(payload, [payload.buffer]);
    this.pendingLength = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    if (input && input.length) {
      this.pushChunk(input);
    }

    const output = outputs[0]?.[0];
    if (output) {
      output.fill(0);
    }
    return true;
  }
}

registerProcessor("mic-capture-processor", MicCaptureProcessor);
