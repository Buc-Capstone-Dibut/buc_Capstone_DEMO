BEGIN;

-- Multiple boards are being retired. Preserve every task and merge their
-- per-board ordering into one deterministic order inside each status column.
WITH ranked_tasks AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "column_id"
      ORDER BY "order", "created_at", "id"
    ) - 1 AS "next_order"
  FROM "public"."kanban_tasks"
)
UPDATE "public"."kanban_tasks" AS task
SET "order" = ranked_tasks."next_order"::INTEGER
FROM ranked_tasks
WHERE task."id" = ranked_tasks."id";

DROP INDEX IF EXISTS "public"."idx_kanban_tasks_board_column_order";
DROP INDEX IF EXISTS "public"."idx_kanban_tasks_board_end_date";

ALTER TABLE "public"."kanban_tasks"
DROP CONSTRAINT IF EXISTS "kanban_tasks_board_id_fkey";

ALTER TABLE "public"."kanban_tasks"
DROP COLUMN IF EXISTS "board_id";

DROP TABLE IF EXISTS "public"."workspace_boards";

CREATE INDEX IF NOT EXISTS "idx_kanban_tasks_column_order"
ON "public"."kanban_tasks" ("column_id", "order");

CREATE INDEX IF NOT EXISTS "idx_kanban_tasks_end_date"
ON "public"."kanban_tasks" ("end_date");

COMMIT;
