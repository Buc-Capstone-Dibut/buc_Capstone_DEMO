create table if not exists public.workspace_doc_states (
  doc_id uuid primary key references public.workspace_docs(id) on delete cascade,
  yjs_state text,
  updated_at timestamp without time zone not null default now(),
  updated_by uuid
);

create table if not exists public.workspace_doc_assets (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  doc_id uuid not null references public.workspace_docs(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp without time zone not null default now()
);

create index if not exists workspace_doc_assets_workspace_doc_created_idx
  on public.workspace_doc_assets (workspace_id, doc_id, created_at desc);

create index if not exists workspace_doc_assets_doc_created_idx
  on public.workspace_doc_assets (doc_id, created_at desc);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'workspace-doc-assets',
  'workspace-doc-assets',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
