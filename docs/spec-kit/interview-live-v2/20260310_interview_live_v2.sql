ALTER TABLE public.interview_sessions
    ADD COLUMN IF NOT EXISTS runtime_status TEXT NOT NULL DEFAULT 'created',
    ADD COLUMN IF NOT EXISTS live_provider TEXT NOT NULL DEFAULT 'gemini-live',
    ADD COLUMN IF NOT EXISTS live_model TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS last_disconnect_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reconnect_deadline_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_paused_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS paused_duration_sec INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS report_requested_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS report_completed_at TIMESTAMPTZ;

UPDATE public.interview_sessions
SET runtime_status = CASE
    WHEN status = 'completed' THEN 'completed'
    WHEN status IN ('running', 'in_progress') THEN 'awaiting_user'
    ELSE 'created'
END
WHERE runtime_status IS NULL OR runtime_status = 'created';

ALTER TABLE public.interview_turns
    ADD COLUMN IF NOT EXISTS exchange_index INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS turn_kind TEXT NOT NULL DEFAULT 'message',
    ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS latency_ms INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS usage_input_tokens INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS usage_output_tokens INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS usage_total_tokens INTEGER NOT NULL DEFAULT 0;

UPDATE public.interview_turns
SET
    exchange_index = CASE
        WHEN exchange_index > 0 THEN exchange_index
        ELSE GREATEST(1, (turn_index + 1) / 2)
    END,
    turn_kind = CASE
        WHEN turn_kind <> 'message' THEN turn_kind
        WHEN role = 'user' THEN 'user_answer'
        WHEN role IN ('model', 'ai') THEN 'ai_prompt'
        ELSE 'system_event'
    END,
    phase = COALESCE(NULLIF(phase, ''), COALESCE(payload->>'phase', '')),
    provider = COALESCE(NULLIF(provider, ''), COALESCE(payload->>'provider', '')),
    started_at = COALESCE(started_at, created_at),
    completed_at = COALESCE(completed_at, created_at),
    usage_total_tokens = GREATEST(
        usage_total_tokens,
        COALESCE((payload->>'usage_total_tokens')::INTEGER, 0),
        COALESCE((payload->>'usageTotalTokens')::INTEGER, 0)
    ),
    usage_input_tokens = GREATEST(
        usage_input_tokens,
        COALESCE((payload->>'usage_input_tokens')::INTEGER, 0),
        COALESCE((payload->>'usageInputTokens')::INTEGER, 0)
    ),
    usage_output_tokens = GREATEST(
        usage_output_tokens,
        COALESCE((payload->>'usage_output_tokens')::INTEGER, 0),
        COALESCE((payload->>'usageOutputTokens')::INTEGER, 0)
    )
WHERE TRUE;

ALTER TABLE public.interview_reports
    ADD COLUMN IF NOT EXISTS schema_version VARCHAR(16) NOT NULL DEFAULT 'v2';

UPDATE public.interview_reports
SET schema_version = CASE
    WHEN report_payload ? 'schemaVersion' THEN COALESCE(report_payload->>'schemaVersion', 'v2')
    ELSE 'v1'
END;

ALTER TABLE public.interview_report_jobs
    ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE public.interview_report_jobs
SET
    requested_at = COALESCE(requested_at, created_at),
    started_at = CASE
        WHEN status IN ('running', 'done', 'failed') THEN COALESCE(started_at, updated_at, created_at)
        ELSE started_at
    END,
    completed_at = CASE
        WHEN status = 'done' THEN COALESCE(completed_at, updated_at, created_at)
        ELSE completed_at
    END
WHERE TRUE;

CREATE INDEX IF NOT EXISTS idx_interview_sessions_runtime_status
ON public.interview_sessions(runtime_status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_turns_session_exchange_role
ON public.interview_turns(session_id, exchange_index, role, created_at);
