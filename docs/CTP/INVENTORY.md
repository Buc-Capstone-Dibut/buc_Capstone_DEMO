# CTP Inventory Snapshot (New Curriculum)

기준: `module-01~04` 신규 커리큘럼 + 전달 방식 정책 적용 상태

## 1) 라우트 규칙

- 현재 유효 상세 URL 패턴:
  - `/insights/ctp/<moduleId>/<chapterId>?view=<lessonId>`
- 레거시 상세 URL 패턴은 더 이상 사용하지 않음
- 구 URL 접근 시 404 처리됨

## 2) 전달 방식 정책

- `코드 시뮬레이터(Mode=code)` 허용 챕터:
  1. `module-01-foundation/foundation-integration`
  2. `module-02-stack-recursion/stack-recursion-integration`
  3. `module-03-sorting-string/sorting-string-integration`
  4. `module-04-list-tree-final/list-tree-integration`
- 그 외 챕터는 `사용자 참여형 인터랙티브(Mode=interactive)`로 구성

## 3) Module / Chapter 맵

| moduleId | chapterId | route | lessons | delivery |
|---|---|---|---|---|
| module-01-foundation | algo-basics | `/insights/ctp/module-01-foundation/algo-basics` | algo-overview, condition-loop, flow-tracing | Interactive runtime |
| module-01-foundation | basic-ds-array | `/insights/ctp/module-01-foundation/basic-ds-array` | ds-compare, 1d-array, 2d-array, array-number-prime | Interactive runtime |
| module-01-foundation | search-algorithms | `/insights/ctp/module-01-foundation/search-algorithms` | search-problem-key, linear-search, basic-binary-search, hash-collision | Interactive runtime |
| module-01-foundation | foundation-integration | `/insights/ctp/module-01-foundation/foundation-integration` | foundation-integrated-1, foundation-integrated-2, foundation-integrated-3 | Code simulator |
| module-02-stack-recursion | stack-queue | `/insights/ctp/module-02-stack-recursion/stack-queue` | lifo-basics, queue-overview, linear-queue, circular-queue | Interactive runtime |
| module-02-stack-recursion | recursion | `/insights/ctp/module-02-stack-recursion/recursion` | recursion-basics, recursion-analysis, tower-of-hanoi, iterative-recursion, queen-backtracking | Interactive runtime |
| module-02-stack-recursion | stack-recursion-integration | `/insights/ctp/module-02-stack-recursion/stack-recursion-integration` | stack-recursion-integrated-1, stack-recursion-integrated-2, stack-recursion-integrated-3 | Code simulator |
| module-03-sorting-string | sorting | `/insights/ctp/module-03-sorting-string/sorting` | sorting-overview, bubble-sort, selection-sort, insertion-sort, shell-sort, quick-sort, merge-sort, heap-sort, counting-sort | Interactive runtime |
| module-03-sorting-string | string-search | `/insights/ctp/module-03-sorting-string/string-search` | brute-force-search, kmp-search, boyer-moore-search | Interactive runtime |
| module-03-sorting-string | sorting-string-integration | `/insights/ctp/module-03-sorting-string/sorting-string-integration` | sorting-string-integrated-1, sorting-string-integrated-2, sorting-string-integrated-3 | Code simulator |
| module-04-list-tree-final | list | `/insights/ctp/module-04-list-tree-final/list` | singly, doubly, cursor-linked-list, circular | Interactive runtime |
| module-04-list-tree-final | tree | `/insights/ctp/module-04-list-tree-final/tree` | tree-basics, bst | Interactive runtime |
| module-04-list-tree-final | list-tree-integration | `/insights/ctp/module-04-list-tree-final/list-tree-integration` | list-tree-integrated-1, list-tree-integrated-2, list-tree-integrated-3 | Code simulator |
| module-04-list-tree-final | final-challenge | `/insights/ctp/module-04-list-tree-final/final-challenge` | fc-1, fc-2, fc-3, fc-4 | Interactive runtime |

## 4) 코드 기준점

- 커리큘럼 원본: `web/lib/ctp-curriculum.ts`
- chapter 라우팅 레지스트리: `web/lib/ctp-content-registry.tsx`
- 신규 모듈 구현:
  - `web/components/features/ctp/contents/categories/modules/module-01-foundation.tsx`
  - `web/components/features/ctp/contents/categories/modules/module-02-stack-recursion.tsx`
  - `web/components/features/ctp/contents/categories/modules/module-03-sorting-string.tsx`
  - `web/components/features/ctp/contents/categories/modules/module-04-list-tree-final.tsx`
- 템플릿 런타임 유틸:
  - `web/components/features/ctp/contents/categories/modules/shared/module-utils.tsx`

## 5) 운영 메모

- 기존 상세 페이지는 `categoryId/conceptId` 불일치 시 `notFound()`로 즉시 차단
- 인터랙티브 챕터는 `peek/push/pop/reset` 참여형 동작으로 학습 흐름 제공
- 코드 시뮬레이터 챕터는 Run 기반 단계(step) 시각화로 심화 문제 검증
