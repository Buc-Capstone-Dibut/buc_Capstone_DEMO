# CTP Refactor Todo

## Goal
- `categories/...`를 CTP 콘텐츠의 주 구조로 전환하고, 신규 목차에 없는 구 콘텐츠를 제거한다.

## Acceptance Criteria
- `web/lib/ctp-content-registry.tsx`가 `categories/...` 경로만 참조한다.
- `web/components/features/ctp/contents/refactored/new-outline`가 제거되거나 더 이상 참조되지 않는다.
- `web/lib/ctp-curriculum.ts` 기준 목차가 상세 페이지에서 정상 렌더된다.
- `categories` 내부에서 목차 외 legacy concept 디렉토리가 제거된다.
- 빌드 또는 타입체크로 최소 1회 검증한다.

## Checklist
- [x] Locate: 현재 참조 경로/의존성 확인
- [x] Design: 이동 경로와 제거 범위 확정
- [x] Implement: `new-outline` -> `categories/modules` 이동
- [x] Implement: `ctp-content-registry.tsx` import 경로 전환
- [x] Implement: 목차 외 구 `categories` 콘텐츠 제거
- [x] Update docs: 경로 문서 동기화
- [x] Verify: 타입체크/빌드 실행
- [x] Results: 변경/검증 요약 기록

## Working Notes
- 현재 상세 페이지는 `getCtpContent()`만 통해 콘텐츠를 로드한다.
- 기존 `categories/(linear|non-linear|algorithms)`는 현재 레지스트리 기준 미사용 상태였다.
- 단계별로 참조 경로를 먼저 바꾼 뒤 삭제해 회귀 위험을 줄인다.

## Results
- 변경:
  - `new-outline` 모듈/유틸을 `web/components/features/ctp/contents/categories/modules`로 이동
  - `web/lib/ctp-content-registry.tsx`를 `categories/modules` 기준 import로 전환
  - 목차 외 legacy 디렉토리(`categories/linear`, `categories/non-linear`, `categories/algorithms`) 제거
  - 문서 경로 동기화:
    - `docs/CTP/INVENTORY.md`
    - `docs/CTP/operations/CONSISTENCY_GUIDELINES.md`
    - `docs/CTP/foundation/SIMULATION_PIPELINE.md`
- 검증:
  - `npm run lint` 실행 시 ESLint 초기 설정 프롬프트로 비대화형 검증 불가
  - `npx tsc --noEmit` 실행 완료(실패): 저장소 전역의 기존 타입 오류 다수 존재, CTP 경로 전환 자체의 import 경로 오류는 재현되지 않음
