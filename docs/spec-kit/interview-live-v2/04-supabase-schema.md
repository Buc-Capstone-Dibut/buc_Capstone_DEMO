# Supabase Schema

## 변경 목표
- runtime 상태와 reconnect pause를 세션 레벨에서 추적한다.
- finalized transcript와 usage를 턴 레벨에서 정규화한다.
- report payload를 v2 hybrid document로 저장한다.

## `public.interview_sessions`
### 추가 컬럼
- `runtime_status text not null default 'created'`
- `live_provider text not null default 'gemini-live'`
- `live_model text not null default ''`
- `last_disconnect_at timestamptz null`
- `reconnect_deadline_at timestamptz null`
- `last_paused_at timestamptz null`
- `paused_duration_sec integer not null default 0`
- `report_requested_at timestamptz null`
- `report_completed_at timestamptz null`

### 의미
- `runtime_status`
  - `created|connecting|awaiting_user|model_thinking|model_speaking|reconnecting|completed|failed`
- `paused_duration_sec`
  - reconnect로 인해 누적된 정지 시간

## `public.interview_turns`
### 추가 컬럼
- `exchange_index integer not null default 0`
- `turn_kind text not null default 'message'`
- `phase text not null default ''`
- `provider text not null default ''`
- `started_at timestamptz null`
- `completed_at timestamptz null`
- `latency_ms integer not null default 0`
- `usage_input_tokens integer not null default 0`
- `usage_output_tokens integer not null default 0`
- `usage_total_tokens integer not null default 0`

### 규칙
- user/ai 한 row씩 저장
- `exchange_index`로 질문-답변 pair를 묶는다.
- partial transcript, raw audio는 저장하지 않는다.

## `public.interview_reports`
### 추가 컬럼
- `schema_version varchar(16) not null default 'v2'`

### report_payload 구조
- `schemaVersion: "v2"`
- `sessionType`
- `compatAnalysis`
- `reportView`
- `timeline`
- `generationMeta`

## `public.interview_report_jobs`
### 추가 컬럼
- `requested_at timestamptz not null default now()`
- `started_at timestamptz null`
- `completed_at timestamptz null`

## 인덱스
- `idx_interview_turns_session_exchange_role`
  - `(session_id, exchange_index, role, created_at)`
- `idx_interview_sessions_user_created`
  - 기존 유지
- `idx_interview_sessions_user_type_created`
  - `(user_id, session_type, created_at desc)`
- `idx_interview_sessions_runtime_status`
  - `(runtime_status, updated_at desc)`
- `idx_report_jobs_status_created`
  - 기존 유지

## 개발 단계 기준
- 개발 단계에서는 `강한 CHECK 제약`보다 `RLS + 인덱스 + backend validation`을 우선한다.
- 즉, 상태 enum/숫자 범위 검증은 우선 Python service/runtime 계층에서 책임지고, DB는 너무 일찍 고정하지 않는다.
- 운영 안정화 직전에만 필요한 CHECK constraint를 최소 집합으로 다시 넣는다.

## RLS
- interview 계열 테이블은 전부 `RLS enabled`로 전환한다.
- 직접 소유권 기준은 `interview_sessions.user_id = auth.uid()::text`다.
- 자식 테이블은 모두 `session_id -> interview_sessions.id` 조인으로 owner를 판별한다.
- 정책은 우선 `SELECT only`로 제한한다.
- 쓰기 경로는 backend의 direct DB connection이 담당한다.

## 적용 순서
1. 새 컬럼 추가
2. 기존 row backfill
3. 새 인덱스 추가
4. interview 계열 RLS/policy 적용
5. backend write path 전환
6. report payload v2 전환
