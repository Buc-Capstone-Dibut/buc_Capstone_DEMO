-- Community
CREATE INDEX IF NOT EXISTS "idx_comments_post_created_at"
ON "public"."comments" ("post_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_posts_category_created_at"
ON "public"."posts" ("category", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_squads_status_created_at"
ON "public"."squads" ("status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_squads_type_created_at"
ON "public"."squads" ("type", "created_at" DESC);

-- My page / activity
CREATE INDEX IF NOT EXISTS "idx_user_activity_events_user_type_created_at"
ON "public"."user_activity_events" ("user_id", "event_type", "created_at" DESC);

-- Workspace
CREATE INDEX IF NOT EXISTS "idx_kanban_columns_workspace_order"
ON "public"."kanban_columns" ("workspace_id", "order");

CREATE INDEX IF NOT EXISTS "idx_kanban_tasks_column_order"
ON "public"."kanban_tasks" ("column_id", "order");

CREATE INDEX IF NOT EXISTS "idx_kanban_tasks_assignee"
ON "public"."kanban_tasks" ("assignee_id");

CREATE INDEX IF NOT EXISTS "idx_workspace_docs_workspace_updated_at"
ON "public"."workspace_docs" ("workspace_id", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_workspace_docs_parent_id"
ON "public"."workspace_docs" ("parent_id");

-- Notifications
CREATE INDEX IF NOT EXISTS "idx_notifications_user_created_at"
ON "public"."notifications" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_is_read"
ON "public"."notifications" ("user_id", "is_read");
