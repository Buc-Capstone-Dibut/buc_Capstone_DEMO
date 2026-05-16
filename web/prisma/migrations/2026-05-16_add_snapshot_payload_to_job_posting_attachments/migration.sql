-- 2026-05-15 마이그레이션에 포함되어 있었으나 일부 환경에서 적용되지 않은
-- snapshot_payload 컬럼을 보강한다. IF NOT EXISTS 이므로 이미 적용된 환경에서는 noop.
ALTER TABLE "user_job_posting_attachments"
  ADD COLUMN IF NOT EXISTS "snapshot_payload" jsonb;

COMMENT ON COLUMN "user_job_posting_attachments"."snapshot_payload" IS
  '첨부 시점의 자료 스냅샷 (이력서 제목/경력요약, 자소서 본문, 포트폴리오 제목, 프로젝트 개요)';
