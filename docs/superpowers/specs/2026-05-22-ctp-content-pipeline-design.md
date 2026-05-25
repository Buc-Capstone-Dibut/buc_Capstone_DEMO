---
title: CTP 콘텐츠 양산 파이프라인 (A안 보정본 — Lock-Then-Mass + Aggressive Cleanup)
date: 2026-05-22
status: approved
authors:
  - 정환2 (의사결정)
  - Claude Opus 4.7 (조사/설계)
target: CTP (Coding Test Preparation) 모듈 전체
---

# CTP 콘텐츠 양산 파이프라인 설계서

## 1. 요약 (TL;DR)

CTP는 4모듈 × 평균 12 컨셉 = 52 subConcept + 48 ProblemBank 문제로 구성된 코딩테스트 학습 플랫폼이다. 현재 다음 4가지 결손을 동시에 해결해야 한다.

1. **시각화 빈약**: 51 컨셉 중 19개가 generic fallback (module-04 전체 + 통합 12개), `runSimulation: () => {}` 더미 29개, 데이터 출처 63%가 hardcoded-internal
2. **콘텐츠 빈약**: 52 컨셉 중 D등급(콘텐츠 사실상 0) 19개, module별 story 평균 문장 수 격차 11.5 / 7 / 3.5 / 0
3. **레거시 잔재**: dead 컴포넌트 5개, expansion 사전 1638줄 중 약 900줄 옛 ID 매핑, types.ts dead 필드 4개, restrictedEditing 기능 전체 dead, MAINTENANCE_PLAYBOOK 전체가 옛 구조 가정
4. **인프라 거짓 문서**: ARCHITECTURE.md가 가정하는 `use-skulpt-engine.ts`, `adapters/`, `AdapterFactory` 모두 코드에 부재

본 파이프라인은 **Phase 0(대청소+표준화) → Phase 1(빈 컨셉 양산) → Phase 2(module-04 visualizer 신규 + module-03 보강) → Phase 3(톤 다듬기) → Phase 4(코드 시뮬레이터 어댑터, 보류)** 4단계로 진행한다. 멀티에이전트는 **축별 specialist (Visualizer/Content/Verifier) + Opus 4.7 통일**로 운영한다.

---

## 2. 결정된 운영 원칙 (5개)

본 설계서의 모든 결정은 다음 5개 사용자 의사결정에 종속된다.

| # | 결정 | 의미 |
|---|---|---|
| D1 | **Wide-Shallow 일괄** | 한 컨셉 깊게가 아니라 모든 컨셉이 최소한의 기준선을 갖도록 일괄 끌어올림 |
| D2 | **자습용 학습 도구 수준** | 정확성 95%+, 시각적 임팩트 중간, 모바일/접근성 후순위. 졸업작품 데모 + 동료 학생 공유 가능한 수준 |
| D3 | **Step 시나리오 전면** | 컨셉마다 `useXxxSim` + 전용 Visualizer 컴포넌트 작성. Skulpt trace 기반은 보류 (Phase 4) |
| D4 | **축별 specialist + Opus 4.7 통일** | Visualizer/Content/Verifier 3 specialist가 모든 컨셉을 가로지름. 모든 에이전트 model: opus |
| D5 | **자동 게이트 + 샘플 인간 검토** | 스키마/lint/톤 가이드/Skulpt 실행 정확성 자동 검증, 모듈당 N개 샘플 인간 검토 |

---

## 3. 목표 + 비목표

### 3.1 목표
- 52 subConcept 모두 **D등급 제거**: story 3블록 + features 4개 최소 보유
- module-04 전체 visualizer 신규 작성: 연결리스트/트리/BST 전용 SVG
- module-03 story 1문장 → 3-4문장으로 확장
- expansion 사전 ↔ 커리큘럼 ID **양방향 정합**
- 레거시 dead code 일괄 제거 (안전 카테고리 14개)
- 문서 4개(ARCHITECTURE/SIMULATION_PIPELINE/MAINTENANCE_PLAYBOOK/CONSISTENCY_GUIDELINES) 코드 정합화
- 톤 일관성: module-02의 차분 비즈니스 톤 기준으로 통일

### 3.2 비목표 (의도적 제외)
- ❌ Skulpt 기반 코드 실행 → 시각화 연결 (Phase 4로 분리, 본 설계서 범위 외)
- ❌ Reference solution 자동 생성 (48 ProblemBank 문제) — 별도 작업
- ❌ Bookmark/Solve history/Point/Difficulty unlock — Phase 5 deferred
- ❌ 모바일 반응형, a11y, 다국어 — D2 결정에 따라 후순위
- ❌ ProblemBank UI 확장 (검색 입력, tags 노출) — 별도 작업
- ❌ CTPComplexity 섹션 부활 — 결락된 상태가 의도된 것으로 가정 (CONSISTENCY_GUIDELINES 문서를 코드 측에 맞춤)
- ❌ 코드 시뮬레이터 trace 기반 전환 (D3 결정에 따라)

---

## 4. 아키텍처

### 4.1 전체 흐름

```
┌──────────────────────────────────────────────────────────────────┐
│ Phase 0 (인간 주도, 2-3일)                                         │
│  ├─ ⓐ Dead Code 일괄 제거 (14 안전 카테고리)                       │
│  ├─ ⓑ expansion 사전 정리 (옛 ID 45 제거 + 신규 30 매핑)          │
│  ├─ ⓒ ConceptSpec TypeScript 컨트랙트 확정                       │
│  ├─ ⓓ Design Primitive 라이브러리 구축                            │
│  ├─ ⓔ Tone Guide 문서 작성                                       │
│  ├─ ⓕ 핵심 문서 4개 코드 정합화                                  │
│  └─ ⓖ Refactored 접미사 일괄 rename (선택)                       │
├──────────────────────────────────────────────────────────────────┤
│ Phase 1-3 (멀티에이전트, 8-14일)                                   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────┐        │
│   │ Spec Author (인간 또는 Opus 4.7 단일)                │        │
│   │  conceptId별 ConceptSpec(JSON) 일괄 작성             │        │
│   └─────────────────────┬───────────────────────────────┘        │
│                         │                                        │
│         ┌───────────────┼───────────────┐                        │
│         ▼               ▼               ▼                        │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐                    │
│   │Visualizer│   │ Content  │   │ Verifier │                    │
│   │Specialist│   │Specialist│   │ (auto    │                    │
│   │ (opus)   │   │ (opus)   │   │  gates)  │                    │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘                    │
│        │              │              │                          │
│        ▼              ▼              ▼                          │
│   useSim+        story+         스키마/lint/                     │
│   Visualizer+    features+      톤/Skulpt 정확성                 │
│   supp.tsx       guide(md)      검사                             │
│        │              │              │                          │
│        └──────────────┴──────────────┘                          │
│                       │                                          │
│                       ▼                                          │
│           모듈당 3개 샘플 인간 검토                                │
│                       │                                          │
│                       ▼                                          │
│            module-XX-*.tsx 패치 적용                              │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 축별 specialist 책임 매트릭스

| Specialist | 입력 | 출력 | 의존성 |
|---|---|---|---|
| **Spec Author** | 컨셉 ID 목록, Tone Guide, Design Primitive 목록 | ConceptSpec JSON 파일 (한 컨셉당 1개) | 인간 또는 단일 Opus 에이전트가 모든 spec을 한 번에 작성 — 일관성 확보 |
| **Visualizer Specialist** | ConceptSpec JSON, Design Primitive 라이브러리, 기존 svg-animations 패턴 예시 (module-01의 binary-search) | `svg-animations/module-XX/<id>.tsx` (useSim + Visualizer) + `supp/<id>-supp.tsx` (4개 SVG) | Phase 0의 Design Primitive 라이브러리 |
| **Content Specialist** | ConceptSpec JSON, Tone Guide, 기존 module-02 story 패턴 예시 | module-XX-*.tsx 안 모듈 정의에 들어갈 story/features 객체 (TSX 단편) | Phase 0의 Tone Guide |
| **Verifier** | Specialist 산출물 | PASS/FAIL + 사유 리포트 | 자동 검증 스크립트 |

핵심 통합 규약: **conceptId가 useSim 이름(`useXxxSim`)과 Visualizer 이름(`XxxVisualizer`)을 결정**한다. Spec Author가 ConceptSpec에 `id: "queue-basics"` 라고 적으면, Visualizer Specialist는 `useQueueBasicsSim` + `QueueBasicsVisualizer` + `QueueBasicsSupplementaryOptions` 3개를 자동으로 export한다. Content Specialist는 module 파일에서 같은 이름을 import한다. **이 명명 규약이 축별 에이전트 간 통합 비용을 0으로 만드는 유일한 장치다.**

### 4.3 ConceptSpec 표준 컨트랙트

Phase 0 산출물. `web/data/ctp/specs/<conceptId>.json` 형태로 컨셉마다 1개씩 저장. 모든 에이전트의 입력으로 사용.

```typescript
// web/data/ctp/specs/concept-spec.ts (Phase 0에서 작성)
export interface ConceptSpec {
  // 식별
  id: string;                    // "queue-basics" — useSim/Visualizer 이름 결정
  moduleId: "module-01-foundation" | "module-02-stack-recursion" 
          | "module-03-sorting-string" | "module-04-list-tree-final";
  conceptId: string;             // "stack-queue" — 어느 챕터에 속하는지
  title: string;                 // "07-1 큐 기초"
  
  // 학습 메타
  difficulty: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];       // ["array-basics"]
  learningOutcomes: string[];    // 3-5개
  
  // 시뮬레이션 명세
  simulation: {
    mode: "interactive" | "code";
    domain: "stack" | "queue" | "list" | "tree" | "graph" | "array" | "sort" | "string" | "hash" | "recursion";
    stepCount: number;           // 4-12 권장
    operations: string[];        // ["peek", "push", "pop", "reset"] — useSim handlers
    initialState: unknown;       // 초기 데이터
    storyboard: Array<{          // 각 step의 의도 (사람이 작성)
      step: number;
      description: string;       // 한국어 한 줄
      stateAfter: unknown;       // 그 step 직후 상태
      highlight?: string;        // 강조 요소
    }>;
  };
  
  // 시각화 명세
  visualizer: {
    type: "array" | "stack-bar" | "queue-ring" | "linked-list" | "tree" | "bst" 
        | "sort-bars" | "string-pointer" | "hash-table" | "recursion-tree" | "backtracking-board";
    primaryColor?: string;       // semantic token 키
    showIndices?: boolean;
    showPointers?: string[];     // ["L", "R", "M"] 이진탐색
  };
  
  // 보조 일러스트 4개 (Supplementary)
  supplementary: Array<{
    title: string;
    description: string;
    visualHint: string;          // Visualizer Specialist용 그림 가이드
  }>;
  
  // 콘텐츠 명세 (Content Specialist용)
  content: {
    story: {
      problem: string;           // 3-5 문장 — 어떤 문제를 푸는가
      definition: string;        // 3-5 문장 (글머리표 3개 권장) — 무엇인가
      analogy: string;           // 2-3 문장 — 일상 비유
    };
    features: Array<{            // 정확히 4개
      title: string;
      description: string;       // 2-3 문장
      icon?: string;
    }>;
    complexity?: {               // 선택 — CTPComplexity가 dead라 현재 표시 안 됨
      access: string;
      search: string;
      insertion: string;
      deletion: string;
    };
  };
}
```

### 4.4 Design Primitive 라이브러리

Phase 0 산출물. `web/components/features/ctp/playground/visualizers/shared/svg-primitives/` 디렉토리에 다음을 작성.

```
shared/svg-primitives/
├── CyberGrid.tsx           # 배경 그리드 (30+ visualizer에서 중복)
├── NeonGlowFilters.tsx     # SVG filter 정의 (neon-glow-{color})
├── IndexLabel.tsx          # 인덱스 숫자 라벨
├── ArrayBox.tsx            # 배열 원소 박스 (status: default/active/comparing/found/muted)
├── PointerArrow.tsx        # L/R/M 같은 포인터 화살표
├── StepCounter.tsx         # "Step 3 / 7"
├── LogPanel.tsx            # 단계별 로그 패널
├── NodeCircle.tsx          # 트리/리스트 노드 원
├── EdgeLine.tsx            # 노드 간 연결선
├── ColorTokens.ts          # semantic color 토큰 매핑
└── index.ts                # 배럴
```

기존 30+ visualizer에서 반복되는 inline 정의를 이 라이브러리로 교체. **Phase 1 specialist가 이 라이브러리만 import하도록 강제**한다 (Verifier가 hardcoded color/grid를 detect하면 FAIL).

### 4.5 자동 검증 게이트

`scripts/ctp-verify.mjs` (Phase 0에서 작성). 다음 7개 체크를 모두 통과해야 PASS.

| # | 게이트 | 검사 내용 | 위반 시 |
|---|---|---|---|
| G1 | **스키마 정합** | ConceptSpec.id가 useSim 이름(`useXxxSim`)과 Visualizer 이름(`XxxVisualizer`)과 일치 | FAIL |
| G2 | **모듈 정의 정합** | module-XX-*.tsx에서 해당 conceptId 항목이 spec과 동일한 story/features 보유 | FAIL |
| G3 | **expansion 매핑** | curriculum의 subConcept ID가 expansion 사전 또는 모듈 정의 둘 중 하나에 존재 | WARN (FAIL이 아님) |
| G4 | **톤 가이드** | story의 problem/definition/analogy 문장 수 ≥ Tone Guide 기준선 (문장 = `.?!` 카운트) | FAIL |
| G5 | **primitive 사용** | Visualizer가 hardcoded `<rect fill="#...">` 색상 또는 inline NeonGlowFilter 정의를 갖지 않음 (shared/svg-primitives만 사용) | FAIL |
| G6 | **Skulpt 실행** | 컨셉이 `simulation.mode === "code"`이면 starter code가 Skulpt에서 RTE 없이 실행 | FAIL (interactive 모드 면제) |
| G7 | **링크/매핑** | conceptId가 curriculum + registry 양쪽에 등록 + URL `/insights/ctp/<categoryId>/<conceptId>?view=<id>`이 404 안 남 | FAIL |

샘플 인간 검토: 모듈당 3개 (총 12개) 무작위 추출, 다음 4축 평가
- 학습 효과 (1-5)
- 비유 자연스러움 (1-5)
- 시각화 정확성 (1-5)
- 톤 일관성 (1-5)
평균 4.0 미만이면 해당 모듈 전체 재작업.

---

## 5. Phase 0: 대청소 + 표준화 (2-3일, 인간 주도)

### 5.1 Dead Code 일괄 제거

**ⓐ 안전 카테고리 14개 삭제** — 외부 의존성 0 확인 완료:

1. `web/components/features/ctp/contents/shared/ctp-category-overview.tsx` (전체 파일)
2. `web/components/features/ctp/contents/shared/ctp-complexity.tsx` (전체 파일)
3. `web/components/features/ctp/playground/visualizers/array/string-graph-visualizer.tsx` (전체 파일)
4. `web/components/features/ctp/playground/visualizers/array/grid-visualizer.tsx` (전체 파일)
5. `web/components/features/ctp/playground/visualizers/array/linear-visualizer.tsx` (전체 파일)
6. 4개 모듈 파일의 `*_INTEGRATION_MODULES` 변수 (`module-01-foundation.tsx:427`, `module-02-stack-recursion.tsx:420`, `module-03-sorting-string.tsx:274`, `module-04-list-tree-final.tsx:52`)
7. `module-utils.tsx`의 `createCodeTemplateModule(s)`, `useCodeTemplateSimulation`, `makeCodeGuide`, `makeCodeStarter` 함수 체인 (라인 81-146, 228, 308 일대)
8. `use-ctp-store.ts`의 `addStep` action (라인 81-84)
9. `types.ts`의 `LinearItem`, `GridItem`, `LinkedListNode`, `complexityNames` (각 라인 118, 119, 121, 62-67)
10. `ctp-playground.tsx`의 `restrictedEditing`/`editBoundaryStart`/`editBoundaryEnd` props + `extractUserBlock`/`replaceUserBlock` 함수 (라인 36-38, 47-49, 379-400)
11. `web/data/ctp/problems/index.ts`의 `CTP_PROBLEM_BANK` 객체 + `getProblemsByModuleId` 함수 (라인 7-14)
12. `ctp-playground.tsx:114`의 `console.log("[Playground] Run Triggered")`
13. `ctp-playground.tsx:145-157`의 `SKULPT PROTOTYPE VERIFICATION` 주석 블록 (11줄)
14. `module-utils.tsx:258, 308`의 `@ts-ignore` 2건 — 타입 조건부 좁히기로 해결

각 항목은 별도 commit으로 분리 (revert 용이성).

### 5.2 expansion 사전 정리

`ctp-content-expansion.ts` (1638줄):
- **옛 ID 매핑 45개 제거**: `array-stack, bfs*, dfs*, dijkstra, dp-*, ds-*, hash-basics, hash-implement, heap-basics, linked-stack, max-heap, min-heap, monotonic-stack, mst, parametric-search, path-compression, pq-basics, prefix-search, shortest-path, string, topological-sort, trie-*, two-pointers, union-rank, cycle-detection, collision, floyd-warshall, grid-traversal, graph-representation, binary-traversal, dfs-backtracking, dfs-cycle-detection, dfs-tree-traversal, bfs-basics, bfs-multi-source, bfs-path-reconstruction, bfs-zero-one` 등
- **신규 ID 매핑 추가**: `algo-overview, array-number-prime, boyer-moore-search, brute-force-search, condition-loop, counting-sort, cursor-linked-list, ds-compare, flow-tracing, hash-collision, iterative-recursion, kmp-search, linear-search, queen-backtracking, queue-overview, recursion-analysis, recursion-basics, search-problem-key, shell-sort, sorting-overview, tower-of-hanoi` 등 약 21개
- **fc-1~4 정책**: Final Challenge 4개는 expansion 사전 매핑에서 **의도적 제외**. 이유: 종합 평가 컨셉이라 같은 deep-dive 패턴이 부적합. 대신 모듈 본문에서 직접 story 작성.
- **ProblemBank 컨셉(p01-001~p04-012)**: 본 spec 범위 외 — expansion 사전 매핑 대상 아님
- **결과**: 1638줄 → ~700줄 예상

**키 미스매치 해결**: `hash-collision`(커리큘럼) ↔ `collision`(expansion 옛 키). expansion에서 `collision`을 `hash-collision`으로 rename.

### 5.3 ConceptSpec 컨트랙트 작성

위 §4.3의 TypeScript 인터페이스를 `web/data/ctp/specs/concept-spec.ts`로 작성. 검증 스크립트가 import.

### 5.4 Design Primitive 라이브러리 구축

위 §4.4의 11개 파일을 작성. 기존 visualizer에서 패턴 추출:
- `CyberGrid`, `NeonGlowFilters`: `basic-binary-search.tsx:63-77`, `bubble-sort.tsx:196-220`, `bubble-sort-supp.tsx:7-41`에서 공통 패턴 추출
- `ArrayBox`, `IndexLabel`: `linear-visualizer.tsx`(dead), `array-graph-visualizer.tsx`의 패턴 통합
- `NodeCircle`, `EdgeLine`: 기존엔 부재 — 신규 작성 (module-04 trie/tree에 필수)

### 5.5 Tone Guide 문서 작성

`docs/CTP/foundation/TONE_GUIDE.md` 신규 작성:
- **기준선 톤**: module-02 차분 비즈니스 (problem 2문장 / definition 글머리표 3개 / analogy 2-3문장)
- **module-01 다듬기**: 화려한 형용사("미슐랭 3스타", "잔혹한", "압도적인") 정리 — Phase 3에서
- **한국어 기본, 영어는 첫 등장 시 1회 병기**
- **비유 사전**: 도서관, 카드, 사물함, 기차, 시계, 트럼프, 주차장, 자율주행, 명탐정, 택배함 (모듈-01 컬렉션) + 양방향 도로, 원형 트랙, 회전 초밥 벨트 (모듈-04용)

### 5.6 핵심 문서 정합화

| 문서 | 작업 |
|---|---|
| `ARCHITECTURE.md` | 부재 인프라(use-skulpt-engine, adapters/, AdapterFactory) 행 제거. sub-concepts 구조 가정 부분 → 현재 module-XX-*.tsx 구조로 |
| `SIMULATION_PIPELINE.md` | 옛 Skulpt step 흐름 → 현재 인터랙티브 + ProblemBank 흐름으로 재작성. Visualizer 계약 표에서 부재 컴포넌트(LinkedListGraphVisualizer 등) 제거 |
| `MAINTENANCE_PLAYBOOK.md` | **전면 재작성** — sub-concepts/<id>/config.ts + logic.ts 절차 제거, 현재 ConceptSpec → Specialist → module-XX-*.tsx 절차로 |
| `CONSISTENCY_GUIDELINES.md` | 섹션 순서에서 Complexity 결락 반영, 번호 1→2→3→**4(Implementation)→5(Practice)**로 |
| `README.md` (docs/CTP/) | `refresh_inventory.mjs` 거짓 명령어 제거 또는 실제 스크립트 작성 |
| `PROBLEM_BANK_PLAN.md` | Status "Planning" → "Done", 문제 개수 "15-20" → "12" 통일 |
| `PROBLEM_BANK_HANDOFF.md` | "empty placeholders" 표현을 "구현 완료 상태"로 갱신 또는 archive 폴더로 이동 |
| `INVENTORY.md` | 현재 상태와 정합 재확인 |

### 5.7 (선택) Refactored 접미사 일괄 rename

리팩토링 종료 후 영구 식별자로 굳어버린 5+ 곳:
- `SortingContentRefactored` → `SortingContent`
- `ListContentRefactored` → `ListContent`
- `TreeContentRefactored` → `TreeContent`
- `SORTING_MODULES_REFACTORED` → `SORTING_MODULES`
- `TREE_MODULES_REFACTORED` → `TREE_MODULES`

`ctp-content-registry.tsx`도 함께 수정. 한 commit으로 처리 (rename only, behavior change 없음).

### 5.8 Phase 0 Exit Criteria
- [ ] §5.1 14개 삭제 완료, 빌드 + 타입체크 + 기존 lint pass
- [ ] §5.2 expansion 사전 정리 완료, 매핑 차집합 0 (또는 fc-1~4 의도적 제외 문서화)
- [ ] §5.3 ConceptSpec 인터페이스 + JSON 스키마 작성, 1개 샘플 spec 통과
- [ ] §5.4 svg-primitives 11개 파일 작성, 기존 visualizer 1개를 primitive로 마이그레이션 (PoC)
- [ ] §5.5 TONE_GUIDE.md 커밋
- [ ] §5.6 핵심 문서 4개 정합화 완료
- [ ] `scripts/ctp-verify.mjs` G1-G7 자동 검증 스크립트 작성, 1개 샘플 컨셉 PASS

---

## 6. Phase 1: Critical-Empty 완성 (5-7일, 멀티에이전트)

### 6.1 작업 대상 (총 16 컨셉)

**Tier 1 — 콘텐츠 0줄 (5개, 최우선)**:
- `cursor-linked-list` (08-3)
- `fc-1`, `fc-2`, `fc-3`, `fc-4` (Final Challenge)

**Tier 2 — expansion만 의존 (5개)**:
- `singly` (08-1), `doubly` (08-2), `circular` (08-4), `tree-basics` (09-1), `bst` (09-2)

**Tier 3 — 모듈-03 expansion 매핑 없는 6개 (story 1문장 → 3-4문장)**:
- `sorting-overview`, `shell-sort`, `counting-sort`, `brute-force-search`, `kmp-search`, `boyer-moore-search`
- (이미 expansion 매핑 있는 6 정렬(bubble/selection/insertion/quick/merge/heap)은 Phase 3 톤 다듬기에서 함께 처리)

### 6.1.1 Phase 1 시각화 작업 범위
- **시각화 신규 작성**: Tier 1 5개 (cursor-linked-list + fc-1~4) 만 Phase 1에서 작성. fc-1~4는 종합 시뮬레이터 형태.
- **콘텐츠만 작성**: Tier 2 5개, Tier 3 6개 — Phase 1에서는 story/features만, 시각화는 Phase 2에서.

### 6.2 에이전트 dispatch 패턴

```
Step 1: Spec Author (단일 Opus 에이전트)
  Input: §6.1의 18 컨셉 ID 목록 + TONE_GUIDE.md + 기존 module-01/02 예시
  Output: web/data/ctp/specs/<id>.json × 18

Step 2: 병렬 dispatch
  Visualizer Specialist (Opus) × 1 — 18 컨셉 순차 처리 또는 그룹 분할 병렬
  Content Specialist (Opus) × 1 — 18 컨셉 story/features 일괄 작성

Step 3: Verifier (자동 스크립트) — 모든 산출물 G1-G7 검증

Step 4: 인간 샘플 검토 — module별 3개 무작위
```

### 6.3 Phase 1 Exit Criteria
- [ ] 16 컨셉 모두 ConceptSpec JSON 존재
- [ ] 16 컨셉 모두 module-XX-*.tsx에 story 3블록 + features 4개 작성
- [ ] Tier 1 5개(cursor-linked-list + fc-1~4)는 svg-animations/module-04/<id>.tsx 신규 작성
- [ ] G1-G7 ALL PASS
- [ ] 샘플 검토 평균 ≥ 4.0/5.0

---

## 7. Phase 2: module-04 Visualizer 신규 + module-03 보강 (3-4일)

### 7.1 module-04 Tier 2 시각화 (Phase 1에서 작성 안 된 5개)

Phase 1에서 `cursor-linked-list` + `fc-1~4`는 이미 시각화 완성. Phase 2에서 나머지 5개:
- `singly.tsx` — 단일 연결 리스트 (NodeCircle + EdgeLine, head → next 화살표)
- `doubly.tsx` — 이중 연결 리스트 (prev/next 양방향 화살표)
- `circular.tsx` — 원형 이중 연결 리스트 (마지막 노드 → head 연결)
- `tree-basics.tsx` — 일반 트리 (dagre 레이아웃)
- `bst.tsx` — BST 삽입/삭제/탐색 시각화 (in-order successor 케이스 강조)
- 각각 `supp/<id>-supp.tsx` 4개 보조 SVG

### 7.2 module-03 정렬 supp 통일

현재 module-03 정렬 visualizer는 supp 패턴이 두 가지로 혼재:
- 통일된 `SupplementaryOptions` 배열 (sorting-overview/bubble/insertion/selection/shell/quick/merge)
- 개별 named export (counting/heap/string-search)

→ 모두 `SupplementaryOptions` 배열 패턴으로 통일.

### 7.3 string-search visualizer 데이터 추출 개선

`brute-force-search`/`kmp-search`/`boyer-moore-search`가 sampleData를 알파벳 매핑(`chars[n%26]`)하는 어색한 패턴을 제거. ConceptSpec에 `simulation.initialState`에 text/pattern을 명시적으로 받게.

### 7.4 Phase 2 Exit Criteria
- [ ] module-04 Tier 2 시각화 5개 main + 20개 supp 작성 (5 × 4)
- [ ] module-04 전체(Phase 1+2 합산) main 6개 + supp 24개 (6 × 4) 보유 — fc-1~4 제외
- [ ] module-03 정렬 9개 supp 패턴 통일
- [ ] string-search 3개 데이터 입력 명시화
- [ ] G1-G7 ALL PASS
- [ ] module-04 ChapterOverview에 previewVisualizers 채워짐

---

## 8. Phase 3: 톤 다듬기 + 통합 검수 (2-3일)

### 8.1 module-01 톤 다듬기
- 화려한 형용사 정리 ("미슐랭 3스타", "잔혹한 실행 경로", "압도적인 위력", "신비한 지휘관") → module-02 차분 톤
- 영문 병기 빈도 조정 (한 컨셉당 8-15개 → 5-8개)

### 8.2 통합 검수
- 전 52 컨셉을 G1-G7 다시 통과
- 인간 샘플 검토: 모듈 × 5개 = 20개
- TONE_GUIDE.md 위반 lint 0건

### 8.3 module-01 ↔ module-04 비유 사전 통합
- 비유 중복 검사 (같은 비유가 여러 컨셉에 등장하지 않는지)
- 모듈 간 톤 일관성 점수화

### 8.4 Phase 3 Exit Criteria
- [ ] 52 컨셉 톤 일관성 인간 평가 평균 ≥ 4.5/5.0
- [ ] G1-G7 ALL PASS
- [ ] hash-collision 키 매핑 작동 확인 (개발자 도구로 expansion 보강 확인)

---

## 9. Phase 4: 코드 시뮬레이터 어댑터 (보류, 별도 spec)

D3 결정(Step 시나리오 전면)에 따라 본 spec에서 제외. 향후 trace 기반으로 전환 시 별도 spec 작성:
- `web/lib/ctp/skulpt-runner.ts` 작성 (Skulpt Worker → useCTPStore 어댑터)
- `useCodeTemplateSimulation` 교체 (현재는 Phase 0에서 dead로 삭제됨)
- Generic Visualizer가 `step.variables`/`step.events` 자동 매핑

---

## 10. 위험 + 완화

| 위험 | 영향 | 완화책 |
|---|---|---|
| 축별 specialist 통합 충돌 | 같은 파일을 여러 에이전트가 동시 편집 | conceptId 기반 명명 규약 + 에이전트별 책임 파일 분리 (Visualizer는 svg-animations/, Content는 module-XX-*.tsx) |
| 톤 들쭉날쭉 | Wide-Shallow + 멀티에이전트 조합의 본질적 위험 | Phase 0 TONE_GUIDE.md + G4 자동 검사 + Phase 3 다듬기 |
| ConceptSpec 작성 자체가 병목 | 18 컨셉 spec을 한 명이 다 쓰면 느림 | Spec Author도 Opus 에이전트화 (단, 모든 spec을 한 번에 일괄 작성하여 일관성 확보) |
| Skulpt G6 검증 실패 | Phase 1 산출물이 무한 재시도 | Phase 0에서 1개 샘플 컨셉으로 사전 검증, 실패 패턴 미리 식별 |
| 옛 expansion 키 삭제로 깨짐 | 삭제한 키를 어딘가에서 import 중일 수 있음 | §5.2 작업 전 `rg "<key>"` 일괄 검색, 어느 곳에서도 참조 안 됨 확인 후 삭제 |
| module-04 신규 visualizer 디자인 품질 | NodeCircle/EdgeLine 같은 primitive가 새로 만들어지는 영역 | Phase 0에서 primitive 디자인 PoC, 작은 데모 페이지로 사전 검토 |
| 인간 검토 자원 부족 | 모듈당 3개 × 4 모듈 + Phase 3 추가 = 약 32회 검토 | 1회 5-10분 가정 시 총 3-5시간 — 1일 분산 가능 |

---

## 11. 작업 산출물 목록

### Phase 0 산출물
- 14개 dead code 제거 commit
- `ctp-content-expansion.ts` 정리 commit (45 옛 ID 제거 + 30 신규 매핑)
- `web/data/ctp/specs/concept-spec.ts` (ConceptSpec 인터페이스)
- `web/components/features/ctp/playground/visualizers/shared/svg-primitives/*.tsx` (11개)
- `docs/CTP/foundation/TONE_GUIDE.md`
- 핵심 문서 4개 정합화 (ARCHITECTURE/SIMULATION_PIPELINE/MAINTENANCE_PLAYBOOK/CONSISTENCY_GUIDELINES + README + PROBLEM_BANK_PLAN + INVENTORY)
- `scripts/ctp-verify.mjs` 검증 스크립트
- (선택) Refactored 접미사 rename commit

### Phase 1 산출물
- `web/data/ctp/specs/*.json` × 16 (Tier 1 + Tier 2 + Tier 3)
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/{cursor-linked-list,fc-1,fc-2,fc-3,fc-4}.tsx` × 5 main
- 위 5개의 `supp/*-supp.tsx` × 5 (각 SupplementaryOptions 4개 = 총 20 SVG)
- module-04-list-tree-final.tsx + module-03-sorting-string.tsx (16 컨셉의 story/features 패치)

### Phase 2 산출물
- `web/data/ctp/specs/*.json` × 5 (Tier 2 — singly/doubly/circular/tree-basics/bst)
- `svg-animations/module-04/{singly,doubly,circular,tree-basics,bst}.tsx` × 5 main + supp 20개
- module-03 supp 패턴 통일 commit
- string-search 데이터 입력 명시화 commit

### Phase 3 산출물
- module-01 톤 다듬기 commit
- 통합 검수 리포트 (samples × 20)

---

## 12. 다음 단계

본 spec 승인 후:
1. `superpowers:writing-plans` 스킬로 Phase 0의 단계별 실행 계획 작성 (가장 큰 phase, 인간 주도)
2. Phase 0 실행 → Exit Criteria 통과 확인
3. Phase 1을 위한 멀티에이전트 dispatch (writing-plans가 다시 한 번 호출되어 단계별 작업 분할)
4. Phase 2, 3 순차

각 Phase 시작 전 본 spec을 재참조하여 결정사항(D1-D5)에서 벗어나지 않았는지 확인.

---

## 부록 A: 사용자 결정 요약

| 결정 | 답변 | 함의 |
|---|---|---|
| 시작 전략 | Wide-Shallow 일괄 | 전체 외형 빠른 완성 우선, 패턴 미확정 위험은 Phase 0로 완화 |
| 퀄리티 명세 | 자습용 학습 도구 | 95%+ 정확성, 모바일/a11y 후순위, 동료 공유 가능 |
| 시각화 엔진 | Step 시나리오 전면 | 컨셉별 useSim+Visualizer 작성, Skulpt trace 보류 |
| 에이전트 분할 | 축별 specialist + Opus 4.7 max | Visualizer/Content/Verifier 3 axis, 모든 에이전트 opus |
| 검증 게이트 | 자동 + 샘플 인간 검토 | G1-G7 자동, 모듈당 3개 인간 검토 |

## 부록 B: 핵심 발견 인용 출처

본 spec의 모든 진단은 다음 조사 결과에 근거:
- 1차 4-에이전트 조사 (CTP 코드 구조 / 문서 / 시각화/시뮬레이터 / 문제+교재)
- 2차 3-에이전트 정밀 재조사 (시각화 빈약 매트릭스 / 콘텐츠 충실도 / 레거시 정밀 탐색)

조사 결과는 본 worktree 세션의 task notification 로그에 보존됨.
