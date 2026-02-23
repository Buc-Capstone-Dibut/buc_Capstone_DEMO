# CTP Docs Index

## 목적
이 폴더는 **다음 AI/개발자가 CTP를 빠르게 파악하고, 안전하게 수정하고, 즉시 인수인계**할 수 있도록 만든 운영 문서 모음이다.

핵심 원칙:
- 설명보다 **수정 지점(file path)과 계약(contract)** 우선
- 중복 설명 최소화 (토큰 절약)
- 변경 시 재검증 체크리스트를 항상 포함

## 폴더 구조
- `foundation/`
  - `foundation/ARCHITECTURE.md`
  - `foundation/SIMULATION_PIPELINE.md`
- `operations/`
  - `operations/MAINTENANCE_PLAYBOOK.md`
  - `operations/CONSISTENCY_GUIDELINES.md`
  - `operations/HANDOFF_TEMPLATE.md`
- `upgrades/`
  - `upgrades/PROBLEM_BANK_PLAN.md` ← **신규: Integration 페이지 문제은행 전환 계획**
- 루트 유지
  - `README.md`
  - `INVENTORY.md` (스크립트 자동 생성)
  - `scripts/refresh_inventory.mjs`

## 권장 읽기 순서 (빠른 온보딩)
1. `foundation/ARCHITECTURE.md`
   전체 구조(라우팅/레지스트리/로더/플레이그라운드) 5분 파악
2. `foundation/SIMULATION_PIPELINE.md`
   시뮬레이션 데이터 흐름(Worker -> Store -> Adapter -> Visualizer) 파악
3. `INVENTORY.md`
   전체 세션(서브컨셉) 모드/엔진/어댑터 인벤토리 확인
4. `operations/MAINTENANCE_PLAYBOOK.md`
   실제 수정 절차/체크리스트 따라 작업
5. `operations/CONSISTENCY_GUIDELINES.md`
   UI/콘텐츠/인터랙션 통일 기준 확인 후 작업 시작
6. `upgrades/PROBLEM_BANK_PLAN.md`
   Integration 페이지 문제은행 전환 — 기술 설계, 문제 목록, 구현 로드맵
7. `operations/HANDOFF_TEMPLATE.md`
   작업 종료 후 다음 AI에게 전달할 요약 포맷

## 아주 빠른 진입점
- 라우팅 시작점: `web/app/insights/ctp/page.tsx`
- 상세 진입점: `web/app/insights/ctp/[categoryId]/[conceptId]/page.tsx`
- 커리큘럼 원본: `web/lib/ctp-curriculum.ts`
- 컨텐츠 라우팅 레지스트리: `web/lib/ctp-content-registry.tsx`
- 모듈 로더(핵심): `web/components/features/ctp/common/CTPModuleLoader.tsx`
- 전역 시뮬레이션 스토어: `web/components/features/ctp/store/use-ctp-store.ts`
- 스컬프트 엔진 훅: `web/hooks/use-skulpt-engine.ts`
- 워커 런타임: `web/public/workers/skulpt.worker.js`

## 변경 범위별 1차 점검
- 서브컨셉 링크/목차 문제: `ctp-curriculum.ts` + `*-registry.ts`의 key 일치 확인
- 실행/시각화 문제: `logic.ts` -> adapter -> visualizer payload 타입 확인
- 콘텐츠(스토리/가이드) 문제: `config.ts` + `contents/shared/ctp-content-expansion.ts` 확인
- 레이아웃/TOC 문제: `layout/ctp-*.tsx` 확인

## 유지보수 규칙 (요약)
- ID 변경은 단일 파일에서 끝나지 않는다. 최소 4곳 동기화 필요:
  - `web/lib/ctp-curriculum.ts`
  - `web/components/features/ctp/contents/**/<concept>-registry.ts`
  - `web/lib/ctp-content-registry.tsx` (concept 단위)
  - 필요한 경우 `applyContentExpansion` 키 맵
- `logic.ts`가 반환하는 `runSimulation`/`interactive` 인터페이스는 `CTPModule` 계약을 깨지 않게 유지
- 인터랙티브 모듈은 `components`와 `handlers` 키가 실제로 매핑되는지 확인 (`reset`/`clear` alias 주의)

## 자동 갱신 커맨드
- 인벤토리 재생성:
  - `node docs/CTP/scripts/refresh_inventory.mjs`
