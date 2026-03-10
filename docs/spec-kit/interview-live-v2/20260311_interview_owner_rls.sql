UPDATE public.interview_sessions
SET runtime_status = CASE
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'failed' THEN 'failed'
    WHEN status IN ('running', 'in_progress') THEN 'awaiting_user'
    ELSE 'created'
END
WHERE runtime_status IS NULL
   OR runtime_status IN ('created', 'running', 'in_progress', 'expired');

DROP INDEX IF EXISTS public.idx_interview_sessions_runtime_status;
CREATE INDEX IF NOT EXISTS idx_interview_sessions_runtime_status
ON public.interview_sessions(runtime_status, updated_at DESC);

DROP INDEX IF EXISTS public.idx_interview_turns_session_exchange_role;
CREATE INDEX IF NOT EXISTS idx_interview_turns_session_exchange_role
ON public.interview_turns(session_id, exchange_index, role, created_at);

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_report_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_eval_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interview_sessions_owner_select ON public.interview_sessions;
CREATE POLICY interview_sessions_owner_select
ON public.interview_sessions
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS interview_turns_owner_select ON public.interview_turns;
CREATE POLICY interview_turns_owner_select
ON public.interview_turns
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = interview_turns.session_id
          AND s.user_id = auth.uid()::text
    )
);

DROP POLICY IF EXISTS interview_reports_owner_select ON public.interview_reports;
CREATE POLICY interview_reports_owner_select
ON public.interview_reports
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = interview_reports.session_id
          AND s.user_id = auth.uid()::text
    )
);

DROP POLICY IF EXISTS interview_report_jobs_owner_select ON public.interview_report_jobs;
CREATE POLICY interview_report_jobs_owner_select
ON public.interview_report_jobs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = interview_report_jobs.session_id
          AND s.user_id = auth.uid()::text
    )
);

DROP POLICY IF EXISTS interview_eval_signals_owner_select ON public.interview_eval_signals;
CREATE POLICY interview_eval_signals_owner_select
ON public.interview_eval_signals
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = interview_eval_signals.session_id
          AND s.user_id = auth.uid()::text
    )
);

DROP POLICY IF EXISTS portfolio_sources_owner_select ON public.portfolio_sources;
CREATE POLICY portfolio_sources_owner_select
ON public.portfolio_sources
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.interview_sessions s
        WHERE s.id = portfolio_sources.session_id
          AND s.user_id = auth.uid()::text
    )
);
