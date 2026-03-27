create table if not exists public.workspace_doc_templates (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  source_doc_id uuid references public.workspace_docs(id) on delete set null,
  name text not null,
  description text,
  emoji text,
  title text not null,
  content json,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_doc_templates_workspace_updated_idx
  on public.workspace_doc_templates (workspace_id, updated_at desc);

create index if not exists workspace_doc_templates_workspace_name_idx
  on public.workspace_doc_templates (workspace_id, name);

create index if not exists workspace_doc_templates_source_doc_idx
  on public.workspace_doc_templates (source_doc_id);
