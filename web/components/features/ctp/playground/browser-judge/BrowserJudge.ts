import {
  JudgeResult,
  ProblemBankItem,
  ProblemTestCase,
  TestCaseResult,
  Verdict,
} from "@/components/features/ctp/problem-bank/types";
import { normalizeOutput } from "./normalize";

interface WorkerJudgeResponse {
  stdout: string;
  errorMessage?: string;
  errorCode?: Verdict;
}

function toStdinLines(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const withoutTrailingNewline = normalized.replace(/\n+$/, "");
  if (!withoutTrailingNewline.length) {
    return [];
  }
  return withoutTrailingNewline.split("\n");
}

function deriveOverall(cases: TestCaseResult[]): Verdict {
  if (!cases.length) return "RTE";
  if (cases.every((item) => item.verdict === "AC")) return "AC";
  if (cases.some((item) => item.verdict === "OLE")) return "OLE";
  if (cases.some((item) => item.verdict === "TLE")) return "TLE";
  if (cases.some((item) => item.verdict === "RTE")) return "RTE";
  return "WA";
}

function runCaseWithWorker(
  userCode: string,
  testCase: ProblemTestCase,
  problem: ProblemBankItem,
): Promise<WorkerJudgeResponse> {
  return new Promise((resolve) => {
    const worker = new Worker(`/workers/skulpt.worker.js?v=${Date.now()}-${Math.random()}`);
    let resolved = false;
    let stdout = "";

    const finish = (result: WorkerJudgeResponse) => {
      if (resolved) return;
      resolved = true;
      worker.terminate();
      resolve(result);
    };

    worker.onmessage = (event) => {
      const payload = event.data;
      if (!payload || typeof payload !== "object") return;

      if (payload.type === "RESULT") {
        stdout = typeof payload.stdout === "string" ? payload.stdout : "";
      }

      if (payload.type === "ERROR") {
        const errorCode = (payload.code as Verdict | undefined) ?? "RTE";
        finish({
          stdout,
          errorMessage: String(payload.message ?? "Runtime Error"),
          errorCode,
        });
      }

      if (payload.type === "STATUS" && payload.status === "completed") {
        finish({ stdout });
      }
    };

    worker.onerror = (event) => {
      finish({
        stdout,
        errorCode: "RTE",
        errorMessage: event.message || "Worker execution error",
      });
    };

    worker.postMessage({
      type: "RUN_CODE",
      code: userCode,
      judge: {
        stdinLines: toStdinLines(testCase.input),
        maxSteps: problem.timeLimit,
        maxOutputBytes: problem.outputLimitBytes,
        captureSteps: false,
      },
    });
  });
}

export const BrowserJudge = {
  async run(userCode: string, problem: ProblemBankItem): Promise<JudgeResult> {
    const cases: TestCaseResult[] = [];

    for (let index = 0; index < problem.testCases.length; index += 1) {
      const testCase = problem.testCases[index];
      const workerResult = await runCaseWithWorker(userCode, testCase, problem);

      if (workerResult.errorCode) {
        cases.push({
          index: index + 1,
          verdict: workerResult.errorCode,
          errorMessage: workerResult.errorMessage,
          expectedOutput: testCase.output,
          actualOutput: workerResult.stdout,
        });
        continue;
      }

      const actual = normalizeOutput(workerResult.stdout);
      const expected = normalizeOutput(testCase.output);
      if (actual === expected) {
        cases.push({
          index: index + 1,
          verdict: "AC",
        });
      } else {
        cases.push({
          index: index + 1,
          verdict: "WA",
          expectedOutput: expected,
          actualOutput: actual,
        });
      }
    }

    const passed = cases.filter((item) => item.verdict === "AC").length;
    return {
      overall: deriveOverall(cases),
      passed,
      total: problem.testCases.length,
      cases,
    };
  },
};

export const __browserJudgeInternals = {
  toStdinLines,
  deriveOverall,
};
