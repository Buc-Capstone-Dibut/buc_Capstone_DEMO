alter table public.user_portfolios
  add column if not exists format text not null default 'slide',
  add column if not exists page_size text not null default '16:9',
  add column if not exists orientation text not null default 'landscape',
  add column if not exists generation_preset text not null default 'interview-pitch';

create index if not exists user_portfolios_user_format_updated_idx
  on public.user_portfolios (user_id, format, updated_at desc);
