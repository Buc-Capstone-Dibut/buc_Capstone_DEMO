alter table public.user_portfolios
  add column if not exists generation_plan jsonb not null default '{}'::jsonb,
  add column if not exists generation_status text not null default 'idle',
  add column if not exists generation_quality jsonb not null default '{}'::jsonb,
  add column if not exists template_blueprint jsonb not null default '{}'::jsonb,
  add column if not exists thumbnail_url text,
  add column if not exists generated_at timestamptz,
  add column if not exists canvas_version integer not null default 4;

create index if not exists user_portfolios_generation_status_idx
  on public.user_portfolios (user_id, generation_status, updated_at desc);
