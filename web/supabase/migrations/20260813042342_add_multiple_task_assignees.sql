begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Keep kanban_tasks.assignee_id during the rolling deployment as the primary
-- assignee compatibility field. The join table is the canonical source for
-- all new reads and writes.
create table if not exists public.kanban_task_assignees (
  task_id uuid not null references public.kanban_tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  position integer not null default 0 check (position >= 0),
  primary key (task_id, user_id)
);

create index if not exists idx_kanban_task_assignees_user_id
on public.kanban_task_assignees (user_id, task_id);

create index if not exists idx_kanban_task_assignees_assigned_by
on public.kanban_task_assignees (assigned_by);

create index if not exists idx_kanban_task_assignees_task_position
on public.kanban_task_assignees (task_id, position, assigned_at, user_id);

insert into public.kanban_task_assignees (task_id, user_id, assigned_by)
select task.id, task.assignee_id, task.assignee_id
from public.kanban_tasks as task
where task.assignee_id is not null
on conflict (task_id, user_id) do nothing;

alter table public.kanban_task_assignees enable row level security;

revoke all on table public.kanban_task_assignees from public;
revoke all on table public.kanban_task_assignees from anon;
grant select, insert, delete on table public.kanban_task_assignees to authenticated;

drop policy if exists "workspace members can view task assignees"
on public.kanban_task_assignees;
create policy "workspace members can view task assignees"
on public.kanban_task_assignees
for select
to authenticated
using (
  exists (
    select 1
    from public.kanban_tasks as task
    join public.kanban_columns as column_record
      on column_record.id = task.column_id
    join public.workspace_members as member
      on member.workspace_id = column_record.workspace_id
    where task.id = kanban_task_assignees.task_id
      and member.user_id = (select auth.uid())
  )
);

drop policy if exists "workspace members can assign task members"
on public.kanban_task_assignees;
create policy "workspace members can assign task members"
on public.kanban_task_assignees
for insert
to authenticated
with check (
  exists (
    select 1
    from public.kanban_tasks as task
    join public.kanban_columns as column_record
      on column_record.id = task.column_id
    join public.workspace_members as actor
      on actor.workspace_id = column_record.workspace_id
     and actor.user_id = (select auth.uid())
    join public.workspace_members as assignee_member
      on assignee_member.workspace_id = column_record.workspace_id
     and assignee_member.user_id = kanban_task_assignees.user_id
    where task.id = kanban_task_assignees.task_id
      and (
        kanban_task_assignees.assigned_by is null
        or kanban_task_assignees.assigned_by = (select auth.uid())
      )
  )
);

drop policy if exists "workspace members can remove task assignees"
on public.kanban_task_assignees;
create policy "workspace members can remove task assignees"
on public.kanban_task_assignees
for delete
to authenticated
using (
  exists (
    select 1
    from public.kanban_tasks as task
    join public.kanban_columns as column_record
      on column_record.id = task.column_id
    join public.workspace_members as member
      on member.workspace_id = column_record.workspace_id
    where task.id = kanban_task_assignees.task_id
      and member.user_id = (select auth.uid())
  )
);

-- Assignment changes must invalidate every open board view, just like task
-- changes. Extend the existing private trigger function to resolve the
-- workspace through task_id for the join table.
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
  record_id := coalesce(
    to_jsonb(new) ->> 'id',
    to_jsonb(old) ->> 'id',
    concat_ws(
      ':',
      coalesce(to_jsonb(new) ->> 'task_id', to_jsonb(old) ->> 'task_id'),
      coalesce(to_jsonb(new) ->> 'user_id', to_jsonb(old) ->> 'user_id')
    )
  );

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
  elsif tg_table_name = 'kanban_task_assignees' then
    if tg_op <> 'DELETE' then
      select column_record.workspace_id
      into new_workspace_id
      from public.kanban_tasks as task
      join public.kanban_columns as column_record
        on column_record.id = task.column_id
      where task.id = new.task_id;
    end if;

    if tg_op <> 'INSERT' then
      select column_record.workspace_id
      into old_workspace_id
      from public.kanban_tasks as task
      join public.kanban_columns as column_record
        on column_record.id = task.column_id
      where task.id = old.task_id;
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

drop trigger if exists broadcast_workspace_board_task_assignees
on public.kanban_task_assignees;
create trigger broadcast_workspace_board_task_assignees
after insert or update or delete on public.kanban_task_assignees
for each row execute function private.broadcast_workspace_board_change();

create or replace function private.sync_kanban_task_primary_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_task_id uuid;
begin
  affected_task_id := coalesce(new.task_id, old.task_id);

  update public.kanban_tasks as task
  set assignee_id = (
    select assignment.user_id
    from public.kanban_task_assignees as assignment
    where assignment.task_id = affected_task_id
    order by assignment.position, assignment.assigned_at, assignment.user_id
    limit 1
  )
  where task.id = affected_task_id
    and task.assignee_id is distinct from (
      select assignment.user_id
      from public.kanban_task_assignees as assignment
      where assignment.task_id = affected_task_id
      order by assignment.position, assignment.assigned_at, assignment.user_id
      limit 1
    );

  return null;
end;
$$;

revoke all on function private.sync_kanban_task_primary_assignee()
from public, anon, authenticated;

drop trigger if exists sync_kanban_task_primary_assignee
on public.kanban_task_assignees;
create trigger sync_kanban_task_primary_assignee
after insert or update or delete on public.kanban_task_assignees
for each row execute function private.sync_kanban_task_primary_assignee();

-- A removed workspace member must not leave an assignment that has no
-- matching assignee column. Re-select the compatibility primary from the
-- remaining canonical assignments.
create or replace function private.cleanup_removed_workspace_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.kanban_task_assignees as assignment
  using public.kanban_tasks as task, public.kanban_columns as column_record
  where assignment.task_id = task.id
    and task.column_id = column_record.id
    and column_record.workspace_id = old.workspace_id
    and assignment.user_id = old.user_id;

  return null;
end;
$$;

revoke all on function private.cleanup_removed_workspace_task_assignee()
from public, anon, authenticated;

drop trigger if exists cleanup_removed_workspace_task_assignee
on public.workspace_members;
create trigger cleanup_removed_workspace_task_assignee
after delete on public.workspace_members
for each row execute function private.cleanup_removed_workspace_task_assignee();

commit;
