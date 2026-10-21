export function waitForDemo(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Request aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Request aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

type DemoReply = { content: string; protocol: string };

export function createCareerDemoStream(
  reply: DemoReply,
  signal?: AbortSignal,
  timing = { initialDelayMs: 1900, chunkDelayMs: 45, chunkSize: 12 },
): Response {
  const abort = new AbortController();
  const forwardAbort = () => abort.abort();
  if (signal?.aborted) abort.abort();
  else signal?.addEventListener("abort", forwardAbort, { once: true });
  const cleanup = () => signal?.removeEventListener("abort", forwardAbort);
  const chars = Array.from(reply.content);
  const encoder = new TextEncoder();
  let offset = 0;
  let started = false;
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        await waitForDemo(started ? timing.chunkDelayMs : timing.initialDelayMs, abort.signal);
        started = true;
        if (offset < chars.length) {
          const next = chars.slice(offset, offset + Math.max(1, timing.chunkSize)).join("");
          offset += Math.max(1, timing.chunkSize);
          controller.enqueue(encoder.encode(next));
        } else {
          // Keep the UI protocol separate from the simulated typing text; plain replies have none.
          if (reply.protocol) controller.enqueue(encoder.encode(`\n\n${reply.protocol}`));
          controller.close();
          cleanup();
        }
      } catch (error) {
        cleanup();
        if (!cancelled) controller.error(error);
      }
    },
    cancel() {
      cancelled = true;
      abort.abort();
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
