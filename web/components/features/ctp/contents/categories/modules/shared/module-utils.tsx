"use client";

import { useCallback, useMemo, useState } from "react";
import { CTPModule, GuideSection, VisualItem, FeatureItem } from "@/components/features/ctp/common/types";
import { useCTPStore, VisualStep } from "@/components/features/ctp/store/use-ctp-store";
import { ArrayGraphVisualizer } from "@/components/features/ctp/playground/visualizers/array/graph/array-graph-visualizer";
import { SVGFlowWrapper } from "@/components/features/ctp/playground/visualizers/svg-animations/shared/svg-flow-wrapper";

export type TemplateModuleDescriptor = {
  id: string;
  title: string;
  description: string;
  starterCode?: string;
  emptyMessage?: string;
  sampleData?: number[];
  Visualizer?: React.ComponentType<any>;
  useSim?: (...args: any[]) => any;
  features?: FeatureItem[];
  story?: {
    problem: string;
    definition: string;
    analogy: string;
    playgroundLimit?: string;
  };
};

const DEFAULT_DATA = [8, 3, 12, 5, 1];
const DEFAULT_MAX_SIZE = 12;

const randomValue = () => Math.floor(Math.random() * 90) + 10;

const toVisualItems = (
  values: number[],
  options?: {
    activeIndex?: number | null;
    success?: boolean;
  }
): VisualItem[] =>
  values.map((value, index) => ({
    id: index,
    value,
    label: `${index}`,
    status:
      options?.success === true
        ? "success"
        : options?.activeIndex === index
          ? "active"
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

const makeInteractiveGuide = (title: string): GuideSection[] => [
  {
    title: "참여형 학습 가이드",
    items: [
      {
        label: "핵심 목표",
        code: title,
        description: "버튼 조작으로 상태 변화를 관찰하고 개념을 체화합니다.",
        tags: ["Interactive"],
      },
      {
        label: "권장 순서",
        code: "Peek -> Push -> Pop -> Reset",
        description: "같은 데이터를 여러 번 조작하면서 규칙을 확인하세요.",
        tags: ["Flow"],
      },
    ],
  },
];

const makeCodeGuide = (title: string): GuideSection[] => [
  {
    title: "코드 시뮬레이션 가이드",
    items: [
      {
        label: "핵심 목표",
        code: title,
        description: "코드를 수정하고 Run을 눌러 단계별 변화를 추적합니다.",
        tags: ["Code"],
      },
      {
        label: "체크 포인트",
        code: "입력 -> 처리 -> 결과",
        description: "각 단계에서 값과 인덱스가 어떻게 이동하는지 확인하세요.",
        tags: ["Checklist"],
      },
    ],
  },
];

const makeCodeStarter = (title: string, sampleData: number[]) => `# ${title}
# 샘플 데이터를 수정한 뒤 Run 버튼으로 단계별 상태 변화를 확인하세요.

arr = [${sampleData.join(", ")}]
print("input:", arr)
`;

const useCodeTemplateSimulation = (fallbackData: number[]) => {
  const setSteps = useCTPStore((state) => state.setSteps);
  const setPlayState = useCTPStore((state) => state.setPlayState);

  const runSimulation = useCallback(
    (code: string) => {
      const parsed = extractNumbers(code);
      const input = parsed.length > 0 ? parsed : fallbackData;
      const sorted = [...input].sort((a, b) => a - b);

      const steps: VisualStep[] = [
        {
          id: "code-step-0",
          description: "입력 데이터를 로드했습니다.",
          data: toVisualItems(input),
          activeLine: 3,
        },
        {
          id: "code-step-1",
          description: "핵심 처리 포인트를 강조합니다.",
          data: toVisualItems(input, { activeIndex: Math.max(0, Math.floor(input.length / 2) - 1) }),
          activeLine: 3,
        },
        {
          id: "code-step-2",
          description: "처리 완료 상태를 확인합니다.",
          data: toVisualItems(sorted, { success: true }),
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

const useInteractiveTemplateSimulation = (seedData: number[], title: string, maxSize: number) => {
  const [items, setItems] = useState<number[]>(seedData);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>(["> 참여형 모드를 시작하세요."]);

  const appendLog = useCallback((message: string) => {
    setLogs((prev) => [`> ${message}`, ...prev]);
  }, []);

  const reset = useCallback(() => {
    setItems(seedData);
    setHighlightIndex(null);
    setLogs([`> ${title} 모듈을 초기화했습니다.`]);
  }, [seedData, title]);

  const push = useCallback(() => {
    setItems((prev) => {
      if (prev.length >= maxSize) {
        appendLog(`공간이 가득 찼습니다. (max=${maxSize})`);
        return prev;
      }
      const next = [...prev, randomValue()];
      setHighlightIndex(next.length - 1);
      appendLog(`push: 새 값을 추가했습니다. size=${next.length}`);
      return next;
    });
  }, [appendLog, maxSize]);

  const pop = useCallback(() => {
    setItems((prev) => {
      if (prev.length === 0) {
        appendLog("pop: 제거할 데이터가 없습니다.");
        return prev;
      }
      const next = prev.slice(0, -1);
      setHighlightIndex(next.length - 1);
      appendLog(`pop: 마지막 값을 제거했습니다. size=${next.length}`);
      return next;
    });
  }, [appendLog]);

  const peek = useCallback(() => {
    setItems((prev) => {
      if (prev.length === 0) {
        setHighlightIndex(null);
        appendLog("peek: 현재 데이터가 비어 있습니다.");
        return prev;
      }
      const targetIndex = prev.length - 1;
      setHighlightIndex(targetIndex);
      appendLog(`peek: 현재 포커스 인덱스=${targetIndex}, 값=${prev[targetIndex]}`);
      return prev;
    });
  }, [appendLog]);

  const visualData = useMemo(
    () => toVisualItems(items, { activeIndex: highlightIndex }),
    [highlightIndex, items]
  );

  const runSimulation = useCallback((_code: string) => {
    // Interactive mode: code execution disabled intentionally.
  }, []);

  return {
    runSimulation,
    interactive: {
      visualData,
      logs,
      handlers: {
        push,
        pop,
        peek,
        reset,
        clear: reset,
      },
    },
  };
};

export function createCodeTemplateModule(item: TemplateModuleDescriptor): CTPModule {
  const sampleData = item.sampleData ?? DEFAULT_DATA;

  return {
    config: {
      id: item.id,
      title: item.title,
      description: item.description,
      story: item.story,
      tags: ["Code Simulator", "Applied"],
      guide: makeCodeGuide(item.title),
      features: item.features ?? [
        {
          title: "단계별 실행",
          description: "코드 실행 결과를 단계별 시각화로 확인합니다.",
          SupplementaryVisualizer: item.Visualizer, // In default cases, we might reuse it as supplementary if nothing else is provided. But typically we will explicitly pass SupplementaryVisualizer in item.features.
        },
      ],
      complexity: {
        access: "O(1) ~ O(n)",
        search: "O(n)",
        insertion: "O(1) ~ O(n)",
        deletion: "O(1) ~ O(n)",
      },
      initialCode: {
        python: item.starterCode ?? makeCodeStarter(item.title, sampleData),
      },
    },
    useSim: item.useSim ?? (() => useCodeTemplateSimulation(sampleData)),
    Visualizer: item.Visualizer ? ((props: { data: any; emptyMessage?: string }) => {
      // @ts-ignore - Visualizer is guaranteed to exist here
      return <SVGFlowWrapper Visualizer={item.Visualizer} data={props.data} />;
    }) : ((props: { data: VisualItem[]; emptyMessage?: string }) => (
      <ArrayGraphVisualizer
        data={props.data}
        emptyMessage={item.emptyMessage ?? props.emptyMessage ?? "Run으로 시뮬레이션을 시작하세요."}
      />
    )),
  };
}

export function createCodeTemplateModules(items: TemplateModuleDescriptor[]): Record<string, CTPModule> {
  return items.reduce<Record<string, CTPModule>>((acc, item) => {
    acc[item.id] = createCodeTemplateModule(item);
    return acc;
  }, {});
}

export function createInteractiveTemplateModule(item: TemplateModuleDescriptor): CTPModule {
  const sampleData = item.sampleData ?? DEFAULT_DATA;

  return {
    config: {
      id: item.id,
      title: item.title,
      description: item.description,
      story: item.story,
      mode: "interactive",
      interactive: {
        components: ["peek", "push", "pop", "reset"],
        maxSize: DEFAULT_MAX_SIZE,
      },
      tags: ["Interactive", "User Participation"],
      guide: makeInteractiveGuide(item.title),
      features: item.features ?? [
        {
          title: "버튼 기반 조작",
          description: "직접 조작하며 자료 상태 변화를 확인할 수 있습니다.",
          SupplementaryVisualizer: item.Visualizer,
        },
      ],
      complexity: {
        access: "O(1) ~ O(n)",
        search: "O(n)",
        insertion: "O(1)",
        deletion: "O(1)",
      },
    },
    useSim: item.useSim ?? (() => useInteractiveTemplateSimulation(sampleData, item.title, DEFAULT_MAX_SIZE)),
    Visualizer: item.Visualizer ? ((props: { data: any; emptyMessage?: string }) => {
      // @ts-ignore - Visualizer is guaranteed to exist here
      return <SVGFlowWrapper Visualizer={item.Visualizer} data={props.data} />;
    }) : ((props: { data: VisualItem[]; emptyMessage?: string }) => (
      <ArrayGraphVisualizer
        data={props.data}
        emptyMessage={item.emptyMessage ?? props.emptyMessage ?? "버튼을 눌러 참여형 실습을 시작하세요."}
      />
    )),
  };
}

export function createInteractiveTemplateModules(items: TemplateModuleDescriptor[]): Record<string, CTPModule> {
  return items.reduce<Record<string, CTPModule>>((acc, item) => {
    acc[item.id] = createInteractiveTemplateModule(item);
    return acc;
  }, {});
}
