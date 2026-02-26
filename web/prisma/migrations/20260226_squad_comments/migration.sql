-- Squad comments for recruiting posts

CREATE TABLE IF NOT EXISTS public.squad_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.squad_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_squad_comments_squad_created_at
ON public.squad_comments (squad_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_squad_comments_parent_id
ON public.squad_comments (parent_id);
