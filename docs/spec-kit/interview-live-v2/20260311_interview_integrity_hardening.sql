UPDATE public.interview_sessions
SET status = 'in_progress'
WHERE status = 'running';

ALTER TABLE public.interview_sessions
    DROP CONSTRAINT IF EXISTS interview_sessions_status_check,
    DROP CONSTRAINT IF EXISTS interview_sessions_runtime_status_check,
    DROP CONSTRAINT IF EXISTS interview_sessions_question_count_check,
    DROP CONSTRAINT IF EXISTS interview_sessions_target_duration_check,
    DROP CONSTRAINT IF EXISTS interview_sessions_closing_threshold_check,
    DROP CONSTRAINT IF EXISTS interview_sessions_paused_duration_check;

ALTER TABLE public.interview_sessions
    ADD CONSTRAINT interview_sessions_status_check
        CHECK (status IN ('created', 'in_progress', 'completed', 'failed')),
    ADD CONSTRAINT interview_sessions_runtime_status_check
        CHECK (runtime_status IN ('created', 'connecting', 'awaiting_user', 'model_thinking', 'model_speaking', 'reconnecting', 'completed', 'failed')),
    ADD CONSTRAINT interview_sessions_question_count_check
        CHECK (question_count >= 0),
    ADD CONSTRAINT interview_sessions_target_duration_check
        CHECK (target_duration_sec >= 60),
    ADD CONSTRAINT interview_sessions_closing_threshold_check
        CHECK (closing_threshold_sec >= 10),
    ADD CONSTRAINT interview_sessions_paused_duration_check
        CHECK (paused_duration_sec >= 0);

ALTER TABLE public.interview_turns
    DROP CONSTRAINT IF EXISTS interview_turns_role_check,
    DROP CONSTRAINT IF EXISTS interview_turns_channel_check,
    DROP CONSTRAINT IF EXISTS interview_turns_turn_index_check,
    DROP CONSTRAINT IF EXISTS interview_turns_exchange_index_check,
    DROP CONSTRAINT IF EXISTS interview_turns_latency_check,
    DROP CONSTRAINT IF EXISTS interview_turns_usage_input_check,
    DROP CONSTRAINT IF EXISTS interview_turns_usage_output_check,
    DROP CONSTRAINT IF EXISTS interview_turns_usage_total_check;

ALTER TABLE public.interview_turns
    ADD CONSTRAINT interview_turns_role_check
        CHECK (role IN ('user', 'model', 'ai', 'assistant', 'interviewer', 'system')),
    ADD CONSTRAINT interview_turns_channel_check
        CHECK (channel IN ('text', 'voice')),
    ADD CONSTRAINT interview_turns_turn_index_check
        CHECK (turn_index > 0),
    ADD CONSTRAINT interview_turns_exchange_index_check
        CHECK (exchange_index >= 0),
    ADD CONSTRAINT interview_turns_latency_check
        CHECK (latency_ms >= 0),
    ADD CONSTRAINT interview_turns_usage_input_check
        CHECK (usage_input_tokens >= 0),
    ADD CONSTRAINT interview_turns_usage_output_check
        CHECK (usage_output_tokens >= 0),
    ADD CONSTRAINT interview_turns_usage_total_check
        CHECK (usage_total_tokens >= 0);

ALTER TABLE public.interview_report_jobs
    DROP CONSTRAINT IF EXISTS interview_report_jobs_status_check,
    DROP CONSTRAINT IF EXISTS interview_report_jobs_attempts_check,
    DROP CONSTRAINT IF EXISTS interview_report_jobs_max_attempts_check;

ALTER TABLE public.interview_report_jobs
    ADD CONSTRAINT interview_report_jobs_status_check
        CHECK (status IN ('pending', 'running', 'done', 'failed')),
    ADD CONSTRAINT interview_report_jobs_attempts_check
        CHECK (attempts >= 0),
    ADD CONSTRAINT interview_report_jobs_max_attempts_check
        CHECK (max_attempts >= 1);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_type_created
ON public.interview_sessions(user_id, session_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_sources_session_id
ON public.portfolio_sources(session_id);
