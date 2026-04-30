create table if not exists public.user_portfolios (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '새 포트폴리오',
  slug text not null,
  template_id text not null default 'developer-minimal',
  is_public boolean not null default false,
  document_payload jsonb not null default '{}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  public_summary jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_portfolios_user_slug_unique unique (user_id, slug)
);

create index if not exists user_portfolios_user_updated_idx
  on public.user_portfolios (user_id, updated_at desc);

create index if not exists user_portfolios_public_published_idx
  on public.user_portfolios (is_public, published_at desc);

create table if not exists public.user_portfolio_assets (
  id uuid primary key default uuid_generate_v4(),
  portfolio_id uuid not null references public.user_portfolios(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes integer not null,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index if not exists user_portfolio_assets_portfolio_created_idx
  on public.user_portfolio_assets (portfolio_id, created_at desc);

create index if not exists user_portfolio_assets_user_created_idx
  on public.user_portfolio_assets (user_id, created_at desc);

alter table public.user_portfolios enable row level security;
alter table public.user_portfolio_assets enable row level security;

drop policy if exists "Users can read own or public portfolios" on public.user_portfolios;
create policy "Users can read own or public portfolios"
  on public.user_portfolios
  for select
  using (auth.uid() = user_id or is_public = true);

drop policy if exists "Users can insert own portfolios" on public.user_portfolios;
create policy "Users can insert own portfolios"
  on public.user_portfolios
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own portfolios" on public.user_portfolios;
create policy "Users can update own portfolios"
  on public.user_portfolios
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own portfolios" on public.user_portfolios;
create policy "Users can delete own portfolios"
  on public.user_portfolios
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own or public portfolio assets" on public.user_portfolio_assets;
create policy "Users can read own or public portfolio assets"
  on public.user_portfolio_assets
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.user_portfolios p
      where p.id = user_portfolio_assets.portfolio_id
        and p.is_public = true
    )
  );

drop policy if exists "Users can insert own portfolio assets" on public.user_portfolio_assets;
create policy "Users can insert own portfolio assets"
  on public.user_portfolio_assets
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own portfolio assets" on public.user_portfolio_assets;
create policy "Users can delete own portfolio assets"
  on public.user_portfolio_assets
  for delete
  using (auth.uid() = user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'portfolio-assets',
  'portfolio-assets',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
