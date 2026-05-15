-- 채용공고 폴더 분류 + 카드 색 사용자 지정
-- 1. 폴더 테이블 (사용자별)
CREATE TABLE IF NOT EXISTS "user_job_posting_folders" (
  "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid        NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "name"        text        NOT NULL,
  "color"       text,
  "sort_order"  integer     NOT NULL DEFAULT 0,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_user_job_posting_folders_user"
  ON "user_job_posting_folders" ("user_id", "sort_order");

-- RLS (기존 user_job_postings 정책 패턴 따라)
ALTER TABLE "user_job_posting_folders" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_posting_folders_owner_select"
  ON "user_job_posting_folders" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "job_posting_folders_owner_insert"
  ON "user_job_posting_folders" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "job_posting_folders_owner_update"
  ON "user_job_posting_folders" FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "job_posting_folders_owner_delete"
  ON "user_job_posting_folders" FOR DELETE
  USING (auth.uid() = user_id);

-- 2. 공고에 폴더/색 연결
ALTER TABLE "user_job_postings"
  ADD COLUMN IF NOT EXISTS "folder_id" uuid REFERENCES "user_job_posting_folders"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "color"     text;

CREATE INDEX IF NOT EXISTS "idx_user_job_postings_folder"
  ON "user_job_postings" ("user_id", "folder_id");

COMMENT ON TABLE "user_job_posting_folders" IS
  'User-defined folders for organizing job postings (e.g. 지원중, 백엔드, 공기업).';
COMMENT ON COLUMN "user_job_postings"."folder_id" IS
  'Optional folder for grouping in the UI.';
COMMENT ON COLUMN "user_job_postings"."color" IS
  'User-picked accent color preset (e.g. emerald, sky, violet). Overrides status color on the card left bar.';
