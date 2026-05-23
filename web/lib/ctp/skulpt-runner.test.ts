import assert from "node:assert/strict";
import test from "node:test";

import {
  runWithTrace,
  __skulptRunnerInternals,
  type SkulptStep,
} from "./skulpt-runner";

// ---- MockWorker 구현 ----
// Worker constructor 호출 시 등록된 시나리오를 차례대로 재생.
type WorkerScenario = (post: (data: unknown) => void) => void;
let nextScenario: WorkerScenario | null = null;

class MockWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  private terminated = false;
  constructor(_url: string) {
    // no-op
  }
  postMessage(_data: unknown) {
    if (!nextScenario) return;
    const scenario = nextScenario;
    nextScenario = null;
    queueMicrotask(() => {
      if (this.terminated) return;
      scenario((payload) => {
        if (this.terminated) return;
        this.onmessage?.({ data: payload });
      });
    });
  }
  terminate() {
    this.terminated = true;
  }
}

// global Worker 대체.
(globalThis as unknown as { Worker: typeof MockWorker }).Worker = MockWorker;

function setNextScenario(scenario: WorkerScenario) {
  nextScenario = scenario;
}

test("runWithTrace: 성공 케이스 - BATCH_STEPS 누적 후 RESULT/STATUS로 완료", async () => {
  const sampleSteps: SkulptStep[] = [
    {
      line: 1,
      variables: { arr: [3, 7, 2], i: 0 },
      stdout: [],
      events: [],
    },
    {
      line: 2,
      variables: { arr: [3, 7, 2], i: 1 },
      stdout: [],
      events: [{ event_type: "compare", scope: "linear-search" }],
    },
    {
      line: 3,
      variables: { arr: [3, 7, 2], i: 1, found: true },
      stdout: ["found"],
      events: [{ event_type: "found", scope: "linear-search" }],
    },
  ];

  setNextScenario((post) => {
    post({ type: "STATUS", status: "running" });
    post({ type: "RESULT", stdout: "found\n", stepCount: 3, outputBytes: 6 });
    post({ type: "BATCH_STEPS", steps: sampleSteps });
    post({ type: "STATUS", status: "completed" });
  });

  const result = await runWithTrace("arr = [3,7,2]\ni = 0\n", { captureSteps: true });

  assert.equal(result.error, null);
  assert.equal(result.stdout, "found\n");
  assert.equal(result.rawSteps.length, 3);
  assert.equal(result.steps.length, 3);
  assert.equal(result.steps[0].activeLine, 1);
  assert.equal(result.steps[2].description, "Line 3: 매칭 발견");
  // data.pointers.i should be 1 at step index 1
  const step1Data = result.steps[1].data as { pointers: Record<string, number> };
  assert.equal(step1Data.pointers.i, 1);
});

test("runWithTrace: 에러 케이스 - ERROR 메시지 -> result.error 채워짐", async () => {
  setNextScenario((post) => {
    post({ type: "STATUS", status: "running" });
    post({ type: "ERROR", code: "TLE", message: "Execution Time Limit Exceeded" });
  });

  const result = await runWithTrace("while True: pass\n");

  assert.notEqual(result.error, null);
  assert.equal(result.error?.code, "TLE");
  assert.match(result.error?.message ?? "", /Time Limit/);
  assert.equal(result.steps.length, 0);
});

test("runWithTrace: 포인터 추출 - variables.i가 numeric일 때 data.pointers에 포함", async () => {
  const sampleSteps: SkulptStep[] = [
    {
      line: 2,
      variables: { arr: [1, 2, 3], i: 2, total: "not-a-pointer" },
      stdout: [],
      events: [],
    },
  ];

  setNextScenario((post) => {
    post({ type: "BATCH_STEPS", steps: sampleSteps });
    post({ type: "RESULT", stdout: "" });
    post({ type: "STATUS", status: "completed" });
  });

  const result = await runWithTrace("");
  assert.equal(result.error, null);
  const step = result.steps[0];
  const data = step.data as { pointers: Record<string, number>; array: number[] };
  assert.equal(data.pointers.i, 2);
  // total은 string이라 pointers에 들어가지 않아야 함
  assert.equal(data.pointers.total, undefined);
  // array는 정확히 매핑되어야 함
  assert.deepEqual(data.array, [1, 2, 3]);
});

test("extractPointers: numeric 변수만 추출, 알려진 이름만 통과", () => {
  const pointers = __skulptRunnerInternals.extractPointers({
    i: 3,
    L: 0,
    R: 5,
    mid: 2,
    total: 100, // not in KNOWN_POINTERS
    arr: [1, 2, 3], // array, not number
    found: true, // boolean, not number
  });
  assert.equal(pointers.i, 3);
  assert.equal(pointers.L, 0);
  assert.equal(pointers.R, 5);
  assert.equal(pointers.mid, 2);
  assert.equal(pointers.total, undefined);
  assert.equal(pointers.arr, undefined);
  assert.equal(pointers.found, undefined);
});

test("findArrayVariable: arr/array/nums 우선, fallback은 첫 array", () => {
  assert.deepEqual(
    __skulptRunnerInternals.findArrayVariable({ arr: [1, 2], data: [9] }),
    [1, 2],
  );
  assert.deepEqual(
    __skulptRunnerInternals.findArrayVariable({ data: [9, 9] }),
    [9, 9],
  );
  assert.deepEqual(
    __skulptRunnerInternals.findArrayVariable({ random_name: [42] }),
    [42],
  );
  assert.equal(
    __skulptRunnerInternals.findArrayVariable({ i: 1, j: 2 }),
    null,
  );
});
