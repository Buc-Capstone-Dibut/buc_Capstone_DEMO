begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- The application has used one workspace-wide task board since
-- 20260730_remove_workspace_boards, but that Prisma migration was not part of
-- the Supabase deployment history. Production therefore still required the
-- retired board_id column and rejected every task INSERT with SQLSTATE 23502.
-- Repeat the removal in the deployed migration stream and keep it idempotent.
with ranked_tasks as (
  select
    id,
    row_number() over (
      partition by column_id
      order by "order", created_at, id
    ) - 1 as next_order
  from public.kanban_tasks
)
update public.kanban_tasks as task
set "order" = ranked_tasks.next_order::integer
from ranked_tasks
where task.id = ranked_tasks.id
  and task."order" is distinct from ranked_tasks.next_order::integer;

drop index if exists public.idx_kanban_tasks_board_column_order;
drop index if exists public.idx_kanban_tasks_board_end_date;

alter table public.kanban_tasks
drop constraint if exists kanban_tasks_board_id_fkey;

alter table public.kanban_tasks
drop column if exists board_id;

drop table if exists public.workspace_boards;

create index if not exists idx_kanban_tasks_column_order
on public.kanban_tasks (column_id, "order");

create index if not exists idx_kanban_tasks_end_date
on public.kanban_tasks (end_date);

commit;
