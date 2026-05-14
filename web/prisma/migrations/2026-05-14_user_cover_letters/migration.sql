-- Migration: user_cover_letters_init
-- Applied via Supabase MCP on 2026-05-14
-- Adds standalone cover letters table + back-fills from existing resume_payload.coverLetters[].

create table if not exists public.user_cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '새 자기소개서',
  body text not null default '',
  source_resume_id uuid references public.user_resumes(id) on delete set null,
  source_index integer,
  tags text[] not null default '{}',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_cover_letters_user_updated_idx
  on public.user_cover_letters (user_id, updated_at desc);

drop trigger if exists user_cover_letters_set_updated_at on public.user_cover_letters;
create trigger user_cover_letters_set_updated_at
  before update on public.user_cover_letters
  for each row execute function public.set_updated_at();

alter table public.user_cover_letters enable row level security;

create policy "cover_letters_owner_select" on public.user_cover_letters
  for select using (auth.uid() = user_id);
create policy "cover_letters_owner_insert" on public.user_cover_letters
  for insert with check (auth.uid() = user_id);
create policy "cover_letters_owner_update" on public.user_cover_letters
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cover_letters_owner_delete" on public.user_cover_letters
  for delete using (auth.uid() = user_id);

alter table public.user_job_posting_attachments
  add column if not exists cover_letter_id uuid references public.user_cover_letters(id) on delete cascade;

create unique index if not exists user_job_posting_attachments_cover_letter_id_unique
  on public.user_job_posting_attachments (job_posting_id, cover_letter_id)
  where attachment_type = 'cover_letter' and cover_letter_id is not null;

insert into public.user_cover_letters (user_id, title, body, source_resume_id, source_index, created_at, updated_at)
select
  r.user_id,
  coalesce(c.value->>'title', '자기소개서') as title,
  coalesce(c.value->>'body', c.value->>'content', '') as body,
  r.id as source_resume_id,
  (c.idx - 1)::int as source_index,
  r.created_at,
  r.updated_at
from public.user_resumes r
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(r.resume_payload->'coverLetters') = 'array'
    then r.resume_payload->'coverLetters'
    else '[]'::jsonb
  end
) with ordinality as c(value, idx)
where jsonb_typeof(r.resume_payload->'coverLetters') = 'array'
  and jsonb_array_length(r.resume_payload->'coverLetters') > 0
  and not exists (
    select 1 from public.user_cover_letters cl
    where cl.source_resume_id = r.id
      and cl.source_index = (c.idx - 1)::int
  );

insert into public.user_cover_letters (user_id, title, body, source_resume_id, source_index, created_at, updated_at)
select
  rp.user_id,
  coalesce(c.value->>'title', '자기소개서') as title,
  coalesce(c.value->>'body', c.value->>'content', '') as body,
  null::uuid as source_resume_id,
  (c.idx - 1)::int as source_index,
  rp.created_at,
  rp.updated_at
from public.user_resume_profiles rp
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(rp.resume_payload->'coverLetters') = 'array'
    then rp.resume_payload->'coverLetters'
    else '[]'::jsonb
  end
) with ordinality as c(value, idx)
where jsonb_typeof(rp.resume_payload->'coverLetters') = 'array'
  and jsonb_array_length(rp.resume_payload->'coverLetters') > 0
  and not exists (
    select 1 from public.user_cover_letters cl
    where cl.user_id = rp.user_id
      and cl.source_resume_id is null
      and cl.source_index = (c.idx - 1)::int
  );
