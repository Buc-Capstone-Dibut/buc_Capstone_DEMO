# Remaining Work

기준 시점: 2026-02-25 (latest update)

## P0 (완료됨)

- `parse-job` 안정화
- setup `video` 모드 활성
- WS 종료 경계 예외 처리
- secret placeholder 무효화 + env 운영 가이드 반영
- 메인 면접 시간 기반 동적 진행(5/7/10분 + 남은 60초 마무리 질문)
- 훈련센터 replay 기능 제거
- 훈련센터 포트폴리오 디펜스 단일화(음성/화상)

## P1 (현재 우선)

### 1. LiveKit 서버 트랙 subscribe 브리지

- 목표:
  - FastAPI worker가 LiveKit room에 bot participant로 참가
  - participant track subscribe 후 STT/LLM/TTS 처리
  - TTS 결과를 room track으로 publish
- 완료 기준:
  - 브라우저 `raw-audio-data` 직접 송신 없이 음성 면접 진행

### 2. 회귀 테스트 자동화

- FastAPI:
  - `/v1/interview/chat` 시간 기반 종료 규칙 테스트
  - WS `closing_announced -> completion` 시퀀스 테스트
- Next BFF:
  - `/api/interview/*` 계약 테스트
- 완료 기준:
  - CI에서 핵심 회귀 자동 검증

### 3. Admin 운영 강화

- 세션 필터(`status/mode/session_type/date`) 추가
- STT/TTS/LLM 지연 메타 표시
- 실패 reason 집계(`time_limit_reached`, `question_cap_reached` 등)

## P2 (확장)

### 4. 마이페이지 자산 즉시면접

- 저장된 JD/이력서/GitHub URL을 세션 시작 시 자동 주입

### 5. RAG 확장

- JD/README/코드구조를 근거 검색으로 연결
- 질문과 피드백에 evidence snippet 첨부

### 6. 리포트 고도화

- 단일 분석 -> 다단계 분석
- 세션 간 성장 추세(시계열) 비교
- 재훈련 큐 자동 제안

## 다음 실행 순서

1. LiveKit worker 브리지 구현
2. 동적 시간면접 회귀 테스트 작성
3. Admin 운영성 지표 확장
4. 마이페이지 주입 + RAG
5. 리포트 고도화
