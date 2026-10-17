-- Create the dev_events table
create table if not exists public.dev_events (
  id uuid not null default gen_random_uuid (),
  title text not null,
  link text not null,
  host text null,
  date text not null,
  start_date date null,
  end_date date null,
  tags text[] null,
  category text null,
  status text not null default 'recruiting'::text,
  source text not null default 'github'::text,
  source_key text not null,
  source_title text not null,
  description text null,
  thumbnail text null,
  content text null,
  summary text null,
  target_audience text[] null,
  fee text null,
  schedule text[] null,
  benefits text[] null,
  created_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone null,
  updated_at timestamp with time zone null,
  constraint dev_events_pkey primary key (id),
  constraint dev_events_source_link_key unique (source, link),
  constraint dev_events_source_key_key unique (source_key)
);

-- Existing installations: bring the legacy table to the current crawler contract.
alter table public.dev_events add column if not exists source_key text;
alter table public.dev_events add column if not exists source_title text;
alter table public.dev_events add column if not exists summary text;
alter table public.dev_events add column if not exists target_audience text[];
alter table public.dev_events add column if not exists fee text;
alter table public.dev_events add column if not exists schedule text[];
alter table public.dev_events add column if not exists benefits text[];
alter table public.dev_events add column if not exists last_seen_at timestamp with time zone;
alter table public.dev_events add column if not exists updated_at timestamp with time zone;

update public.dev_events
set source_key = coalesce(source, 'github') || '::' || link
where source_key is null;

update public.dev_events
set source_title = title
where source_title is null;

alter table public.dev_events alter column source_key set not null;
alter table public.dev_events alter column source_title set not null;
create unique index if not exists dev_events_source_key_key
  on public.dev_events (source_key);

-- Enable RLS (Row Level Security) if needed, or leave open for service role
alter table public.dev_events enable row level security;

-- Allow read access to everyone (public)
create policy "Allow public read access"
  on public.dev_events
  for select
  to public
  using (true);

-- Allow service role to do everything (implicit, but good to know)

-- Legacy duplicates must first be reconciled with src.apps.dev_event.reconcile.
-- The reconciliation command also creates this index and the alias schema below.
create unique index if not exists dev_events_source_link_unique
  on public.dev_events (source, link);

create table if not exists public.dev_event_aliases (
  alias_id uuid primary key,
  event_id uuid not null references public.dev_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (alias_id <> event_id)
);
alter table public.dev_event_aliases enable row level security;
drop policy if exists dev_event_aliases_public_read on public.dev_event_aliases;
create policy dev_event_aliases_public_read on public.dev_event_aliases
  for select to public using (true);
grant select on public.dev_event_aliases to anon, authenticated;
grant all on public.dev_event_aliases to service_role;
