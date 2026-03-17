-- Career data cutover: dev_events source-of-truth in Supabase, blogs public read hardening

CREATE TABLE IF NOT EXISTS public.dev_events (
  id uuid PRIMARY KEY,
  source_key text NOT NULL,
  source text NOT NULL DEFAULT 'github',
  source_title text NOT NULL,
  title text NOT NULL,
  link text NOT NULL,
  host text,
  date text NOT NULL,
  start_date date,
  end_date date,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  category text,
  status text NOT NULL DEFAULT 'recruiting',
  summary text,
  description text,
  content text,
  thumbnail text,
  target_audience text[] NOT NULL DEFAULT ARRAY[]::text[],
  fee text,
  schedule text[] NOT NULL DEFAULT ARRAY[]::text[],
  benefits text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dev_events_source_key_unique
ON public.dev_events (source_key);

CREATE INDEX IF NOT EXISTS idx_dev_events_status
ON public.dev_events (status);

CREATE INDEX IF NOT EXISTS idx_dev_events_category
ON public.dev_events (category);

CREATE INDEX IF NOT EXISTS idx_dev_events_end_date
ON public.dev_events (end_date);

CREATE INDEX IF NOT EXISTS idx_dev_events_last_seen_at
ON public.dev_events (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_dev_events_tags_gin
ON public.dev_events
USING gin (tags);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blogs_external_url_unique
ON public.blogs (external_url);

ALTER TABLE public.dev_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dev_events'
      AND policyname = 'dev_events_public_read'
  ) THEN
    CREATE POLICY dev_events_public_read
      ON public.dev_events
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blogs'
      AND policyname = 'blogs_public_read'
  ) THEN
    CREATE POLICY blogs_public_read
      ON public.blogs
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END
$$;
