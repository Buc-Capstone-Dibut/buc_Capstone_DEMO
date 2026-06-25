"use client";

// Phase 4 PoC — Skulpt trace 모드 시각화.
// 기존 linear-search.tsx는 Step 시나리오 유지.
// linear-search-trace는 사용자 Python 코드를 Skulpt Worker에서 실제 실행하고
// 매 라인 변수 snapshot을 GenericArrayVisualizer에 흘려넣는다.

import { useCallback } from "react";
import { runWithTrace } from "@/lib/ctp/skulpt-runner";
import { useCTPStore } from "@/components/features/ctp/store/use-ctp-store";
import { GenericArrayVisualizer } from "@/components/features/ctp/playground/visualizers/shared/GenericArrayVisualizer";

export const LINEAR_SEARCH_TRACE_STARTER_CODE = `# 선형 검색 — Skulpt 인터프리터에서 직접 실행됩니다.
# 매 라인마다 변수 snapshot이 캡처되어 자동 시각화됩니다.
arr = [6, 13, 4, 17, 8]
target = 17

result = -1
for i in range(len(arr)):
    current = arr[i]
    if current == target:
        result = i
        break

print(result)
`;

export function useLinearSearchTraceSim() {
  const setSteps = useCTPStore((s) => s.setSteps);
  const setPlayState = useCTPStore((s) => s.setPlayState);

  const runSimulation = useCallback(
    async (code: string) => {
      setPlayState("playing");
      const result = await runWithTrace(code, { captureSteps: true });
      if (result.error) {
        // 에러 시 빈 step + 에러 메시지를 단일 step으로 표시.
        setSteps([
          {
            id: "trace-error",
            description: `[${result.error.code}] ${result.error.message}`,
            data: { array: [], pointers: {} },
            activeLine: 0,
            stdout: [result.error.message],
            events: [],
            variables: {},
          },
        ]);
        setPlayState("completed");
        return;
      }
      setSteps(result.steps);
      setPlayState("completed");
    },
    [setSteps, setPlayState],
  );

  return {
    runSimulation,
  };
}

export function LinearSearchTraceVisualizer({
  data,
  emptyMessage,
}: {
  data: unknown;
  emptyMessage?: string;
}) {
  // data는 useCTPStore의 currentStep.data — skulpt-runner의 mapToVisualData 산출물.
  // {} (빈 객체) 또는 정상 trace 형태 모두 처리.
  const traceData =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Parameters<typeof GenericArrayVisualizer>[0]["data"])
      : null;

  return (
    <GenericArrayVisualizer
      data={traceData}
      emptyMessage={
        emptyMessage ??
        "▶ 코드를 실행하면 i 포인터가 배열을 왼쪽부터 훑으며 target 과 비교하는 과정이 자동으로 그려집니다."
      }
    />
  );
}
