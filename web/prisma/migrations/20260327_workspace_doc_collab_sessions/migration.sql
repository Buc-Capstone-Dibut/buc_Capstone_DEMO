create table if not exists public.workspace_doc_collab_sessions (
  doc_id uuid primary key references public.workspace_docs(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  status text not null default 'ENDED',
  started_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  ended_at timestamptz,
  last_activity_at timestamptz
);

create index if not exists workspace_doc_collab_sessions_workspace_status_activity_idx
  on public.workspace_doc_collab_sessions (workspace_id, status, last_activity_at desc);

create table if not exists public.workspace_doc_live_presence (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  doc_id uuid not null references public.workspace_docs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null default 'NORMAL',
  is_dirty boolean not null default false,
  last_seen_at timestamptz not null default now(),
  unique (doc_id, user_id)
);

create index if not exists workspace_doc_live_presence_workspace_doc_mode_last_seen_idx
  on public.workspace_doc_live_presence (workspace_id, doc_id, mode, last_seen_at desc);

create index if not exists workspace_doc_live_presence_user_last_seen_idx
  on public.workspace_doc_live_presence (user_id, last_seen_at desc);
