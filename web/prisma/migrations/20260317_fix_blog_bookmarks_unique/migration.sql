WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, blog_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.blog_bookmarks
)
DELETE FROM public.blog_bookmarks bb
USING ranked
WHERE bb.id = ranked.id
  AND ranked.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'blog_bookmarks'
      AND c.conname = 'blog_bookmarks_user_blog_unique'
  ) THEN
    ALTER TABLE public.blog_bookmarks
    ADD CONSTRAINT blog_bookmarks_user_blog_unique UNIQUE (user_id, blog_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_blog_bookmarks_user_created_at
ON public.blog_bookmarks (user_id, created_at DESC);
