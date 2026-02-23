"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { ChapterOverview } from "./shared/chapter-overview";
import {
  createCodeTemplateModules,
  createInteractiveTemplateModules,
} from "./shared/module-utils";

const FOUNDATION_ALGO_BASICS_MODULES = createInteractiveTemplateModules([
  {
    id: "algo-overview",
    title: "01-1 알고리즘 개요",
    description: "알고리즘의 정의, 입력/출력 모델, 시간복잡도의 의미를 학습합니다.",
    sampleData: [1, 4, 2, 8, 5],
  },
  {
    id: "condition-loop",
    title: "01-2 조건문과 반복문",
    description: "분기와 반복을 조합해 절차를 구성하는 기본 패턴을 익힙니다.",
    sampleData: [3, 9, 2, 6, 1],
  },
  {
    id: "flow-tracing",
    title: "01-3 순서도와 흐름 추적",
    description: "순서도 기반으로 상태 변화를 추적하고 디버깅 사고를 훈련합니다.",
    sampleData: [7, 2, 11, 4, 5],
  },
]);

const FOUNDATION_BASIC_DS_ARRAY_MODULES = createInteractiveTemplateModules([
  {
    id: "ds-compare",
    title: "02-1 자료구조 비교 (배열/리스트/튜플)",
    description: "자료구조별 접근/수정/확장 비용과 사용 맥락을 비교합니다.",
    sampleData: [10, 4, 6, 3, 8],
  },
  {
    id: "1d-array",
    title: "02-2 배열 인덱스와 슬라이싱",
    description: "인덱스 접근, 부분 구간 선택, 경계 처리 규칙을 실습합니다.",
    sampleData: [5, 2, 9, 1, 7],
  },
  {
    id: "2d-array",
    title: "02-3 배열 기본 문제 (최댓값/역순 정렬)",
    description: "반복문 기반 배열 순회와 기초 문제 해결 흐름을 학습합니다.",
    sampleData: [12, 3, 6, 9, 2],
  },
  {
    id: "array-number-prime",
    title: "02-4 배열 응용 (n진수/소수)",
    description: "배열을 이용한 진법 변환과 소수 판정/생성 패턴을 다룹니다.",
    sampleData: [2, 3, 5, 7, 11],
  },
]);

const FOUNDATION_SEARCH_ALGORITHMS_MODULES = createInteractiveTemplateModules([
  {
    id: "search-problem-key",
    title: "03-1 검색 문제와 키",
    description: "검색 대상/키 정의와 비교 기준을 문제 유형별로 정리합니다.",
    sampleData: [14, 2, 19, 7, 10],
  },
  {
    id: "linear-search",
    title: "03-2 선형 검색",
    description: "정렬되지 않은 데이터에서의 선형 탐색 패턴을 실습합니다.",
    sampleData: [6, 13, 4, 17, 8],
  },
  {
    id: "basic-binary-search",
    title: "03-3 이진 검색",
    description: "경계 이동 규칙과 불변식을 유지하는 이진 탐색을 학습합니다.",
    sampleData: [1, 3, 5, 7, 9],
  },
  {
    id: "hash-collision",
    title: "03-4 해시법과 충돌 해결",
    description: "해시 충돌 유형과 체이닝/개방주소법의 차이를 비교합니다.",
    sampleData: [10, 20, 30, 40, 50],
  },
]);

// Requirement: keep this chapter as code simulator
const FOUNDATION_INTEGRATION_MODULES = createCodeTemplateModules([
  {
    id: "foundation-integrated-1",
    title: "통합 문제 1: 배열+검색",
    description: "배열 전처리 후 검색 전략을 선택하는 통합 문제를 풉니다.",
    sampleData: [9, 1, 6, 3, 7, 2],
  },
  {
    id: "foundation-integrated-2",
    title: "통합 문제 2: 정렬된 배열 삽입/탐색",
    description: "정렬 상태를 유지하면서 삽입/탐색 비용을 최적화합니다.",
    sampleData: [1, 2, 4, 5, 8, 11],
  },
  {
    id: "foundation-integrated-3",
    title: "통합 문제 3: 해시 충돌 시나리오",
    description: "충돌 상황에서 자료구조 선택과 리해시 전략을 설계합니다.",
    sampleData: [21, 31, 41, 22, 32, 42],
  },
]);

export function FoundationAlgorithmBasicsContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 01. Foundation"
        modules={FOUNDATION_ALGO_BASICS_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 01. Foundation"
            chapterTitle="01 알고리즘 기초"
            chapterDescription="알고리즘 학습의 시작점인 절차적 사고와 흐름 추적 능력을 다집니다."
            guideItems={[
              "모든 레슨은 참여형 인터랙티브로 구성됩니다.",
              "Peek/Push/Pop/Reset 순서로 상태 변화를 관찰하세요.",
              "각 동작 이후 로그를 읽고 규칙을 정리하세요.",
            ]}
            items={[
              { id: "algo-overview", title: "01-1 알고리즘 개요", description: "알고리즘의 역할과 분석 관점을 정리합니다." },
              { id: "condition-loop", title: "01-2 조건문과 반복문", description: "분기/반복 조합으로 문제 해결 절차를 구성합니다." },
              { id: "flow-tracing", title: "01-3 순서도와 흐름 추적", description: "실행 경로를 추적하고 오류를 찾는 방법을 훈련합니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function FoundationBasicDsArrayContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 01. Foundation"
        modules={FOUNDATION_BASIC_DS_ARRAY_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 01. Foundation"
            chapterTitle="02 기본 자료구조와 배열"
            chapterDescription="배열 중심 문제 해결력과 자료구조 선택 기준을 동시에 익힙니다."
            guideItems={[
              "각 자료구조 상황을 인터랙티브 조작으로 체험하세요.",
              "같은 데이터에서 연산 순서를 바꿔 결과 차이를 확인하세요.",
              "요약 로그를 바탕으로 구조 선택 기준을 정리하세요.",
            ]}
            items={[
              { id: "ds-compare", title: "02-1 자료구조 비교 (배열/리스트/튜플)", description: "구조별 장단점과 사용 맥락을 비교합니다." },
              { id: "1d-array", title: "02-2 배열 인덱스와 슬라이싱", description: "배열 접근과 부분 구간 처리 규칙을 실습합니다." },
              { id: "2d-array", title: "02-3 배열 기본 문제 (최댓값/역순 정렬)", description: "기초 배열 문제를 통해 반복/조건 패턴을 익힙니다." },
              { id: "array-number-prime", title: "02-4 배열 응용 (n진수/소수)", description: "배열을 활용한 진법/소수 문제로 확장합니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function FoundationSearchAlgorithmsContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 01. Foundation"
        modules={FOUNDATION_SEARCH_ALGORITHMS_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 01. Foundation"
            chapterTitle="03 검색 알고리즘"
            chapterDescription="선형 탐색에서 이진 탐색, 해시 충돌 해결까지 검색 전략을 체계화합니다."
            guideItems={[
              "이 챕터는 사용자 참여형(인터랙티브)으로 구성됩니다.",
              "연산 버튼을 누르며 검색 전략의 흐름을 비교하세요.",
              "각 동작 로그를 읽고 어떤 전략이 유리한지 판단하세요.",
            ]}
            items={[
              { id: "search-problem-key", title: "03-1 검색 문제와 키", description: "검색 대상과 키 설계 기준을 정의합니다." },
              { id: "linear-search", title: "03-2 선형 검색", description: "단순 탐색의 구현과 최적화 포인트를 익힙니다." },
              { id: "basic-binary-search", title: "03-3 이진 검색", description: "경계 이동 기반의 로그 탐색을 실습합니다." },
              { id: "hash-collision", title: "03-4 해시법과 충돌 해결", description: "충돌 대응 전략과 트레이드오프를 학습합니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function FoundationIntegrationContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 01. Foundation"
        modules={FOUNDATION_INTEGRATION_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 01. Foundation"
            chapterTitle="알고리즘 기초/자료구조·검색 개념 심화 및 적용"
            chapterDescription="이 챕터는 코드 시뮬레이터 전용으로 구성되며, 통합 문제를 코드로 검증합니다."
            guideItems={[
              "Run 버튼으로 단계별 실행 결과를 확인하세요.",
              "입력 데이터를 바꿔 동일 로직의 결과 차이를 비교하세요.",
              "복잡도와 자료구조 선택 근거를 코드 옆에 기록하세요.",
            ]}
            items={[
              { id: "foundation-integrated-1", title: "통합 문제 1: 배열+검색", description: "배열 처리와 탐색을 결합한 문제를 풉니다." },
              { id: "foundation-integrated-2", title: "통합 문제 2: 정렬된 배열 삽입/탐색", description: "정렬 조건을 유지하는 삽입/탐색 전략을 다룹니다." },
              { id: "foundation-integrated-3", title: "통합 문제 3: 해시 충돌 시나리오", description: "충돌 상황에서의 자료구조 의사결정을 훈련합니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}
