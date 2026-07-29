BEGIN;

CREATE TABLE IF NOT EXISTS "public"."workspace_boards" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "workspace_id" UUID NOT NULL REFERENCES "public"."workspaces"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_workspace_boards_workspace_archive_position"
ON "public"."workspace_boards" ("workspace_id", "archived_at", "position");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_workspace_boards_one_default"
ON "public"."workspace_boards" ("workspace_id")
WHERE "is_default" = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_workspace_boards_active_name"
ON "public"."workspace_boards" ("workspace_id", LOWER("name"))
WHERE "archived_at" IS NULL;

ALTER TABLE "public"."workspace_boards" ENABLE ROW LEVEL SECURITY;

INSERT INTO "public"."workspace_boards" (
  "workspace_id",
  "name",
  "position",
  "is_default"
)
SELECT
  "id",
  '기본 보드',
  0,
  TRUE
FROM "public"."workspaces"
ON CONFLICT DO NOTHING;

ALTER TABLE "public"."kanban_tasks"
ADD COLUMN IF NOT EXISTS "board_id" UUID;

UPDATE "public"."kanban_tasks" AS task
SET "board_id" = board."id"
FROM "public"."kanban_columns" AS task_column,
     "public"."workspace_boards" AS board
WHERE task."column_id" = task_column."id"
  AND board."workspace_id" = task_column."workspace_id"
  AND board."is_default" = TRUE
  AND task."board_id" IS NULL;

ALTER TABLE "public"."kanban_tasks"
ALTER COLUMN "board_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'kanban_tasks_board_id_fkey'
      AND conrelid = 'public.kanban_tasks'::regclass
  ) THEN
    ALTER TABLE "public"."kanban_tasks"
    ADD CONSTRAINT "kanban_tasks_board_id_fkey"
    FOREIGN KEY ("board_id")
    REFERENCES "public"."workspace_boards"("id")
    ON DELETE CASCADE;
  END IF;
END
$$;

ALTER TABLE "public"."kanban_tasks"
ADD COLUMN IF NOT EXISTS "start_date" DATE;

ALTER TABLE "public"."kanban_tasks"
ADD COLUMN IF NOT EXISTS "end_date" DATE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'kanban_tasks'
      AND column_name = 'due_date'
  ) THEN
    UPDATE "public"."kanban_tasks"
    SET "end_date" = (
      ("due_date" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'
    )::DATE
    WHERE "due_date" IS NOT NULL
      AND "end_date" IS NULL;
  END IF;
END
$$;

ALTER TABLE "public"."kanban_tasks"
DROP COLUMN IF EXISTS "due_date";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'kanban_tasks_valid_date_range'
      AND conrelid = 'public.kanban_tasks'::regclass
  ) THEN
    ALTER TABLE "public"."kanban_tasks"
    ADD CONSTRAINT "kanban_tasks_valid_date_range"
    CHECK (
      "start_date" IS NULL
      OR "end_date" IS NULL
      OR "start_date" <= "end_date"
    );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "idx_kanban_tasks_board_column_order"
ON "public"."kanban_tasks" ("board_id", "column_id", "order");

CREATE INDEX IF NOT EXISTS "idx_kanban_tasks_board_end_date"
ON "public"."kanban_tasks" ("board_id", "end_date");

INSERT INTO "public"."kanban_tags" (
  "workspace_id",
  "name",
  "color"
)
SELECT DISTINCT
  task_column."workspace_id",
  BTRIM(tag_ref),
  'gray'
FROM "public"."kanban_tasks" AS task
JOIN "public"."kanban_columns" AS task_column
  ON task_column."id" = task."column_id"
CROSS JOIN LATERAL UNNEST(task."tags") AS task_tag(tag_ref)
WHERE BTRIM(tag_ref) <> ''
  AND tag_ref !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND NOT EXISTS (
    SELECT 1
    FROM "public"."kanban_tags" AS existing_tag
    WHERE existing_tag."workspace_id" = task_column."workspace_id"
      AND LOWER(existing_tag."name") = LOWER(BTRIM(tag_ref))
  )
ON CONFLICT DO NOTHING;

WITH normalized_tags AS (
  SELECT
    task."id" AS task_id,
    COALESCE(
      ARRAY_AGG(DISTINCT tag."id"::TEXT)
        FILTER (WHERE tag."id" IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS tag_ids
  FROM "public"."kanban_tasks" AS task
  JOIN "public"."kanban_columns" AS task_column
    ON task_column."id" = task."column_id"
  LEFT JOIN LATERAL UNNEST(task."tags") AS task_tag(tag_ref)
    ON TRUE
  LEFT JOIN "public"."kanban_tags" AS tag
    ON tag."workspace_id" = task_column."workspace_id"
   AND (
     tag."id"::TEXT = task_tag.tag_ref
     OR LOWER(tag."name") = LOWER(BTRIM(task_tag.tag_ref))
   )
  GROUP BY task."id"
)
UPDATE "public"."kanban_tasks" AS task
SET "tags" = normalized_tags.tag_ids
FROM normalized_tags
WHERE task."id" = normalized_tags.task_id
  AND task."tags" IS DISTINCT FROM normalized_tags.tag_ids;

COMMIT;
