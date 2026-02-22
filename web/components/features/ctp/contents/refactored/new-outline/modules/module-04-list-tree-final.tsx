"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { CTPModule } from "@/components/features/ctp/common/types";
import { LINKED_LIST_MODULES } from "@/components/features/ctp/contents/categories/linear/concepts/linked-list/linked-list-registry";
import { TREE_MODULES } from "@/components/features/ctp/contents/categories/non-linear/concepts/tree/tree-registry";
import { ChapterOverview } from "../shared/chapter-overview";
import { aliasModule, createTemplateModule, createTemplateModules } from "../shared/module-utils";

const LIST_MODULES: Record<string, CTPModule> = {
  singly: aliasModule(LINKED_LIST_MODULES.singly, {
    title: "08-1 연결 리스트",
    description: "단일 연결 리스트의 구조와 기본 연산을 학습합니다.",
  }),
  doubly: aliasModule(LINKED_LIST_MODULES.doubly, {
    title: "08-2 포인터 기반 연결 리스트",
    description: "이중 연결 리스트로 양방향 이동 연산을 다룹니다.",
  }),
  "cursor-linked-list": createTemplateModule({
    id: "cursor-linked-list",
    title: "08-3 커서 기반 연결 리스트",
    description: "포인터 대신 인덱스(커서)로 연결 리스트를 구현하는 방법을 학습합니다.",
  }),
  circular: aliasModule(LINKED_LIST_MODULES.circular, {
    title: "08-4 원형 이중 연결 리스트",
    description: "원형 연결 구조의 순환 처리와 경계 케이스를 다룹니다.",
  }),
};

const TREE_MODULES_REFACTORED: Record<string, CTPModule> = {
  "tree-basics": aliasModule(TREE_MODULES["tree-basics"], {
    title: "09-1 트리 구조",
    description: "트리의 노드/레벨/깊이 개념과 기본 순회를 학습합니다.",
  }),
  bst: aliasModule(TREE_MODULES.bst, {
    title: "09-2 이진 트리와 이진 검색 트리",
    description: "BST 삽입/탐색 규칙과 활용 패턴을 익힙니다.",
  }),
};

const LIST_TREE_INTEGRATION_MODULES = createTemplateModules([
  {
    id: "list-tree-integrated-1",
    title: "통합 문제 1: 리스트 삽입/삭제 시나리오",
    description: "연결 구조에서 삽입/삭제의 포인터 변경을 시뮬레이션합니다.",
  },
  {
    id: "list-tree-integrated-2",
    title: "통합 문제 2: BST 탐색/삽입 응용",
    description: "트리 탐색/삽입 규칙을 복합 조건 문제에 적용합니다.",
  },
  {
    id: "list-tree-integrated-3",
    title: "통합 문제 3: 구조 선택 트레이드오프",
    description: "리스트 vs 트리 선택을 시간/메모리 관점에서 비교합니다.",
  },
]);

const FINAL_CHALLENGE_MODULES = createTemplateModules([
  {
    id: "fc-1",
    title: "FC-1 기초·검색 종합",
    description: "Foundation 영역의 핵심 패턴을 종합 점검합니다.",
  },
  {
    id: "fc-2",
    title: "FC-2 스택·재귀·정렬 종합",
    description: "스택/재귀/정렬 문제를 시간 제한 조건에서 훈련합니다.",
  },
  {
    id: "fc-3",
    title: "FC-3 문자열·리스트·트리 종합",
    description: "문자열 처리와 비선형 구조 선택 문제를 통합 점검합니다.",
  },
  {
    id: "fc-4",
    title: "FC-4 미니 코딩테스트 (타이머형)",
    description: "실전 시간 제한과 동일한 형태로 미니 테스트를 수행합니다.",
  },
]);

export function ListContentRefactored() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 04. List, Tree & Final"
        modules={LIST_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 04. List, Tree & Final"
            chapterTitle="08 리스트"
            chapterDescription="연결 리스트의 변형 구조를 비교하고 구현 선택 기준을 정리합니다."
            guideItems={[
              "삽입/삭제 시 포인터 변경 순서를 먼저 정의하세요.",
              "단일/이중/원형 리스트의 장단점을 비교하세요.",
              "커서 기반 구현에서 인덱스 유효성을 검증하세요.",
            ]}
            items={[
              { id: "singly", title: "08-1 연결 리스트", description: "단일 연결 리스트의 기본 연산을 실습합니다." },
              { id: "doubly", title: "08-2 포인터 기반 연결 리스트", description: "양방향 연결 구조의 연산을 학습합니다." },
              { id: "cursor-linked-list", title: "08-3 커서 기반 연결 리스트", description: "배열 인덱스로 노드 연결을 모사합니다." },
              { id: "circular", title: "08-4 원형 이중 연결 리스트", description: "순환 연결 구조의 경계 처리를 익힙니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function TreeContentRefactored() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 04. List, Tree & Final"
        modules={TREE_MODULES_REFACTORED}
        overview={
          <ChapterOverview
            moduleLabel="Module 04. List, Tree & Final"
            chapterTitle="09 트리"
            chapterDescription="트리 구조 이해부터 BST 연산까지 필수 패턴을 학습합니다."
            guideItems={[
              "트리 기본 용어(레벨/높이/차수)를 먼저 정리하세요.",
              "BST 규칙을 삽입/탐색 예제로 검증하세요.",
              "재귀와 반복 순회의 차이를 비교하세요.",
            ]}
            items={[
              { id: "tree-basics", title: "09-1 트리 구조", description: "트리 기본 구조와 순회를 학습합니다." },
              { id: "bst", title: "09-2 이진 트리와 이진 검색 트리", description: "BST 규칙과 응용을 실습합니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function ListTreeIntegrationContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 04. List, Tree & Final"
        modules={LIST_TREE_INTEGRATION_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 04. List, Tree & Final"
            chapterTitle="리스트/트리 자료구조 개념 심화 및 적용"
            chapterDescription="리스트와 트리의 구조적 차이를 문제 해결에 연결합니다."
            guideItems={[
              "문제별 요구 연산을 먼저 분해하세요.",
              "리스트/트리의 접근/수정 비용을 비교하세요.",
              "구조 선택 이유를 정량 지표로 설명해보세요.",
            ]}
            items={[
              { id: "list-tree-integrated-1", title: "통합 문제 1: 리스트 삽입/삭제 시나리오", description: "연결 구조의 포인터 갱신 문제를 풉니다." },
              { id: "list-tree-integrated-2", title: "통합 문제 2: BST 탐색/삽입 응용", description: "트리 연산을 응용한 문제를 풉니다." },
              { id: "list-tree-integrated-3", title: "통합 문제 3: 구조 선택 트레이드오프", description: "자료구조 선택 근거를 명확히 제시합니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function FinalChallengeContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 04. List, Tree & Final"
        modules={FINAL_CHALLENGE_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 04. List, Tree & Final"
            chapterTitle="종합 평가 + 미니 코딩테스트 (Final Challenge)"
            chapterDescription="전 모듈 핵심 개념을 시간 제한 기반으로 종합 점검합니다."
            guideItems={[
              "실전처럼 시간 제한을 켜고 문제를 풉니다.",
              "문제별 접근 전략과 복잡도를 먼저 기록하세요.",
              "오답 원인을 유형별(구현/로직/복잡도)로 분류하세요.",
            ]}
            items={[
              { id: "fc-1", title: "FC-1 기초·검색 종합", description: "기초/검색 영역을 통합 점검합니다." },
              { id: "fc-2", title: "FC-2 스택·재귀·정렬 종합", description: "스택/재귀/정렬 결합 문제를 풉니다." },
              { id: "fc-3", title: "FC-3 문자열·리스트·트리 종합", description: "문자열과 자료구조 복합 문제를 다룹니다." },
              { id: "fc-4", title: "FC-4 미니 코딩테스트 (타이머형)", description: "타이머형 실전 테스트를 수행합니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}
