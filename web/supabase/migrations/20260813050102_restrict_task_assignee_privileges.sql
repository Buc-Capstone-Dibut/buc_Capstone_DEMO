begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Supabase projects can grant broad table privileges through default
-- privileges. TRUNCATE bypasses RLS, so explicitly reduce this exposed table
-- to only the operations supported by its policies.
revoke all on table public.kanban_task_assignees
from public, anon, authenticated;

grant select, insert, delete on table public.kanban_task_assignees
to authenticated;

commit;
