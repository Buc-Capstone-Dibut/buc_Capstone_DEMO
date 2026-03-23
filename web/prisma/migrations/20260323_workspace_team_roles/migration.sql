ALTER TABLE "public"."workspace_members"
ADD COLUMN IF NOT EXISTS "team_role" TEXT;

ALTER TABLE "public"."workspace_invites"
ADD COLUMN IF NOT EXISTS "team_role" TEXT;
