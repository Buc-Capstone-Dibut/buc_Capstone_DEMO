"use client";

import { useCallback } from "react";
import { CTPModule, VisualItem } from "@/components/features/ctp/common/types";
import { useCTPStore, VisualStep } from "@/components/features/ctp/store/use-ctp-store";
import { ArrayGraphVisualizer } from "@/components/features/ctp/playground/visualizers/array/graph/array-graph-visualizer";

export type TemplateModuleDescriptor = {
  id: string;
  title: string;
  description: string;
  starterCode?: string;
  emptyMessage?: string;
  sampleData?: number[];
};

const DEFAULT_DATA = [8, 3, 12, 5, 1];

const toItems = (values: number[], mode: "base" | "focus" | "done"): VisualItem[] =>
  values.map((value, index) => ({
    id: index,
    value,
    label: `${index}`,
    status:
      mode === "focus" && index === 1
        ? "comparing"
        : mode === "done"
          ? "success"
          : undefined,
  }));

const extractNumbers = (code: string): number[] => {
  const parsed = code
    .match(/-?\d+/g)
    ?.map((chunk) => Number(chunk))
    .filter((n) => Number.isFinite(n));

  if (!parsed || parsed.length < 3) return [];
  return parsed.slice(0, 8);
};

const defaultStarterCode = (title: string, sampleData: number[]) => `# ${title}
# 샘플 데이터를 수정한 뒤 Run 버튼으로 단계별 상태 변화를 확인하세요.

arr = [${sampleData.join(", ")}]
print("input:", arr)
`;

const makeGuide = (title: string) => [
  {
    title: "학습 포인트",
    items: [
      {
        label: "핵심 목표",
        code: title,
        description: "이 챕터에서 요구하는 핵심 흐름을 먼저 요약합니다.",
        tags: ["Focus"],
      },
      {
        label: "Run 시 체크",
        code: "상태 전이(초기 -> 처리 -> 완료)",
        description: "각 단계에서 값/인덱스가 어떻게 바뀌는지 확인합니다.",
        tags: ["Checklist"],
      },
    ],
  },
];

const useTemplateSimulation = (fallbackData: number[]) => {
  const setSteps = useCTPStore((state) => state.setSteps);
  const setPlayState = useCTPStore((state) => state.setPlayState);

  const runSimulation = useCallback(
    (code: string) => {
      const parsed = extractNumbers(code);
      const input = parsed.length > 0 ? parsed : fallbackData;
      const sorted = [...input].sort((a, b) => a - b);

      const steps: VisualStep[] = [
        {
          id: "outline-step-0",
          description: "입력 데이터를 로드했습니다.",
          data: toItems(input, "base"),
          activeLine: 3,
        },
        {
          id: "outline-step-1",
          description: "비교 또는 핵심 처리 포인트를 강조합니다.",
          data: toItems(input, "focus"),
          activeLine: 3,
        },
        {
          id: "outline-step-2",
          description: "처리 완료 상태를 확인합니다.",
          data: toItems(sorted, "done"),
          activeLine: 4,
        },
      ];

      setSteps(steps);
      setPlayState("playing");
    },
    [fallbackData, setPlayState, setSteps]
  );

  return { runSimulation };
};

export function createTemplateModule(item: TemplateModuleDescriptor): CTPModule {
  const sampleData = item.sampleData ?? DEFAULT_DATA;

  return {
    config: {
      title: item.title,
      description: item.description,
      tags: ["New Curriculum", "Template Lesson"],
      features: [
        {
          title: "핵심 개념 시각화",
          description: "실행 단계마다 데이터 상태를 확인할 수 있습니다.",
        },
        {
          title: "코드-상태 연결",
          description: "코드 입력을 바꿔 시뮬레이션 입력 데이터를 직접 조정할 수 있습니다.",
        },
      ],
      guide: makeGuide(item.title),
      complexity: {
        access: "O(1) ~ O(n)",
        search: "O(n)",
        insertion: "O(1) ~ O(n)",
        deletion: "O(1) ~ O(n)",
      },
      initialCode: {
        python: item.starterCode ?? defaultStarterCode(item.title, sampleData),
      },
    },
    useSim: () => useTemplateSimulation(sampleData),
    Visualizer: (props: { data: VisualItem[]; emptyMessage?: string }) => (
      <ArrayGraphVisualizer
        data={props.data}
        emptyMessage={item.emptyMessage ?? props.emptyMessage ?? "Run으로 시뮬레이션을 시작하세요."}
      />
    ),
  };
}

export function createTemplateModules(items: TemplateModuleDescriptor[]): Record<string, CTPModule> {
  return items.reduce<Record<string, CTPModule>>((acc, item) => {
    acc[item.id] = createTemplateModule(item);
    return acc;
  }, {});
}

export function aliasModule(
  base: CTPModule,
  overrides: {
    title: string;
    description?: string;
    tags?: string[];
  }
): CTPModule {
  return {
    ...base,
    config: {
      ...base.config,
      title: overrides.title,
      description: overrides.description ?? base.config.description,
      tags: overrides.tags ?? base.config.tags,
    },
  };
}
