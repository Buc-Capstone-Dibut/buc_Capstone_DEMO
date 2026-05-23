"use client";

import { useCallback, useMemo, useState } from "react";
import { CTPModule, GuideSection, VisualItem, FeatureItem } from "@/components/features/ctp/common/types";
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

export function createInteractiveTemplateModule(item: TemplateModuleDescriptor): CTPModule {
  const sampleData = item.sampleData ?? DEFAULT_DATA;
  const ItemVisualizer = item.Visualizer;

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
    Visualizer: ItemVisualizer ? ((props: { data: any; emptyMessage?: string }) => {
      return <SVGFlowWrapper Visualizer={ItemVisualizer} data={props.data} />;
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
