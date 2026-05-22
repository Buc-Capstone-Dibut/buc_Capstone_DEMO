"use client";

// Skulpt Worker -> VisualStep[] 어댑터.
// captureSteps=true 시 step별 line/variables/events/stdout을 캡처해
// useCTPStore가 사용할 수 있는 VisualStep[] 형태로 매핑한다.
// 30s timeout + WORKER_CRASH 처리 포함.

import type { VisualStep } from "@/components/features/ctp/store/use-ctp-store";

export interface SkulptRunOptions {
  maxSteps?: number;
  stdin?: string;
  captureSteps?: boolean;
  timeoutMs?: number;
}

export interface SkulptStep {
  line: number;
  col?: number;
  variables: Record<string, unknown>;
  stdout: string[];
  events: Array<{ event_type?: string; type?: string; scope?: string; [key: string]: unknown }>;
}

export type SkulptErrorCode = "TLE" | "OLE" | "RTE" | "WORKER_CRASH";

export interface SkulptRunResult {
  steps: VisualStep[];
  rawSteps: SkulptStep[];
  stdout: string;
  error: null | {
    code: SkulptErrorCode;
    message: string;
  };
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_STEPS = 10_000;

function toStdinLines(input?: string): string[] {
  if (!input) return [];
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const stripped = normalized.replace(/\n+$/, "");
  if (!stripped.length) return [];
  return stripped.split("\n");
}

const KNOWN_POINTERS = new Set([
  "i",
  "j",
  "k",
  "l",
  "r",
  "m",
  "left",
  "right",
  "mid",
  "current",
  "idx",
  "index",
  "pos",
  "p",
  "q",
  "head",
  "tail",
]);

function extractPointers(variables: Record<string, unknown>): Record<string, number> {
  const pointers: Record<string, number> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (!KNOWN_POINTERS.has(key.toLowerCase())) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      pointers[key] = value;
    }
  }
  return pointers;
}

function findArrayVariable(variables: Record<string, unknown>): unknown[] | null {
  // 가장 흔한 변수명 우선 탐색.
  const preferred = ["arr", "array", "nums", "data", "items", "lst", "list"];
  for (const name of preferred) {
    const v = variables[name];
    if (Array.isArray(v)) return v;
  }
  // fallback: 첫 번째 array 값.
  for (const v of Object.values(variables)) {
    if (Array.isArray(v)) return v;
  }
  return null;
}

function mapToVisualData(s: SkulptStep): unknown {
  const array = findArrayVariable(s.variables);
  const pointers = extractPointers(s.variables);
  const latestEvent = s.events.length > 0 ? s.events[s.events.length - 1] : null;
  const eventType =
    (latestEvent?.event_type as string | undefined) ??
    (latestEvent?.type as string | undefined) ??
    null;
  return {
    array,
    pointers,
    event: latestEvent,
    eventType,
  };
}

function deriveDescription(s: SkulptStep): string {
  const latestEvent = s.events.length > 0 ? s.events[s.events.length - 1] : null;
  const eventType =
    (latestEvent?.event_type as string | undefined) ??
    (latestEvent?.type as string | undefined);
  if (eventType === "found") return `Line ${s.line}: 매칭 발견`;
  if (eventType === "compare") return `Line ${s.line}: 비교`;
  if (eventType === "swap") return `Line ${s.line}: 교환`;
  if (eventType) return `Line ${s.line}: ${eventType}`;
  return `Line ${s.line}`;
}

function toVisualStep(s: SkulptStep, idx: number): VisualStep {
  return {
    id: `trace-step-${idx}`,
    description: deriveDescription(s),
    activeLine: s.line,
    data: mapToVisualData(s),
    variables: s.variables,
    events: s.events,
    stdout: s.stdout,
  };
}

export async function runWithTrace(
  code: string,
  options: SkulptRunOptions = {},
): Promise<SkulptRunResult> {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  const captureSteps = options.captureSteps !== false;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const stdinLines = toStdinLines(options.stdin);

  return new Promise<SkulptRunResult>((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(`/workers/skulpt.worker.js?v=${Date.now()}-${Math.random()}`);
    } catch (err) {
      resolve({
        steps: [],
        rawSteps: [],
        stdout: "",
        error: {
          code: "WORKER_CRASH",
          message: err instanceof Error ? err.message : String(err),
        },
      });
      return;
    }

    let resolved = false;
    let rawSteps: SkulptStep[] = [];
    let stdout = "";
    let pendingError: { code: SkulptErrorCode; message: string } | null = null;
    let resultReceived = false;

    const cleanup = () => {
      try {
        worker.terminate();
      } catch {
        // ignore terminate errors
      }
    };

    const finish = (result: SkulptRunResult) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      cleanup();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        steps: [],
        rawSteps,
        stdout,
        error: { code: "TLE", message: `Execution exceeded ${timeoutMs}ms timeout` },
      });
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || typeof payload !== "object") return;

      switch (payload.type) {
        case "BATCH_STEPS":
          if (Array.isArray(payload.steps)) {
            rawSteps = payload.steps as SkulptStep[];
          }
          break;
        case "RESULT":
          resultReceived = true;
          stdout = typeof payload.stdout === "string" ? payload.stdout : "";
          break;
        case "ERROR": {
          const code = (payload.code as SkulptErrorCode | undefined) ?? "RTE";
          pendingError = {
            code,
            message: typeof payload.message === "string" ? payload.message : "Runtime Error",
          };
          break;
        }
        case "STATUS":
          if (payload.status === "completed") {
            if (pendingError) {
              finish({
                steps: [],
                rawSteps,
                stdout,
                error: pendingError,
              });
              return;
            }
            const steps = rawSteps.map((s, i) => toVisualStep(s, i));
            finish({
              steps,
              rawSteps,
              stdout,
              error: null,
            });
          }
          break;
        default:
          break;
      }

      // Worker는 ERROR 발생 시 STATUS를 보내지 않을 수 있어 ERROR 직후 짧게 finish.
      if (payload.type === "ERROR") {
        // 즉시 finish (worker가 STATUS=completed를 안 보낼 수 있음)
        if (!resolved) {
          finish({
            steps: [],
            rawSteps,
            stdout,
            error: pendingError!,
          });
        }
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      finish({
        steps: [],
        rawSteps,
        stdout,
        error: {
          code: "WORKER_CRASH",
          message: event.message || "Worker crashed",
        },
      });
    };

    // 호환성을 위해 BrowserJudge와 동일한 message shape 사용.
    worker.postMessage({
      type: "RUN_CODE",
      code,
      judge: {
        stdinLines,
        maxSteps,
        captureSteps,
      },
    });

    // resultReceived가 set만 되고 STATUS를 못 받는 경우 대비 — timer가 cleanup.
    void resultReceived;
  });
}

// 테스트 노출용 internals
export const __skulptRunnerInternals = {
  toStdinLines,
  extractPointers,
  findArrayVariable,
  mapToVisualData,
  deriveDescription,
  toVisualStep,
};
