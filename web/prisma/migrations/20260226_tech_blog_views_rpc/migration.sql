-- Tech blog: atomic view increment RPC and tag search index

CREATE INDEX IF NOT EXISTS idx_blogs_tags_gin
ON public.blogs
USING gin (tags);

CREATE OR REPLACE FUNCTION public.increment_views(blog_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blogs
  SET views = COALESCE(views, 0) + 1,
      updated_at = now()
  WHERE id = blog_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_views(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_views(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_views(integer) TO service_role;
