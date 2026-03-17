# Contracts

## BFF routes
### POST `/api/interview/session/start`
- auth 필수
- request
  - `mode`
  - `personality`
  - `jobData`
  - `resumeData`
  - `targetDurationSec`
  - `closingThresholdSec`
- behavior
  - Supabase auth session에서 user id를 읽는다.
  - user id가 없으면 401
  - FastAPI `session/start`에 `x-user-id`를 필수 전달한다.

### POST `/api/interview/portfolio/session/start`
- auth 필수
- behavior는 위와 동일하되 `sessionType=portfolio_defense`, `mode=video` 고정

### GET `/api/interview/sessions/:id`
- auth 필수
- owner scope 확인 실패 시 403
- response
  - 기존 필드 유지
  - `report_view`
  - `timeline`
  - `report_generation_meta`

## FastAPI routes
### POST `/v1/interview/session/start`
- auth header `x-user-id` 필수
- 세션 owner를 `interview_sessions.user_id`에 기록
- 생성 응답에 `sessionId`, `sessionType`, `targetDurationSec`, `closingThresholdSec` 포함

### POST `/v1/interview/portfolio/session/start`
- auth 필수
- repo metadata를 session payload에 저장

### GET `/v1/interview/sessions/{session_id}`
- owner만 조회 가능
- session, turns, report job, report payload를 합쳐 반환

## WebSocket
### endpoint
- 기존 경로 유지
  - `/v1/interview/ws/client`

### client -> server
- `init-interview-session`
  - `sessionId`
  - `sessionType`
  - `targetDurationSec`
  - `closingThresholdSec`
  - `jobData`
  - `resumeData`
- `raw-audio-data`
  - float PCM chunk
- `flush-audio`
  - utterance end signal
- `audio-playback-complete`
  - current ai turn playback finished

### server -> client
- `ready`
- `interview-session-created`
- `runtime.meta`
  - `targetDurationSec`
  - `closingThresholdSec`
  - `elapsedSec`
  - `remainingSec`
  - `estimatedTotalQuestions`
  - `questionCount`
  - `isClosingPhase`
  - `interviewComplete`
  - `finishReason`
  - `runtimeStatus`
  - `sessionPaused`
  - `reconnectRemainingSec`
- `interview-phase-updated`
- `transcript.delta`
  - `role=ai`
  - `delta`
  - `accumulatedText`
- `transcript.final`
  - `role=user|ai`
  - `text`
- `audio`
  - `audioBase64`
  - `sampleRate`
  - `turnId`
- `avatar.state`
- `control`
  - `start-mic`
  - `mic-audio-end`
  - `interrupt`
- `connection.reconnecting`
- `connection.resumed`
- `connection.expired`
- `warning`
- `error`

## Report payload contract
### `interview_reports.report_payload`
- `schemaVersion`
- `sessionType`
- `compatAnalysis`
- `reportView`
- `timeline`
- `generationMeta`

### `compatAnalysis`
- `live_interview`
  - 기존 `AnalysisResult` 호환
- `portfolio_defense`
  - 기존 `rubricScores`, `totalWeightedScore`, `strengths`, `improvements`, `nextActions` 호환

### `reportView`
- 프런트 mock 리포트 화면이 바로 쓸 수 있는 최종 view model
- 세션 타입별로 세부 구조가 다르더라도 top-level key는 고정한다.
