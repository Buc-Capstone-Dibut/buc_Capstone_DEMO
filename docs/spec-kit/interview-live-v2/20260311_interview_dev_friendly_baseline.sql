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

ALTER TABLE public.interview_turns
    DROP CONSTRAINT IF EXISTS interview_turns_role_check,
    DROP CONSTRAINT IF EXISTS interview_turns_channel_check,
    DROP CONSTRAINT IF EXISTS interview_turns_turn_index_check,
    DROP CONSTRAINT IF EXISTS interview_turns_exchange_index_check,
    DROP CONSTRAINT IF EXISTS interview_turns_latency_check,
    DROP CONSTRAINT IF EXISTS interview_turns_usage_input_check,
    DROP CONSTRAINT IF EXISTS interview_turns_usage_output_check,
    DROP CONSTRAINT IF EXISTS interview_turns_usage_total_check;

ALTER TABLE public.interview_report_jobs
    DROP CONSTRAINT IF EXISTS interview_report_jobs_status_check,
    DROP CONSTRAINT IF EXISTS interview_report_jobs_attempts_check,
    DROP CONSTRAINT IF EXISTS interview_report_jobs_max_attempts_check;
