from __future__ import annotations

from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from app.config import settings


@contextmanager
def get_connection():
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not set")

    conn = psycopg.connect(settings.database_url, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    ddl = [
        """
        CREATE TABLE IF NOT EXISTS public.interview_sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            session_type VARCHAR(32) NOT NULL DEFAULT 'live_interview',
            mode VARCHAR(16) NOT NULL DEFAULT 'chat',
            personality VARCHAR(32) NOT NULL DEFAULT 'professional',
            status VARCHAR(32) NOT NULL DEFAULT 'created',
            current_phase VARCHAR(32) NOT NULL DEFAULT 'introduction',
            tail_question_depth INT NOT NULL DEFAULT 0,
            question_count INT NOT NULL DEFAULT 0,
            target_duration_sec INT NOT NULL DEFAULT 420,
            closing_threshold_sec INT NOT NULL DEFAULT 60,
            closing_announced BOOLEAN NOT NULL DEFAULT false,
            origin_session_id TEXT,
            origin_turn_id TEXT,
            job_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            resume_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            jd_text TEXT,
            resume_text TEXT,
            planned_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            started_at TIMESTAMPTZ,
            ended_at TIMESTAMPTZ
        )
        """,
        """
        ALTER TABLE public.interview_sessions
            ADD COLUMN IF NOT EXISTS session_type VARCHAR(32) NOT NULL DEFAULT 'live_interview',
            ADD COLUMN IF NOT EXISTS target_duration_sec INT NOT NULL DEFAULT 420,
            ADD COLUMN IF NOT EXISTS closing_threshold_sec INT NOT NULL DEFAULT 60,
            ADD COLUMN IF NOT EXISTS closing_announced BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS origin_session_id TEXT,
            ADD COLUMN IF NOT EXISTS origin_turn_id TEXT,
            ADD COLUMN IF NOT EXISTS runtime_status TEXT NOT NULL DEFAULT 'created',
            ADD COLUMN IF NOT EXISTS live_provider TEXT NOT NULL DEFAULT 'gemini-live',
            ADD COLUMN IF NOT EXISTS live_model TEXT NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS last_disconnect_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS reconnect_deadline_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS last_paused_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS paused_duration_sec INT NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS report_requested_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS report_completed_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ
        """,
        """
        CREATE TABLE IF NOT EXISTS public.interview_turns (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
            turn_index INT NOT NULL,
            exchange_index INT NOT NULL DEFAULT 0,
            role VARCHAR(16) NOT NULL,
            channel VARCHAR(16) NOT NULL DEFAULT 'text',
            turn_kind TEXT NOT NULL DEFAULT 'message',
            phase TEXT NOT NULL DEFAULT '',
            provider TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            latency_ms INT NOT NULL DEFAULT 0,
            usage_input_tokens INT NOT NULL DEFAULT 0,
            usage_output_tokens INT NOT NULL DEFAULT 0,
            usage_total_tokens INT NOT NULL DEFAULT 0,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE(session_id, turn_index)
        )
        """,
        """
        ALTER TABLE public.interview_turns
            ADD COLUMN IF NOT EXISTS exchange_index INT NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS turn_kind TEXT NOT NULL DEFAULT 'message',
            ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS latency_ms INT NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS usage_input_tokens INT NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS usage_output_tokens INT NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS usage_total_tokens INT NOT NULL DEFAULT 0
        """,
        """
        CREATE TABLE IF NOT EXISTS public.interview_reports (
            session_id TEXT PRIMARY KEY REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
            report_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            comparison_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            rubric_version VARCHAR(16) NOT NULL DEFAULT 'v1',
            schema_version VARCHAR(16) NOT NULL DEFAULT 'v2',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        """
        ALTER TABLE public.interview_reports
            ADD COLUMN IF NOT EXISTS comparison_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS rubric_version VARCHAR(16) NOT NULL DEFAULT 'v1',
            ADD COLUMN IF NOT EXISTS schema_version VARCHAR(16) NOT NULL DEFAULT 'v2'
        """,
        """
        CREATE TABLE IF NOT EXISTS public.interview_eval_signals (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
            dimension VARCHAR(32) NOT NULL,
            score INT NOT NULL DEFAULT 0,
            weight INT NOT NULL DEFAULT 0,
            weighted_score NUMERIC(6,2) NOT NULL DEFAULT 0,
            evidence TEXT NOT NULL DEFAULT '',
            confidence NUMERIC(4,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS public.interview_report_jobs (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL UNIQUE REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
            session_type VARCHAR(32) NOT NULL DEFAULT 'live_interview',
            status VARCHAR(16) NOT NULL DEFAULT 'pending',
            attempts INT NOT NULL DEFAULT 0,
            max_attempts INT NOT NULL DEFAULT 3,
            error TEXT NOT NULL DEFAULT '',
            requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        """
        ALTER TABLE public.interview_report_jobs
            ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ
        """,
        """
        CREATE TABLE IF NOT EXISTS public.portfolio_sources (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
            repo_url TEXT NOT NULL,
            visibility VARCHAR(16) NOT NULL DEFAULT 'public',
            default_branch TEXT NOT NULL DEFAULT 'main',
            readme_snapshot TEXT NOT NULL DEFAULT '',
            tree_snapshot TEXT NOT NULL DEFAULT '',
            infra_files_snapshot TEXT NOT NULL DEFAULT '',
            analysis_status VARCHAR(32) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_created
        ON public.interview_sessions(user_id, created_at DESC)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_type_created
        ON public.interview_sessions(user_id, session_type, created_at DESC)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_interview_sessions_origin
        ON public.interview_sessions(origin_session_id)
        WHERE origin_session_id IS NOT NULL
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_interview_turns_session_created
        ON public.interview_turns(session_id, created_at)
        """,
        """
        DROP INDEX IF EXISTS public.idx_interview_sessions_runtime_status
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_interview_sessions_runtime_status
        ON public.interview_sessions(runtime_status, updated_at DESC)
        """,
        """
        DROP INDEX IF EXISTS public.idx_interview_turns_session_exchange_role
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_interview_turns_session_exchange_role
        ON public.interview_turns(session_id, exchange_index, role, created_at)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_eval_signals_session
        ON public.interview_eval_signals(session_id)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_report_jobs_status_created
        ON public.interview_report_jobs(status, created_at)
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_portfolio_sources_session_id
        ON public.portfolio_sources(session_id)
        """,
        """
        UPDATE public.interview_sessions
        SET status = 'in_progress'
        WHERE status = 'running'
        """,
        """
        UPDATE public.interview_sessions
        SET runtime_status = CASE
            WHEN status = 'completed' THEN 'completed'
            WHEN status = 'failed' THEN 'failed'
            WHEN status IN ('running', 'in_progress') THEN 'awaiting_user'
            ELSE 'created'
        END
        WHERE runtime_status IS NULL
           OR runtime_status IN ('created', 'running', 'in_progress', 'expired')
        """,
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'auth' AND p.proname = 'uid'
            ) THEN
                EXECUTE 'ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY';
                EXECUTE 'ALTER TABLE public.interview_turns ENABLE ROW LEVEL SECURITY';
                EXECUTE 'ALTER TABLE public.interview_reports ENABLE ROW LEVEL SECURITY';
                EXECUTE 'ALTER TABLE public.interview_report_jobs ENABLE ROW LEVEL SECURITY';
                EXECUTE 'ALTER TABLE public.interview_eval_signals ENABLE ROW LEVEL SECURITY';
                EXECUTE 'ALTER TABLE public.portfolio_sources ENABLE ROW LEVEL SECURITY';

                EXECUTE 'DROP POLICY IF EXISTS interview_sessions_owner_select ON public.interview_sessions';
                EXECUTE '' ||
                    'CREATE POLICY interview_sessions_owner_select ' ||
                    'ON public.interview_sessions FOR SELECT TO authenticated ' ||
                    'USING (auth.uid()::text = user_id)';

                EXECUTE 'DROP POLICY IF EXISTS interview_turns_owner_select ON public.interview_turns';
                EXECUTE '' ||
                    'CREATE POLICY interview_turns_owner_select ' ||
                    'ON public.interview_turns FOR SELECT TO authenticated ' ||
                    'USING (EXISTS (' ||
                    'SELECT 1 FROM public.interview_sessions s ' ||
                    'WHERE s.id = interview_turns.session_id AND s.user_id = auth.uid()::text' ||
                    '))';

                EXECUTE 'DROP POLICY IF EXISTS interview_reports_owner_select ON public.interview_reports';
                EXECUTE '' ||
                    'CREATE POLICY interview_reports_owner_select ' ||
                    'ON public.interview_reports FOR SELECT TO authenticated ' ||
                    'USING (EXISTS (' ||
                    'SELECT 1 FROM public.interview_sessions s ' ||
                    'WHERE s.id = interview_reports.session_id AND s.user_id = auth.uid()::text' ||
                    '))';

                EXECUTE 'DROP POLICY IF EXISTS interview_report_jobs_owner_select ON public.interview_report_jobs';
                EXECUTE '' ||
                    'CREATE POLICY interview_report_jobs_owner_select ' ||
                    'ON public.interview_report_jobs FOR SELECT TO authenticated ' ||
                    'USING (EXISTS (' ||
                    'SELECT 1 FROM public.interview_sessions s ' ||
                    'WHERE s.id = interview_report_jobs.session_id AND s.user_id = auth.uid()::text' ||
                    '))';

                EXECUTE 'DROP POLICY IF EXISTS interview_eval_signals_owner_select ON public.interview_eval_signals';
                EXECUTE '' ||
                    'CREATE POLICY interview_eval_signals_owner_select ' ||
                    'ON public.interview_eval_signals FOR SELECT TO authenticated ' ||
                    'USING (EXISTS (' ||
                    'SELECT 1 FROM public.interview_sessions s ' ||
                    'WHERE s.id = interview_eval_signals.session_id AND s.user_id = auth.uid()::text' ||
                    '))';

                EXECUTE 'DROP POLICY IF EXISTS portfolio_sources_owner_select ON public.portfolio_sources';
                EXECUTE '' ||
                    'CREATE POLICY portfolio_sources_owner_select ' ||
                    'ON public.portfolio_sources FOR SELECT TO authenticated ' ||
                    'USING (EXISTS (' ||
                    'SELECT 1 FROM public.interview_sessions s ' ||
                    'WHERE s.id = portfolio_sources.session_id AND s.user_id = auth.uid()::text' ||
                    '))';
            END IF;
        END
        $$;
        """,
    ]

    with get_connection() as conn:
        with conn.cursor() as cur:
            for stmt in ddl:
                cur.execute(stmt)
        conn.commit()
