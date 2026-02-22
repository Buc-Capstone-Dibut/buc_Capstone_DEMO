"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { CTPModule } from "@/components/features/ctp/common/types";
import { STACK_MODULES } from "@/components/features/ctp/contents/categories/linear/concepts/stack/stack-registry";
import { QUEUE_MODULES } from "@/components/features/ctp/contents/categories/linear/concepts/queue/queue-registry";
import { DFS_MODULES } from "@/components/features/ctp/contents/categories/algorithms/concepts/dfs/dfs-registry";
import { ChapterOverview } from "../shared/chapter-overview";
import { aliasModule, createTemplateModule, createTemplateModules } from "../shared/module-utils";

const STACK_QUEUE_MODULES: Record<string, CTPModule> = {
  "lifo-basics": aliasModule(STACK_MODULES["lifo-basics"], {
    title: "04-1 스택 개요",
    description: "LIFO 구조의 동작 원리와 대표 사용 사례를 학습합니다.",
  }),
  "queue-overview": createTemplateModule({
    id: "queue-overview",
    title: "04-2 큐 개요",
    description: "FIFO 구조의 핵심 개념과 운영 방식 비교를 다룹니다.",
  }),
  "linear-queue": aliasModule(QUEUE_MODULES["linear-queue"], {
    title: "04-3 배열 기반 큐",
    description: "배열로 큐를 구현하며 Front/Rear 이동 규칙을 익힙니다.",
  }),
  "circular-queue": aliasModule(QUEUE_MODULES["circular-queue"], {
    title: "04-4 링 버퍼 큐",
    description: "원형 인덱싱으로 배열 공간을 재활용하는 큐를 학습합니다.",
  }),
};

const RECURSION_MODULES: Record<string, CTPModule> = {
  "recursion-basics": createTemplateModule({
    id: "recursion-basics",
    title: "05-1 재귀 기본",
    description: "기저 조건과 재귀 호출 구조를 문제 중심으로 정리합니다.",
  }),
  "recursion-analysis": createTemplateModule({
    id: "recursion-analysis",
    title: "05-2 재귀 분석",
    description: "호출 트리와 시간복잡도 관점에서 재귀를 분석합니다.",
  }),
  "tower-of-hanoi": createTemplateModule({
    id: "tower-of-hanoi",
    title: "05-3 하노이의 탑",
    description: "대표 재귀 문제를 통해 분할/정복 사고를 훈련합니다.",
  }),
  "iterative-recursion": createTemplateModule({
    id: "iterative-recursion",
    title: "05-4 비재귀적 표현",
    description: "스택을 이용해 재귀를 반복문으로 변환하는 방법을 학습합니다.",
  }),
  "queen-backtracking": aliasModule(DFS_MODULES["dfs-backtracking"], {
    title: "05-5 백트래킹 (퀸 배치)",
    description: "분기/되돌리기 전략으로 탐색 공간을 줄이는 기법을 실습합니다.",
  }),
};

const STACK_RECURSION_INTEGRATION_MODULES = createTemplateModules([
  {
    id: "stack-recursion-integrated-1",
    title: "통합 문제 1: 스택으로 재귀 대체",
    description: "재귀 로직을 명시적 스택으로 전환하는 문제를 풉니다.",
  },
  {
    id: "stack-recursion-integrated-2",
    title: "통합 문제 2: 큐/스택 선택 문제",
    description: "문제 조건에 맞는 자료구조를 선택하는 의사결정을 훈련합니다.",
  },
  {
    id: "stack-recursion-integrated-3",
    title: "통합 문제 3: 분기 탐색 실전",
    description: "백트래킹 탐색에서 가지치기 전략을 실전에 적용합니다.",
  },
]);

export function StackQueueContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 02. Stack & Recursion"
        modules={STACK_QUEUE_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 02. Stack & Recursion"
            chapterTitle="04 스택과 큐"
            chapterDescription="선형 자료구조 중 push/pop, enqueue/dequeue의 동작 차이를 명확히 익힙니다."
            guideItems={[
              "같은 문제를 스택/큐로 각각 풀어보며 차이를 확인하세요.",
              "배열 기반 큐의 공간 낭비 문제를 직접 관찰하세요.",
              "원형 큐에서 인덱스 wrap-around 규칙을 정리하세요.",
            ]}
            items={[
              { id: "lifo-basics", title: "04-1 스택 개요", description: "LIFO 동작과 핵심 연산을 이해합니다." },
              { id: "queue-overview", title: "04-2 큐 개요", description: "FIFO 처리 흐름과 활용 예시를 파악합니다." },
              { id: "linear-queue", title: "04-3 배열 기반 큐", description: "Front/Rear 포인터 기반 구현을 실습합니다." },
              { id: "circular-queue", title: "04-4 링 버퍼 큐", description: "원형 큐로 공간 재사용 패턴을 익힙니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function RecursionContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 02. Stack & Recursion"
        modules={RECURSION_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 02. Stack & Recursion"
            chapterTitle="05 재귀 알고리즘"
            chapterDescription="재귀 정의, 분석, 변환, 백트래킹까지 하나의 흐름으로 학습합니다."
            guideItems={[
              "기저 조건과 점화식을 먼저 말로 설명하세요.",
              "호출 스택 깊이와 시간복잡도를 함께 기록하세요.",
              "비재귀 전환 시 스택 상태를 표로 정리해보세요.",
            ]}
            items={[
              { id: "recursion-basics", title: "05-1 재귀 기본", description: "재귀 함수의 기본 구조를 학습합니다." },
              { id: "recursion-analysis", title: "05-2 재귀 분석", description: "호출 트리와 점화식을 이용해 복잡도를 분석합니다." },
              { id: "tower-of-hanoi", title: "05-3 하노이의 탑", description: "대표 재귀 문제로 분할 사고를 체득합니다." },
              { id: "iterative-recursion", title: "05-4 비재귀적 표현", description: "재귀 로직을 반복 + 스택으로 변환합니다." },
              { id: "queen-backtracking", title: "05-5 백트래킹 (퀸 배치)", description: "가지치기 기반 탐색을 실전 문제로 훈련합니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function StackRecursionIntegrationContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 02. Stack & Recursion"
        modules={STACK_RECURSION_INTEGRATION_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 02. Stack & Recursion"
            chapterTitle="스택·큐/재귀 알고리즘 개념 심화 및 적용"
            chapterDescription="자료구조 선택과 탐색 전략 결정을 통합 문제로 점검합니다."
            guideItems={[
              "문제별로 스택/큐/재귀 중 선택 이유를 적으세요.",
              "동일 문제를 다른 전략으로 풀어 성능을 비교하세요.",
              "분기 탐색 문제는 pruning 기준을 명시하세요.",
            ]}
            items={[
              { id: "stack-recursion-integrated-1", title: "통합 문제 1: 스택으로 재귀 대체", description: "재귀를 반복문으로 치환하는 역량을 검증합니다." },
              { id: "stack-recursion-integrated-2", title: "통합 문제 2: 큐/스택 선택 문제", description: "문제 조건에 맞는 구조를 선택하는 연습을 합니다." },
              { id: "stack-recursion-integrated-3", title: "통합 문제 3: 분기 탐색 실전", description: "백트래킹 탐색 최적화를 적용합니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}
