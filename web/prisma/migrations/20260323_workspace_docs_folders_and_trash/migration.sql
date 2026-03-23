ALTER TABLE "public"."workspace_docs"
ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'page',
ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

UPDATE "public"."workspace_docs" doc
SET "sort_order" = ordered.sort_order
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "workspace_id", "parent_id", "is_archived"
      ORDER BY "updated_at" DESC, "created_at" ASC
    ) - 1 AS sort_order
  FROM "public"."workspace_docs"
) AS ordered
WHERE doc.id = ordered.id;

CREATE INDEX IF NOT EXISTS "workspace_docs_workspace_id_parent_id_is_archived_sort_order_idx"
ON "public"."workspace_docs"("workspace_id", "parent_id", "is_archived", "sort_order");
