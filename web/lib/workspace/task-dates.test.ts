import assert from "node:assert/strict";
import test from "node:test";
import {
  assertValidDateRange,
  formatTaskDateRange,
  normalizeDateOnly,
  parseDateOnly,
} from "./task-dates";

test("date-only values stay on the same calendar day", () => {
  assert.equal(normalizeDateOnly("2026-07-29"), "2026-07-29");
  assert.equal(
    normalizeDateOnly(parseDateOnly("2026-07-29")),
    "2026-07-29",
  );
});

test("invalid calendar dates are rejected", () => {
  assert.equal(normalizeDateOnly("2026-02-30"), null);
  assert.equal(normalizeDateOnly("not-a-date"), null);
});

test("start date cannot be later than end date", () => {
  assert.throws(
    () => assertValidDateRange("2026-07-30", "2026-07-29"),
    /시작일/,
  );
  assert.deepEqual(assertValidDateRange("2026-07-29", "2026-07-30"), {
    startDate: "2026-07-29",
    endDate: "2026-07-30",
  });
});

test("date ranges have compact labels", () => {
  assert.equal(formatTaskDateRange("2026-07-29", "2026-07-31"), "7/29–7/31");
  assert.equal(formatTaskDateRange(null, "2026-07-31"), "~ 7/31");
});
