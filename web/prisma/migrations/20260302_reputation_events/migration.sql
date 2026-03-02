CREATE TABLE IF NOT EXISTS "public"."reputation_events" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "source_type" TEXT,
  "source_id" TEXT,
  "actor_id" UUID,
  "dedupe_key" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "reputation_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reputation_events_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "public"."profiles"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "reputation_events_dedupe_key_key"
  ON "public"."reputation_events" ("dedupe_key");

CREATE INDEX IF NOT EXISTS "idx_reputation_events_user_created_at"
  ON "public"."reputation_events" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_reputation_events_event_type_created_at"
  ON "public"."reputation_events" ("event_type", "created_at" DESC);
