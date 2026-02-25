# Implementation Status

기준 시점: 2026-02-25 (latest update)

## 1) 핵심 상태

- Next.js(`web`) + FastAPI(`ai-interview`) 분리 아키텍처 운영 중
- 채팅/화상 setup 진입 모두 활성화 (`video` Coming Soon 제거)
- 메인 면접은 `5문항 고정`에서 `시간 기반 동적 진행`으로 전환
  - 기본 7분 (`5/7/10` 선택)
  - 남은 60초 진입 시 마무리 질문 자동 전환
  - 마무리 질문 응답 후 세션 종료
- 훈련센터는 `포트폴리오 디펜스` 단일 트랙으로 운영 (음성/화상 모드)

## 2) 인터뷰 API 상태

- Next BFF 퍼블릭 경로 유지
  - `/api/interview/parse-job`
  - `/api/interview/parse-resume`
  - `/api/interview/session/start`
  - `/api/interview/chat`
  - `/api/interview/analyze`
- FastAPI 인터뷰 핵심
  - `POST /v1/interview/parse-job`
  - `POST /v1/interview/parse-resume`
  - `POST /v1/interview/session/start`
  - `POST /v1/interview/chat`
  - `POST /v1/interview/analyze`
  - `GET /v1/interview/sessions`
  - `GET /v1/interview/sessions/{session_id}`
- 실시간 음성
  - `WS /v1/interview/ws/client` (VAD → STT → LLM → TTS)
  - WS도 동일하게 시간 기반 동적 마무리 룰 적용

## 3) 데이터 모델 상태 (Supabase/Postgres)

- `interview_sessions`, `interview_turns`, `interview_reports`, `interview_eval_signals`, `portfolio_sources`
- 세션 시간 제어 필드 반영
  - `target_duration_sec`
  - `closing_threshold_sec`
  - `closing_announced`

## 4) 완료된 안정화 항목

- `parse-job` JSON 파서 보강 (코드블록/후행텍스트/다중객체 대응)
- WS close 이후 send 예외 경계 처리
- secret placeholder 런타임 무효화(`your_*`, `<...>`)

## 5) 현재 남은 큰 작업

- FastAPI의 LiveKit 서버 트랙 직접 subscribe 브리지
- 마이페이지 저장 자산 즉시면접 주입
- RAG 검색/벡터DB 연동
- 리포트 다단계 고도화 파이프라인
