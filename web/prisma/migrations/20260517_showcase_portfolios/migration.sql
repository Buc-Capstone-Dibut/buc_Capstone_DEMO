create table if not exists public.showcase_portfolios (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  slug             text not null,
  title            text not null default '새 포트폴리오',
  template_id      text not null default 'neon-editorial',
  content_payload  jsonb not null default '{}'::jsonb,
  tokens_payload   jsonb not null default '{}'::jsonb,
  is_public        boolean not null default false,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint showcase_portfolios_user_slug_unique unique (user_id, slug)
);

create index if not exists showcase_portfolios_user_updated_idx
  on public.showcase_portfolios (user_id, updated_at desc);

create index if not exists showcase_portfolios_public_published_idx
  on public.showcase_portfolios (is_public, published_at desc);
