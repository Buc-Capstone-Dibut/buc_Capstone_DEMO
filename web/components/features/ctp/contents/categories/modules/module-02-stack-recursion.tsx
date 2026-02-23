"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { ProblemBankController } from "@/components/features/ctp/problem-bank";
import { module02Problems } from "@/data/ctp/problems";
import { ChapterOverview } from "./shared/chapter-overview";
import {
  createCodeTemplateModules,
  createInteractiveTemplateModules,
} from "./shared/module-utils";

const STACK_QUEUE_MODULES = createInteractiveTemplateModules([
  {
    id: "lifo-basics",
    title: "04-1 스택 개요",
    description: "LIFO 구조의 동작 원리와 대표 사용 사례를 학습합니다.",
    sampleData: [3, 6, 9, 12],
  },
  {
    id: "queue-overview",
    title: "04-2 큐 개요",
    description: "FIFO 구조의 핵심 개념과 운영 방식 비교를 다룹니다.",
    sampleData: [4, 8, 2, 10],
  },
  {
    id: "linear-queue",
    title: "04-3 배열 기반 큐",
    description: "배열로 큐를 구현하며 Front/Rear 이동 규칙을 익힙니다.",
    sampleData: [1, 5, 7, 11],
  },
  {
    id: "circular-queue",
    title: "04-4 링 버퍼 큐",
    description: "원형 인덱싱으로 배열 공간을 재활용하는 큐를 학습합니다.",
    sampleData: [2, 4, 6, 8],
  },
]);

const RECURSION_MODULES = createInteractiveTemplateModules([
  {
    id: "recursion-basics",
    title: "05-1 재귀 기본",
    description: "기저 조건과 재귀 호출 구조를 문제 중심으로 정리합니다.",
    sampleData: [5, 1, 4, 2],
  },
  {
    id: "recursion-analysis",
    title: "05-2 재귀 분석",
    description: "호출 트리와 시간복잡도 관점에서 재귀를 분석합니다.",
    sampleData: [7, 3, 9, 1],
  },
  {
    id: "tower-of-hanoi",
    title: "05-3 하노이의 탑",
    description: "대표 재귀 문제를 통해 분할/정복 사고를 훈련합니다.",
    sampleData: [3, 2, 1],
  },
  {
    id: "iterative-recursion",
    title: "05-4 비재귀적 표현",
    description: "스택을 이용해 재귀를 반복문으로 변환하는 방법을 학습합니다.",
    sampleData: [6, 2, 5, 1],
  },
  {
    id: "queen-backtracking",
    title: "05-5 백트래킹 (퀸 배치)",
    description: "분기/되돌리기 전략으로 탐색 공간을 줄이는 기법을 실습합니다.",
    sampleData: [1, 3, 5, 7],
  },
]);

// Requirement: keep this chapter as code simulator
const STACK_RECURSION_INTEGRATION_MODULES = createCodeTemplateModules([
  {
    id: "stack-recursion-integrated-1",
    title: "통합 문제 1: 스택으로 재귀 대체",
    description: "재귀 로직을 명시적 스택으로 전환하는 문제를 풉니다.",
    sampleData: [10, 6, 2, 9, 1],
  },
  {
    id: "stack-recursion-integrated-2",
    title: "통합 문제 2: 큐/스택 선택 문제",
    description: "문제 조건에 맞는 자료구조를 선택하는 의사결정을 훈련합니다.",
    sampleData: [4, 12, 8, 3, 7],
  },
  {
    id: "stack-recursion-integrated-3",
    title: "통합 문제 3: 분기 탐색 실전",
    description: "백트래킹 탐색에서 가지치기 전략을 실전에 적용합니다.",
    sampleData: [5, 9, 1, 6, 2],
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
            chapterDescription="선형 자료구조 연산을 직접 조작하며 LIFO/FIFO 차이를 체득합니다."
            guideItems={[
              "모든 레슨은 참여형 인터랙티브입니다.",
              "버튼 조작으로 상태 변화를 관찰하고 로그를 읽어보세요.",
              "같은 데이터에서 스택/큐 동작 차이를 비교하세요.",
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
            chapterDescription="재귀 사고를 참여형 실습으로 익히고, 상태 변화를 단계적으로 확인합니다."
            guideItems={[
              "Peek/Push/Pop으로 호출 스택 개념을 대응해 보세요.",
              "연산 순서를 바꿔 재귀 흐름 차이를 관찰하세요.",
              "로그를 기반으로 기저 조건의 중요성을 정리하세요.",
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
      <ProblemBankController
        moduleLabel="Module 02. Stack & Recursion"
        chapterTitle="스택·큐/재귀 알고리즘 개념 심화 및 적용"
        chapterDescription="Problem Bank에서 Stack/Recursion 통합 문제를 풀이하고 자동 채점을 확인하세요."
        problems={module02Problems}
      />
    </Suspense>
  );
}
