DO $$
BEGIN
  CREATE TYPE "public"."workspace_space_status" AS ENUM ('DRAFT', 'ACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "public"."workspaces"
  ALTER COLUMN "category" SET DEFAULT 'project';

ALTER TABLE "public"."workspaces"
  ADD COLUMN IF NOT EXISTS "space_status" "public"."workspace_space_status" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "public"."workspaces"
  ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMPTZ(6);

UPDATE "public"."workspaces" AS w
SET "category" = CASE COALESCE(s."type", '')
  WHEN 'project' THEN 'project'
  WHEN 'study' THEN 'study'
  WHEN 'contest' THEN 'contest'
  WHEN 'mogakco' THEN 'mogakco'
  WHEN 'side-project' THEN 'project'
  WHEN 'general' THEN 'project'
  ELSE 'project'
END
FROM "public"."squads" AS s
WHERE w."from_squad_id" IS NOT NULL
  AND w."from_squad_id" = s."id";

UPDATE "public"."workspaces" AS w
SET "category" = CASE COALESCE(w."category", '')
  WHEN 'project' THEN 'project'
  WHEN 'study' THEN 'study'
  WHEN 'contest' THEN 'contest'
  WHEN 'mogakco' THEN 'mogakco'
  WHEN 'Side Project' THEN 'project'
  WHEN 'Startup' THEN 'project'
  WHEN 'Enterprise' THEN 'project'
  WHEN 'Competition' THEN 'contest'
  WHEN 'School' THEN 'study'
  WHEN 'Personal' THEN 'study'
  WHEN 'general' THEN 'project'
  WHEN 'side-project' THEN 'project'
  ELSE 'project'
END
WHERE w."from_squad_id" IS NULL;

UPDATE "public"."workspaces"
SET "activated_at" = COALESCE("activated_at", "created_at")
WHERE "space_status" = 'ACTIVE'
  AND "activated_at" IS NULL;
