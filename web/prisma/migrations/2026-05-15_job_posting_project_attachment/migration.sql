-- 채용공고 첨부에 '프로젝트(이력서 내부 JSON)' 연결을 추가합니다.
-- 프로젝트는 별도 테이블이 없고 user_resumes.resume_payload(JSON) 안의
-- projects[] 배열에 들어 있으므로, 외래키 없이 (resume_id + project_id) 페어로
-- 식별합니다. project_label 은 표시용 denormalized 스냅샷.

ALTER TABLE "user_job_posting_attachments"
  ADD COLUMN IF NOT EXISTS "project_id"    text,
  ADD COLUMN IF NOT EXISTS "project_label" text;

COMMENT ON COLUMN "user_job_posting_attachments"."project_id" IS
  'Project id within user_resumes.resume_payload.projects[]. Set when attachment_type = ''project''.';
COMMENT ON COLUMN "user_job_posting_attachments"."project_label" IS
  'Denormalized project name + period for display. Set when attachment_type = ''project''.';
