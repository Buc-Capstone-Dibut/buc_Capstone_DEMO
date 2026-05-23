# CTP Phase 2: module-04 Tier 2 Visualizer 신규 + module-03 정합화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Phase 1에서 콘텐츠만 작성됐던 module-04의 Tier 2 5개 컨셉(singly, doubly, circular, tree-basics, bst)에 전용 시각화 컴포넌트를 작성하고, module-03 정렬 9개 visualizer의 supp 패턴 + string-search 3개의 데이터 입력 방식을 정합화한다.

**Architecture:** Phase 1과 동일한 specialist 패턴 — Visualizer Specialist가 Tier 2 5 main + 20 supp를 svg-primitives 기반으로 신규 작성. Content Specialist가 module-04에 useSim/Visualizer import + 등록 패치. Refactor Specialist가 module-03 supp 패턴 통일 + string-search 데이터 입력 ConceptSpec 기반으로 변경.

**Tech Stack:** Phase 0+1 산출 (ConceptSpec + svg-primitives + ctp-verify) 재활용.

**참조:**
- Spec: [docs/superpowers/specs/2026-05-22-ctp-content-pipeline-design.md](../specs/2026-05-22-ctp-content-pipeline-design.md) §7
- Phase 1 plan: [2026-05-22-ctp-phase-1-critical-empty-fill.md](2026-05-22-ctp-phase-1-critical-empty-fill.md)

---

## 작업 대상

### Task 1: module-04 Tier 2 시각화 5개 신규 (가장 큰 작업)
| id | Visualizer 이름 | 비유 | 도메인 |
|---|---|---|---|
| `singly` | `SinglyVisualizer` | 기차 객차 (앞→뒤만 연결) | linked-list |
| `doubly` | `DoublyVisualizer` | 양방향 도로 (왕복) | linked-list |
| `circular` | `CircularVisualizer` | 회전 초밥 벨트 (끝→시작 연결) | linked-list |
| `tree-basics` | `TreeBasicsVisualizer` | 회사 조직도 | tree |
| `bst` | `BstVisualizer` | 사전 색인 (좌/우 규칙) | bst |

각 컨셉별로 svg-animations/module-04/<id>.tsx (main) + supp/<id>-supp.tsx (4 SVG) 추가.

### Task 2: module-03 supp 패턴 통일
현재 module-03 일부 supp 파일이 named export 4개를 직접 import하는 패턴이고, 일부는 `XxxSupplementaryOptions = [SVG1, SVG2, SVG3, SVG4]` 배열 export. 후자로 통일.

대상: `boyer-moore-supp.tsx`, `brute-force-supp.tsx`, `kmp-search-supp.tsx`, `counting-sort-supp.tsx`, `heap-sort-supp.tsx` (개별 export 패턴) → `XxxSupplementaryOptions` 배열 형식으로 통일. module-03-sorting-string.tsx의 import도 동기화.

### Task 3: string-search visualizer 데이터 입력 명시화
현재 `brute-force-search.tsx:107-112`, `kmp-search.tsx`, `boyer-moore-search.tsx`가 sampleData를 알파벳 매핑(`chars[n%26]`)하고 `text.substring(3,6)`을 자동 패턴 추출하는 어색한 패턴 사용. 

→ ConceptSpec.simulation.initialState에 `{ text: string, pattern: string }` 명시. visualizer가 그대로 사용.

ConceptSpec 3개 수정:
- `web/data/ctp/specs/brute-force-search.json`
- `web/data/ctp/specs/kmp-search.json`
- `web/data/ctp/specs/boyer-moore-search.json`

각각 simulation.initialState를 도메인별 의미 있는 데이터로 (예: `{ text: "ABCABCDABCE", pattern: "ABCD" }`).

---

## File Structure

### 신규 생성 (10 파일)
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/singly.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/doubly.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/circular.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/tree-basics.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/bst.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/singly-supp.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/doubly-supp.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/circular-supp.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/tree-basics-supp.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/bst-supp.tsx`

### 수정 (12 파일)
- `web/data/ctp/specs/singly.json`, `doubly.json`, `circular.json`, `tree-basics.json`, `bst.json` (storyboard 풍부화 — Phase 1에선 minimal)
- `web/data/ctp/specs/brute-force-search.json`, `kmp-search.json`, `boyer-moore-search.json` (initialState text/pattern 명시)
- `web/components/features/ctp/contents/categories/modules/module-04-list-tree-final.tsx` (Tier 2 5 컨셉에 useSim/Visualizer import + 등록)
- `web/components/features/ctp/contents/categories/modules/module-03-sorting-string.tsx` (supp import 패턴 통일)
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/counting-sort-supp.tsx`, `heap-sort-supp.tsx`, `boyer-moore-supp.tsx`, `brute-force-supp.tsx`, `kmp-search-supp.tsx` (named export → SupplementaryOptions 배열)
- 위 module-03 visualizer 3개(brute-force-search/kmp-search/boyer-moore-search) — sampleData prop 대신 initialState text/pattern 사용

---

## Task 1: Visualizer Specialist — Tier 2 5 main + 5 supp

단일 Opus subagent dispatch. Phase 1 Task 2와 동일한 패턴.

### Task 1.1: 5 ConceptSpec storyboard 풍부화

기존 Tier 2 spec은 시각화 미정의로 stepCount=3 minimal. Phase 2에서 신규 시각화 작성하면서 storyboard를 4-6 step으로 풍부화.

각 spec에 다음 추가:
- simulation.stepCount: 4-6
- simulation.storyboard: 도메인별 step 시나리오 (각 step별 stateAfter 명시)
- visualizer.type: 도메인 정합 (singly/doubly/circular → linked-list, tree-basics → tree, bst → bst)
- supplementary.visualHint: 4개 정확한 시각 단서

Commit:
```
feat(CTP): Tier 2 5 ConceptSpec storyboard 풍부화 (Phase 2)

singly, doubly, circular, tree-basics, bst의 minimal storyboard를
4-6 step 시나리오로 확장. visualizer.type 정합.
```

### Task 1.2: 5 main visualizer 신규

각 visualizer 시각화 의도:

**singly**: 수평 노드 4-5개 + 우측 화살표 next. head 포인터(PointerArrow). step 1=초기→2=새 노드 삽입(head)→3=중간 삽입→4=삭제→5=완료.
- 사용 primitive: NodeCircle, EdgeLine(arrow=true), PointerArrow

**doubly**: singly와 동일하나 좌우 양방향 화살표. prev/next 포인터.
- step별: 초기→삽입→삭제(prev/next 둘 다 재연결)→완료

**circular**: doubly와 동일하나 마지막 노드 → head 연결(원형 호). 회전 시각 효과는 step 변경으로 표현.
- 마지막 EdgeLine을 호(arc) 또는 별도 styling

**tree-basics**: dagre 레이아웃 또는 수동 절대 좌표로 트리 그림. root + depth 2-3.
- 사용 primitive: NodeCircle (각 노드), EdgeLine (parent-child)
- step별: 전위/중위/후위/레벨 순회 강조 (status: active)

**bst**: tree-basics 기반 + 삽입/탐색 step별 좌우 분기 결정 강조.
- step별: 5 삽입→3 삽입→7 삽입→3 탐색(좌측 따라감)→7 탐색(우측 따라감)

각 main 파일 export: `useXxxSim` + `XxxVisualizer`.

Commit:
```
feat(CTP): Tier 2 main visualizer 5개 신규 (module-04)

singly, doubly, circular, tree-basics, bst의 useSim + Visualizer.
svg-primitives만 사용. ConceptSpec.simulation.storyboard 그대로.
```

### Task 1.3: 5 supp 파일 신규

각 supp 파일 = 4 SVG 컴포넌트 + `XxxSupplementaryOptions` 배열 export.

ConceptSpec.supplementary[0..3].visualHint를 디자인 가이드로 사용.

예시 (singly):
1. "head 포인터 의미" — head 화살표 + 첫 노드 강조
2. "next 체인" — 4 노드 + next 화살표
3. "삽입 비용 O(1) vs 배열 O(N)" — 두 자료구조 비교
4. "tail 추적 없음의 비용" — tail까지 traverse 시각화

Commit:
```
feat(CTP): Tier 2 supp SVG 20개 신규 (module-04/supp)

singly/doubly/circular/tree-basics/bst의 SupplementaryOptions 배열 4개씩.
svg-primitives 기반.
```

### Task 1.4 검증
```bash
cd web && for id in singly doubly circular tree-basics bst; do
  node scripts/ctp-verify.mjs --concept=$id 2>&1 | grep -E "G1|G5"
done
```
Expected: 모두 PASS.

```bash
cd web && pnpm exec tsc --noEmit 2>&1 | grep "module-04" | head
```
Expected: 0 매치.

---

## Task 2: Content Specialist — module-04에 Tier 2 useSim/Visualizer 등록

### Task 2.1: module-04-list-tree-final.tsx 패치

5 Tier 2 컨셉에 useSim/Visualizer import + 등록 추가:

```tsx
import { useSinglySim, SinglyVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/singly";
import { SinglySupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/singly-supp";
// ... 동일 패턴으로 doubly, circular, tree-basics, bst
```

각 모듈 항목에 추가:
```tsx
{
  id: "singly",
  title: "08-1 단일 연결 리스트",
  description: "...",
  story: { ... },  // 이미 Phase 1에서 작성됨, 그대로 유지
  features: [
    { ..., SupplementaryVisualizer: SinglySupplementaryOptions[0] },
    { ..., SupplementaryVisualizer: SinglySupplementaryOptions[1] },
    { ..., SupplementaryVisualizer: SinglySupplementaryOptions[2] },
    { ..., SupplementaryVisualizer: SinglySupplementaryOptions[3] },
  ],
  sampleData: [...],
  useSim: useSinglySim,
  Visualizer: SinglyVisualizer,
}
```

Commit:
```
feat(CTP): module-04 Tier 2 5 컨셉 visualizer 등록 (Phase 2)

singly, doubly, circular, tree-basics, bst에 useSim/Visualizer + supp 4개
연결. Phase 1에서 작성된 story/features는 유지.
```

### Task 2.2 검증
```bash
cd web && for id in singly doubly circular tree-basics bst; do
  node scripts/ctp-verify.mjs --concept=$id 2>&1 | tail -10
done
```
Expected: G1-G7 모두 PASS.

---

## Task 3: Refactor Specialist — module-03 정합화

### Task 3.1: module-03 supp 패턴 통일

대상 파일 (현재 named export, 통일 후 SupplementaryOptions 배열):
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/boyer-moore-supp.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/brute-force-supp.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/kmp-search-supp.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/counting-sort-supp.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/heap-sort-supp.tsx`

각 파일에 다음 추가:
```tsx
// 기존 named export 유지 (backward compat) 또는 제거
export const BoyerMooreSearchSupplementaryOptions = [
  CompleteBinaryTreeSVG,  // 또는 기존 named SVG들
  MaxHeapPropertySVG,
  HeapifySVG,
  HeapSortProcessSVG,
];
```

`module-03-sorting-string.tsx`의 import도 `XxxSupplementaryOptions` 배열로 통일.

Commit:
```
refactor(CTP): module-03 supp 5개를 SupplementaryOptions 배열 패턴으로 통일

boyer-moore, brute-force, kmp-search, counting-sort, heap-sort의 supp 파일
명명 컨벤션을 module-01/02와 일치시킴 (XxxSupplementaryOptions = [SVG1..4]).
module-03-sorting-string.tsx import 동기화.
```

### Task 3.2: string-search 데이터 입력 명시화

3 ConceptSpec 수정:

**brute-force-search.json**:
```json
"simulation": {
  "initialState": {
    "text": "ABABCABABCABCABABA",
    "pattern": "ABABCAB"
  },
  ...
}
```

**kmp-search.json**:
```json
"simulation": {
  "initialState": {
    "text": "ABABDABACDABABCABAB",
    "pattern": "ABABCABAB"
  },
  ...
}
```

**boyer-moore-search.json**:
```json
"simulation": {
  "initialState": {
    "text": "HERE IS A SIMPLE EXAMPLE",
    "pattern": "EXAMPLE"
  },
  ...
}
```

3개 module-03 visualizer 파일 패치:
- 기존 `chars[n%26]` 매핑 + `text.substring(3,6)` 자동 추출 코드 제거
- ConceptSpec.simulation.initialState로부터 text/pattern을 받도록 변경 (visualizer가 sampleData 대신 initialState를 prop으로)

Commit:
```
fix(CTP): string-search visualizer 3개에 text/pattern 명시 입력

brute-force-search, kmp-search, boyer-moore-search의 visualizer가
sampleData에서 알파벳 자동 매핑하던 어색한 패턴 제거.
ConceptSpec.simulation.initialState.text/pattern을 직접 사용.
```

---

## Task 4: Verifier — G1-G7 통합

```bash
cd web && node scripts/ctp-verify.mjs --all
```

Expected: 22 컨셉 (17 Phase 1 + 5 신규 Tier 2 visualizer 등록) 모두 PASS.

빌드 + 테스트:
```bash
cd web && pnpm exec tsc --noEmit 2>&1 | grep -E "module-04|module-03|ctp/specs" | head
cd web && pnpm test:ctp-specs
cd web && pnpm test:ctp-problem-bank
```

FAIL 발생 시 atomic fix commit.

---

## Phase 2 Exit Criteria

- [ ] Tier 2 5 컨셉 main visualizer + 20 supp SVG 신규
- [ ] module-04 Tier 2 5 컨셉이 useSim/Visualizer 등록 (G1-G7 PASS)
- [ ] module-03 supp 5개 패턴 통일 (SupplementaryOptions 배열)
- [ ] string-search 3 visualizer가 ConceptSpec initialState 직접 사용
- [ ] ctp-verify --all 22/22 PASS
- [ ] next build 컴파일 성공
- [ ] 기존 테스트 모두 PASS

---

## 예상 commits

| Task | Commit 수 |
|---|---|
| 1.1 spec storyboard 풍부화 | 1 |
| 1.2 main visualizer 5개 | 1 |
| 1.3 supp 5개 | 1 |
| 2.1 module-04 등록 | 1 |
| 3.1 module-03 supp 통일 | 1 |
| 3.2 string-search 데이터 명시화 | 1 |
| 4.x fix (필요 시) | 0-N |

**총 6 + N commits**
