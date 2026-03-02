DO $$
BEGIN
  CREATE TYPE "public"."workspace_lifecycle_status" AS ENUM ('IN_PROGRESS', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "public"."workspaces"
  ADD COLUMN IF NOT EXISTS "lifecycle_status" "public"."workspace_lifecycle_status" NOT NULL DEFAULT 'IN_PROGRESS',
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "result_type" TEXT,
  ADD COLUMN IF NOT EXISTS "result_link" TEXT,
  ADD COLUMN IF NOT EXISTS "result_note" TEXT;

CREATE INDEX IF NOT EXISTS "idx_workspaces_lifecycle_status"
  ON "public"."workspaces" ("lifecycle_status");

CREATE INDEX IF NOT EXISTS "idx_workspaces_completed_at"
  ON "public"."workspaces" ("completed_at" DESC);
