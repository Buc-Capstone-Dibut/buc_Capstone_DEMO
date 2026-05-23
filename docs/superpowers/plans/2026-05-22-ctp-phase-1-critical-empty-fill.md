# CTP Phase 1: Critical-Empty 완성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** D등급(콘텐츠 사실상 0) 19 컨셉 중 ProblemBank/통합 챕터로 라우팅되는 3개를 제외한 16 컨셉을 양산해 module-04 + module-03 일부의 학습 가능성을 회복한다.

**Architecture:** 축별 specialist 3개(Spec Author → Visualizer + Content 병렬 → Verifier)가 각자 dispatch되며 ConceptSpec JSON을 단일 컨트랙트로 사용한다. Spec Author가 먼저 16 JSON을 일괄 작성해 일관성을 확보하고, Visualizer Specialist는 Tier 1의 5개 시각화 컴포넌트를 svg-primitives 라이브러리로 신규 작성하며, Content Specialist는 16 컨셉의 story/features를 module-XX-*.tsx에 등록한다. 최종 Verifier가 G1-G7 자동 게이트로 검증한다.

**Tech Stack:** TypeScript + React + framer-motion + svg-primitives 라이브러리 (Phase 0 산출) + ConceptSpec 컨트랙트 (Phase 0 산출) + ctp-verify.mjs (Phase 0 산출).

**참조:**
- Spec: [docs/superpowers/specs/2026-05-22-ctp-content-pipeline-design.md](../specs/2026-05-22-ctp-content-pipeline-design.md) §6 (Phase 1 명세)
- Phase 0 plan: [docs/superpowers/plans/2026-05-22-ctp-phase-0-cleanup-and-standards.md](2026-05-22-ctp-phase-0-cleanup-and-standards.md)
- Tone Guide: [docs/CTP/foundation/TONE_GUIDE.md](../../CTP/foundation/TONE_GUIDE.md)
- Maintenance Playbook: [docs/CTP/operations/MAINTENANCE_PLAYBOOK.md](../../CTP/operations/MAINTENANCE_PLAYBOOK.md)

---

## 작업 대상 16 컨셉

### Tier 1 — 콘텐츠 + 시각화 둘 다 신규 (5개)
| ID | conceptId | 모듈 | 비고 |
|---|---|---|---|
| `cursor-linked-list` | list | module-04 | 08-3 커서 기반 연결 리스트 |
| `fc-1` | final-challenge | module-04 | FC-1 기초·검색 종합 |
| `fc-2` | final-challenge | module-04 | FC-2 스택·재귀·정렬 종합 |
| `fc-3` | final-challenge | module-04 | FC-3 문자열·리스트·트리 종합 |
| `fc-4` | final-challenge | module-04 | FC-4 미니 코딩테스트 |

### Tier 2 — 콘텐츠만 (5개, 시각화는 Phase 2)
| ID | conceptId | 모듈 | 비고 |
|---|---|---|---|
| `singly` | list | module-04 | 08-1 단일 연결 리스트 |
| `doubly` | list | module-04 | 08-2 이중 연결 리스트 |
| `circular` | list | module-04 | 08-4 원형 이중 연결 리스트 |
| `tree-basics` | tree | module-04 | 09-1 트리 구조 |
| `bst` | tree | module-04 | 09-2 BST |

### Tier 3 — story 확장만 (6개, 1문장 → 3-4문장)
| ID | conceptId | 모듈 | 비고 |
|---|---|---|---|
| `sorting-overview` | sorting | module-03 | 06-1 |
| `shell-sort` | sorting | module-03 | 06-5 |
| `counting-sort` | sorting | module-03 | 06-9 |
| `brute-force-search` | string-search | module-03 | 07-1 |
| `kmp-search` | string-search | module-03 | 07-2 |
| `boyer-moore-search` | string-search | module-03 | 07-3 |

---

## File Structure

### 신규 생성 파일 (5 + 5 = 10)
- `web/data/ctp/specs/cursor-linked-list.json` (Tier 1 spec)
- `web/data/ctp/specs/fc-1.json`, `fc-2.json`, `fc-3.json`, `fc-4.json` (Tier 1 spec, 4개)
- `web/data/ctp/specs/singly.json`, `doubly.json`, `circular.json`, `tree-basics.json`, `bst.json` (Tier 2 spec, 5개)
- `web/data/ctp/specs/sorting-overview.json`, `shell-sort.json`, `counting-sort.json`, `brute-force-search.json`, `kmp-search.json`, `boyer-moore-search.json` (Tier 3 spec, 6개)

총 16 ConceptSpec JSON.

### 신규 시각화 파일 (Tier 1, 5 main + 20 supp)
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/cursor-linked-list.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/fc-1.tsx`, `fc-2.tsx`, `fc-3.tsx`, `fc-4.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/cursor-linked-list-supp.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/fc-1-supp.tsx`, `fc-2-supp.tsx`, `fc-3-supp.tsx`, `fc-4-supp.tsx`

각 supp 파일에 SVG 컴포넌트 4개 + `XxxSupplementaryOptions` 배열 export.

### 수정 파일
- `web/components/features/ctp/contents/categories/modules/module-03-sorting-string.tsx`: 6 컨셉의 story 확장
- `web/components/features/ctp/contents/categories/modules/module-04-list-tree-final.tsx`: 11 컨셉 (Tier 1 + Tier 2)의 story + features + visualizer 등록
- `web/components/features/ctp/contents/shared/ctp-content-expansion.ts`: 21 placeholder를 실제 콘텐츠로 보강 (Tier 1/2/3 모두)

---

## Task 1: Spec Author — 16 ConceptSpec JSON 일괄 작성

**Files:** 16 JSON 신규 생성 (web/data/ctp/specs/)

단일 Opus subagent가 16 컨셉의 ConceptSpec을 일괄 작성해 톤·구조 일관성을 확보한다.

### Task 1.1: 16 ConceptSpec JSON 작성

- [ ] **Step 1: 디렉토리 확인**

```bash
ls web/data/ctp/specs/
```
Expected: concept-spec.ts, concept-spec.test.ts, samples/

- [ ] **Step 2: Spec Author subagent dispatch**

Spec Author는 다음을 입력으로 받는다:
- `web/data/ctp/specs/concept-spec.ts` (인터페이스)
- `web/data/ctp/specs/samples/binary-search.json` (구조 예시)
- `docs/CTP/foundation/TONE_GUIDE.md` (톤 가이드)
- 16 컨셉 ID/title 목록 (위 §"작업 대상 16 컨셉" 표)
- 기존 module-01/02의 풍부한 컨셉 예시 (`module-01-foundation.tsx`의 `algo-overview`, `module-02-stack-recursion.tsx`의 `lifo-basics`)
- Tier별 작업 범위 차이 안내

각 컨셉별 ConceptSpec 작성 시 요구사항:
- `id`, `moduleId`, `conceptId`, `title`은 위 표 기준
- `difficulty`: Tier 1/2는 `intermediate`, Tier 3는 `intermediate`, `fc-4`만 `advanced`
- `prerequisites`: 의존 컨셉 ID 배열 (예: `singly` → `["1d-array"]`, `bst` → `["tree-basics"]`)
- `learningOutcomes`: 3-5개 한국어 문장
- `simulation`:
  - Tier 1: 신규 시각화 시나리오 정의 (mode, domain, stepCount 4-8, operations, initialState, storyboard 4-8개)
  - Tier 2: 기존 generic fallback 또는 향후 Phase 2 시각화 가정 (mode "interactive", storyboard 비워두거나 minimal)
  - Tier 3: 기존 정렬/문자열 visualizer를 사용 (`useSortingOverviewSim`, `BruteForceSearchVisualizer` 등 기존 이름 그대로)
- `visualizer.type`: 도메인별 매핑 (Tier 1 cursor-linked-list → `linked-list`, fc-* → `array`, Tier 2 tree-* → `tree`/`bst`, 등)
- `supplementary`: 4개 항목 (title + description + visualHint 한국어)
- `content.story`: TONE_GUIDE 기준 (problem 2-3 문장, definition 글머리표 3개로 3-5 문장, analogy 2-3 문장)
- `content.features`: 정확히 4개, 각 description 2-3 문장
- `content.complexity`: 시간복잡도 명시 가능한 경우만 (optional)

비유 사전 (TONE_GUIDE.md 기준):
- `cursor-linked-list`: 주차장 자리 번호로 다음 차량 위치 기록
- `singly`: 기차 객차 (앞에서 뒤로만)
- `doubly`: 양방향 도로
- `circular`: 회전 초밥 벨트 / 원형 트랙
- `tree-basics`: 회사 조직도, 가족 계보, 책 목차
- `bst`: 사전 색인, 도서 정리 규칙
- `fc-1~4`: 종합 평가라 비유보다 "지금까지 배운 N개 개념의 통합 시험" 직접 설명

- [ ] **Step 3: 빌드 + 테스트 검증**

```bash
cd web && pnpm test:ctp-specs
```
기존 3 테스트 PASS 유지.

각 신규 JSON에 대해 `validateConceptSpec`이 통과하는지 임시 스크립트로 검증:
```bash
cd web && for f in data/ctp/specs/*.json; do
  echo "=== $(basename $f) ==="
  node -e "
    const { validateConceptSpec } = require('./data/ctp/specs/concept-spec.ts');
    const spec = require('./$f');
    try { validateConceptSpec(spec); console.log('PASS'); }
    catch (e) { console.error('FAIL:', e.message); }
  " 2>&1 | tail -2
done
```
(tsx 환경 호환성 이슈 시 `tsx --eval` 또는 별도 검증 테스트 추가)

또는 단순히 `pnpm verify:ctp --all`로 G1-G7 검증 시 G2/G7 WARN (모듈 등록 전이라 정상)이지만 G3/G4는 PASS여야 함.

- [ ] **Step 4: Commit**

```bash
git add web/data/ctp/specs/*.json
git commit -m "feat(CTP): Phase 1 16 ConceptSpec JSON 일괄 작성

Tier 1 (5): cursor-linked-list, fc-1, fc-2, fc-3, fc-4
Tier 2 (5): singly, doubly, circular, tree-basics, bst
Tier 3 (6): sorting-overview, shell-sort, counting-sort, brute-force-search, kmp-search, boyer-moore-search

TONE_GUIDE 준수, ConceptSpec 인터페이스 통과.
Phase 1 Visualizer/Content Specialist 작업의 입력 spec.
"
```

---

## Task 2: Visualizer Specialist — Tier 1 시각화 신규 (5 main + 20 supp)

**Files:** `web/components/features/ctp/playground/visualizers/svg-animations/module-04/` 신규 생성

단일 Opus subagent가 5개 컨셉의 useSim 훅 + Visualizer 컴포넌트 + 4개 supp SVG를 svg-primitives 기반으로 작성한다.

### Task 2.1: module-04 디렉토리 생성

- [ ] **Step 1: 폴더 생성**

```bash
mkdir -p web/components/features/ctp/playground/visualizers/svg-animations/module-04/supp
```

### Task 2.2: Visualizer Specialist dispatch — 5 main visualizer 작성

Specialist 입력:
- 5 ConceptSpec JSON (Task 1 산출)
- svg-primitives 라이브러리 (`web/components/features/ctp/playground/visualizers/shared/svg-primitives/`)
- 기존 visualizer 예시: `module-01/basic-binary-search.tsx` (svg-primitives 사용 PoC) + `module-01/lifo-basics.tsx` (인터랙티브 패턴)

각 visualizer 작성 규칙:
- 파일 첫 줄: `"use client";`
- export 2개: `useXxxSim` 훅 + `XxxVisualizer` 컴포넌트
- Visualizer 이름은 ConceptSpec.id를 PascalCase로 (예: `cursor-linked-list` → `CursorLinkedListVisualizer`, `fc-1` → `Fc1Visualizer`)
- **svg-primitives만 사용**: hardcoded hex 색상 금지 (G5)
- useSim 훅: `useState<number>(0) step` + `peek()` 콜백 + `setLogs` 누적 + `maxSteps` 상수 + `reset()`
- 반환: `{ runSimulation: () => {}, interactive: { visualData: { step, ... }, logs, handlers: { peek, reset, clear: reset } } }`

각 컨셉별 시각화 의도:
- **cursor-linked-list**: 배열의 인덱스가 next 포인터 역할. 배열 박스 7개 + 화살표가 인덱스 가리킴. ArrayBox + EdgeLine 활용.
- **fc-1**: 4문제 미니 워크플로 (배열 최댓값 → 선형 탐색 → 이진 탐색 → 해시 충돌). 단계별 다른 자료구조 표시. ArrayBox + IndexLabel + PointerArrow.
- **fc-2**: 스택/큐/재귀 통합 시연 (3개 컨테이너 표시 + push/pop 흐름). NodeCircle + EdgeLine.
- **fc-3**: 문자열 + 리스트 + 트리 통합. 다양한 primitive 조합.
- **fc-4**: 미니 코딩테스트 UI 흉내 (타이머 + 문제 카드 4개 + 결과 패널). StepCounter + LogPanel + ArrayBox.

- [ ] **Step 1: Visualizer Specialist subagent dispatch**

5 main visualizer 일괄 작성. svg-primitives import 강제.

- [ ] **Step 2: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit 2>&1 | grep "module-04" | head
```
Expected: 0 매치

- [ ] **Step 3: Commit**

```bash
git add web/components/features/ctp/playground/visualizers/svg-animations/module-04/*.tsx
git commit -m "feat(CTP): Tier 1 visualizer 5개 신규 (module-04 main)

cursor-linked-list, fc-1, fc-2, fc-3, fc-4의 useSim 훅 + Visualizer 컴포넌트.
svg-primitives 라이브러리만 사용 (hardcoded 색상 금지).
"
```

### Task 2.3: supp 파일 5개 작성 (각 4개 SVG)

각 supp 파일은 4개의 정적 SVG 컴포넌트 + `XxxSupplementaryOptions = [SVG1, SVG2, SVG3, SVG4]` 배열 export.

ConceptSpec.supplementary의 4개 항목을 SVG로 시각화:
- title을 SVG 안 텍스트로
- visualHint를 시각적 단서로 표현
- description은 모듈 등록 시 features 카드에 전달

- [ ] **Step 1: 5 supp 파일 작성**

```
supp/cursor-linked-list-supp.tsx
supp/fc-1-supp.tsx
supp/fc-2-supp.tsx
supp/fc-3-supp.tsx
supp/fc-4-supp.tsx
```

- [ ] **Step 2: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit 2>&1 | grep "supp" | head
```
Expected: 0 매치

- [ ] **Step 3: Commit**

```bash
git add web/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/*.tsx
git commit -m "feat(CTP): Tier 1 supp SVG 20개 신규 (module-04/supp)

각 컨셉별 SupplementaryOptions 배열 4개씩, 총 20 SVG 컴포넌트.
svg-primitives 기반.
"
```

---

## Task 3: Content Specialist — 16 컨셉 모듈 등록 + expansion 보강

**Files:**
- Modify: `web/components/features/ctp/contents/categories/modules/module-03-sorting-string.tsx` (6 컨셉 story 확장)
- Modify: `web/components/features/ctp/contents/categories/modules/module-04-list-tree-final.tsx` (11 컨셉 신규 등록)
- Modify: `web/components/features/ctp/contents/shared/ctp-content-expansion.ts` (21 placeholder 보강)

단일 Opus subagent가 16 컨셉의 story/features를 module 파일에 등록하고 expansion 사전 placeholder를 실제 콘텐츠로 채운다.

### Task 3.1: module-04 11 컨셉 등록

Tier 1 (5) + Tier 2 (5) + 통합 fc-1~4 분배:
- Tier 1: cursor-linked-list (list concept), fc-1~4 (final-challenge concept)
- Tier 2: singly, doubly, circular (list concept), tree-basics, bst (tree concept)

각 컨셉에 다음 필드 작성 (module-04-list-tree-final.tsx 내):
```tsx
{
  id: "cursor-linked-list",
  title: "08-3 커서 기반 연결 리스트",
  description: "한 줄 요약",
  story: { problem, definition, analogy }, // ConceptSpec.content.story 그대로
  features: [...], // ConceptSpec.content.features 4개 그대로
  sampleData: [/* 도메인별 데이터 */],
  // Tier 1만:
  useSim: useCursorLinkedListSim,
  Visualizer: CursorLinkedListVisualizer,
}
```

Tier 2는 useSim/Visualizer 없이 둠 (Phase 2에서 추가). 모듈 폴백이 인터랙티브 모드로 동작.

- [ ] **Step 1: module-04-list-tree-final.tsx에 11 컨셉 등록**

기존 sampleData만 있던 항목을 풍부한 형태로 교체.

- [ ] **Step 2: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit 2>&1 | grep "module-04-list-tree-final" | head
```
Expected: 0 매치

- [ ] **Step 3: Commit**

```bash
git add web/components/features/ctp/contents/categories/modules/module-04-list-tree-final.tsx
git commit -m "feat(CTP): module-04 11 컨셉 콘텐츠 등록 (Tier 1+2)

cursor-linked-list, fc-1~4, singly, doubly, circular, tree-basics, bst의
story 3블록 + features 4개 추가. 기존 sampleData만 있던 부실 상태 해소.
"
```

### Task 3.2: module-03 6 컨셉 story 확장

Tier 3: sorting-overview, shell-sort, counting-sort, brute-force-search, kmp-search, boyer-moore-search

기존 1문장 story를 ConceptSpec.content.story의 풍부한 콘텐츠로 교체. features 4개도 동일하게.

- [ ] **Step 1: module-03-sorting-string.tsx에서 6 컨셉 story/features 확장**

- [ ] **Step 2: 빌드 검증**

- [ ] **Step 3: Commit**

```bash
git add web/components/features/ctp/contents/categories/modules/module-03-sorting-string.tsx
git commit -m "feat(CTP): module-03 6 컨셉 story 확장 (Tier 3)

sorting-overview, shell-sort, counting-sort, brute-force-search,
kmp-search, boyer-moore-search의 1문장 story → module-02 분량으로 확장.
"
```

### Task 3.3: expansion 사전 21 placeholder 보강

Phase 0에서 만든 21 placeholder를 실제 deep-dive 콘텐츠로 채운다.

placeholder 키 21개:
- module-01 8개: algo-overview, array-number-prime, condition-loop, ds-compare, flow-tracing, hash-collision, linear-search, search-problem-key
- module-02 6개: queue-overview, recursion-analysis, recursion-basics, tower-of-hanoi, iterative-recursion, queen-backtracking
- module-03 7개: boyer-moore-search, brute-force-search, counting-sort, kmp-search, shell-sort, sorting-overview, (hash-collision은 module-01)

각 키에 다음 슬롯 보강:
- `story` 보강 (모듈 본문 외 추가 deep-dive)
- `features` 추가 (모듈 본문 외 추가 관찰)
- `guide` (코드 패턴 카드 1-3개)

기존 풍부한 expansion 사전 항목(예: collision → hash-collision)의 구조를 참고해 동일한 깊이로 작성.

- [ ] **Step 1: 21 placeholder 실제 콘텐츠로 보강**

- [ ] **Step 2: 빌드 검증**

```bash
cd web && pnpm exec tsc --noEmit 2>&1 | grep "ctp-content-expansion" | head
```
Expected: 0 매치

- [ ] **Step 3: Commit**

```bash
git add web/components/features/ctp/contents/shared/ctp-content-expansion.ts
git commit -m "feat(CTP): expansion 사전 21 placeholder를 실제 콘텐츠로 보강

Phase 0에서 placeholder로 등록된 21 컨셉에 story 보강 + features 추가
+ guide 코드 패턴 카드 작성. 기존 collision/hash-collision 깊이 수준.
"
```

---

## Task 4: Verifier — G1-G7 통합 검증

**Files:** (실행만, 변경 없음)

자동 스크립트 + 인간 샘플 검토 안내.

### Task 4.1: ctp-verify --all 실행

- [ ] **Step 1: 전체 컨셉 검증**

```bash
cd web && pnpm verify:ctp
node scripts/ctp-verify.mjs --all
```

Expected:
- 16 신규 spec + 1 기존 sample (basic-binary-search) = 17 컨셉 검증
- 모든 컨셉의 G1-G7 PASS (G6는 interactive 면제로 모두 PASS)
- exit code 0

만약 FAIL 발생 시:
- G1 FAIL: useSim/Visualizer 이름이 ConceptSpec.id PascalCase와 다름. Visualizer Specialist 재dispatch
- G2 FAIL: 모듈 파일에 id 등록 누락. Content Specialist 재dispatch
- G4 FAIL: 톤 가이드 위반 (문장 수 부족 / 금지 표현). Content Specialist 수정 dispatch
- G5 FAIL: hardcoded hex 발견. Visualizer Specialist 수정 dispatch
- G7 FAIL: ctp-curriculum.ts에 id 등록 누락 (기존에 등록되어 있을 가능성 높음, 확인 필요)

각 FAIL은 atomic fix commit으로 처리.

### Task 4.2: ctp-curriculum.ts 등록 확인

ctp-curriculum.ts의 subConcepts에 16 컨셉 ID가 이미 있는지 확인:

```bash
for id in cursor-linked-list fc-1 fc-2 fc-3 fc-4 singly doubly circular tree-basics bst sorting-overview shell-sort counting-sort brute-force-search kmp-search boyer-moore-search; do
  if rg -q "id: \"$id\"" web/lib/ctp-curriculum.ts; then
    echo "PASS: $id"
  else
    echo "MISSING: $id"
  fi
done
```

Expected: 모든 ID가 PASS (기존 커리큘럼에 등록되어 있음).

MISSING이 있으면 curriculum 등록 commit 추가:
```bash
git commit -m "fix(CTP): ctp-curriculum.ts에 누락된 subConcept ID 등록"
```

### Task 4.3: 빌드 + 풀빌드 검증

- [ ] **Step 1: 전체 빌드**

```bash
cd web && pnpm exec tsc --noEmit 2>&1 | grep -v "career\|community\|interview\|job-postings\|bookmark\|reputation" | head
```
Expected: CTP 영역 0 매치 (다른 영역의 베이스라인 에러는 무관)

```bash
cd web && pnpm exec next build 2>&1 | tail -5
```
Expected: "Compiled successfully"

### Task 4.4: 기존 테스트 모두 통과

- [ ] **Step 1: ctp-specs 테스트**

```bash
cd web && pnpm test:ctp-specs
```
Expected: 3/3 pass (기존 테스트 영향 없음)

```bash
cd web && pnpm test:ctp-problem-bank
```
Expected: 7/7 pass

---

## Task 5: 인간 샘플 검토 가이드 (controller가 사용자에게 안내)

자동 게이트 통과 후 사용자에게 모듈별 3개 컨셉 샘플 검토를 안내한다.

### Task 5.1: 샘플 추출

다음 12개 샘플을 무작위 추출 (4 모듈 × 3개) — 실제로는 Tier 분포에 맞춤:

추천 샘플 (16 컨셉 중 12):
- Tier 1: cursor-linked-list, fc-1, fc-3 (3개)
- Tier 2: singly, tree-basics, bst (3개)
- Tier 3: sorting-overview, shell-sort, kmp-search (3개)
- module-02에서 검증 차원에서 expansion 보강된 컨셉 3개: tower-of-hanoi, recursion-basics, queen-backtracking

### Task 5.2: 검토 점수표

각 샘플에 4축 평가 (1-5):
- **학습 효과**: 학생이 이 컨셉을 이해하는 데 도움이 되는가?
- **비유 자연스러움**: analogy가 한국 학습자에게 친숙한가?
- **시각화 정확성**: Tier 1 시각화가 실제 알고리즘 동작과 일치하는가?
- **톤 일관성**: 다른 컨셉과 톤이 어울리는가?

평균 4.0 미만이면 해당 모듈 전체 재작업.

### Task 5.3: 사용자 검토 URL 안내

```
검토할 URL 12개:

Tier 1 (신규 시각화 포함):
- /insights/ctp/module-04-list-tree-final/list?view=cursor-linked-list
- /insights/ctp/module-04-list-tree-final/final-challenge?view=fc-1
- /insights/ctp/module-04-list-tree-final/final-challenge?view=fc-3

Tier 2 (콘텐츠만, Phase 2 시각화 대기):
- /insights/ctp/module-04-list-tree-final/list?view=singly
- /insights/ctp/module-04-list-tree-final/tree?view=tree-basics
- /insights/ctp/module-04-list-tree-final/tree?view=bst

Tier 3 (story 확장):
- /insights/ctp/module-03-sorting-string/sorting?view=sorting-overview
- /insights/ctp/module-03-sorting-string/sorting?view=shell-sort
- /insights/ctp/module-03-sorting-string/string-search?view=kmp-search

Expansion 보강 검증:
- /insights/ctp/module-02-stack-recursion/recursion?view=tower-of-hanoi
- /insights/ctp/module-02-stack-recursion/recursion?view=recursion-basics
- /insights/ctp/module-02-stack-recursion/recursion?view=queen-backtracking
```

dev server 실행:
```bash
cd web && pnpm dev
```

---

## Phase 1 Exit Criteria

- [ ] 16 ConceptSpec JSON 생성 + validateConceptSpec 통과
- [ ] Tier 1 5개의 visualizer (5 main + 20 supp) 신규 작성, svg-primitives만 사용
- [ ] module-03 6 컨셉 + module-04 11 컨셉 모듈 등록 완료
- [ ] expansion 사전 21 placeholder가 실제 콘텐츠로 보강됨
- [ ] `pnpm verify:ctp --all` 결과 17/17 PASS (또는 의도된 WARN만)
- [ ] `pnpm exec next build` 컴파일 성공
- [ ] `pnpm test:ctp-specs` + `pnpm test:ctp-problem-bank` 모두 PASS
- [ ] 사용자 샘플 검토 (12개) 평균 4.0+ (Optional, 사용자가 검토 시점에 평가)

---

## Task 정리

| Task | 산출 | 예상 commit 수 |
|---|---|---|
| 1.1 Spec Author | 16 JSON | 1 |
| 2.1 module-04 폴더 | (mkdir만) | 0 |
| 2.2 Visualizer main 5 | 5 .tsx | 1 |
| 2.3 Visualizer supp 5 | 5 supp .tsx × 4 SVG | 1 |
| 3.1 module-04 등록 11 | module-04 패치 | 1 |
| 3.2 module-03 확장 6 | module-03 패치 | 1 |
| 3.3 expansion 보강 21 | expansion.ts 패치 | 1 |
| 4.x Verifier 실행 | (실행만, fix 시 추가 commit) | 0-N |

**Phase 1 예상 총 commit: 6 (양산) + N (fix) = 6-12 commits**

---

## 다음 단계

Phase 1 완료 후:
- **Phase 2** plan 작성: module-04 Tier 2 시각화 5개 신규 + module-03 정렬 supp 패턴 통일 + string-search 데이터 입력 명시화
- **Phase 3** plan 작성: module-01 톤 다듬기 + 전 52 컨셉 톤 일관성 검수

Phase 4 (코드 시뮬레이터 어댑터)는 D3 결정에 따라 보류.
