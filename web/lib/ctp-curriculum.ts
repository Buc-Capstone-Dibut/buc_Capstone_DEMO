export interface TCPSubConcept {
  id: string;
  title: string;
}

export interface CTPConcept {
  id: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  isImportant?: boolean;
  subConcepts?: TCPSubConcept[];
}

export interface CTPCategory {
  id: string;
  title: string;
  description: string;
  color: string;
  concepts: CTPConcept[];
}

export const CTP_DATA: CTPCategory[] = [
  {
    id: "module-01-foundation",
    title: "Module 01. Foundation",
    description: "알고리즘 기초, 배열, 검색의 핵심 토대를 다지는 입문 모듈",
    color: "from-blue-500 to-cyan-400",
    concepts: [
      {
        id: "algo-basics",
        title: "01 알고리즘 기초",
        description: "알고리즘 개요와 흐름 추적의 기본 문법",
        difficulty: "Easy",
        isImportant: true,
        subConcepts: [
          { id: "algo-overview", title: "01-1 알고리즘 개요" },
          { id: "condition-loop", title: "01-2 조건문과 반복문" },
          { id: "flow-tracing", title: "01-3 순서도와 흐름 추적" },
        ],
      },
      {
        id: "basic-ds-array",
        title: "02 기본 자료구조와 배열",
        description: "배열 중심으로 자료구조 비교와 기본 응용 학습",
        difficulty: "Easy",
        isImportant: true,
        subConcepts: [
          { id: "ds-compare", title: "02-1 자료구조 비교 (배열/리스트/튜플)" },
          { id: "1d-array", title: "02-2 배열 인덱스와 슬라이싱" },
          { id: "2d-array", title: "02-3 배열 기본 문제 (최댓값/역순 정렬)" },
          { id: "array-number-prime", title: "02-4 배열 응용 (n진수/소수)" },
        ],
      },
      {
        id: "search-algorithms",
        title: "03 검색 알고리즘",
        description: "선형/이진 검색과 해시 충돌 해결까지 연결",
        difficulty: "Medium",
        isImportant: true,
        subConcepts: [
          { id: "search-problem-key", title: "03-1 검색 문제와 키" },
          { id: "linear-search", title: "03-2 선형 검색" },
          { id: "basic-binary-search", title: "03-3 이진 검색" },
          { id: "hash-collision", title: "03-4 해시법과 충돌 해결" },
        ],
      },
      {
        id: "foundation-integration",
        title: "알고리즘 기초/자료구조·검색 개념 심화 및 적용",
        description: "배열/검색/해시를 통합한 실전형 문제 풀이",
        difficulty: "Medium",
        subConcepts: [
          { id: "problem-bank", title: "Problem Bank (12 Problems)" },
        ],
      },
    ],
  },
  {
    id: "module-02-stack-recursion",
    title: "Module 02. Stack & Recursion",
    description: "스택/큐와 재귀, 백트래킹의 동작 원리를 체화하는 모듈",
    color: "from-violet-500 to-indigo-400",
    concepts: [
      {
        id: "stack-queue",
        title: "04 스택과 큐",
        description: "LIFO/FIFO 구조와 배열 기반 큐 구현",
        difficulty: "Easy",
        isImportant: true,
        subConcepts: [
          { id: "lifo-basics", title: "04-1 스택 개요" },
          { id: "queue-overview", title: "04-2 큐 개요" },
          { id: "linear-queue", title: "04-3 배열 기반 큐" },
          { id: "circular-queue", title: "04-4 링 버퍼 큐" },
        ],
      },
      {
        id: "recursion",
        title: "05 재귀 알고리즘",
        description: "재귀 사고, 분석, 비재귀 전환과 백트래킹",
        difficulty: "Medium",
        isImportant: true,
        subConcepts: [
          { id: "recursion-basics", title: "05-1 재귀 기본" },
          { id: "recursion-analysis", title: "05-2 재귀 분석" },
          { id: "tower-of-hanoi", title: "05-3 하노이의 탑" },
          { id: "iterative-recursion", title: "05-4 비재귀적 표현" },
          { id: "queen-backtracking", title: "05-5 백트래킹 (퀸 배치)" },
        ],
      },
      {
        id: "stack-recursion-integration",
        title: "스택·큐/재귀 알고리즘 개념 심화 및 적용",
        description: "스택/큐/재귀 선택 기준을 문제로 훈련",
        difficulty: "Medium",
        subConcepts: [
          { id: "problem-bank", title: "Problem Bank (12 Problems)" },
        ],
      },
    ],
  },
  {
    id: "module-03-sorting-string",
    title: "Module 03. Sorting & String",
    description: "정렬 전 범위와 문자열 검색의 핵심 패턴을 익히는 모듈",
    color: "from-amber-500 to-orange-400",
    concepts: [
      {
        id: "sorting",
        title: "06 정렬 알고리즘",
        description: "기초 정렬부터 분할정복/힙/도수 정렬까지",
        difficulty: "Medium",
        isImportant: true,
        subConcepts: [
          { id: "sorting-overview", title: "06-1 정렬 알고리즘 개요" },
          { id: "bubble-sort", title: "06-2 버블 정렬" },
          { id: "selection-sort", title: "06-3 선택 정렬" },
          { id: "insertion-sort", title: "06-4 삽입 정렬" },
          { id: "shell-sort", title: "06-5 셸 정렬" },
          { id: "quick-sort", title: "06-6 퀵 정렬" },
          { id: "merge-sort", title: "06-7 병합 정렬" },
          { id: "heap-sort", title: "06-8 힙 정렬" },
          { id: "counting-sort", title: "06-9 도수 정렬" },
        ],
      },
      {
        id: "string-search",
        title: "07 문자열 검색",
        description: "패턴 매칭 알고리즘의 기본과 성능 차이",
        difficulty: "Medium",
        subConcepts: [
          { id: "brute-force-search", title: "07-1 브루트 포스" },
          { id: "kmp-search", title: "07-2 KMP" },
          { id: "boyer-moore-search", title: "07-3 보이어-무어" },
        ],
      },
      {
        id: "sorting-string-integration",
        title: "정렬/문자열 검색 알고리즘 개념 심화 및 적용",
        description: "정렬과 문자열 검색을 결합한 통합 문제",
        difficulty: "Hard",
        subConcepts: [
          { id: "problem-bank", title: "Problem Bank (12 Problems)" },
        ],
      },
    ],
  },
  {
    id: "module-04-list-tree-final",
    title: "Module 04. List, Tree & Final",
    description: "리스트/트리 선택 기준을 정립하고 파이널 테스트로 마무리",
    color: "from-emerald-500 to-teal-400",
    concepts: [
      {
        id: "list",
        title: "08 리스트",
        description: "연결 리스트 계열 구현과 변형 구조",
        difficulty: "Medium",
        isImportant: true,
        subConcepts: [
          { id: "singly", title: "08-1 연결 리스트" },
          { id: "doubly", title: "08-2 포인터 기반 연결 리스트" },
          { id: "cursor-linked-list", title: "08-3 커서 기반 연결 리스트" },
          { id: "circular", title: "08-4 원형 이중 연결 리스트" },
        ],
      },
      {
        id: "tree",
        title: "09 트리",
        description: "트리의 핵심 구조와 BST 탐색/삽입",
        difficulty: "Medium",
        isImportant: true,
        subConcepts: [
          { id: "tree-basics", title: "09-1 트리 구조" },
          { id: "bst", title: "09-2 이진 트리와 이진 검색 트리" },
        ],
      },
      {
        id: "list-tree-integration",
        title: "리스트/트리 자료구조 개념 심화 및 적용",
        description: "구조 선택과 연산 트레이드오프를 실전으로 정리",
        difficulty: "Hard",
        subConcepts: [
          { id: "problem-bank", title: "Problem Bank (12 Problems)" },
        ],
      },
      {
        id: "final-challenge",
        title: "종합 평가 + 미니 코딩테스트 (Final Challenge)",
        description: "4개 파트 종합 점검과 타이머형 실전 테스트",
        difficulty: "Hard",
        isImportant: true,
        subConcepts: [
          { id: "fc-1", title: "FC-1 기초·검색 종합" },
          { id: "fc-2", title: "FC-2 스택·재귀·정렬 종합" },
          { id: "fc-3", title: "FC-3 문자열·리스트·트리 종합" },
          { id: "fc-4", title: "FC-4 미니 코딩테스트 (타이머형)" },
        ],
      },
    ],
  },
];
