# CTP Phase 5: 잔여 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Phase 0~4에서 명시적 보류로 남긴 미완 항목을 마무리해 완전한 코드 정합 상태로.

**Architecture:** 2개 영역 동시 정리 — (1) module-03 정렬 6 visualizer의 hardcoded hex 색상을 svg-primitives semantic token으로 교체, (2) fc-1~4 4개 컨셉의 expansion 사전 매핑을 추가해 G3 WARN 제거.

**참조:**
- Phase 2 plan §7.2 (module-03 supp 패턴 통일 — 일부)
- Phase 0~4 누적 산출: 56 commits 완료 상태에서 시작

---

## 작업 대상

### Task 1: module-03 정렬 6 visualizer hex 정합
Phase 1 Task 7.2 fix에서 일부 정렬류(brute-force/kmp/boyer-moore/counting-sort/shell-sort/sorting-overview)는 hex→HSL 단순 변환했지만, 남은 6개는 그대로:

대상:
- `bubble-sort.tsx`
- `selection-sort.tsx`
- `insertion-sort.tsx`
- `quick-sort.tsx`
- `merge-sort.tsx`
- `heap-sort.tsx`

각 파일에서 hex 색상(`#xxxxxx`)을 다음 중 하나로 교체:
- `colorTokens` 토큰 (`active`, `comparing`, `found`, `muted`)
- `hsl(var(--*))` semantic token

**시각 결과 보존**이 최우선. hex → HSL 단순 변환이 OK.

### Task 2: fc-1~4 expansion 매핑 추가
원래는 의도적 제외였으나 사용자 요청으로 매핑 추가. G3 WARN 4건 제거.

`ctp-content-expansion.ts`의 expansions 객체에 4 키 추가:
```typescript
expansions["fc-1"] = { story: { definition: "..." }, features: [...] };
expansions["fc-2"] = { story: { definition: "..." }, features: [...] };
expansions["fc-3"] = { story: { definition: "..." }, features: [...] };
expansions["fc-4"] = { story: { definition: "..." }, features: [...] };
```

각 키에 deep-dive 콘텐츠:
- definition 보강 (1-2 문단)
- features 2-4개

종합 평가 컨셉이므로 "Module N 학습 후 무엇을 어떻게 평가하는가" 형태.

---

## File Structure

### 수정 파일 (7개)
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/bubble-sort.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/selection-sort.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/insertion-sort.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/quick-sort.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/merge-sort.tsx`
- `web/components/features/ctp/playground/visualizers/svg-animations/module-03/heap-sort.tsx`
- `web/components/features/ctp/contents/shared/ctp-content-expansion.ts`

---

## Task 1: module-03 정렬 6 visualizer hex 정합

### Task 1.1: hex 카운트 사전 조사

```bash
cd web && for f in bubble-sort selection-sort insertion-sort quick-sort merge-sort heap-sort; do
  count=$(rg -c "#[0-9a-fA-F]{3,8}\b" components/features/ctp/playground/visualizers/svg-animations/module-03/${f}.tsx 2>/dev/null || echo 0)
  echo "$f: $count hex"
done
```
Expected: 각 파일에 수십 개 hex.

### Task 1.2: 일괄 hex → HSL 또는 colorTokens 교체

각 파일 read 후 hex 색상을 다음 매핑으로 교체:

| 자주 쓰이는 hex | 의미 | 교체 |
|---|---|---|
| #0d1117 / #1a1a2e / 검은 배경 | background | `hsl(var(--background))` |
| #f00 / #ef4444 / 빨강 | 비교/위험 | `hsl(var(--destructive))` 또는 colorTokens.found |
| #3b82f6 / #2563eb / 파랑 | active | `hsl(var(--primary))` |
| #fbbf24 / #f59e0b / 노랑 | comparing | `hsl(var(--warning, 38 92% 50%))` |
| #10b981 / #22c55e / 초록 | success/sorted | `hsl(var(--success, 142 71% 45%))` |
| #6b7280 / #9ca3af / 회색 | muted | `hsl(var(--muted-foreground))` |

각 visualizer가 자체 inline filter/pattern 정의를 갖고 있다면 NeonGlowFilters/CyberGrid primitive로 교체 가능 (선택적, surgical하게).

**시각 결과 동일성 우선** — hex → HSL 단순 변환이 가장 안전.

Steps:
1. 6 visualizer 한 번에 read
2. 일괄 hex 치환
3. G5 PASS 확인:
```bash
cd web && rg "#[0-9a-fA-F]{3,8}\b" components/features/ctp/playground/visualizers/svg-animations/module-03/{bubble,selection,insertion,quick,merge,heap}-sort.tsx
```
Expected: 0 매치

4. 빌드 검증
5. Commit:
```
fix(CTP): module-03 정렬 6 visualizer hardcoded hex 제거 (Phase 5)

bubble/selection/insertion/quick/merge/heap-sort.tsx의 hex 색상 리터럴을
semantic token(hsl(var(--*))) 또는 colorTokens로 일괄 교체.
시각 결과 보존, G5 PASS.
```

---

## Task 2: fc-1~4 expansion 매핑 추가

### Task 2.1: ctp-content-expansion.ts에 4 키 추가

**Files:** `web/components/features/ctp/contents/shared/ctp-content-expansion.ts`

기존 expansions 객체에 4 키 추가. 각 키의 콘텐츠:

**fc-1** (기초·검색 종합):
- definition: "Module 1 학습 후 배열 인덱싱, 선형 탐색, 이진 탐색, 해시 충돌 처리 4가지 핵심 개념을 통합 적용하는 평가입니다. 4단계 워크플로(최댓값 → 선형 → 이진 → 해시)로 각 알고리즘의 비용 비교를 체험합니다."
- features 2-3개

**fc-2** (스택·재귀·정렬 종합):
- definition: "Module 2 학습 후 스택/큐, 재귀, 백트래킹 알고리즘 + Module 3 정렬 기초를 통합 적용. 각 자료구조의 동작 흐름을 한 화면에서 비교."
- features 2-3개

**fc-3** (문자열·리스트·트리 종합):
- definition: "Module 3 문자열 검색 + Module 4 연결 리스트/트리를 통합. 세 가지 자료구조의 traversal 방식 비교."
- features 2-3개

**fc-4** (미니 코딩테스트):
- definition: "전 모듈 종합 평가. 타이머 환경에서 4문제 미니 시험 형식으로 학습 효과 검증. 시간 압박 + 정답률 동시 측정."
- features 2-3개

빌드 검증:
```bash
cd web && pnpm exec tsc --noEmit 2>&1 | grep "ctp-content-expansion"
```
Expected: 0 매치

G3 PASS 확인:
```bash
cd web && for id in fc-1 fc-2 fc-3 fc-4; do
  node scripts/ctp-verify.mjs --concept=$id 2>&1 | grep G3
done
```
Expected: 모두 PASS

Commit:
```
feat(CTP): fc-1~4 expansion 사전 매핑 추가 (Phase 5)

종합 평가 4 컨셉의 deep-dive 콘텐츠 (definition + features)를
expansion 사전에 추가. G3 WARN 4건 제거.
모듈 본문 story와 중복되지 않도록 expansion은 "어떻게 평가하는가" 위주.
```

---

## Task 3: 최종 통합 검증

```bash
cd web && node scripts/ctp-verify.mjs --all 2>&1 | tee /tmp/p5-verify.txt
```
Expected: 18 PASS / 0 FAIL, WARN 0건 (G3 WARN 4건이 해소되므로)

빌드 + 테스트:
```bash
cd web && pnpm exec next build 2>&1 | tail -3
cd web && pnpm exec tsc --noEmit 2>&1 | grep -E "features/ctp|data/ctp|lib/ctp" | head
cd web && pnpm test:ctp-specs
cd web && pnpm test:ctp-problem-bank
cd web && pnpm test:ctp-skulpt-runner
```

전역 hex 검사:
```bash
rg "#[0-9a-fA-F]{3,8}\b" web/components/features/ctp/playground/visualizers/svg-animations/ | head
```
Expected: 0 매치 또는 의도된 케이스만

---

## Phase 5 Exit Criteria

- [ ] module-03 6 정렬 visualizer hex 0 매치
- [ ] fc-1~4 expansion 사전 매핑 추가, G3 PASS
- [ ] ctp-verify --all 18/18 PASS, WARN 0건
- [ ] next build compile 성공
- [ ] 모든 단위 테스트 PASS (test:ctp-specs 3 + test:ctp-problem-bank 7 + test:ctp-skulpt-runner 5)

---

## 예상 commits

| Task | Commit 수 |
|---|---|
| 1.2 정렬 6 visualizer hex 정합 | 1 |
| 2.1 fc-1~4 expansion 매핑 | 1 |

**총 2 commits**

---

## Phase 5 완료 후

모든 phase (0~5) 완료. 최종 통합 보고:
- 총 commits: ~60
- ctp-verify --all 18/18 PASS, WARN 0건 (fc-1~4 매핑 해소)
- 전체 visualizer hex 0건
- 전 22 시각화 (Phase 1 5 + Phase 2 5 + Phase 4 1 + 기존 11) svg-primitives 사용
- Phase 4 PoC: 사용자 코드 → trace → 자동 시각화
