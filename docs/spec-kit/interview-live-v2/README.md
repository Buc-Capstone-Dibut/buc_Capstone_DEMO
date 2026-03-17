# Interview Live V2

## 목적
- `Gemini Live` 단일 런타임으로 `live_interview`와 `portfolio_defense`를 재구축한다.
- 한 세션은 하나의 Live 세션만 사용하고, 한 턴은 외부 AI 호출 1회만 허용한다.
- fallback, 별도 STT/TTS, legacy 텍스트 질문 생성 경로를 제거한다.
- 리포트는 종료 후 1회만 비동기로 생성하고, 원본은 DB에 저장된 finalized turn history만 사용한다.

## 제품 결정
- 진행 모드
  - `live_interview`: 음성/영상 실시간 면접
  - `portfolio_defense`: 음성/영상 실시간 디펜스
- 제외/비활성화
  - `live_interview` 채팅 모드는 제품 로직에서 제거하고 UI stub만 남긴다.
- 인증
  - 로그인 사용자만 세션 생성, 세션 조회, 리포트 조회를 허용한다.
- reconnect
  - 네트워크 끊김 시 60초 동안 재연결만 시도한다.
  - reconnect 대기 동안 면접 타이머는 정지한다.
  - 브라우저 새로고침은 복구하지 않고 완전 초기화한다.
- UX
  - AI 음성은 반드시 재생되어야 한다.
  - AI 자막만 partial streaming으로 노출한다.
  - 사용자 자막은 final transcript만 저장/표시한다.
  - AI가 speaking 중일 때 사용자는 끼어들 수 없다.
- 리포트
  - 면접 종료 후 최종 1회 생성
  - 로딩 애니메이션 및 polling 허용
  - 현재 mock 리포트 화면 구성을 적극적으로 유지

## 공통 제약
- 오디오 원본 저장 금지
- DB에는 텍스트 타임라인과 usage 메타만 저장
- 마지막 질문 시작 시점
  - 5분 코스: 4분
  - 10분 코스: 9분
  - 15분 코스: 14분

## 구현 범위
- 포함
  - Supabase 스키마 개편
  - FastAPI runtime 재구축
  - Next.js 면접 room/result 흐름 개편
  - 포트폴리오 디펜스 room의 Live 통합
  - spec kit 문서와 코드 계약 동기화
- 제외
  - cross-process runtime recovery
  - 오디오 원본 저장/재생성
  - fallback 경로 유지

## 문서 목록
- `04-supabase-schema.md`
- `06-cutover-test-plan.md`
- `07-implementation-status.md`
- `08-ops-observability.md`
