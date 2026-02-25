-- MyPage core schema (public profile + resume + settings + activity)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS handle text;

-- backfill handle for existing rows (best-effort, deterministic-ish)
WITH base AS (
  SELECT
    id,
    coalesce(
      nullif(
        lower(
          regexp_replace(
            coalesce(nullif(nickname, ''), 'user-' || substring(id::text, 1, 8)),
            '[^a-zA-Z0-9_]+',
            '-',
            'g'
          )
        ),
        ''
      ),
      'user-' || substring(id::text, 1, 8)
    ) AS raw_handle
  FROM public.profiles
),
dedup AS (
  SELECT
    id,
    CASE
      WHEN row_number() OVER (PARTITION BY raw_handle ORDER BY id) = 1 THEN raw_handle
      ELSE raw_handle || '-' || row_number() OVER (PARTITION BY raw_handle ORDER BY id)
    END AS resolved_handle
  FROM base
)
UPDATE public.profiles p
SET handle = d.resolved_handle
FROM dedup d
WHERE p.id = d.id
  AND (p.handle IS NULL OR p.handle = '');

ALTER TABLE public.profiles
ALTER COLUMN handle SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'profiles_handle_key'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_handle_key UNIQUE (handle);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_resume_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  resume_payload jsonb NOT NULL,
  public_summary jsonb NOT NULL,
  source_type text NOT NULL DEFAULT 'manual',
  source_file_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_workspace_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  settings_payload jsonb NOT NULL,
  public_summary jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blog_bookmarks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blog_id integer NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_bookmarks_user_blog_unique UNIQUE (user_id, blog_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_bookmarks_user_created_at
ON public.blog_bookmarks (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_activity_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_events_user_created_at
ON public.user_activity_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_events_event_type
ON public.user_activity_events (event_type);
