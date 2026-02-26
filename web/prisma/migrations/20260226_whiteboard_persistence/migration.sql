-- CreateTable: workspace_whiteboards
-- 워크스페이스당 화이트보드 1개 (1:1 관계)
-- yjs_state: Y.encodeStateAsUpdate(doc) 결과를 base64로 인코딩한 문자열

CREATE TABLE IF NOT EXISTS "public"."workspace_whiteboards" (
  "id"           UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "workspace_id" UUID        NOT NULL,
  "yjs_state"    TEXT,
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "workspace_whiteboards_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "workspace_whiteboards_workspace_id_key" UNIQUE ("workspace_id"),
  CONSTRAINT "workspace_whiteboards_workspace_id_fkey"
    FOREIGN KEY ("workspace_id")
    REFERENCES "public"."workspaces"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
