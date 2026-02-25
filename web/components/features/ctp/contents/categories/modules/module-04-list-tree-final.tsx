"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { ProblemBankController } from "@/components/features/ctp/problem-bank";
import { module04Problems } from "@/data/ctp/problems";
import { ChapterOverview } from "./shared/chapter-overview";
import { createCodeTemplateModules, createInteractiveTemplateModules } from "./shared/module-utils";

const LIST_MODULES = createInteractiveTemplateModules([
  {
    id: "singly",
    title: "08-1 연결 리스트",
    description: "단일 연결 리스트의 구조와 기본 연산을 학습합니다.",
    sampleData: [1, 2, 3, 4],
  },
  {
    id: "doubly",
    title: "08-2 포인터 기반 연결 리스트",
    description: "이중 연결 리스트로 양방향 이동 연산을 다룹니다.",
    sampleData: [4, 6, 8, 10],
  },
  {
    id: "cursor-linked-list",
    title: "08-3 커서 기반 연결 리스트",
    description: "포인터 대신 인덱스(커서)로 연결 리스트를 구현하는 방법을 학습합니다.",
    sampleData: [7, 3, 9, 2],
  },
  {
    id: "circular",
    title: "08-4 원형 이중 연결 리스트",
    description: "원형 연결 구조의 순환 처리와 경계 케이스를 다룹니다.",
    sampleData: [5, 10, 15, 20],
  },
]);

const TREE_MODULES_REFACTORED = createInteractiveTemplateModules([
  {
    id: "tree-basics",
    title: "09-1 트리 구조",
    description: "트리의 노드/레벨/깊이 개념과 기본 순회를 학습합니다.",
    sampleData: [8, 4, 12, 2, 6],
  },
  {
    id: "bst",
    title: "09-2 이진 트리와 이진 검색 트리",
    description: "BST 삽입/탐색 규칙과 활용 패턴을 익힙니다.",
    sampleData: [10, 5, 15, 3, 7],
  },
]);

const LIST_TREE_INTEGRATION_MODULES = createCodeTemplateModules([
  {
    id: "list-tree-integrated-1",
    title: "통합 문제 1: 리스트 삽입/삭제 시나리오",
    description: "연결 구조에서 삽입/삭제의 포인터 변경을 시뮬레이션합니다.",
    sampleData: [2, 5, 8, 11],
  },
  {
    id: "list-tree-integrated-2",
    title: "통합 문제 2: BST 탐색/삽입 응용",
    description: "트리 탐색/삽입 규칙을 복합 조건 문제에 적용합니다.",
    sampleData: [9, 4, 13, 1, 6],
  },
  {
    id: "list-tree-integrated-3",
    title: "통합 문제 3: 구조 선택 트레이드오프",
    description: "리스트 vs 트리 선택을 시간/메모리 관점에서 비교합니다.",
    sampleData: [12, 7, 3, 14, 5],
  },
]);

const FINAL_CHALLENGE_MODULES = createInteractiveTemplateModules([
  {
    id: "fc-1",
    title: "FC-1 기초·검색 종합",
    description: "Foundation 영역의 핵심 패턴을 종합 점검합니다.",
    sampleData: [1, 8, 2, 7, 3],
  },
  {
    id: "fc-2",
    title: "FC-2 스택·재귀·정렬 종합",
    description: "스택/재귀/정렬 문제를 시간 제한 조건에서 훈련합니다.",
    sampleData: [4, 9, 5, 2, 6],
  },
  {
    id: "fc-3",
    title: "FC-3 문자열·리스트·트리 종합",
    description: "문자열 처리와 비선형 구조 선택 문제를 통합 점검합니다.",
    sampleData: [7, 1, 9, 3, 8],
  },
  {
    id: "fc-4",
    title: "FC-4 미니 코딩테스트 (타이머형)",
    description: "실전 시간 제한과 동일한 형태로 미니 테스트를 수행합니다.",
    sampleData: [10, 6, 11, 4, 12],
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
            chapterDescription="리스트 챕터는 참여형 인터랙티브 실습 중심으로 구성됩니다."
            guideItems={[
              "연산 버튼으로 삽입/삭제 흐름을 반복 체험하세요.",
              "로그를 통해 경계 조건 처리 규칙을 정리하세요.",
              "같은 데이터로 구조별 반응 차이를 비교하세요.",
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
            chapterDescription="트리 챕터도 참여형 인터랙티브 실습으로 전환되었습니다."
            guideItems={[
              "버튼 조작으로 노드 상태 변화를 관찰하세요.",
              "탐색 순서에 따라 로그가 어떻게 달라지는지 비교하세요.",
              "리스트 구조와 트리 구조의 차이를 정리하세요.",
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
      <ProblemBankController
        moduleLabel="Module 04. List, Tree & Final"
        chapterTitle="리스트/트리 자료구조 개념 심화 및 적용"
        chapterDescription="Problem Bank에서 List/Tree 통합 문제를 풀이하고 자동 채점을 확인하세요."
        problems={module04Problems}
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
            chapterDescription="파이널 챌린지는 참여형 인터랙티브 시뮬레이션으로 진행됩니다."
            guideItems={[
              "각 FC 레슨에서 조작 순서를 스스로 설계하세요.",
              "반복 실습으로 안정적인 해결 흐름을 만드세요.",
              "로그를 기반으로 실전 전략을 복기하세요.",
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
