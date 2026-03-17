# Runtime State Machine

## 세션 상태
- `connecting`
  - WS 연결 직후, Live 세션 준비 전
- `awaiting_user`
  - AI 발화가 끝나고 mic를 열어 사용자 입력을 기다리는 상태
- `model_thinking`
  - 사용자 final utterance를 받아 Live turn을 실행 중인 상태
- `model_speaking`
  - Live 응답 오디오를 재생 중인 상태
- `reconnecting`
  - 네트워크 단절 후 reconnect 대기 중인 상태
- `completed`
  - 면접 종료 및 report enqueue 완료 상태
- `failed`
  - 복구 불가 오류 또는 reconnect 만료 상태

## 턴 규칙
- 턴 시작 조건
  - `awaiting_user` 상태에서 final user utterance가 확정될 때
- 턴 처리
  1. 서버가 Live에 audio/text를 1회 전송한다.
  2. Live 응답에서 user transcript, ai transcript, ai audio, usage metadata를 받는다.
  3. ai transcript는 partial caption으로 스트리밍하고 final transcript로 마감한다.
  4. turn 종료 시 finalized row를 DB에 기록한다.
- 턴 중 추가 외부 호출 금지
  - repair prompt
  - extra STT
  - extra TTS
  - legacy LLM

## disconnect 처리
- `connecting`, `awaiting_user`, `model_thinking`, `model_speaking`에서 disconnect가 발생하면 `reconnecting`으로 전이
- `reconnecting` 진입 시
  - `last_disconnect_at` 기록
  - `reconnect_deadline_at = now + 60s`
  - session timer pause 시작
- reconnect 성공 시
  - pause 누적 시간 반영
  - 직전 상태 복원
  - speaking 중이던 턴이면 오디오 replay
- deadline 초과 시
  - `failed` 전이
  - 세션 종료 이벤트 전송

## 새로고침 처리
- 브라우저 새로고침은 explicit abandon으로 본다.
- 서버에 graceful close가 오면 runtime은 즉시 정리한다.
- 클라이언트는 `sessionId`를 재사용하지 않는다.

## 자막 규칙
- `transcript.delta`
  - `role=ai`만 허용
  - partial caption UI용
- `transcript.final`
  - `role=user|ai`
  - finalized timeline 및 report source용

## 시간 계산
- `effective_elapsed_sec = wall_clock_elapsed_sec - paused_duration_sec`
- closing question 진입 기준
  - `effective_elapsed_sec >= target_duration_sec - 60`
- 타임라인 표시는 `effective_elapsed_sec` 기준으로 계산한다.
