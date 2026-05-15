-- Migration: job_postings_favorite
-- Applied via Supabase MCP on 2026-05-14

alter table public.user_job_postings
  add column if not exists is_favorite boolean not null default false;

create index if not exists user_job_postings_user_fav_idx
  on public.user_job_postings (user_id, is_favorite desc, created_at desc);
