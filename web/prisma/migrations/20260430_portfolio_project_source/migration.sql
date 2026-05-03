alter table public.user_portfolios
  add column if not exists source_project_id text,
  add column if not exists source_project_title text;

create index if not exists user_portfolios_user_source_project_updated_idx
  on public.user_portfolios (user_id, source_project_id, updated_at desc);
