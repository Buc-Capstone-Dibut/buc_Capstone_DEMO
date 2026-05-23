# CTP Phase 0: 대청소 + 표준화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 1 멀티에이전트 양산이 시작될 수 있도록 코드베이스의 dead code/레거시 잔재를 제거하고, ConceptSpec 컨트랙트 + Design Primitive 라이브러리 + Tone Guide + 자동 검증 게이트를 구축한다.

**Architecture:** 4축으로 분리해 진행한다 — (1) 안전 카테고리 dead code 14개 일괄 삭제, (2) expansion 사전 옛 ID 정리 + 신규 매핑 추가, (3) 신규 인프라(`ConceptSpec` 타입 + 11 SVG primitive + `scripts/ctp-verify.mjs`) 작성, (4) 핵심 문서 4개를 현재 코드 구조에 맞춰 재작성. 각 작업은 atomic commit으로 분리해 revert 용이성 확보.

**Tech Stack:** Next.js 14 + TypeScript + React + Tailwind + Zustand + Skulpt(Worker) + framer-motion + @xyflow/react + Monaco. 검증 스크립트는 Node `tsx` 런타임.

**참조 spec:** [docs/superpowers/specs/2026-05-22-ctp-content-pipeline-design.md](../specs/2026-05-22-ctp-content-pipeline-design.md)

---

## File Structure

### 삭제할 파일 (5개)
- `web/components/features/ctp/contents/shared/ctp-category-overview.tsx` — dead component
- `web/components/features/ctp/contents/shared/ctp-complexity.tsx` — dead component
- `web/components/features/ctp/playground/visualizers/array/graph/string-graph-visualizer.tsx` — dead component
- `web/components/features/ctp/playground/visualizers/array/grid-visualizer.tsx` — dead component
- `web/components/features/ctp/playground/visualizers/array/linear-visualizer.tsx` — dead component

### 수정할 파일 (14개)
- `web/components/features/ctp/contents/categories/modules/module-01-foundation.tsx` — `FOUNDATION_INTEGRATION_MODULES` 제거
- `web/components/features/ctp/contents/categories/modules/module-02-stack-recursion.tsx` — `STACK_RECURSION_INTEGRATION_MODULES` 제거
- `web/components/features/ctp/contents/categories/modules/module-03-sorting-string.tsx` — `SORTING_STRING_INTEGRATION_MODULES` 제거
- `web/components/features/ctp/contents/categories/modules/module-04-list-tree-final.tsx` — `LIST_TREE_INTEGRATION_MODULES` 제거
- `web/components/features/ctp/contents/categories/modules/shared/module-utils.tsx` — `createCodeTemplateModule(s)`/`useCodeTemplateSimulation`/`makeCodeGuide`/`makeCodeStarter` 제거, `@ts-ignore` 2건 해결
- `web/components/features/ctp/store/use-ctp-store.ts` — `addStep` action 제거
- `web/components/features/ctp/common/types.ts` — `LinearItem`/`GridItem`/`LinkedListNode`/`complexityNames` 필드 제거
- `web/components/features/ctp/playground/ctp-playground.tsx` — restrictedEditing props + extractUserBlock/replaceUserBlock + console.log + SKULPT PROTOTYPE 주석 블록 제거
- `web/data/ctp/problems/index.ts` — `CTP_PROBLEM_BANK`/`getProblemsByModuleId` 제거
- `web/components/features/ctp/contents/shared/ctp-content-expansion.ts` — 옛 ID 45개 제거, 신규 21개 매핑 추가, `collision`→`hash-collision` rename
- `docs/CTP/foundation/ARCHITECTURE.md` — sub-concepts 구조 가정 + 부재 인프라(use-skulpt-engine, adapters/) 제거
- `docs/CTP/foundation/SIMULATION_PIPELINE.md` — 옛 Skulpt step 흐름 → 현재 인터랙티브 + ProblemBank 흐름으로
- `docs/CTP/operations/MAINTENANCE_PLAYBOOK.md` — 전면 재작성 (현재 module-XX-*.tsx 단일 파일 구조 기준)
- `docs/CTP/operations/CONSISTENCY_GUIDELINES.md` — Complexity 섹션 결락 반영
- `docs/CTP/upgrades/PROBLEM_BANK_PLAN.md` — Status "Planning" → "Done"

### 신규 생성할 파일 (15개)
- `web/data/ctp/specs/concept-spec.ts` — ConceptSpec TypeScript 인터페이스
- `web/data/ctp/specs/concept-spec.test.ts` — 인터페이스 + 샘플 spec validate 테스트
- `web/data/ctp/specs/samples/binary-search.json` — Phase 0 PoC 샘플 1개
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/CyberGrid.tsx`
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/NeonGlowFilters.tsx`
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/IndexLabel.tsx`
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/ArrayBox.tsx`
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/PointerArrow.tsx`
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/StepCounter.tsx`
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/LogPanel.tsx`
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/NodeCircle.tsx`
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/EdgeLine.tsx`
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/colorTokens.ts`
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/index.ts`
- `web/scripts/ctp-verify.mjs` — G1-G7 자동 검증 스크립트
- `docs/CTP/foundation/TONE_GUIDE.md` — 톤 가이드 문서

---

## Task 1: Dead Code 일괄 제거

각 sub-task는 한 commit. 빌드 + 타입체크가 모두 통과해야 다음 단계.

### Task 1.1: ctp-category-overview.tsx 삭제

**Files:**
- Delete: `web/components/features/ctp/contents/shared/ctp-category-overview.tsx`

- [ ] **Step 1: 외부 import 0건 확인**

```bash
rg "CTPCategoryOverview|ctp-category-overview" web/ --type-add 'tsx:*.tsx' --type-add 'ts:*.ts' -t ts -t tsx
```

Expected: 정의 파일 자체만 매치, 다른 매치 0건

- [ ] **Step 2: 파일 삭제**

```bash
rm web/components/features/ctp/contents/shared/ctp-category-overview.tsx
```

- [ ] **Step 3: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(CTP): dead component CTPCategoryOverview 제거

호출자 0건 확인 후 삭제. chapter-overview.tsx가 동일 역할 대체."
```

---

### Task 1.2: ctp-complexity.tsx 삭제

**Files:**
- Delete: `web/components/features/ctp/contents/shared/ctp-complexity.tsx`

- [ ] **Step 1: 외부 import 0건 확인**

```bash
rg "CTPComplexity|ctp-complexity" web/ -t ts -t tsx
```

Expected: 정의 파일만 매치

- [ ] **Step 2: 파일 삭제**

```bash
rm web/components/features/ctp/contents/shared/ctp-complexity.tsx
```

- [ ] **Step 3: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(CTP): dead component CTPComplexity 제거

CTPModuleLoader 렌더에서 Complexity 섹션이 빠진 상태로 굳어졌으며
어디서도 호출되지 않음."
```

---

### Task 1.3: array visualizer 3개 삭제

**Files:**
- Delete: `web/components/features/ctp/playground/visualizers/array/graph/string-graph-visualizer.tsx`
- Delete: `web/components/features/ctp/playground/visualizers/array/grid-visualizer.tsx`
- Delete: `web/components/features/ctp/playground/visualizers/array/linear-visualizer.tsx`

- [ ] **Step 1: 외부 import 0건 확인**

```bash
rg "StringGraphVisualizer|GridVisualizer\b|LinearVisualizer" web/ -t ts -t tsx
```

Expected: 정의 파일들만 매치, 다른 매치 0건

- [ ] **Step 2: 파일 3개 삭제**

```bash
rm web/components/features/ctp/playground/visualizers/array/graph/string-graph-visualizer.tsx \
   web/components/features/ctp/playground/visualizers/array/grid-visualizer.tsx \
   web/components/features/ctp/playground/visualizers/array/linear-visualizer.tsx
```

- [ ] **Step 3: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(CTP): dead visualizer 3개 제거

StringGraphVisualizer/GridVisualizer/LinearVisualizer 모두 JSX 호출 0건.
ArrayGraphVisualizer가 모든 array fallback을 흡수."
```

---

### Task 1.4: *_INTEGRATION_MODULES 4개 제거

각 모듈 파일에서 dead 변수 정의와 그 import만 제거 (Content Component 함수는 유지 — `<ProblemBankController/>`만 렌더).

**Files:**
- Modify: `web/components/features/ctp/contents/categories/modules/module-01-foundation.tsx`
- Modify: `web/components/features/ctp/contents/categories/modules/module-02-stack-recursion.tsx`
- Modify: `web/components/features/ctp/contents/categories/modules/module-03-sorting-string.tsx`
- Modify: `web/components/features/ctp/contents/categories/modules/module-04-list-tree-final.tsx`

- [ ] **Step 1: 각 파일에서 `*_INTEGRATION_MODULES` 변수 + 그 변수가 참조하는 `createCodeTemplateModules` import 제거**

module-01-foundation.tsx에서:
```tsx
// 제거: import { createCodeTemplateModules } from "./shared/module-utils";
// 제거: 라인 427 부근 const FOUNDATION_INTEGRATION_MODULES = createCodeTemplateModules([...]);
```

module-02/03/04도 동일 패턴.

- [ ] **Step 2: 변수 사용처 0건 재확인**

```bash
rg "FOUNDATION_INTEGRATION_MODULES|STACK_RECURSION_INTEGRATION_MODULES|SORTING_STRING_INTEGRATION_MODULES|LIST_TREE_INTEGRATION_MODULES" web/
```

Expected: 0건

- [ ] **Step 3: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(CTP): dead *_INTEGRATION_MODULES 4개 제거

4개 모듈 모두 통합 챕터를 ProblemBankController로만 렌더하므로
createCodeTemplateModules로 만든 모듈 객체는 한 번도 사용되지 않음."
```

---

### Task 1.5: module-utils.tsx의 createCodeTemplate 함수 체인 제거

Task 1.4로 createCodeTemplateModules의 외부 호출이 0건이 됐으므로 정의도 제거 가능.

**Files:**
- Modify: `web/components/features/ctp/contents/categories/modules/shared/module-utils.tsx`

- [ ] **Step 1: 정의 + 호출 0건 재확인**

```bash
rg "createCodeTemplateModule|useCodeTemplateSimulation|makeCodeGuide|makeCodeStarter" web/
```

Expected: module-utils.tsx 내부 정의만 매치

- [ ] **Step 2: module-utils.tsx에서 다음 식별자 정의 제거**
  - `extractNumbers` 함수 (라인 30 근처)
  - `useCodeTemplateSimulation` 훅 (라인 108-146)
  - `makeCodeGuide` 함수
  - `makeCodeStarter` 함수
  - `createCodeTemplateModule` 함수 (라인 228 근처)
  - `createCodeTemplateModules` 함수
  - 더 이상 사용되지 않게 된 import (`VisualStep`, `useCTPStore` 등) 정리

- [ ] **Step 3: `@ts-ignore` 2건 해결**

기존 `module-utils.tsx:258` 일대:
```tsx
// 변경 전
// @ts-ignore - Visualizer is guaranteed to exist here
return <SVGFlowWrapper><item.Visualizer ... /></SVGFlowWrapper>;
```

변경 후 — `item.Visualizer`가 undefined일 수 없는 분기를 type guard로:
```tsx
if (!item.Visualizer) {
  return <SVGFlowWrapper><ArrayGraphVisualizer data={...} /></SVGFlowWrapper>;
}
const Visualizer = item.Visualizer;
return <SVGFlowWrapper><Visualizer ... /></SVGFlowWrapper>;
```

라인 308 일대도 동일 패턴 적용.

- [ ] **Step 4: 빌드 + 타입체크**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0, `@ts-ignore` 없이 통과

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(CTP): module-utils의 createCodeTemplate 함수 체인 제거 + @ts-ignore 해결

Task 1.4에서 INTEGRATION_MODULES가 사라지며 createCodeTemplateModules 호출 0건.
연관 helper (extractNumbers, useCodeTemplateSimulation, makeCodeGuide, makeCodeStarter)
모두 dead 상태이므로 함께 제거. @ts-ignore 2건은 type guard로 해결."
```

---

### Task 1.6: use-ctp-store.ts의 addStep 제거

**Files:**
- Modify: `web/components/features/ctp/store/use-ctp-store.ts`

- [ ] **Step 1: 호출 0건 확인**

```bash
rg "\.addStep\(|addStep:" web/ -t ts -t tsx
```

Expected: store 정의 외 매치 0건

- [ ] **Step 2: action 제거**

`use-ctp-store.ts:81-84` 부근의 `addStep` 정의 삭제.
state interface에서도 `addStep: ...` 시그니처 제거.

- [ ] **Step 3: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(CTP): use-ctp-store의 dead addStep action 제거

Skulpt streaming용으로 만들어졌으나 호출자 0건."
```

---

### Task 1.7: types.ts의 dead 필드/타입 제거

**Files:**
- Modify: `web/components/features/ctp/common/types.ts`

- [ ] **Step 1: 사용 0건 확인 (개별)**

```bash
rg "LinearItem\b|GridItem\b|LinkedListNode|complexityNames" web/ -t ts -t tsx
```

Expected: types.ts 정의만 매치

- [ ] **Step 2: 4개 식별자 제거**

- `LinearItem` (라인 118)
- `GridItem` (라인 119)
- `LinkedListNode` (라인 121)
- `CTPModuleConfig.complexityNames` 필드 (라인 62-67)

- [ ] **Step 3: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(CTP): types.ts dead 식별자 4개 제거

LinearItem/GridItem/LinkedListNode/complexityNames 모두 외부 사용 0건."
```

---

### Task 1.8: ctp-playground.tsx 정리 (restrictedEditing + console.log + SKULPT 주석)

**Files:**
- Modify: `web/components/features/ctp/playground/ctp-playground.tsx`

- [ ] **Step 1: restrictedEditing props/함수 호출 0건 확인**

```bash
rg "restrictedEditing|editBoundaryStart|editBoundaryEnd|extractUserBlock|replaceUserBlock" web/ -t ts -t tsx
```

Expected: ctp-playground.tsx 내부 정의만 매치

- [ ] **Step 2: 3 props 제거**

`ctp-playground.tsx:36-38, 47-49` 부근:
- props 타입에서 `restrictedEditing?: boolean`, `editBoundaryStart?: string`, `editBoundaryEnd?: string` 제거
- 컴포넌트 매개변수 구조 분해에서 동일 제거

- [ ] **Step 3: extractUserBlock + replaceUserBlock 함수 + 그 사용처 제거**

`ctp-playground.tsx:379-400` 부근의 두 함수 정의 삭제.
`handleRun` 안에서 `restrictedEditing ? replaceUserBlock(...) : code` 같은 분기를 직접 `code`로.

- [ ] **Step 4: SKULPT PROTOTYPE 주석 블록 + console.log 제거**

- 라인 114 `console.log("[Playground] Run Triggered");` 제거
- 라인 145-157의 `--- SKULPT PROTOTYPE VERIFICATION ---` 주석 블록 11줄 제거

- [ ] **Step 5: 빌드 + 런타임 검증**

```bash
cd web && pnpm exec tsc --noEmit && pnpm exec next build
```

Expected: 에러 0, 빌드 성공

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(CTP): ctp-playground에서 dead restrictedEditing + 디버그 잔재 제거

- restrictedEditing/editBoundaryStart/editBoundaryEnd props 3개 (호출자 0건)
- extractUserBlock/replaceUserBlock 함수 2개 (외부 사용 0건)
- 가드 없는 console.log 1건
- SKULPT PROTOTYPE VERIFICATION 주석 블록 11줄"
```

---

### Task 1.9: data/ctp/problems/index.ts 정리

**Files:**
- Modify: `web/data/ctp/problems/index.ts`

- [ ] **Step 1: 호출 0건 확인**

```bash
rg "CTP_PROBLEM_BANK|getProblemsByModuleId" web/ -t ts -t tsx
```

Expected: index.ts 자체 정의만 매치

- [ ] **Step 2: 두 export 제거**

- `CTP_PROBLEM_BANK` 객체 (라인 7-12 부근)
- `getProblemsByModuleId` 함수 (라인 14 부근)
- 개별 `moduleNN-problems` re-export는 유지 (외부에서 직접 import 중)

- [ ] **Step 3: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(CTP): data/problems의 dead CTP_PROBLEM_BANK/getProblemsByModuleId 제거

호출자 0건. 외부는 module01Problems~module04Problems를 직접 import 중."
```

---

## Task 2: expansion 사전 정리

### Task 2.1: 옛 ID 매핑 45개 제거

**Files:**
- Modify: `web/components/features/ctp/contents/shared/ctp-content-expansion.ts`

제거 대상 키 (각 항목이 `expansions` 객체의 키):
```
array-stack, bfs, bfs-basics, bfs-multi-source, bfs-path-reconstruction,
bfs-zero-one, binary-traversal, collision, cycle-detection, deque, dfs,
dfs-backtracking, dfs-basics, dfs-cycle-detection, dfs-path-reconstruction,
dfs-tree-traversal, dijkstra, dp-1d, dp-2d, dp-basics, dp-patterns,
ds-apps, ds-basics, floyd-warshall, graph-representation, grid-traversal,
hash-basics, hash-implement, heap-basics, linked-stack, max-heap, min-heap,
monotonic-stack, mst, parametric-search, path-compression, pq-basics,
prefix-search, shortest-path, string, topological-sort, trie-apps,
trie-basics, two-pointers, union-rank
```

- [ ] **Step 1: 각 옛 키를 grep으로 외부 참조 0건 확인 (안전 검증)**

```bash
for key in array-stack bfs bfs-basics collision deque dfs dijkstra dp-basics heap-basics linked-stack mst two-pointers; do
  echo "=== $key ==="
  rg "[\"']${key}[\"']" web/ -t ts -t tsx | grep -v "ctp-content-expansion.ts"
done
```

Expected: 모든 매치 ctp-content-expansion.ts 내부에서만

- [ ] **Step 2: 45개 키의 expansion entry 제거**

해당 키 블록들을 `expansions` 객체에서 모두 삭제. 동시에 `groupByKey`/`groupDeepDive`/`groupObservation` 안의 매핑(`dp`, `graph`, `heap`, `trie`, `uf`, `mst` 등)도 모두 dead라서 함께 제거.

파일 크기: 1638줄 → 약 700줄 예상

- [ ] **Step 3: 모듈 로딩 smoke test**

```bash
cd web && pnpm exec tsc --noEmit
```

또한 브라우저 dev 서버 띄우고 `/insights/ctp/module-01-foundation/algo-basics?view=algo-overview` 같은 페이지가 정상 로딩 되는지 확인 (수동).

```bash
pnpm dev
```

Expected: 에러 0, 페이지 정상 로딩

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(CTP): expansion 사전에서 옛 sub-concept ID 45개 제거

신규 module-01~04 커리큘럼 도입 후 사용되지 않는 옛 키 일괄 정리.
파일 크기 1638줄 → 약 700줄."
```

---

### Task 2.2: 신규 ID 매핑 21개 추가 + collision→hash-collision rename

**Files:**
- Modify: `web/components/features/ctp/contents/shared/ctp-content-expansion.ts`

추가 대상 키 (현재 커리큘럼 lesson인데 expansion 매핑 없는 것):
```
algo-overview, array-number-prime, boyer-moore-search, brute-force-search,
condition-loop, counting-sort, cursor-linked-list, ds-compare, flow-tracing,
hash-collision, iterative-recursion, kmp-search, linear-search,
queen-backtracking, queue-overview, recursion-analysis, recursion-basics,
search-problem-key, shell-sort, sorting-overview, tower-of-hanoi
```

각 키에 대해 `expansions[key] = { story: { ... }, features: [...], guide: [...] }` 추가.

본 Task에서는 **각 키의 빈 placeholder 객체만 추가**한다 (실제 콘텐츠는 Phase 1의 Content Specialist가 채움):

```ts
expansions["algo-overview"] = {
  story: { /* placeholder — Phase 1에서 채움 */ },
  features: [],
};
// ... 21개 모두 동일 패턴
```

- [ ] **Step 1: 21개 placeholder entry 추가**

- [ ] **Step 2: `collision` → `hash-collision` rename**

`expansions["collision"]` 의 본문을 `expansions["hash-collision"]` 으로 옮기고 `collision` 키 자체 제거 (Task 2.1에서 이미 제거됨 — 본문만 살려서 hash-collision에 매핑)

- [ ] **Step 3: 빌드 검증 + 페이지 로딩 확인**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0. `/insights/ctp/module-01-foundation/search-algorithms?view=hash-collision` 페이지 로딩 시 expansion이 머지되는지 확인 (브라우저).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(CTP): expansion 사전에 신규 21개 매핑 placeholder + hash-collision 키 정렬

신규 module-01~04 커리큘럼의 lesson ID와 expansion 키 양방향 정합.
collision → hash-collision으로 키 통일 (커리큘럼 ID와 매칭).
Phase 1 Content Specialist가 placeholder를 실제 콘텐츠로 채움."
```

---

## Task 3: ConceptSpec 컨트랙트 작성

### Task 3.1: TypeScript 인터페이스 + 샘플 JSON 작성

**Files:**
- Create: `web/data/ctp/specs/concept-spec.ts`
- Create: `web/data/ctp/specs/samples/binary-search.json`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p web/data/ctp/specs/samples
```

- [ ] **Step 2: concept-spec.ts 작성**

`web/data/ctp/specs/concept-spec.ts`:
```typescript
export type Domain =
  | "stack" | "queue" | "list" | "tree" | "graph"
  | "array" | "sort" | "string" | "hash" | "recursion";

export type VisualizerType =
  | "array" | "stack-bar" | "queue-ring" | "linked-list" | "tree" | "bst"
  | "sort-bars" | "string-pointer" | "hash-table" | "recursion-tree" | "backtracking-board";

export type ModuleId =
  | "module-01-foundation" | "module-02-stack-recursion"
  | "module-03-sorting-string" | "module-04-list-tree-final";

export interface StoryboardStep {
  step: number;
  description: string;
  stateAfter: unknown;
  highlight?: string;
}

export interface ConceptSpec {
  id: string;
  moduleId: ModuleId;
  conceptId: string;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];
  learningOutcomes: string[];
  simulation: {
    mode: "interactive" | "code";
    domain: Domain;
    stepCount: number;
    operations: string[];
    initialState: unknown;
    storyboard: StoryboardStep[];
  };
  visualizer: {
    type: VisualizerType;
    primaryColor?: string;
    showIndices?: boolean;
    showPointers?: string[];
  };
  supplementary: Array<{
    title: string;
    description: string;
    visualHint: string;
  }>;
  content: {
    story: {
      problem: string;
      definition: string;
      analogy: string;
    };
    features: Array<{
      title: string;
      description: string;
      icon?: string;
    }>;
    complexity?: {
      access: string;
      search: string;
      insertion: string;
      deletion: string;
    };
  };
}

export function validateConceptSpec(spec: unknown): asserts spec is ConceptSpec {
  if (!spec || typeof spec !== "object") {
    throw new Error("ConceptSpec must be an object");
  }
  const s = spec as Record<string, unknown>;
  if (typeof s.id !== "string") throw new Error("id must be string");
  if (typeof s.title !== "string") throw new Error("title must be string");
  if (!s.content || typeof s.content !== "object") throw new Error("content required");
  const content = s.content as Record<string, unknown>;
  const story = content.story as Record<string, unknown> | undefined;
  if (!story?.problem || !story?.definition || !story?.analogy) {
    throw new Error("story.problem/definition/analogy all required");
  }
  if (!Array.isArray(content.features) || content.features.length !== 4) {
    throw new Error("features must be exactly 4");
  }
}
```

- [ ] **Step 3: 샘플 binary-search.json 작성**

`web/data/ctp/specs/samples/binary-search.json`:
```json
{
  "id": "basic-binary-search",
  "moduleId": "module-01-foundation",
  "conceptId": "search-algorithms",
  "title": "03-3 이진 검색 기초",
  "difficulty": "beginner",
  "prerequisites": ["1d-array", "linear-search"],
  "learningOutcomes": [
    "정렬된 배열에서 O(log N) 탐색이 가능한 이유 이해",
    "L/M/R 포인터 이동 규칙 체득",
    "선형 탐색 대비 step 수 차이 측정"
  ],
  "simulation": {
    "mode": "interactive",
    "domain": "array",
    "stepCount": 6,
    "operations": ["next", "prev", "reset"],
    "initialState": { "arr": [1, 3, 5, 7, 9, 11, 13], "target": 11 },
    "storyboard": [
      { "step": 0, "description": "정렬된 배열과 타깃 11을 확인합니다.", "stateAfter": { "L": -1, "R": -1 } },
      { "step": 1, "description": "L=0, R=6 으로 초기화합니다.", "stateAfter": { "L": 0, "R": 6 } },
      { "step": 2, "description": "M=(0+6)/2=3, arr[3]=7 < 11 이므로 L=M+1.", "stateAfter": { "L": 4, "R": 6, "M": 3 } },
      { "step": 3, "description": "M=(4+6)/2=5, arr[5]=11 == 타깃! 찾았습니다.", "stateAfter": { "L": 4, "R": 6, "M": 5, "found": true } }
    ]
  },
  "visualizer": {
    "type": "array",
    "showIndices": true,
    "showPointers": ["L", "M", "R"]
  },
  "supplementary": [
    { "title": "절반씩 줄어드는 탐색 공간", "description": "각 단계마다 후보 구간이 절반으로 줄어듭니다.", "visualHint": "남은 구간을 파란색 박스로 강조" },
    { "title": "O(log N) 직관", "description": "N=1000 도 약 10 step.", "visualHint": "막대 그래프로 N vs step 수 비교" },
    { "title": "정렬 전제의 중요성", "description": "정렬되지 않으면 사용 불가.", "visualHint": "정렬 안 된 배열에 X 표시" },
    { "title": "L > R 종료 조건", "description": "구간이 사라지면 -1 반환.", "visualHint": "L과 R이 교차하는 순간 빨간색 표시" }
  ],
  "content": {
    "story": {
      "problem": "정렬된 7개 숫자 배열에서 값 11이 몇 번 인덱스에 있는지 가장 빠르게 찾으려면 어떻게 해야 할까요? 처음부터 하나씩 비교하면 7번까지 봐야 할 수 있습니다.",
      "definition": "이진 검색은 정렬된 배열에서 절반씩 후보 구간을 줄여나가는 검색 알고리즘입니다.\n- 핵심 변수: L(왼쪽 끝), R(오른쪽 끝), M(중간 인덱스)\n- 매 단계: arr[M]을 타깃과 비교해 L 또는 R 갱신\n- 시간 복잡도: O(log N)",
      "analogy": "전화번호부에서 특정 이름을 찾을 때 책의 한가운데를 펴서 알파벳을 비교하는 방식과 같습니다. 한 페이지씩 넘기지 않고 절반을 한 번에 잘라냅니다."
    },
    "features": [
      { "title": "L/M/R 포인터", "description": "세 변수만으로 후보 구간을 표현합니다. M은 (L+R)/2.", "icon": "compass" },
      { "title": "정렬 전제", "description": "배열이 정렬되어 있어야만 동작합니다. 정렬되지 않은 데이터에는 선형 탐색.", "icon": "alert" },
      { "title": "O(log N) 효율", "description": "N=1000도 약 10 step. N=1,000,000도 약 20 step만 필요합니다.", "icon": "trending-down" },
      { "title": "종료 조건", "description": "L > R 이 되면 타깃이 없는 것. -1 또는 false 반환.", "icon": "check-circle" }
    ]
  }
}
```

- [ ] **Step 4: 빌드 + import 확인**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(CTP): ConceptSpec TypeScript 컨트랙트 + binary-search 샘플

Phase 1 멀티에이전트가 입력으로 사용할 표준 spec 인터페이스.
validateConceptSpec runtime guard 포함.
binary-search.json은 인터페이스 검증용 1개 샘플."
```

---

### Task 3.2: ConceptSpec validate 테스트

**Files:**
- Create: `web/data/ctp/specs/concept-spec.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

`web/data/ctp/specs/concept-spec.test.ts`:
```typescript
import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateConceptSpec } from "./concept-spec";

describe("ConceptSpec", () => {
  it("validates binary-search sample", () => {
    const json = readFileSync(
      resolve(__dirname, "samples/binary-search.json"),
      "utf-8"
    );
    const spec = JSON.parse(json);
    validateConceptSpec(spec);
    assert.equal(spec.id, "basic-binary-search");
  });

  it("rejects missing story.analogy", () => {
    const bad = {
      id: "x", title: "X",
      content: { story: { problem: "p", definition: "d" }, features: [] },
    };
    assert.throws(() => validateConceptSpec(bad), /story.problem\/definition\/analogy/);
  });

  it("rejects features count !== 4", () => {
    const bad = {
      id: "x", title: "X",
      content: {
        story: { problem: "p", definition: "d", analogy: "a" },
        features: [],
      },
    };
    assert.throws(() => validateConceptSpec(bad), /features must be exactly 4/);
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
cd web && pnpm exec tsx --test data/ctp/specs/concept-spec.test.ts
```

Expected: 3 tests pass

- [ ] **Step 3: package.json에 test script 추가**

`web/package.json` scripts에:
```json
"test:ctp-specs": "tsx --test data/ctp/specs/*.test.ts"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(CTP): ConceptSpec validateConceptSpec 단위 테스트 3건

binary-search 샘플 정합 + 누락 필드 거부 2건."
```

---

## Task 4: Design Primitive 라이브러리

### Task 4.1: 디렉토리 + colorTokens 작성

**Files:**
- Create: `web/components/features/ctp/playground/visualizers/shared/svg-primitives/colorTokens.ts`
- Create: `web/components/features/ctp/playground/visualizers/shared/svg-primitives/index.ts`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p web/components/features/ctp/playground/visualizers/shared/svg-primitives
```

- [ ] **Step 2: colorTokens.ts 작성**

```typescript
// CTP 시각화 공통 색상 토큰. Tailwind semantic token과 매칭.
export const colorTokens = {
  default: "hsl(var(--muted))",
  active: "hsl(var(--primary))",
  comparing: "hsl(var(--warning, 38 92% 50%))",
  found: "hsl(var(--success, 142 71% 45%))",
  muted: "hsl(var(--muted-foreground))",
  pointer: "hsl(var(--accent))",
  text: "hsl(var(--foreground))",
  background: "hsl(var(--background))",
  border: "hsl(var(--border))",
} as const;

export type ColorToken = keyof typeof colorTokens;
```

- [ ] **Step 3: index.ts (배럴) 작성 — 빈 골격**

```typescript
export { colorTokens, type ColorToken } from "./colorTokens";
// 이후 task에서 컴포넌트들이 추가됨
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(CTP): svg-primitives 디렉토리 + colorTokens 추가

CTP 시각화 30+ 파일에서 중복되는 색상 정의 통합 1단계."
```

---

### Task 4.2: CyberGrid 작성

**Files:**
- Create: `web/components/features/ctp/playground/visualizers/shared/svg-primitives/CyberGrid.tsx`
- Modify: `web/components/features/ctp/playground/visualizers/shared/svg-primitives/index.ts`

- [ ] **Step 1: CyberGrid.tsx 작성**

```tsx
"use client";

interface CyberGridProps {
  width?: number;
  height?: number;
  gridSize?: number;
  opacity?: number;
}

export function CyberGrid({
  width = 800,
  height = 500,
  gridSize = 40,
  opacity = 0.15,
}: CyberGridProps) {
  return (
    <g aria-hidden opacity={opacity}>
      <defs>
        <pattern id="cyber-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={0.5}
          />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#cyber-grid)" />
    </g>
  );
}
```

- [ ] **Step 2: index.ts에 export 추가**

```typescript
export { CyberGrid } from "./CyberGrid";
```

- [ ] **Step 3: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(CTP): svg-primitives/CyberGrid 컴포넌트

basic-binary-search.tsx, bubble-sort.tsx 등 30+ visualizer에서
중복 정의된 grid pattern 통합."
```

---

### Task 4.3: NeonGlowFilters 작성

**Files:**
- Create: `web/components/features/ctp/playground/visualizers/shared/svg-primitives/NeonGlowFilters.tsx`
- Modify: `web/components/features/ctp/playground/visualizers/shared/svg-primitives/index.ts`

- [ ] **Step 1: NeonGlowFilters.tsx 작성**

```tsx
"use client";

const GLOW_COLORS = ["primary", "warning", "success", "danger", "accent"] as const;

export function NeonGlowFilters() {
  return (
    <defs>
      {GLOW_COLORS.map((color) => (
        <filter id={`neon-glow-${color}`} key={color} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      ))}
    </defs>
  );
}
```

- [ ] **Step 2: index.ts에 export 추가**

- [ ] **Step 3: 빌드 + Commit**

```bash
git add -A
git commit -m "feat(CTP): svg-primitives/NeonGlowFilters 컴포넌트

5색(primary/warning/success/danger/accent) glow filter 사전 정의.
각 visualizer는 filter='url(#neon-glow-primary)' 형태로 사용."
```

---

### Task 4.4: IndexLabel 작성

**Files:**
- Create: `web/components/features/ctp/playground/visualizers/shared/svg-primitives/IndexLabel.tsx`

- [ ] **Step 1: 작성**

```tsx
"use client";

interface IndexLabelProps {
  x: number;
  y: number;
  index: number;
  size?: number;
}

export function IndexLabel({ x, y, index, size = 12 }: IndexLabelProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={size}
      fill="hsl(var(--muted-foreground))"
      fontFamily="ui-monospace, monospace"
    >
      {index}
    </text>
  );
}
```

- [ ] **Step 2: index.ts 업데이트 + Commit**

```bash
git add -A
git commit -m "feat(CTP): svg-primitives/IndexLabel 컴포넌트"
```

---

### Task 4.5: ArrayBox 작성

**Files:**
- Create: `web/components/features/ctp/playground/visualizers/shared/svg-primitives/ArrayBox.tsx`

- [ ] **Step 1: 작성**

```tsx
"use client";

import { motion } from "framer-motion";
import { colorTokens, type ColorToken } from "./colorTokens";

interface ArrayBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string | number;
  status?: ColorToken;
  showGlow?: boolean;
}

export function ArrayBox({
  x, y, width, height, value,
  status = "default",
  showGlow = false,
}: ArrayBoxProps) {
  const fill = colorTokens[status];
  return (
    <motion.g
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      filter={showGlow ? `url(#neon-glow-${status === "default" ? "primary" : status})` : undefined}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="hsl(var(--border))"
        strokeWidth={1.5}
        rx={4}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(width, height) * 0.4}
        fill="hsl(var(--background))"
        fontWeight={600}
      >
        {value}
      </text>
    </motion.g>
  );
}
```

- [ ] **Step 2: index.ts 업데이트 + 빌드 + Commit**

```bash
git add -A
git commit -m "feat(CTP): svg-primitives/ArrayBox 컴포넌트

배열 원소 박스. status prop으로 default/active/comparing/found/muted/pointer
색상 분기. framer-motion fade-in 포함."
```

---

### Task 4.6: 나머지 5개 컴포넌트 작성

**Files:**
- Create: `PointerArrow.tsx`, `StepCounter.tsx`, `LogPanel.tsx`, `NodeCircle.tsx`, `EdgeLine.tsx`

각 컴포넌트 명세는 다음 표를 따른다.

| 컴포넌트 | 책임 | 핵심 props |
|---|---|---|
| `PointerArrow` | L/R/M 같은 포인터 화살표 | `x, y, label, color?` |
| `StepCounter` | "Step 3 / 7" 표시 | `current, total, className?` |
| `LogPanel` | 단계별 한국어 로그 리스트 | `logs: string[], maxLines?: number` |
| `NodeCircle` | 트리/리스트 노드 원 | `cx, cy, r, value, status?, showGlow?` |
| `EdgeLine` | 노드 간 연결선 | `x1, y1, x2, y2, status?, arrow?` |

- [ ] **Step 1: PointerArrow.tsx 작성**

```tsx
"use client";

import { motion } from "framer-motion";

interface PointerArrowProps {
  x: number;
  y: number;
  label: string;
  color?: string;
  direction?: "down" | "up" | "left" | "right";
}

export function PointerArrow({ x, y, label, color = "hsl(var(--primary))", direction = "down" }: PointerArrowProps) {
  const rotation = { down: 0, up: 180, left: 90, right: -90 }[direction];
  return (
    <motion.g
      initial={{ y: y - 4, opacity: 0 }}
      animate={{ y, opacity: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
    >
      <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
        <path d="M 0 0 L -6 -10 L 6 -10 Z" fill={color} />
      </g>
      <text
        x={x}
        y={y - 18}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={color}
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
    </motion.g>
  );
}
```

- [ ] **Step 2: StepCounter.tsx 작성**

```tsx
"use client";

interface StepCounterProps {
  current: number;
  total: number;
  className?: string;
}

export function StepCounter({ current, total, className }: StepCounterProps) {
  return (
    <div className={`text-xs font-mono text-muted-foreground ${className ?? ""}`}>
      Step <span className="text-foreground font-semibold">{current}</span> / {total}
    </div>
  );
}
```

- [ ] **Step 3: LogPanel.tsx 작성**

```tsx
"use client";

interface LogPanelProps {
  logs: string[];
  maxLines?: number;
}

export function LogPanel({ logs, maxLines = 6 }: LogPanelProps) {
  const visible = logs.slice(-maxLines);
  return (
    <div className="bg-muted/40 rounded-md p-3 text-xs font-mono space-y-1 h-32 overflow-y-auto">
      {visible.length === 0 ? (
        <div className="text-muted-foreground italic">실행 로그가 여기 표시됩니다.</div>
      ) : (
        visible.map((log, i) => (
          <div key={i} className="text-foreground/80">
            <span className="text-muted-foreground mr-2">{logs.length - visible.length + i + 1}.</span>
            {log}
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 4: NodeCircle.tsx 작성**

```tsx
"use client";

import { motion } from "framer-motion";
import { colorTokens, type ColorToken } from "./colorTokens";

interface NodeCircleProps {
  cx: number;
  cy: number;
  r: number;
  value: string | number;
  status?: ColorToken;
  showGlow?: boolean;
}

export function NodeCircle({ cx, cy, r, value, status = "default", showGlow = false }: NodeCircleProps) {
  const fill = colorTokens[status];
  return (
    <motion.g
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      filter={showGlow ? `url(#neon-glow-${status === "default" ? "primary" : status})` : undefined}
    >
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="hsl(var(--border))" strokeWidth={1.5} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={r * 0.7}
        fill="hsl(var(--background))"
        fontWeight={600}
      >
        {value}
      </text>
    </motion.g>
  );
}
```

- [ ] **Step 5: EdgeLine.tsx 작성**

```tsx
"use client";

import { colorTokens, type ColorToken } from "./colorTokens";

interface EdgeLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  status?: ColorToken;
  arrow?: boolean;
  label?: string;
}

export function EdgeLine({ x1, y1, x2, y2, status = "default", arrow = false, label }: EdgeLineProps) {
  const stroke = colorTokens[status === "default" ? "muted" : status];
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={stroke}
        strokeWidth={2}
        markerEnd={arrow ? "url(#edge-arrow)" : undefined}
      />
      {arrow && (
        <defs>
          <marker id="edge-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
          </marker>
        </defs>
      )}
      {label && (
        <text x={midX} y={midY - 6} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
          {label}
        </text>
      )}
    </g>
  );
}
```

- [ ] **Step 6: index.ts 최종 업데이트**

```typescript
export { colorTokens, type ColorToken } from "./colorTokens";
export { CyberGrid } from "./CyberGrid";
export { NeonGlowFilters } from "./NeonGlowFilters";
export { IndexLabel } from "./IndexLabel";
export { ArrayBox } from "./ArrayBox";
export { PointerArrow } from "./PointerArrow";
export { StepCounter } from "./StepCounter";
export { LogPanel } from "./LogPanel";
export { NodeCircle } from "./NodeCircle";
export { EdgeLine } from "./EdgeLine";
```

- [ ] **Step 7: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(CTP): svg-primitives 라이브러리 11개 컴포넌트 완성

PointerArrow/StepCounter/LogPanel/NodeCircle/EdgeLine 추가.
Phase 1 Visualizer Specialist가 이 라이브러리만 import하도록 강제됨."
```

---

### Task 4.7: 기존 visualizer 1개를 primitive로 마이그레이션 (PoC)

`module-01/basic-binary-search.tsx`를 svg-primitives 기반으로 재작성해 라이브러리 검증.

**Files:**
- Modify: `web/components/features/ctp/playground/visualizers/svg-animations/module-01/basic-binary-search.tsx`

- [ ] **Step 1: 기존 inline grid/glow 정의를 primitive import로 교체**

```tsx
// 변경 전: 파일 내부 <pattern id="cyber-grid">...
// 변경 후:
import { CyberGrid, NeonGlowFilters, ArrayBox, PointerArrow } from "../../shared/svg-primitives";

export function BasicBinarySearchVisualizer({ data }: { data: { step: number } }) {
  // ... 기존 step 분기 로직 유지
  return (
    <svg viewBox="0 0 800 500">
      <CyberGrid width={800} height={500} />
      <NeonGlowFilters />
      {/* 기존 박스 배열을 ArrayBox 컴포넌트로 교체 */}
      {arr.map((value, i) => (
        <ArrayBox
          key={i}
          x={50 + i * 100}
          y={200}
          width={80}
          height={60}
          value={value}
          status={i === M ? "comparing" : i < L || i > R ? "muted" : "default"}
        />
      ))}
      {/* L/R/M 포인터를 PointerArrow로 */}
      {L >= 0 && <PointerArrow x={50 + L * 100 + 40} y={280} label="L" />}
      {R >= 0 && <PointerArrow x={50 + R * 100 + 40} y={280} label="R" color="hsl(var(--warning))" />}
      {M >= 0 && <PointerArrow x={50 + M * 100 + 40} y={170} label="M" direction="up" color="hsl(var(--primary))" />}
    </svg>
  );
}
```

- [ ] **Step 2: 시각적 비교 (브라우저)**

```bash
cd web && pnpm dev
```

`/insights/ctp/module-01-foundation/search-algorithms?view=basic-binary-search` 페이지를 열어 visualizer가 정상 렌더링 되는지 확인.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(CTP): basic-binary-search visualizer를 svg-primitives 기반으로 마이그레이션

라이브러리 사용 PoC. 동일 시각 결과를 유지하면서 LOC ~30% 감소 + 디자인 토큰 일관성."
```

---

## Task 5: Tone Guide 문서 작성

### Task 5.1: TONE_GUIDE.md 작성

**Files:**
- Create: `docs/CTP/foundation/TONE_GUIDE.md`

- [ ] **Step 1: 파일 작성**

`docs/CTP/foundation/TONE_GUIDE.md`:
```markdown
# CTP 콘텐츠 톤 가이드

> Phase 1 Content Specialist가 따라야 하는 글쓰기 규칙. G4 자동 검사 기준.

## 기준 톤: module-02 (차분 비즈니스)

module-02-stack-recursion.tsx의 story 작성 스타일을 기준선으로 한다.

### 표준 분량
- `story.problem`: 2-3 문장
- `story.definition`: 3-5 문장 (글머리표 3개 권장)
- `story.analogy`: 2-3 문장
- `features[]`: 정확히 4개, 각 description 2-3 문장

### 문장 측정 기준
문장 = `.`, `?`, `!` 구두점 카운트. 글머리표 항목 1개 = 1 문장.

## 톤 원칙

### 1. 차분한 비즈니스 문체
- module-01의 화려한 형용사 ("미슐랭 3스타", "잔혹한", "압도적인", "신비한 지휘관")는 **금지**
- 동사 위주, 명료한 단언
- 학습자를 가르치되 권위적이지 않게

### 2. 한국어 기본 + 영문 첫 등장 시 1회 병기
- 첫 등장: `이진 검색(Binary Search)`
- 같은 단어 재등장 시 한글만 사용
- 표준 약어(LIFO, BST, KMP, LPS, Big-O)는 영문 그대로
- 한 컨셉당 영문 병기 5-8회 권장 (module-01의 8-15회는 줄임)

### 3. 일상 비유 사전
한국 학습자에게 친숙한 사물·상황을 우선 사용.

**기존 비유 (모듈-01~03에서 사용 중)**:
- 자료구조: 도서관, 사물함, 트럼프 카드, 사전, 시계
- 알고리즘: 명탐정, 자율주행, 미슐랭 주방(→ 일반 주방으로 다듬기)
- 스택/큐: 접시 더미, 놀이공원 줄, 좁은 주차장, 시계 초침
- 정렬: 카드 게임, 키 순서 줄서기, 책 찾기, 머리 빗기, 사전 합치기
- 문자열: 오답 노트, 터널 점프(BM)
- 재귀: 러시아 인형(마트료시카), 미로, 프로젝트 예산 트리

**module-04 신규 비유** (사용 권장):
- 연결 리스트: 기차 객차 (singly), 양방향 도로 (doubly), 회전 초밥 벨트/원형 트랙 (circular), 주차장 자리 번호 (cursor)
- 트리: 회사 조직도, 가족 계보, 책 목차
- BST: 사전 색인, 도서 정리 규칙

### 4. 비유 → 정의 → 코드 순서
모든 컨셉은 분야 비유로 시작 → 형식 정의 → 코드 예시 순서.
정의를 먼저 던지지 않는다.

## 모듈별 톤 조정 결과

- **module-01**: 현재 톤이 너무 화려함. Phase 3에서 형용사 정리.
- **module-02**: 기준 톤. 그대로 유지.
- **module-03**: 현재 story 1문장씩으로 너무 짧음. Phase 1 Tier 3에서 module-02 분량으로 확장.
- **module-04**: 대부분 빈 상태. Phase 1+2에서 module-02 톤으로 신규 작성.

## 금지 표현

- ❌ "압도적인", "잔혹한", "신비한", "미슐랭", "외과 수술 같은"
- ❌ "~~~를 정복하세요!", "마스터하기"
- ❌ 이모지 (학습 콘텐츠 본문에는 사용 금지)
- ❌ 영문만으로 끝나는 문장 ("This is Big-O notation.")

## G4 자동 검사 통과 조건

`scripts/ctp-verify.mjs` G4가 각 ConceptSpec에 대해 다음을 검사:
- story.problem 문장 수 >= 2
- story.definition 문장 수 >= 3
- story.analogy 문장 수 >= 2
- features 개수 === 4
- features[].description 문장 수 >= 2 (각각)
- 금지 표현 매치 === 0
```

- [ ] **Step 2: Commit**

```bash
git add docs/CTP/foundation/TONE_GUIDE.md
git commit -m "docs(CTP): TONE_GUIDE.md 작성

Phase 1 Content Specialist 기준 톤 가이드.
module-02 차분 비즈니스 톤을 기준선으로 통일.
일상 비유 사전 + 금지 표현 + G4 자동 검사 조건 명시."
```

---

## Task 6: 핵심 문서 4개 정합화

각 문서는 개별 commit으로 분리.

### Task 6.1: ARCHITECTURE.md 재작성

**Files:**
- Modify: `docs/CTP/foundation/ARCHITECTURE.md`

- [ ] **Step 1: 부재 인프라 행 제거**

ARCHITECTURE.md 라인 33-35 일대의 다음 행 제거:
- `web/components/features/ctp/adapters/**` (부재)
- `web/hooks/use-skulpt-engine.ts` (부재)
- `AdapterFactory` 언급

- [ ] **Step 2: sub-concepts 디렉토리 가정 부분 제거**

라인 43-47 부근의 `sub-concepts/<subConceptId>/config.ts + logic.ts + visualizer.tsx` 설명을 다음으로 교체:
```markdown
### 컨셉 정의 단위

현재 구조 (2026-02 신규 커리큘럼 도입 후):

- `web/components/features/ctp/contents/categories/modules/module-XX-*.tsx`: 한 모듈당 단일 파일.
  내부에서 `createInteractiveTemplateModules([...])` 호출로 sub-concept 모듈 객체 배열 생성.
- 각 sub-concept은 `useSim` 훅 + `Visualizer` 컴포넌트 1쌍을 가지며, 둘 다 `svg-animations/module-XX/<id>.tsx`에 정의.
- 보조 일러스트(supp)는 `svg-animations/module-XX/supp/<id>-supp.tsx`에 4개 SVG export.
```

- [ ] **Step 3: DFS/BFS 잔재 행 제거**

라인 78-81의 "DFS/BFS는 `algorithms/concepts/dfs-bfs/sub-concepts/*`에 공용으로 존재"는 옛 구조 잔재. 신규 커리큘럼에 DFS/BFS lesson이 없으므로 행 자체 제거.

- [ ] **Step 4: Commit**

```bash
git add docs/CTP/foundation/ARCHITECTURE.md
git commit -m "docs(CTP): ARCHITECTURE.md 코드 정합화

- 부재 인프라(adapters/, use-skulpt-engine.ts) 행 제거
- sub-concepts 디렉토리 가정 → module-XX-*.tsx 단일 파일 구조로
- DFS/BFS 옛 잔재 행 제거"
```

---

### Task 6.2: SIMULATION_PIPELINE.md 재작성

**Files:**
- Modify: `docs/CTP/foundation/SIMULATION_PIPELINE.md`

- [ ] **Step 1: 옛 Skulpt step 흐름 섹션 제거**

라인 14-32의 다음 내용 제거:
- `useSkulptEngine.run(code)` 흐름
- `BATCH_STEPS` 메시지 → `dataMapper(adapter)` → `useCTPStore.setSteps` 의 4단계
- "56 서브컨셉 기준 code 50, interactive 6" 카운트

대신 현재 흐름을 다음으로 작성:
```markdown
## 현재 실행 모드

### Interactive 모드 (대부분의 컨셉)
- `config.mode === "interactive"` 또는 미지정
- 사용자가 Run/Push/Pop/Peek/Reset 버튼 조작
- `useXxxSim` 훅이 자체 useState로 step 시퀀스를 보유하고 peek()로 한 칸씩 전진
- `CTPInteractiveModule`이 좌측 Visualizer + 우측 Operation Panel + 학습 노트 렌더

### Code 모드 (현재는 통합 챕터 4개에서만 ProblemBank로 사용)
- `config.mode === "code"`
- Monaco 에디터에 사용자 코드 작성 → 제출 → `BrowserJudge.run`이 새 Web Worker(`/workers/skulpt.worker.js`) 생성
- Skulpt 인터프리터가 testCase의 stdin을 받아 stdout 생성
- normalize 후 expected와 비교해 verdict(AC/WA/TLE/RTE/OLE) 산출
- 시각화는 없음. 채점 결과만 표시

### Skulpt Worker 인프라
Skulpt Worker는 trace()/captureGlobals API를 갖췄으나 현재는 **Problem Bank 채점 경로에서만 사용**된다.
시각화 모듈로 연결하는 어댑터는 Phase 4(보류)에서 작성 예정.
```

- [ ] **Step 2: Visualizer 계약 표 정리**

라인 74-84 부근의 부재 컴포넌트 행 제거: `LinkedListGraphVisualizer`, `TreeGraphVisualizer`, `GraphSvgVisualizer`, `SortingBarVisualizer` 모두 코드에 부재.

실제 존재하는 visualizer 목록으로 재작성:
```markdown
## 현재 존재하는 Visualizer (실재 컴포넌트만)

| 도메인 | 컴포넌트 | 위치 |
|---|---|---|
| Array | `ArrayGraphVisualizer` | `playground/visualizers/array/graph/array-graph-visualizer.tsx` |
| Stack | `StackGraphVisualizer` | `playground/visualizers/stack/graph/stack-graph-visualizer.tsx` |
| Module-01~03 도메인별 | `<Name>Visualizer` (예: `BasicBinarySearchVisualizer`) | `playground/visualizers/svg-animations/module-XX/<id>.tsx` |
| Phase 1+2 신규 (예정) | `<Name>Visualizer` for module-04 | `playground/visualizers/svg-animations/module-04/<id>.tsx` |
```

- [ ] **Step 3: Commit**

```bash
git add docs/CTP/foundation/SIMULATION_PIPELINE.md
git commit -m "docs(CTP): SIMULATION_PIPELINE.md 코드 정합화

- 옛 Skulpt step 흐름(useSkulptEngine/AdapterFactory) 제거
- 현재 Interactive + Problem Bank 흐름으로 재작성
- 부재 컴포넌트(LinkedList/Tree/Graph/SortingBar Visualizer) 행 제거"
```

---

### Task 6.3: MAINTENANCE_PLAYBOOK.md 전면 재작성

**Files:**
- Modify: `docs/CTP/operations/MAINTENANCE_PLAYBOOK.md`

- [ ] **Step 1: 기존 내용 전체 교체**

기존 sub-concepts 구조 가정 절차를 모두 제거하고 다음으로 재작성:

```markdown
# CTP 유지보수 플레이북

> 신규 컨셉 추가 / 기존 컨셉 수정 / ID 변경 시 따라야 하는 절차.

## 신규 sub-concept 추가 절차

1. **ConceptSpec JSON 작성**
   - 위치: `web/data/ctp/specs/<conceptId>.json`
   - 형식: `web/data/ctp/specs/concept-spec.ts`의 `ConceptSpec` 인터페이스 준수
   - `validateConceptSpec()`로 사전 검증

2. **Visualizer 작성** (시각화가 필요한 경우)
   - 위치: `web/components/features/ctp/playground/visualizers/svg-animations/module-XX/<id>.tsx`
   - export: `useXxxSim` 훅 + `XxxVisualizer` 컴포넌트
   - import 제약: `svg-primitives/` 라이브러리만 사용. hardcoded 색상/grid 금지
   - supp: `supp/<id>-supp.tsx`에 4개 SVG 컴포넌트 + `XxxSupplementaryOptions` 배열 export

3. **모듈 등록**
   - 해당 모듈 파일(`module-XX-*.tsx`) 안 `createInteractiveTemplateModules([...])` 배열에 새 항목 추가
   - 필드: `{ id, title, description, sampleData, story, features, useSim, Visualizer }`
   - `id`는 ConceptSpec의 `id`와 동일해야 함

4. **커리큘럼 등록**
   - `web/lib/ctp-curriculum.ts`의 해당 concept `subConcepts` 배열에 `{ id, title }` 추가

5. **(선택) Expansion 매핑**
   - `ctp-content-expansion.ts`에 같은 `id` 키로 추가 콘텐츠 보강 가능
   - fc-1~4와 ProblemBank 컨셉은 매핑 무관

6. **검증**
   ```bash
   pnpm exec node scripts/ctp-verify.mjs --concept <id>
   ```
   G1-G7 모두 PASS 확인 후 commit.

## ID 변경 시 동기화 4곳

같은 ID가 다음 4곳에서 키로 사용된다. 하나라도 누락하면 404 또는 매핑 깨짐:
1. `ctp-curriculum.ts`의 subConcept ID
2. `module-XX-*.tsx`의 `createInteractiveTemplateModules` 항목 `id`
3. URL `?view=<id>` 쿼리
4. `ctp-content-expansion.ts`의 expansions 키 (선택)

ID rename 시 위 4곳 동시 수정 + `ctp-verify.mjs` G3, G7 통과 확인.

## 기존 컨셉 콘텐츠 수정

- story/features 만 수정: 모듈 파일만 수정 + Tone Guide 준수 + G4 통과
- Visualizer 수정: 해당 `svg-animations/module-XX/<id>.tsx` + ConceptSpec storyboard 동기화

## 검증 명령 모음

```bash
# 단일 컨셉 검증
pnpm exec node scripts/ctp-verify.mjs --concept <id>

# 전체 컨셉 검증 (CI)
pnpm exec node scripts/ctp-verify.mjs --all

# 타입 검사
pnpm exec tsc --noEmit

# 빌드 검증
pnpm exec next build
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/CTP/operations/MAINTENANCE_PLAYBOOK.md
git commit -m "docs(CTP): MAINTENANCE_PLAYBOOK.md 전면 재작성

기존 sub-concepts 디렉토리 구조 가정을 제거하고
현재 module-XX-*.tsx 단일 파일 + ConceptSpec 기반 절차로 교체.
신규 작업자가 따라도 잘못된 디렉토리에 파일 만들 위험 제거."
```

---

### Task 6.4: CONSISTENCY_GUIDELINES.md + PROBLEM_BANK_PLAN.md 정정

**Files:**
- Modify: `docs/CTP/operations/CONSISTENCY_GUIDELINES.md`
- Modify: `docs/CTP/upgrades/PROBLEM_BANK_PLAN.md`

- [ ] **Step 1: CONSISTENCY_GUIDELINES.md 섹션 순서 정정**

라인 23-30 부근:
```markdown
# 변경 전
- 섹션 순서: Intro → Features → Visualization → Complexity → Implementation → Practice

# 변경 후
- 섹션 순서: 1.Intro → 2.Features → 3.Visualization → 4.Implementation → 5.Practice
- 주의: 옛 Complexity 섹션은 CTPComplexity 컴포넌트 dead 상태로 결락됨.
  현재 정책은 features 또는 expansion guide에서 시간복잡도를 다룸.
```

- [ ] **Step 2: PROBLEM_BANK_PLAN.md Status 갱신**

라인 1 부근:
```markdown
# 변경 전
**Status**: Planning
**Last updated**: 2026-02-23

# 변경 후
**Status**: Done (구현 완료, 4 통합 챕터 × 12 문제 = 48 문제 운영 중)
**Last updated**: 2026-05-22 (Phase 0 정합화)
```

또한 라인 15의 "15-20 curated problems per module" → "12 problems per module" 통일.

- [ ] **Step 3: Commit**

```bash
git add docs/CTP/operations/CONSISTENCY_GUIDELINES.md docs/CTP/upgrades/PROBLEM_BANK_PLAN.md
git commit -m "docs(CTP): CONSISTENCY_GUIDELINES 섹션 결락 반영 + PROBLEM_BANK_PLAN status Done

- CONSISTENCY: Complexity 섹션 결락 반영, 번호 4 결락 → 4.Implementation, 5.Practice로
- PROBLEM_BANK_PLAN: Status Planning → Done, 문제 개수 15-20 → 12 통일"
```

---

## Task 7: 자동 검증 스크립트 `ctp-verify.mjs` 작성

### Task 7.1: 검증 스크립트 골격 + G1, G2 구현

**Files:**
- Create: `web/scripts/ctp-verify.mjs`
- Modify: `web/package.json` (scripts 추가)

- [ ] **Step 1: 스크립트 디렉토리 확인 및 골격 작성**

```bash
mkdir -p web/scripts
```

`web/scripts/ctp-verify.mjs`:
```javascript
#!/usr/bin/env node
// CTP G1-G7 자동 검증 스크립트
// Usage:
//   node scripts/ctp-verify.mjs --concept basic-binary-search
//   node scripts/ctp-verify.mjs --all

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SPECS_DIR = join(ROOT, "data/ctp/specs");
const MODULES_DIR = join(ROOT, "components/features/ctp/contents/categories/modules");
const VISUALIZERS_DIR = join(ROOT, "components/features/ctp/playground/visualizers/svg-animations");

const args = process.argv.slice(2);
const conceptArg = args.find((a) => a.startsWith("--concept="))?.split("=")[1];
const allMode = args.includes("--all");

function logResult(conceptId, gate, status, reason = "") {
  const icon = status === "PASS" ? "✓" : status === "WARN" ? "⚠" : "✗";
  console.log(`  [${gate}] ${icon} ${status}${reason ? ` — ${reason}` : ""}`);
}

// G1: ConceptSpec.id가 useSim/Visualizer 이름과 일치
function g1_namingMatch(spec) {
  const id = spec.id;
  // useXxxSim 이름 추정: id를 PascalCase로 → useXxxSim
  const pascal = id.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join("");
  const expectedSim = `use${pascal}Sim`;
  const expectedViz = `${pascal}Visualizer`;
  const vizPath = join(VISUALIZERS_DIR, spec.moduleId.replace("module-", "module-").replace("-foundation", "-01").replace("-stack-recursion", "-02").replace("-sorting-string", "-03").replace("-list-tree-final", "-04"), `${id}.tsx`);
  // 더 단순한 매핑: moduleId → folder
  const moduleFolder = {
    "module-01-foundation": "module-01",
    "module-02-stack-recursion": "module-02",
    "module-03-sorting-string": "module-03",
    "module-04-list-tree-final": "module-04",
  }[spec.moduleId];
  const actualPath = join(VISUALIZERS_DIR, moduleFolder, `${id}.tsx`);
  if (!existsSync(actualPath)) {
    return { status: "FAIL", reason: `${actualPath} 파일 없음` };
  }
  const content = readFileSync(actualPath, "utf-8");
  const hasSim = content.includes(`function ${expectedSim}`) || content.includes(`const ${expectedSim}`) || content.includes(`export function ${expectedSim}`) || content.includes(`export const ${expectedSim}`);
  const hasViz = content.includes(`function ${expectedViz}`) || content.includes(`export function ${expectedViz}`);
  if (!hasSim) return { status: "FAIL", reason: `${expectedSim} 함수 없음` };
  if (!hasViz) return { status: "FAIL", reason: `${expectedViz} 컴포넌트 없음` };
  return { status: "PASS" };
}

// G2: 모듈 파일에 해당 conceptId가 등록되어 있는지
function g2_moduleRegistration(spec) {
  const moduleFile = {
    "module-01-foundation": "module-01-foundation.tsx",
    "module-02-stack-recursion": "module-02-stack-recursion.tsx",
    "module-03-sorting-string": "module-03-sorting-string.tsx",
    "module-04-list-tree-final": "module-04-list-tree-final.tsx",
  }[spec.moduleId];
  const path = join(MODULES_DIR, moduleFile);
  if (!existsSync(path)) return { status: "FAIL", reason: `${path} 없음` };
  const content = readFileSync(path, "utf-8");
  if (!content.includes(`id: "${spec.id}"`)) {
    return { status: "FAIL", reason: `module 파일에 id: "${spec.id}" 등록 안 됨` };
  }
  return { status: "PASS" };
}

function verifyConcept(conceptId) {
  const specPath = join(SPECS_DIR, `${conceptId}.json`);
  if (!existsSync(specPath)) {
    // samples 폴더도 확인
    const samplePath = join(SPECS_DIR, "samples", `${conceptId}.json`);
    if (!existsSync(samplePath)) {
      console.log(`✗ Spec not found: ${conceptId}`);
      return false;
    }
  }
  const spec = JSON.parse(readFileSync(
    existsSync(specPath) ? specPath : join(SPECS_DIR, "samples", `${conceptId}.json`),
    "utf-8"
  ));
  console.log(`\n=== ${conceptId} ===`);
  const g1 = g1_namingMatch(spec);
  logResult(conceptId, "G1", g1.status, g1.reason);
  const g2 = g2_moduleRegistration(spec);
  logResult(conceptId, "G2", g2.status, g2.reason);
  // G3-G7는 다음 sub-task에서 추가
  return g1.status === "PASS" && g2.status === "PASS";
}

if (conceptArg) {
  const ok = verifyConcept(conceptArg);
  process.exit(ok ? 0 : 1);
} else if (allMode) {
  console.log("All mode 미구현 — Phase 1에서 보완");
  process.exit(0);
} else {
  console.log("Usage: ctp-verify.mjs --concept=<id> | --all");
  process.exit(2);
}
```

- [ ] **Step 2: package.json scripts 추가**

`web/package.json`의 scripts에:
```json
"verify:ctp": "node scripts/ctp-verify.mjs",
"verify:ctp:sample": "node scripts/ctp-verify.mjs --concept=basic-binary-search"
```

- [ ] **Step 3: 샘플로 실행 검증**

```bash
cd web && pnpm verify:ctp:sample
```

Expected: G1 PASS, G2 PASS (basic-binary-search는 이미 코드에 존재)

- [ ] **Step 4: Commit**

```bash
git add web/scripts/ctp-verify.mjs web/package.json
git commit -m "feat(CTP): 검증 스크립트 ctp-verify.mjs 골격 + G1, G2 구현

G1: ConceptSpec.id ↔ useSim/Visualizer 이름 정합
G2: ConceptSpec.id ↔ module-XX-*.tsx 등록 정합
basic-binary-search 샘플 PASS 확인."
```

---

### Task 7.2: G3-G7 검증 추가

**Files:**
- Modify: `web/scripts/ctp-verify.mjs`

- [ ] **Step 1: G3 (expansion 매핑) 추가**

```javascript
function g3_expansionMapping(spec) {
  const expansionPath = join(ROOT, "components/features/ctp/contents/shared/ctp-content-expansion.ts");
  const content = readFileSync(expansionPath, "utf-8");
  const hasExpansion = content.includes(`"${spec.id}"`) || content.includes(`'${spec.id}'`);
  // module 파일 등록은 G2에서 검사. 둘 중 하나만 있으면 OK
  if (!hasExpansion) {
    return { status: "WARN", reason: "expansion 사전에 매핑 없음 (모듈 본문에는 있다면 OK)" };
  }
  return { status: "PASS" };
}
```

- [ ] **Step 2: G4 (Tone Guide) 추가**

```javascript
function countSentences(text) {
  // .?! 끝나는 문장 + 줄별 글머리표 카운트
  const punct = (text.match(/[.?!]/g) || []).length;
  const bullets = (text.match(/^\s*[-*]\s/gm) || []).length;
  return Math.max(punct, bullets);
}

const FORBIDDEN_WORDS = ["압도적", "잔혹", "신비한", "미슐랭", "마스터하기"];

function g4_toneGuide(spec) {
  const { story, features } = spec.content;
  const issues = [];
  if (countSentences(story.problem) < 2) issues.push("story.problem < 2 문장");
  if (countSentences(story.definition) < 3) issues.push("story.definition < 3 문장");
  if (countSentences(story.analogy) < 2) issues.push("story.analogy < 2 문장");
  if (features.length !== 4) issues.push(`features 개수 ${features.length} (4 필요)`);
  for (const f of features) {
    if (countSentences(f.description) < 2) issues.push(`feature "${f.title}" description < 2 문장`);
  }
  for (const word of FORBIDDEN_WORDS) {
    const joined = JSON.stringify(spec.content);
    if (joined.includes(word)) issues.push(`금지 표현 "${word}" 포함`);
  }
  if (issues.length > 0) return { status: "FAIL", reason: issues.join(", ") };
  return { status: "PASS" };
}
```

- [ ] **Step 3: G5 (primitive 사용) 추가**

```javascript
function g5_primitiveUsage(spec) {
  const moduleFolder = {
    "module-01-foundation": "module-01",
    "module-02-stack-recursion": "module-02",
    "module-03-sorting-string": "module-03",
    "module-04-list-tree-final": "module-04",
  }[spec.moduleId];
  const path = join(VISUALIZERS_DIR, moduleFolder, `${spec.id}.tsx`);
  if (!existsSync(path)) return { status: "FAIL", reason: "Visualizer 파일 없음" };
  const content = readFileSync(path, "utf-8");
  // hardcoded color hex 패턴
  const hexMatches = content.match(/#[0-9a-fA-F]{3,8}/g) || [];
  if (hexMatches.length > 0) {
    return { status: "FAIL", reason: `hardcoded hex 색상 ${hexMatches.length}개 발견 — svg-primitives/colorTokens 사용 권장` };
  }
  // inline NeonGlowFilter 정의 (NeonGlowFilters primitive 사용 권장)
  if (content.includes("<filter id=\"neon-glow") && !content.includes("import { NeonGlowFilters")) {
    return { status: "FAIL", reason: "inline neon-glow filter 정의 발견 — NeonGlowFilters primitive 사용 권장" };
  }
  return { status: "PASS" };
}
```

- [ ] **Step 4: G6 (Skulpt 실행) — 인터랙티브 모드는 면제**

```javascript
function g6_skulptExec(spec) {
  if (spec.simulation.mode !== "code") return { status: "PASS", reason: "interactive 모드 — 면제" };
  // code 모드의 경우 starter code Skulpt 실행 — Phase 0에서는 stub
  return { status: "WARN", reason: "G6 Skulpt 실행 검증은 Phase 4(어댑터 구현 시)에 활성화" };
}
```

- [ ] **Step 5: G7 (URL 매핑) 추가**

```javascript
function g7_urlMapping(spec) {
  const curriculumPath = join(ROOT, "lib/ctp-curriculum.ts");
  const content = readFileSync(curriculumPath, "utf-8");
  if (!content.includes(`id: "${spec.id}"`)) {
    return { status: "FAIL", reason: `ctp-curriculum.ts에 id: "${spec.id}" 등록 안 됨` };
  }
  return { status: "PASS" };
}
```

- [ ] **Step 6: verifyConcept에 G3-G7 호출 추가**

기존 `verifyConcept` 함수에 G3-G7 logResult 호출 추가:
```javascript
const g3 = g3_expansionMapping(spec);
logResult(conceptId, "G3", g3.status, g3.reason);
const g4 = g4_toneGuide(spec);
logResult(conceptId, "G4", g4.status, g4.reason);
const g5 = g5_primitiveUsage(spec);
logResult(conceptId, "G5", g5.status, g5.reason);
const g6 = g6_skulptExec(spec);
logResult(conceptId, "G6", g6.status, g6.reason);
const g7 = g7_urlMapping(spec);
logResult(conceptId, "G7", g7.status, g7.reason);
const allPass = [g1, g2, g3, g4, g5, g6, g7].every((r) => r.status !== "FAIL");
return allPass;
```

- [ ] **Step 7: --all 모드 구현**

```javascript
if (allMode) {
  const specs = readdirSync(SPECS_DIR).filter((f) => f.endsWith(".json"));
  let totalPass = 0;
  let totalFail = 0;
  for (const f of specs) {
    const id = f.replace(".json", "");
    const ok = verifyConcept(id);
    if (ok) totalPass++;
    else totalFail++;
  }
  console.log(`\n=== Summary ===`);
  console.log(`PASS: ${totalPass}, FAIL: ${totalFail}`);
  process.exit(totalFail === 0 ? 0 : 1);
}
```

- [ ] **Step 8: 샘플로 G1-G7 모두 실행**

```bash
cd web && pnpm verify:ctp:sample
```

Expected: G1 PASS, G2 PASS, G3 (WARN 또는 PASS), G4 PASS (binary-search 샘플은 톤 가이드 충족), G5 (현 PoC 마이그레이션 후 PASS), G6 PASS (interactive 모드), G7 PASS

- [ ] **Step 9: Commit**

```bash
git add web/scripts/ctp-verify.mjs
git commit -m "feat(CTP): ctp-verify.mjs G3-G7 검증 추가 + --all 모드

G3: expansion 매핑 (WARN)
G4: Tone Guide (문장 수 + 금지 표현)
G5: svg-primitive 사용 (hardcoded hex/inline filter 검사)
G6: Skulpt 실행 (Phase 4까지 stub)
G7: ctp-curriculum 등록 정합"
```

---

## Task 8: (선택) Refactored 접미사 일괄 rename

리팩토링 종료 후 영구 식별자로 굳어버린 5+ 곳 정리.

**Files:**
- Modify: `web/components/features/ctp/contents/categories/modules/module-03-sorting-string.tsx`
- Modify: `web/components/features/ctp/contents/categories/modules/module-04-list-tree-final.tsx`
- Modify: `web/lib/ctp-content-registry.tsx`

- [ ] **Step 1: rename 대상 식별**

```bash
rg "Refactored|REFACTORED" web/components/features/ctp/ web/lib/ctp-content-registry.tsx
```

Expected: `SortingContentRefactored`, `ListContentRefactored`, `TreeContentRefactored`, `SORTING_MODULES_REFACTORED`, `TREE_MODULES_REFACTORED`

- [ ] **Step 2: 일괄 rename**

각 파일에서:
- `SortingContentRefactored` → `SortingContent`
- `ListContentRefactored` → `ListContent`
- `TreeContentRefactored` → `TreeContent`
- `SORTING_MODULES_REFACTORED` → `SORTING_MODULES`
- `TREE_MODULES_REFACTORED` → `TREE_MODULES`

`ctp-content-registry.tsx`의 import 구문도 함께 수정.

- [ ] **Step 3: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit && pnpm exec next build
```

Expected: 에러 0, 빌드 성공

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(CTP): Refactored 접미사 일괄 정리

5개 식별자 (SortingContent/ListContent/TreeContent/SORTING_MODULES/TREE_MODULES)
리팩토링 종료 후에도 영구 명명으로 굳어버린 것 정리.
동작 변경 없음, rename only."
```

---

## Phase 0 Exit Verification

모든 Task 완료 후 마지막 검증.

- [ ] **Step 1: 전체 빌드**

```bash
cd web && pnpm exec next build
```

Expected: 빌드 성공, 에러 0

- [ ] **Step 2: 전체 타입 검사**

```bash
cd web && pnpm exec tsc --noEmit
```

Expected: 에러 0

- [ ] **Step 3: 기존 테스트 통과**

```bash
cd web && pnpm test:ctp-problem-bank && pnpm test:ctp-specs
```

Expected: 모든 테스트 통과

- [ ] **Step 4: 샘플 컨셉 G1-G7 통과**

```bash
cd web && pnpm verify:ctp:sample
```

Expected: G1-G2 PASS, G3 PASS, G4 PASS, G5 PASS (PoC 마이그레이션 후), G6 PASS (interactive), G7 PASS

- [ ] **Step 5: dev 서버 smoke test**

```bash
cd web && pnpm dev
```

다음 URL들이 모두 정상 로딩:
- `/insights/ctp` (랜딩)
- `/insights/ctp/module-01-foundation/algo-basics?view=algo-overview` (module-01)
- `/insights/ctp/module-01-foundation/search-algorithms?view=basic-binary-search` (PoC 마이그레이션)
- `/insights/ctp/module-04-list-tree-final/list?view=singly` (module-04 — 여전히 빈 상태지만 404 없이 로딩)
- `/insights/ctp/module-01-foundation/foundation-integration?view=p01-001` (ProblemBank)

- [ ] **Step 6: 빈약 매트릭스 재실행 (선택)**

이전 조사에서 사용한 grep 패턴으로 dead code가 모두 사라졌는지 재확인:

```bash
rg "CTPCategoryOverview|CTPComplexity|StringGraphVisualizer\b|GridVisualizer\b|LinearVisualizer\b" web/
# Expected: 0 매치

rg "FOUNDATION_INTEGRATION_MODULES|STACK_RECURSION_INTEGRATION_MODULES|SORTING_STRING_INTEGRATION_MODULES|LIST_TREE_INTEGRATION_MODULES" web/
# Expected: 0 매치

rg "createCodeTemplateModule|useCodeTemplateSimulation|makeCodeGuide|makeCodeStarter" web/
# Expected: 0 매치

rg "extractUserBlock|replaceUserBlock|restrictedEditing" web/
# Expected: 0 매치

rg "@ts-ignore" web/components/features/ctp/
# Expected: 0 매치

rg "console\\.log\\(\\\"\\[Playground\\]" web/
# Expected: 0 매치

rg "SKULPT PROTOTYPE VERIFICATION" web/
# Expected: 0 매치
```

- [ ] **Step 7: Phase 0 완료 commit**

모든 변경이 이미 individual commit으로 들어갔으므로 추가 commit 없음. Phase 0 완료를 PR 본문에 표기.

---

## Phase 0 Done

Phase 1 멀티에이전트 양산을 시작할 수 있는 기반이 완성됨:
- 14개 dead code 제거 + expansion 사전 정리
- ConceptSpec 컨트랙트 + binary-search 샘플
- svg-primitives 라이브러리 11개 컴포넌트
- TONE_GUIDE.md
- 4개 핵심 문서 정합화
- ctp-verify.mjs G1-G7 검증 스크립트

다음 단계: Phase 1 plan 작성 → Spec Author (Opus) dispatch → 16 컨셉 양산.
