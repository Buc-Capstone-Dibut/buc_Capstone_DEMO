"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { CTPModule } from "@/components/features/ctp/common/types";
import { SORTING_MODULES } from "@/components/features/ctp/contents/categories/algorithms/concepts/sorting/sorting-registry";
import { ChapterOverview } from "../shared/chapter-overview";
import { aliasModule, createTemplateModule, createTemplateModules } from "../shared/module-utils";

const SORTING_MODULES_REFACTORED: Record<string, CTPModule> = {
  "sorting-overview": createTemplateModule({
    id: "sorting-overview",
    title: "06-1 정렬 알고리즘 개요",
    description: "정렬 알고리즘의 안정성/복잡도/메모리 사용 기준을 비교합니다.",
  }),
  "bubble-sort": aliasModule(SORTING_MODULES["bubble-sort"], {
    title: "06-2 버블 정렬",
  }),
  "selection-sort": aliasModule(SORTING_MODULES["selection-sort"], {
    title: "06-3 선택 정렬",
  }),
  "insertion-sort": aliasModule(SORTING_MODULES["insertion-sort"], {
    title: "06-4 삽입 정렬",
  }),
  "shell-sort": createTemplateModule({
    id: "shell-sort",
    title: "06-5 셸 정렬",
    description: "gap 기반 부분 정렬로 삽입 정렬을 가속하는 방식을 학습합니다.",
  }),
  "quick-sort": aliasModule(SORTING_MODULES["quick-sort"], {
    title: "06-6 퀵 정렬",
  }),
  "merge-sort": aliasModule(SORTING_MODULES["merge-sort"], {
    title: "06-7 병합 정렬",
  }),
  "heap-sort": aliasModule(SORTING_MODULES["heap-sort"], {
    title: "06-8 힙 정렬",
  }),
  "counting-sort": createTemplateModule({
    id: "counting-sort",
    title: "06-9 도수 정렬",
    description: "값의 범위를 활용한 선형 시간 정렬 아이디어를 다룹니다.",
  }),
};

const STRING_SEARCH_MODULES = createTemplateModules([
  {
    id: "brute-force-search",
    title: "07-1 브루트 포스",
    description: "모든 시작 위치를 검사하는 기본 문자열 탐색을 실습합니다.",
  },
  {
    id: "kmp-search",
    title: "07-2 KMP",
    description: "LPS 테이블을 활용한 선형 시간 패턴 매칭을 학습합니다.",
  },
  {
    id: "boyer-moore-search",
    title: "07-3 보이어-무어",
    description: "bad character / good suffix 규칙으로 점프 탐색을 수행합니다.",
  },
]);

const SORTING_STRING_INTEGRATION_MODULES = createTemplateModules([
  {
    id: "sorting-string-integrated-1",
    title: "통합 문제 1: 정렬 후 문자열 처리",
    description: "정렬 결과를 문자열 처리 파이프라인과 결합하는 문제를 풉니다.",
  },
  {
    id: "sorting-string-integrated-2",
    title: "통합 문제 2: 패턴 매칭 성능 비교",
    description: "입력 조건별로 브루트포스/KMP/BM을 비교 분석합니다.",
  },
  {
    id: "sorting-string-integrated-3",
    title: "통합 문제 3: 비재귀 퀵정렬 응용",
    description: "스택 기반 비재귀 퀵정렬 아이디어를 실전 문제에 적용합니다.",
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
            chapterDescription="기초 정렬부터 분할정복/힙/선형 정렬까지 전체 스펙트럼을 학습합니다."
            guideItems={[
              "정렬 선택 기준(입력 크기/정렬 여부/메모리)을 먼저 정리하세요.",
              "각 알고리즘에서 비교/스왑 횟수를 관찰하세요.",
              "안정 정렬 여부를 문제 요구사항과 연결해보세요.",
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
            chapterDescription="패턴 매칭 알고리즘의 아이디어와 실전 선택 기준을 학습합니다."
            guideItems={[
              "먼저 브루트포스로 기준 구현을 작성하세요.",
              "KMP의 LPS 배열 생성 과정을 손으로 추적하세요.",
              "BM 점프 규칙이 언제 유리한지 입력 패턴으로 비교하세요.",
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
            chapterDescription="정렬과 문자열 검색을 결합한 실전형 문제 해결력을 점검합니다."
            guideItems={[
              "문제 요구사항을 정렬 단계와 매칭 단계로 분리하세요.",
              "입력 분포에 따라 알고리즘 선택 근거를 기록하세요.",
              "비재귀 구현에서 스택 상태를 함께 검증하세요.",
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
