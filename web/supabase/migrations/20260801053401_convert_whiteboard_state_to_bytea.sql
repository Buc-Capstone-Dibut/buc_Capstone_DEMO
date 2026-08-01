-- Whiteboard state is disposable during this migration. Reset the existing
-- Base64 snapshots, then persist future Yjs snapshots as raw PostgreSQL bytea.
-- The type guard makes a later `supabase db push` safe after a manual rollout:
-- it will not clear whiteboards that are already using bytea.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workspace_whiteboards'
      and column_name = 'yjs_state'
      and udt_name = 'text'
  ) then
    truncate table public.workspace_whiteboards;

    alter table public.workspace_whiteboards
      alter column yjs_state type bytea
      using null::bytea;
  end if;
end
$$;

comment on column public.workspace_whiteboards.yjs_state is
  'Raw binary output of Y.encodeStateAsUpdate().';

-- Whiteboard snapshots are only accessed through the internal authenticated
-- BFF. No direct anon/authenticated PostgREST access is required.
alter table public.workspace_whiteboards enable row level security;
