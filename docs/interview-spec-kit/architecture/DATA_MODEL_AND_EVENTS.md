# Data Model and Events

## 1) 세션 모델 확장

### interview_sessions (기존 확장)
- `id`
- `user_id`
- `session_type` (`live_interview|replay_simulation|portfolio_defense`)
- `mode` (`chat|voice|video`)
- `status`
- `origin_session_id` (replay일 때 원본 세션)
- `origin_turn_id` (선택 시작 지점)
- `current_phase`
- `personality`
- `job_payload`, `resume_payload`, `planned_questions`
- `created_at`, `updated_at`, `started_at`, `ended_at`

### interview_turns (기존 유지)
- `id`, `session_id`, `turn_index`, `role`, `channel`, `content`, `payload`, `created_at`

### interview_media_assets (유지)
- `audio_user|audio_ai|video_user|video_ai|transcript_chunk`

### interview_eval_signals (확장)
- `dimension` (`design_intent|code_quality|ai_usage`)
- `score`
- `weight`
- `weighted_score`
- `evidence`
- `confidence`

### portfolio_sources (신규)
- `id`
- `session_id`
- `repo_url`
- `visibility` (`public` 고정)
- `default_branch`
- `readme_snapshot`
- `tree_snapshot`
- `infra_files_snapshot`
- `analysis_status`
- `created_at`

### interview_reports (확장)
- `report_payload`
- `comparison_payload` (replay 개선 비교)
- `rubric_version`

## 2) WS 이벤트

### client -> server
- `session.init`
- `audio.chunk`
- `replay.seek` (리플레이 지점 이동)
- `heartbeat`

### server -> client
- `session.ready`
- `replay.context.loaded`
- `question.next`
- `transcript.partial`
- `transcript.final`
- `tts.chunk`
- `avatar.state`
- `evaluation.partial`
- `interview.completed`
- `error`

### avatar.state payload (추가)
```json
{
  "type": "avatar.state",
  "state": "idle|thinking|listening|speaking",
  "sessionId": "uuid",
  "timestamp": 1700000000
}
```

## 2-1) 미디어 자산 확장 (추가)
- `interview_media_assets`에 다음 유형을 추가한다.
- `avatar_state_timeline`
- `avatar_tts_audio`
- `avatar_video_render` (옵션)
- `avatar_state_timeline`의 state 값은 `idle|thinking|listening|speaking`만 허용한다.
- MVP에서는 viseme/phoneme 타임라인을 저장하지 않는다.

## 3) 리포트 비교 규칙
- replay 세션 종료 시 원본 세션과 `turn-level diff` 생성
- 변경된 답변의 개선 여부를 루브릭별로 비교
- 비교 결과는 다음 재체험 진입의 추천 포인트로 사용
