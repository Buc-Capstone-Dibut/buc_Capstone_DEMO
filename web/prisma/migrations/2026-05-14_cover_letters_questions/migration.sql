-- Migration: cover_letters_questions_column
-- 자기소개서에 문항-답변 배열 보관용 JSONB 컬럼.
-- 기존 body (plain text) 는 그대로 유지. questions = [] 면 종전 동작과 동일.
alter table public.user_cover_letters
  add column if not exists questions jsonb not null default '[]'::jsonb;
