# Interview Live V2 Ops / Observability

## 목적
- `Gemini Live` 단일 런타임 면접에서 장애 원인, quota pressure, reconnect 실패, report generation 지연을 빠르게 파악한다.
- fallback이 없으므로 운영자는 `어느 단계에서 멈췄는지`를 빠르게 좁혀야 한다.

## 핵심 운영 신호

### 세션 상태
- `interview_sessions.status`
  - `created`
  - `in_progress`
  - `completed`
  - `failed`
- `interview_sessions.runtime_status`
  - `connecting`
  - `awaiting_user`
  - `model_thinking`
  - `model_speaking`
  - `reconnecting`
  - `completed`
  - `failed`

### 우선 확인해야 할 증상
- `runtime_status = reconnecting` 장기 지속
- `reportStatus in ('pending', 'running')` 장기 지속
- `usage_total_tokens` 급증
- `latency_ms` 급증

## 필수 운영 쿼리

### 최근 세션 상태 분포
```sql
select
  status,
  runtime_status,
  count(*) as count
from public.interview_sessions
where created_at > now() - interval '24 hours'
group by 1, 2
order by count desc;
```

### reconnect 중 오래 머무는 세션
```sql
select
  id,
  user_id,
  session_type,
  status,
  runtime_status,
  last_disconnect_at,
  reconnect_deadline_at,
  updated_at
from public.interview_sessions
where runtime_status = 'reconnecting'
order by updated_at asc;
```

### report queue 지연 세션
```sql
select
  session_id,
  session_type,
  status,
  attempts,
  requested_at,
  started_at,
  completed_at,
  error
from public.interview_report_jobs
where status in ('pending', 'running')
order by requested_at asc;
```

### 턴별 latency / token 급증 확인
```sql
select
  session_id,
  exchange_index,
  role,
  phase,
  provider,
  latency_ms,
  usage_input_tokens,
  usage_output_tokens,
  usage_total_tokens,
  created_at
from public.interview_turns
where created_at > now() - interval '24 hours'
order by usage_total_tokens desc, latency_ms desc
limit 100;
```

## 로그에 반드시 남길 필드
- `session_id`
- `session_type`
- `turn_id`
- `phase`
- `runtime_status`
- `runtime_mode`
- `provider`
- `live_model`
- `latency_ms`
- `usage_input_tokens`
- `usage_output_tokens`
- `usage_total_tokens`
- `reconnect_remaining_sec`
- `completion_reason`

## 장애 분류 기준

### 연결 문제
- 증상
  - `connection.expired`
  - `runtime_status = reconnecting` 후 `failed`
- 우선 확인
  - 클라이언트 네트워크
  - reconnect grace window 소진 여부
  - refresh/reset 여부

### Live 응답 문제
- 증상
  - `model_thinking`에서 오래 정체
  - `voice pipeline error`
  - user turn 이후 model turn 미생성
- 우선 확인
  - Live provider 응답 지연
  - 특정 세션의 `usage_total_tokens`, `latency_ms`
  - session/job payload 비정상 크기

### 리포트 지연 문제
- 증상
  - 결과 화면 polling 장기 지속
  - `reportStatus = running` 장기 지속
- 우선 확인
  - `interview_report_jobs` backlog
  - worker 로그
  - 특정 session의 turn/history payload 크기

## 알림 기준
- 5분 이상 `reportStatus = running` 세션 5개 이상
- `runtime_status = reconnecting` 세션이 grace window 이후에도 남아 있음
- 최근 15분 `failed` 세션 비율 급증
- 최근 15분 `latency_ms` 상위 95퍼센타일 급등

## 온콜 체크리스트
1. `interview_sessions` 상태 분포 확인
2. `interview_report_jobs` backlog 확인
3. `interview_turns` latency/token 상위 건 확인
4. 문제 세션의 `timeline/debug_events` 확인
5. provider 장애인지 특정 세션 오염인지 분리

## V2 운영 전제
- fallback 없음
- 사용자 턴은 단일 Live 오케스트레이션만 사용
- reconnect는 same-process 기준
- refresh는 복구가 아니라 초기화
- 결과 화면은 DB report를 canonical source로 사용
