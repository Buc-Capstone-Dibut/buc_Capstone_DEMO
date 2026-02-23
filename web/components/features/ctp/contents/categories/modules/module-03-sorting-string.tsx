"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { ChapterOverview } from "./shared/chapter-overview";
import { createCodeTemplateModules, createInteractiveTemplateModules } from "./shared/module-utils";

const SORTING_MODULES_REFACTORED = createInteractiveTemplateModules([
  {
    id: "sorting-overview",
    title: "06-1 정렬 알고리즘 개요",
    description: "정렬 알고리즘의 안정성/복잡도/메모리 사용 기준을 비교합니다.",
    sampleData: [9, 4, 1, 7, 3],
  },
  { id: "bubble-sort", title: "06-2 버블 정렬", description: "인접 교환 기반 정렬을 시각화로 학습합니다.", sampleData: [6, 2, 8, 1, 5] },
  { id: "selection-sort", title: "06-3 선택 정렬", description: "최솟값 선택 반복 패턴을 실습합니다.", sampleData: [7, 3, 9, 2, 4] },
  { id: "insertion-sort", title: "06-4 삽입 정렬", description: "정렬된 구간 삽입 패턴을 이해합니다.", sampleData: [5, 1, 4, 2, 8] },
  { id: "shell-sort", title: "06-5 셸 정렬", description: "gap 축소 기반 고속화 전략을 학습합니다.", sampleData: [10, 3, 7, 1, 9] },
  { id: "quick-sort", title: "06-6 퀵 정렬", description: "분할 정복 정렬의 핵심 패턴을 익힙니다.", sampleData: [8, 4, 6, 2, 9] },
  { id: "merge-sort", title: "06-7 병합 정렬", description: "병합 단계 중심의 안정 정렬을 실습합니다.", sampleData: [11, 5, 2, 8, 3] },
  { id: "heap-sort", title: "06-8 힙 정렬", description: "우선순위 큐 기반 정렬을 학습합니다.", sampleData: [12, 6, 4, 10, 2] },
  { id: "counting-sort", title: "06-9 도수 정렬", description: "빈도 배열 기반 선형 정렬을 다룹니다.", sampleData: [3, 1, 4, 1, 5, 9] },
]);

const STRING_SEARCH_MODULES = createInteractiveTemplateModules([
  {
    id: "brute-force-search",
    title: "07-1 브루트 포스",
    description: "모든 시작 위치를 검사하는 기본 문자열 탐색을 실습합니다.",
    sampleData: [2, 5, 2, 5, 2],
  },
  {
    id: "kmp-search",
    title: "07-2 KMP",
    description: "LPS 테이블을 활용한 선형 시간 패턴 매칭을 학습합니다.",
    sampleData: [1, 2, 1, 2, 1, 2],
  },
  {
    id: "boyer-moore-search",
    title: "07-3 보이어-무어",
    description: "bad character / good suffix 규칙으로 점프 탐색을 수행합니다.",
    sampleData: [9, 7, 5, 7, 9],
  },
]);

const SORTING_STRING_INTEGRATION_MODULES = createCodeTemplateModules([
  {
    id: "sorting-string-integrated-1",
    title: "통합 문제 1: 정렬 후 문자열 처리",
    description: "전처리 정렬 + 매칭 조합 문제를 풉니다.",
    sampleData: [8, 2, 6, 3, 9],
  },
  {
    id: "sorting-string-integrated-2",
    title: "통합 문제 2: 패턴 매칭 성능 비교",
    description: "문자열 검색 알고리즘 성능을 데이터별로 비교합니다.",
    sampleData: [4, 4, 1, 7, 1],
  },
  {
    id: "sorting-string-integrated-3",
    title: "통합 문제 3: 비재귀 퀵정렬 응용",
    description: "반복 기반 분할 정복 응용 문제를 풉니다.",
    sampleData: [13, 5, 11, 2, 7],
  },
]);

export function SortingContentRefactored() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 03. Sorting & String"
        modules={SORTING_MODULES_REFACTORED}
        overview={
          <ChapterOverview
            moduleLabel="Module 03. Sorting & String"
            chapterTitle="06 정렬 알고리즘"
            chapterDescription="정렬 챕터 전 레슨을 참여형 인터랙티브로 구성했습니다."
            guideItems={[
              "버튼 조작으로 정렬 전/후 상태를 관찰하세요.",
              "입력 데이터가 달라질 때 결과 패턴을 비교하세요.",
              "로그를 통해 어떤 연산이 핵심인지 정리하세요.",
            ]}
            items={[
              { id: "sorting-overview", title: "06-1 정렬 알고리즘 개요", description: "정렬 알고리즘 분류와 선택 기준을 정리합니다." },
              { id: "bubble-sort", title: "06-2 버블 정렬", description: "인접 교환 기반 정렬을 시각화로 학습합니다." },
              { id: "selection-sort", title: "06-3 선택 정렬", description: "최솟값 선택 반복 패턴을 실습합니다." },
              { id: "insertion-sort", title: "06-4 삽입 정렬", description: "정렬된 구간 삽입 패턴을 이해합니다." },
              { id: "shell-sort", title: "06-5 셸 정렬", description: "gap 축소 기반 고속화 전략을 학습합니다." },
              { id: "quick-sort", title: "06-6 퀵 정렬", description: "분할 정복 정렬의 핵심 패턴을 익힙니다." },
              { id: "merge-sort", title: "06-7 병합 정렬", description: "병합 단계 중심의 안정 정렬을 실습합니다." },
              { id: "heap-sort", title: "06-8 힙 정렬", description: "우선순위 큐 기반 정렬을 학습합니다." },
              { id: "counting-sort", title: "06-9 도수 정렬", description: "빈도 배열 기반 선형 정렬을 다룹니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function StringSearchContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 03. Sorting & String"
        modules={STRING_SEARCH_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 03. Sorting & String"
            chapterTitle="07 문자열 검색"
            chapterDescription="문자열 검색 챕터도 참여형 인터랙티브로 전환했습니다."
            guideItems={[
              "동작 버튼으로 탐색 흐름을 반복 체험하세요.",
              "동일 입력에서 전략별 반응을 비교하세요.",
              "각 단계 로그를 근거로 알고리즘 차이를 정리하세요.",
            ]}
            items={[
              { id: "brute-force-search", title: "07-1 브루트 포스", description: "기본 문자열 패턴 매칭을 학습합니다." },
              { id: "kmp-search", title: "07-2 KMP", description: "실패함수 기반 선형 탐색을 익힙니다." },
              { id: "boyer-moore-search", title: "07-3 보이어-무어", description: "점프 전략 기반 고속 탐색을 다룹니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function SortingStringIntegrationContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 03. Sorting & String"
        modules={SORTING_STRING_INTEGRATION_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 03. Sorting & String"
            chapterTitle="정렬/문자열 검색 알고리즘 개념 심화 및 적용"
            chapterDescription="이 챕터는 코드 시뮬레이터 전용으로 구성되며, 통합 문제를 코드로 검증합니다."
            guideItems={[
              "Run 버튼으로 단계별 실행 결과를 확인하세요.",
              "입력 데이터를 바꾸며 정렬/검색 조합 결과를 비교하세요.",
              "수행 단계 로그를 근거로 풀이 전략을 개선하세요.",
            ]}
            items={[
              { id: "sorting-string-integrated-1", title: "통합 문제 1: 정렬 후 문자열 처리", description: "전처리 정렬 + 매칭 조합 문제를 풉니다." },
              { id: "sorting-string-integrated-2", title: "통합 문제 2: 패턴 매칭 성능 비교", description: "문자열 검색 알고리즘 성능을 데이터별로 비교합니다." },
              { id: "sorting-string-integrated-3", title: "통합 문제 3: 비재귀 퀵정렬 응용", description: "반복 기반 분할 정복 응용 문제를 풉니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}
