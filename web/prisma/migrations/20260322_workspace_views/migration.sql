CREATE TABLE IF NOT EXISTS "public"."workspace_views" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "workspace_id" UUID NOT NULL REFERENCES "public"."workspaces"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'kanban',
  "group_by" TEXT NOT NULL,
  "icon" TEXT,
  "color" TEXT,
  "columns" JSONB,
  "card_properties" JSONB,
  "filters" JSONB,
  "show_empty_groups" BOOLEAN NOT NULL DEFAULT TRUE,
  "column_order" JSONB,
  "is_system" BOOLEAN NOT NULL DEFAULT FALSE,
  "view_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_workspace_views_workspace_order"
ON "public"."workspace_views" ("workspace_id", "view_order");
