-- 작성물(이력서/자소서) ↔ 채용공고 유기적 양방향 연결
-- target_job_posting_id: 등록된 공고 참조 (FK, nullable)
-- target_meta: 직접 입력 시 free-form {company, division, role, deadline, jobDescription}

ALTER TABLE "user_resumes"
  ADD COLUMN IF NOT EXISTS "target_job_posting_id" uuid REFERENCES "user_job_postings"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "target_meta" jsonb;

ALTER TABLE "user_cover_letters"
  ADD COLUMN IF NOT EXISTS "target_job_posting_id" uuid REFERENCES "user_job_postings"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "target_meta" jsonb;

CREATE INDEX IF NOT EXISTS "idx_user_resumes_target_posting"
  ON "user_resumes" ("user_id", "target_job_posting_id");

CREATE INDEX IF NOT EXISTS "idx_user_cover_letters_target_posting"
  ON "user_cover_letters" ("user_id", "target_job_posting_id");

COMMENT ON COLUMN "user_resumes"."target_job_posting_id" IS
  '이 이력서의 주 대상 채용공고. 사용자가 등록한 공고에서 가져왔을 때 설정. nullable.';
COMMENT ON COLUMN "user_resumes"."target_meta" IS
  '공고 등록 없이 직접 입력한 대상 정보 {company, division, role, deadline, jobDescription}. nullable.';
COMMENT ON COLUMN "user_cover_letters"."target_job_posting_id" IS
  '이 자소서의 주 대상 채용공고. nullable.';
COMMENT ON COLUMN "user_cover_letters"."target_meta" IS
  '직접 입력한 대상 정보. nullable.';
