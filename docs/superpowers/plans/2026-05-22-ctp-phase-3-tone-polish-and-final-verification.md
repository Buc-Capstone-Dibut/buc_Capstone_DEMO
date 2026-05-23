# CTP Phase 3: module-01 톤 다듬기 + module-02 placeholder 보강 + 통합 검수 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** module-01의 화려한 형용사 톤을 module-02 차분 비즈니스 톤으로 정렬, module-02 expansion 사전 6 placeholder를 실제 deep-dive 콘텐츠로 보강, 전 22 컨셉 G1-G7 통합 검수 + 톤 일관성 자동 검사.

**Architecture:** 2 specialist dispatch (Tone Polisher + Expansion Author) + 1 Verifier. module-01의 6 컨셉 + module-02 expansion 6 placeholder를 동시에 다룬다.

**참조:**
- Spec: [docs/superpowers/specs/2026-05-22-ctp-content-pipeline-design.md](../specs/2026-05-22-ctp-content-pipeline-design.md) §8
- Tone Guide: [docs/CTP/foundation/TONE_GUIDE.md](../../CTP/foundation/TONE_GUIDE.md)
- Phase 0-2 plans: 동일 디렉토리

---

## 작업 대상

### Task 1: module-01 톤 다듬기 (6 컨셉)
module-01-foundation.tsx의 화려한 톤을 module-02 차분 톤으로 다듬는다.

대상 — story.problem/definition/analogy에 다음 표현/패턴이 있는 컨셉:
- 화려한 형용사: "압도적", "잔혹", "신비한", "미슐랭", "외과 수술", "마스터하기"
- 영문 병기 과도 (한 컨셉당 8-15회 → 5-8회로 줄임)
- 권위적 명령조

대상 6 컨셉 (Phase 0 ctp-verify G4 검증 시 발견):
- `algo-overview`
- `condition-loop`
- `flow-tracing`
- `ds-compare`
- `1d-array`
- `2d-array`

(나머지 5 컨셉 `array-number-prime`, `search-problem-key`, `linear-search`, `basic-binary-search`, `hash-collision`은 이미 차분한 톤 또는 Phase 0/1에서 정합화됨 — read 시 추가 확인)

### Task 2: module-02 expansion 6 placeholder 보강
Phase 0 Task 2.2에서 `{}` placeholder로 남겨진 module-02 6개 키를 실제 deep-dive 콘텐츠로 채운다.

대상:
- `queue-overview`
- `recursion-basics`
- `recursion-analysis`
- `tower-of-hanoi`
- `iterative-recursion`
- `queen-backtracking`

각 키에 story 보강 + features 2-4개 + guide 1-3개 추가. 기존 풍부한 항목(`linear-queue`, `circular-queue`, `lifo-basics` 등)의 깊이 매칭.

### Task 3: 비유 사전 통합 + 톤 검수
- module-01 ↔ module-04 비유 중복 검사 (같은 비유가 여러 컨셉에 등장하지 않는지)
- 전 22 컨셉(17 + 5 Phase 2 Tier 2 신규 등록) G1-G7 재통과
- next build + 단위 테스트 PASS

---

## Task 1: Tone Polisher Specialist — module-01 6 컨셉 톤 다듬기

### Task 1.1: module-01-foundation.tsx 패치

**Files:** `web/components/features/ctp/contents/categories/modules/module-01-foundation.tsx`

각 6 컨셉의 story 3블록 + features 4개 description에서:
- 금지 형용사 제거 ("압도적", "잔혹", "신비한", "미슐랭", "외과 수술", "마스터하기")
- 영문 병기 5-8회로 축소 (첫 등장 시 1회 병기, 재등장은 한글만)
- 톤을 module-02 차분 비즈니스 (관찰 → 분석 → 적용 흐름)

작업 규칙:
- 의미 손실 없이 표현만 다듬기
- features 개수 (4개) 유지
- story.problem/definition/analogy 분량 유지 (problem 2-3 / definition 3-5 / analogy 2-3 문장)
- TONE_GUIDE.md 비유 사전 그대로 활용

**중요**: 코드 변경 후 ctp-verify G4 통과 — 모든 금지 표현이 제거됐는지 자동 검증.

Steps:
1. module-01-foundation.tsx read
2. 6 컨셉의 story + features 다듬기 (1 commit으로 묶음)
3. G4 PASS 확인
4. Commit:
```
refactor(CTP): module-01 6 컨셉 톤 다듬기 (Phase 3)

algo-overview, condition-loop, flow-tracing, ds-compare, 1d-array, 2d-array의
화려한 형용사 ("압도적", "잔혹", "신비한" 등) 제거.
영문 병기 빈도 8-15회 → 5-8회.
TONE_GUIDE.md module-02 차분 비즈니스 톤으로 정렬.
```

---

## Task 2: Expansion Author Specialist — module-02 6 placeholder 보강

### Task 2.1: ctp-content-expansion.ts에서 6 키 보강

**Files:** `web/components/features/ctp/contents/shared/ctp-content-expansion.ts`

6 키 (현재 `{}` placeholder):
- `queue-overview`
- `recursion-basics`
- `recursion-analysis`
- `tower-of-hanoi`
- `iterative-recursion`
- `queen-backtracking`

각 키에 다음 슬롯 추가:
- `story` (모듈 본문 외 추가 deep-dive 설명, 1-2 문단)
- `features` (모듈 본문 외 추가 관찰, 2-4개)
- `guide` (코드 패턴 카드 1-3개, 기존 `recursionGuide` 같은 도메인 가이드 재활용 가능)

깊이 기준: 기존 풍부한 항목 (`linear-queue`, `circular-queue`, `lifo-basics`, `1d-array`, `2d-array`, `basic-binary-search`, `hash-collision`).

작업 참고:
- module-02-stack-recursion.tsx 안 해당 컨셉의 story (이미 풍부함) 보완 — expansion은 추가 deep-dive
- 비유 사전: 러시아 인형, 미로, 프로젝트 예산 트리 등 module-02 표준 비유 활용

Steps:
1. ctp-content-expansion.ts + 6 ConceptSpec read (참고)
2. 6 placeholder를 실제 콘텐츠로 보강
3. 빌드 검증
4. Commit:
```
feat(CTP): module-02 expansion 6 placeholder 보강 (Phase 3)

queue-overview, recursion-basics, recursion-analysis, tower-of-hanoi,
iterative-recursion, queen-backtracking의 story 추가 deep-dive +
features 2-4개 + guide 코드 패턴 카드 작성.
기존 lifo-basics, linear-queue 깊이 수준.
```

---

## Task 3: Verifier — 전 22 컨셉 통합 검수

### Task 3.1: 전 22 컨셉 G1-G7 재검증

```bash
cd web && node scripts/ctp-verify.mjs --all 2>&1 | tee /tmp/p3-verify.txt
```

Expected:
- 22 컨셉 (Phase 1 16 + Phase 2 5 Tier 2 + 1 binary-search sample = 22, 단 합산이 17일 수도 — Tier 2가 이미 16 안에 포함)
- 실제로는 17 컨셉이 spec dir에 있고 모두 G1-G7 PASS
- fc-1~4 G3 WARN은 의도된 예외

### Task 3.2: 비유 사전 중복 검사

각 컨셉의 story.analogy에서 사용된 핵심 비유 단어를 추출해 중복 분석:

```bash
cd web && for spec in data/ctp/specs/*.json; do
  id=$(basename $spec .json)
  analogy=$(jq -r '.content.story.analogy' $spec 2>/dev/null || cat $spec | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['content']['story']['analogy'])")
  echo "=== $id ==="
  echo "$analogy" | head -2
done
```

중복 비유 발견 시 (예: "기차"가 singly + 다른 컨셉에서 동시 사용) 한 쪽 변경.

### Task 3.3: 톤 일관성 통합 검사

다음 자동 검사 추가 또는 수동 확인:
- 모든 컨셉의 features[].description 평균 문장 수
- 모든 컨셉의 story.problem 평균 문장 수
- module-01 vs module-02 vs module-03 vs module-04 평균 문장 분포

Verifier가 다음 grep 수행:
```bash
# 금지 표현 전수 검사
rg "압도적|잔혹|신비한|미슐랭|마스터하기" web/components/features/ctp/ web/data/ctp/ web/components/features/ctp/contents/shared/ctp-content-expansion.ts
```
Expected: 0 매치 (TONE_GUIDE 통과)

### Task 3.4: next build + 단위 테스트

```bash
cd web && pnpm exec next build 2>&1 | tail -5
cd web && pnpm exec tsc --noEmit 2>&1 | grep -E "features/ctp|data/ctp|lib/ctp" | head
cd web && pnpm test:ctp-specs
cd web && pnpm test:ctp-problem-bank
```

### Task 3.5: 발견된 FAIL 처리

FAIL이 있으면 카테고리별 fix:
- G1 FAIL: visualizer 이름 mismatch → rename
- G4 FAIL: 톤 위반 → 추가 다듬기
- G5 FAIL: hex → semantic token

각 fix는 atomic commit.

---

## Phase 3 Exit Criteria

- [ ] module-01 6 컨셉 톤 다듬기 완료 (G4 PASS)
- [ ] module-02 expansion 6 placeholder 보강 (story + features + guide)
- [ ] 전 17 컨셉 G1-G7 PASS (의도된 WARN 외)
- [ ] 금지 표현 grep 0 매치
- [ ] 비유 사전 중복 없음 또는 의도된 공유만
- [ ] next build 컴파일 성공
- [ ] 기존 테스트 PASS (test:ctp-specs 3/3, test:ctp-problem-bank 7/7)

---

## 예상 commits

| Task | Commit 수 |
|---|---|
| 1.1 module-01 6 컨셉 톤 다듬기 | 1 |
| 2.1 expansion 6 placeholder 보강 | 1 |
| 3.5 fix (필요 시) | 0-N |

**총 2 + N commits**

---

## Phase 3 완료 후

모든 phase 완료 — 사용자에게 통합 보고:
- Phase 0~3 누적 commits
- 신규/수정 파일 list
- URL별 변경 정리
- 사용자 검토 가이드 (본인 환경에서 `pnpm dev` 띄우는 방법, dummy .env.local 만드는 법)
- 알려진 미완 항목 (Phase 4 trace 어댑터, 인간 샘플 검토 미수행)
