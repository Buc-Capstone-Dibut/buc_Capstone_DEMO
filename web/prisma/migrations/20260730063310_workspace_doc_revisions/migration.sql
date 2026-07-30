CREATE TABLE "public"."workspace_doc_revisions" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "doc_id" uuid NOT NULL,
  "source" text NOT NULL DEFAULT 'snapshot',
  "yjs_state" text,
  "content" json,
  "byte_size" integer NOT NULL DEFAULT 0,
  "created_by" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workspace_doc_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workspace_doc_revisions_doc_id_fkey"
    FOREIGN KEY ("doc_id")
    REFERENCES "public"."workspace_docs"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "workspace_doc_revisions_doc_id_created_at_idx"
  ON "public"."workspace_doc_revisions"("doc_id", "created_at" DESC);

ALTER TABLE "public"."workspace_doc_revisions" ENABLE ROW LEVEL SECURITY;
