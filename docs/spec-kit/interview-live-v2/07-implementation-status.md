# Interview Live V2 Implementation Status

## 현재 상태
- 구조 전환: 완료
  - `Gemini Live` 단일 런타임 기준으로 제품 메인 플로우를 재구성했다.
  - WebSocket route는 shell로 축소했고, 실제 런타임 본문은 `app/interview/runtime`으로 이동했다.
- 제품 경로 전환: 대부분 완료
  - `live_interview`, `portfolio_defense`는 같은 Live room 축으로 정리했다.
  - chat 모드는 backend/BFF에서 `410`으로 비활성화하고 UI stub만 남겼다.
- 보안/스키마: 완료
  - Supabase interview 계열 테이블은 owner 기반 RLS와 조회 인덱스를 적용했다.
  - 개발 단계 속도를 위해 강한 DB check 제약은 제거하고 dev-friendly baseline으로 유지한다.
- 리포트 계약: 대부분 완료
  - 결과 화면은 `report_view`, `timeline`, `generationMeta` 중심 contract를 사용한다.
  - backend는 report document와 report job repository를 `app/interview/reporting`으로 분리했다.
- 테스트: 완료
  - backend runtime / owner scope / report lifecycle 테스트를 고정했다.
  - frontend 결과/adapter/flow 테스트를 고정했다.

## 이번 리팩터링에서 완료된 핵심 항목
- `Gemini Live only` 메인 플로우 전환
- 사용자 턴 1회당 단일 Live 오케스트레이션 정리
- reconnect 60초, pause timer, refresh reset 반영
- `runtime_status` 세분화
  - `awaiting_user`
  - `model_thinking`
  - `model_speaking`
  - `reconnecting`
- report canonical source를 DB session detail로 통일
- portfolio report 화면도 canonical report document 기반으로 전환
- chat/analyze legacy 제품 경로 비활성화

## 남은 후속작업 전체 목록

### 선택적 후속작업
- E2E 브라우저 시나리오 테스트 추가
- 운영 대시보드용 SQL/로그 샘플 자동화
- `ws_runtime` 추가 세분화 여부 재검토

## 권장 실행 순서
1. E2E 브라우저 시나리오 테스트
2. 운영 대시보드 자동화
3. 추가적인 구조 분해 여부 재평가

## 완료 선언 기준
- backend runtime 핵심 규칙 테스트 green
- frontend result/report adapter 테스트 green
- chat/analyze/fallback 제품 경로 완전 비활성화 유지
- 결과 화면이 DB canonical report만으로 안정적으로 렌더
- reconnect/report polling/owner scope가 회귀 없이 동작

## 작업 기록

### 2026-03-11 1차
- 완료: backend owner scope / report lifecycle 테스트 추가
  - 파일: `ai-interview/tests/test_interview_backend.py`
  - 검증:
    - `PYTHONPATH=/Users/junghwan/buc_Capstone_DEMO/ai-interview python -m unittest /Users/junghwan/buc_Capstone_DEMO/ai-interview/tests/test_interview_backend.py`
    - `PYTHONPATH=/Users/junghwan/buc_Capstone_DEMO/ai-interview python -m unittest /Users/junghwan/buc_Capstone_DEMO/ai-interview/tests/test_voice_runtime.py /Users/junghwan/buc_Capstone_DEMO/ai-interview/tests/test_interview_backend.py`
  - 고정한 규칙:
    - `get_session_detail(..., user_id=...)`의 owner-scoped 첫 조회
    - report job `enqueue / reserve / fail / complete` lifecycle

- 완료: 결과 페이지 로컬 가공을 adapter 계층으로 이동
  - 파일:
    - `web/lib/interview/report/session-interview-detail-adapter.ts`
    - `web/lib/interview/report/session-interview-detail-adapter.test.ts`
    - `web/app/interview/result/page.tsx`
  - 검증:
    - `cd /Users/junghwan/buc_Capstone_DEMO/web && npm run test:interview-report`
    - `cd /Users/junghwan/buc_Capstone_DEMO/web && npm run lint -- --file app/interview/result/page.tsx --file lib/interview/report/session-interview-detail-adapter.ts --file lib/interview/report/session-interview-detail-adapter.test.ts`
  - 정리한 항목:
    - 핵심 질문 응답/타임라인 인사이트 계산을 page 밖으로 이동
    - 포지셔닝 가이드 계산을 adapter로 이동
    - `result/page.tsx`를 renderer 성격으로 축소

- 완료: observability / ops 문서 보강
  - 파일:
    - `docs/spec-kit/interview-live-v2/08-ops-observability.md`
    - `docs/spec-kit/interview-live-v2/README.md`
  - 정리한 항목:
    - 운영 신호
    - 장애 분류
    - 점검 SQL
    - 온콜 체크리스트

- 완료: 소비되지 않는 legacy interview store 상태 제거
  - 파일:
    - `web/store/interview-setup-store.ts`
    - `web/app/interview/room/video/page.tsx`
  - 검증:
    - `rg -n "chatHistory|setChatHistory|analysisResult|setAnalysisResult" /Users/junghwan/buc_Capstone_DEMO/web -g '!*node_modules*'`
    - `cd /Users/junghwan/buc_Capstone_DEMO/web && npm run lint -- --file store/interview-setup-store.ts --file app/interview/room/video/page.tsx --file app/interview/result/page.tsx`
  - 정리한 항목:
    - 결과 페이지에서 더 이상 쓰지 않는 `chatHistory`
    - 더 이상 소비 경로가 없는 `analysisResult`

- 완료: 검증 묶음 재실행
  - 검증:
    - `PYTHONPATH=/Users/junghwan/buc_Capstone_DEMO/ai-interview python -m unittest /Users/junghwan/buc_Capstone_DEMO/ai-interview/tests/test_voice_runtime.py /Users/junghwan/buc_Capstone_DEMO/ai-interview/tests/test_interview_backend.py`
    - `python -m compileall /Users/junghwan/buc_Capstone_DEMO/ai-interview/app`
    - `cd /Users/junghwan/buc_Capstone_DEMO/web && npm run test:interview-report`
    - `cd /Users/junghwan/buc_Capstone_DEMO/web && npm run lint -- --file app/interview/result/page.tsx --file app/interview/room/video/page.tsx --file store/interview-setup-store.ts --file lib/interview/report/session-interview-report-adapter.ts --file lib/interview/report/session-interview-detail-adapter.ts --file lib/interview/report/portfolio-defense-report-adapter.ts --file lib/interview/report/session-interview-report-adapter.test.ts --file lib/interview/report/session-interview-detail-adapter.test.ts --file lib/interview/report/portfolio-defense-report-adapter.test.ts`

- 완료: runtime wiring 분리
  - 파일:
    - `ai-interview/app/interview/runtime/ws_runtime_wiring.py`
    - `ai-interview/app/interview/runtime/ws_runtime.py`
  - 정리한 항목:
    - deps 조립을 별도 wiring 모듈로 이동
    - `ws_runtime.py`는 runtime orchestration 중심으로 축소
  - 검증:
    - `python -m py_compile /Users/junghwan/buc_Capstone_DEMO/ai-interview/app/interview/runtime/ws_runtime.py /Users/junghwan/buc_Capstone_DEMO/ai-interview/app/interview/runtime/ws_runtime_wiring.py`

- 완료: reporting 운영 로그 보강
  - 파일:
    - `ai-interview/app/interview/reporting/agent.py`
  - 정리한 항목:
    - report job 시작/완료/실패 시 `job_id`, `session_id`, `session_type`, `attempt`, `duration_ms` 로깅

- 완료: frontend flow utility 및 테스트 추가
  - 파일:
    - `web/lib/interview/interview-session-flow.ts`
    - `web/lib/interview/interview-session-flow.test.ts`
    - `web/app/interview/result/page.tsx`
    - `web/app/interview/room/video/page.tsx`
    - `web/package.json`
  - 정리한 항목:
    - report pending 판별
    - portfolio 결과 redirect 판별
    - reconnect timeout reset 판별
    - reload reset 판별
    - result path 생성 로직 공통화
  - 검증:
    - `cd /Users/junghwan/buc_Capstone_DEMO/web && npm run test:interview-flow`
    - `cd /Users/junghwan/buc_Capstone_DEMO/web && npm run test:interview-report`
    - `cd /Users/junghwan/buc_Capstone_DEMO/web && npm run lint -- --file app/interview/result/page.tsx --file app/interview/room/video/page.tsx --file lib/interview/interview-session-flow.ts --file lib/interview/interview-session-flow.test.ts --file lib/interview/report/session-interview-detail-adapter.ts --file lib/interview/report/session-interview-detail-adapter.test.ts`
