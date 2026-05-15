-- Migration: job_postings_init
-- Applied via Supabase MCP on 2026-05-14
-- Adds user-managed job postings + schedules + attachments with RLS.

create table if not exists public.user_job_postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  role_title text not null,
  posting_url text,
  tech_stack text[] not null default '{}',
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  preferred text[] not null default '{}',
  company_description text,
  team_culture text[] not null default '{}',
  memo text,
  status text not null default 'active'
    check (status in ('active','applied','interviewing','closed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_job_postings_user_status_idx
  on public.user_job_postings (user_id, status, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_job_postings_set_updated_at on public.user_job_postings;
create trigger user_job_postings_set_updated_at
  before update on public.user_job_postings
  for each row execute function public.set_updated_at();

create table if not exists public.user_job_posting_schedules (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.user_job_postings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null
    check (kind in ('deadline','document_due','interview','other')),
  title text,
  start_at timestamptz not null,
  end_at timestamptz,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists user_job_posting_schedules_user_idx
  on public.user_job_posting_schedules (user_id, start_at);
create index if not exists user_job_posting_schedules_posting_idx
  on public.user_job_posting_schedules (job_posting_id, start_at);

create table if not exists public.user_job_posting_attachments (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.user_job_postings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attachment_type text not null
    check (attachment_type in ('resume','cover_letter','portfolio')),
  resume_id uuid,
  cover_letter_index integer,
  cover_letter_label text,
  portfolio_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists user_job_posting_attachments_posting_idx
  on public.user_job_posting_attachments (job_posting_id);

create unique index if not exists user_job_posting_attachments_resume_unique
  on public.user_job_posting_attachments (job_posting_id, resume_id)
  where attachment_type = 'resume';

create unique index if not exists user_job_posting_attachments_cover_unique
  on public.user_job_posting_attachments (job_posting_id, resume_id, cover_letter_index)
  where attachment_type = 'cover_letter';

create unique index if not exists user_job_posting_attachments_portfolio_unique
  on public.user_job_posting_attachments (job_posting_id, portfolio_id)
  where attachment_type = 'portfolio';

alter table public.user_job_postings enable row level security;
alter table public.user_job_posting_schedules enable row level security;
alter table public.user_job_posting_attachments enable row level security;

create policy "job_postings_owner_select" on public.user_job_postings
  for select using (auth.uid() = user_id);
create policy "job_postings_owner_insert" on public.user_job_postings
  for insert with check (auth.uid() = user_id);
create policy "job_postings_owner_update" on public.user_job_postings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "job_postings_owner_delete" on public.user_job_postings
  for delete using (auth.uid() = user_id);

create policy "schedules_owner_select" on public.user_job_posting_schedules
  for select using (auth.uid() = user_id);
create policy "schedules_owner_insert" on public.user_job_posting_schedules
  for insert with check (auth.uid() = user_id);
create policy "schedules_owner_update" on public.user_job_posting_schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "schedules_owner_delete" on public.user_job_posting_schedules
  for delete using (auth.uid() = user_id);

create policy "attachments_owner_select" on public.user_job_posting_attachments
  for select using (auth.uid() = user_id);
create policy "attachments_owner_insert" on public.user_job_posting_attachments
  for insert with check (auth.uid() = user_id);
create policy "attachments_owner_update" on public.user_job_posting_attachments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attachments_owner_delete" on public.user_job_posting_attachments
  for delete using (auth.uid() = user_id);
