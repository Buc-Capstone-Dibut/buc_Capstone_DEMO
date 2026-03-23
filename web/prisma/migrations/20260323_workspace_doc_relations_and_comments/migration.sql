CREATE TABLE IF NOT EXISTS public.kanban_task_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.kanban_tasks(id) ON DELETE CASCADE,
  doc_id uuid NOT NULL REFERENCES public.workspace_docs(id) ON DELETE CASCADE,
  relation_type text NOT NULL DEFAULT 'reference',
  is_primary boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT kanban_task_documents_task_id_doc_id_key UNIQUE (task_id, doc_id)
);

CREATE INDEX IF NOT EXISTS kanban_task_documents_workspace_id_task_id_idx
  ON public.kanban_task_documents(workspace_id, task_id);

CREATE INDEX IF NOT EXISTS kanban_task_documents_workspace_id_doc_id_idx
  ON public.kanban_task_documents(workspace_id, doc_id);

CREATE INDEX IF NOT EXISTS kanban_task_documents_task_id_is_primary_idx
  ON public.kanban_task_documents(task_id, is_primary);

CREATE UNIQUE INDEX IF NOT EXISTS kanban_task_documents_primary_per_task_idx
  ON public.kanban_task_documents(task_id)
  WHERE is_primary = true;

CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.workspace_doc_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  doc_id uuid NOT NULL REFERENCES public.workspace_docs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.workspace_doc_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  anchor_block_id text,
  resolved_at timestamp without time zone,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_doc_comments_workspace_id_doc_id_parent_id_created_at_idx
  ON public.workspace_doc_comments(workspace_id, doc_id, parent_id, created_at);

CREATE INDEX IF NOT EXISTS workspace_doc_comments_doc_id_created_at_idx
  ON public.workspace_doc_comments(doc_id, created_at);
