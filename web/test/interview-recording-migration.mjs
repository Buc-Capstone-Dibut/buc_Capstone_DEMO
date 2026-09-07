import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { PGlite } = require("@electric-sql/pglite");
const db = new PGlite();
const ddl = execFileSync(
  ".venv/bin/python",
  [
    "-c",
    "from app.db.database import INTERVIEW_RECORDINGS_DDL; print(INTERVIEW_RECORDINGS_DDL)",
  ],
  { cwd: "../ai-interview", encoding: "utf8" },
);
const migration = await readFile(
  "supabase/migrations/20260907054035_interview_recording_transcript.sql",
  "utf8",
);
try {
  await db.exec(
    "CREATE TABLE public.interview_sessions (id TEXT PRIMARY KEY); INSERT INTO public.interview_sessions VALUES ('qa-session');",
  );
  // Apply the pre-feature table first, then the same additive migration twice.
  await db.exec(ddl.replace("    transcript JSONB,\n", ""));
  await db.exec(
    "INSERT INTO public.interview_recordings(id, session_id, bucket, storage_path) VALUES ('old', 'qa-session', 'interview-recordings', 'qa-session/old.webm');",
  );
  await db.exec(migration);
  await db.exec(migration);
  assert.equal(
    (await db.query("SELECT transcript FROM public.interview_recordings"))
      .rows[0].transcript,
    null,
  );
  const transcript = {
    version: 1,
    entries: [
      {
        id: "a",
        turnId: "t",
        role: "user",
        text: "답변",
        startMs: 200,
        endMs: 1500,
      },
    ],
  };
  await db.query(
    "UPDATE public.interview_recordings SET transcript = $1 WHERE id = 'old'",
    [JSON.stringify(transcript)],
  );
  assert.deepEqual(
    (await db.query("SELECT transcript FROM public.interview_recordings"))
      .rows[0].transcript,
    transcript,
  );
  await db.exec(
    "DELETE FROM public.interview_sessions WHERE id = 'qa-session'",
  );
  assert.equal(
    (await db.query("SELECT count(*) FROM public.interview_recordings")).rows[0]
      .count,
    0,
  );
  console.log(
    "PASS: existing rows, nullable transcript, idempotent migration, JSON round trip, session cascade",
  );
} finally {
  await db.close();
}
