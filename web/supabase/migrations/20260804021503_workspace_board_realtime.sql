create schema if not exists private;

revoke all on schema private from public;

create or replace function private.broadcast_workspace_board_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_workspace_id uuid;
  new_workspace_id uuid;
  record_id text;
begin
  record_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id');

  if tg_table_name = 'kanban_tasks' then
    if tg_op <> 'DELETE' then
      select workspace_id
      into new_workspace_id
      from public.kanban_columns
      where id = new.column_id;
    end if;

    if tg_op <> 'INSERT' then
      select workspace_id
      into old_workspace_id
      from public.kanban_columns
      where id = old.column_id;
    end if;
  else
    if tg_op <> 'DELETE' then
      new_workspace_id := (to_jsonb(new) ->> 'workspace_id')::uuid;
    end if;

    if tg_op <> 'INSERT' then
      old_workspace_id := (to_jsonb(old) ->> 'workspace_id')::uuid;
    end if;
  end if;

  if new_workspace_id is not null then
    perform realtime.send(
      jsonb_build_object(
        'workspaceId', new_workspace_id,
        'entity', tg_table_name,
        'operation', tg_op,
        'recordId', record_id
      ),
      'board.changed',
      'workspace:' || new_workspace_id::text || ':board',
      true
    );
  end if;

  if old_workspace_id is not null
    and old_workspace_id is distinct from new_workspace_id then
    perform realtime.send(
      jsonb_build_object(
        'workspaceId', old_workspace_id,
        'entity', tg_table_name,
        'operation', tg_op,
        'recordId', record_id
      ),
      'board.changed',
      'workspace:' || old_workspace_id::text || ':board',
      true
    );
  end if;

  return null;
end;
$$;

revoke all on function private.broadcast_workspace_board_change()
from public, anon, authenticated;

drop policy if exists "workspace members can receive board broadcasts"
on realtime.messages;

create policy "workspace members can receive board broadcasts"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and exists (
    select 1
    from public.workspace_members as member
    where member.user_id = (select auth.uid())
      and (select realtime.topic()) =
        'workspace:' || member.workspace_id::text || ':board'
  )
);

drop trigger if exists broadcast_workspace_board_columns
on public.kanban_columns;
create trigger broadcast_workspace_board_columns
after insert or update or delete on public.kanban_columns
for each row execute function private.broadcast_workspace_board_change();

drop trigger if exists broadcast_workspace_board_tasks
on public.kanban_tasks;
create trigger broadcast_workspace_board_tasks
after insert or update or delete on public.kanban_tasks
for each row execute function private.broadcast_workspace_board_change();

drop trigger if exists broadcast_workspace_board_tags
on public.kanban_tags;
create trigger broadcast_workspace_board_tags
after insert or update or delete on public.kanban_tags
for each row execute function private.broadcast_workspace_board_change();

drop trigger if exists broadcast_workspace_board_views
on public.workspace_views;
create trigger broadcast_workspace_board_views
after insert or update or delete on public.workspace_views
for each row execute function private.broadcast_workspace_board_change();

drop trigger if exists broadcast_workspace_board_task_documents
on public.kanban_task_documents;
create trigger broadcast_workspace_board_task_documents
after insert or update or delete on public.kanban_task_documents
for each row execute function private.broadcast_workspace_board_change();
