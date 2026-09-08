-- Nullable for existing recordings; no rewrite or backfill of interview content.
ALTER TABLE public.interview_recordings
    ADD COLUMN IF NOT EXISTS transcript JSONB;
