import assert from "node:assert/strict";
import test from "node:test";

import { sortDevEvents } from "@/lib/server/dev-events";
import type { DevEvent } from "@/lib/types/dev-event";

const event = (overrides: Partial<DevEvent>): DevEvent => ({
  id: overrides.id || "event",
  title: overrides.title || "행사",
  link: "https://example.com",
  host: "주최사",
  date: overrides.date || "",
  start_date: overrides.start_date || null,
  end_date: overrides.end_date || null,
  tags: [],
  category: null,
  status: "recruiting",
  source: "test",
  created_at: overrides.created_at,
});

test("sorts latest by event date even when ingestion timestamps are identical or reversed", () => {
  const events = [
    event({ id: "old", title: "카카오 행사", start_date: "2026-01-01", created_at: "2026-10-18T00:00:00Z" }),
    event({ id: "new", title: "네이버 행사", start_date: "2026-02-01", created_at: "2026-01-01T00:00:00Z" }),
  ];

  assert.deepEqual(sortDevEvents(events, "latest").map((item) => item.id), ["new", "old"]);
  assert.deepEqual(sortDevEvents(events, "name").map((item) => item.id), ["new", "old"]);
});

test("breaks same-date ties deterministically and puts unknown dates last in latest", () => {
  const events = [
    event({ id: "unknown", created_at: "2027-01-01T00:00:00Z" }),
    event({ id: "b", start_date: "2026-10-01", end_date: "2026-10-31" }),
    event({ id: "a", start_date: "2026-10-01", end_date: "2026-10-31" }),
    event({ id: "shorter", start_date: "2026-10-01", end_date: "2026-10-20" }),
  ];
  const expected = ["a", "b", "shorter", "unknown"];
  assert.deepEqual(sortDevEvents(events, "latest").map((item) => item.id), expected);
  assert.deepEqual(sortDevEvents([...events].reverse(), "latest").map((item) => item.id), expected);
  assert.equal(events[0].id, "unknown");
});

test("sorts events by the nearest deadline", () => {
  const events = [
    event({ id: "later", end_date: "2026-04-20T00:00:00Z" }),
    event({ id: "soon", end_date: "2026-04-10T00:00:00Z" }),
  ];

  assert.deepEqual(sortDevEvents(events, "deadline").map((item) => item.id), ["soon", "later"]);
});
