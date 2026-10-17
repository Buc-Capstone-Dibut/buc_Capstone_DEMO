import assert from "node:assert/strict";
import test from "node:test";
import { formatDevEventDDay, parseDevEventEndDate } from "./dev-event-dates";

const today = new Date(2026, 9, 17, 23, 30);

test("formats database deadlines as calendar days even late at night", () => {
  assert.equal(formatDevEventDDay("2026-10-17", today), "D-Day");
  assert.equal(formatDevEventDDay("2026-10-18", today), "D-1");
  assert.equal(formatDevEventDDay("2026-10-16", today), "마감");
});

test("keeps ISO timestamp deadlines on the stated event date", () => {
  assert.equal(formatDevEventDDay("2026-10-18T00:00:00.000Z", today), "D-1");
});

test("accepts legacy date ranges with weekday and time labels", () => {
  assert.equal(formatDevEventDDay("2026. 10. 18", today), "D-1");
  assert.equal(
    formatDevEventDDay("10. 14(수) ~ 10. 18(일) 23:59", today),
    "D-1",
  );
});

test("infers the next year only for yearless winter deadlines", () => {
  const december = new Date(2026, 11, 31, 12);
  assert.equal(formatDevEventDDay("01. 01(금)", december), "D-1");
  assert.equal(formatDevEventDDay("2026-01-01", december), "마감");
});

test("rejects impossible or unknown deadlines", () => {
  assert.equal(parseDevEventEndDate("2026-02-30", today), null);
  assert.equal(parseDevEventEndDate("2026-13-01", today), null);
  assert.equal(formatDevEventDDay("추후 공지", today), "D-?");
  assert.equal(formatDevEventDDay(null, today), "");
});
