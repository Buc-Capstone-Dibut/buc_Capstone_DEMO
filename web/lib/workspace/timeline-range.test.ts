import assert from "node:assert/strict";
import test from "node:test";
import { format, parseISO } from "date-fns";

import { adjustTimelineDateRange } from "./timeline-range";

const initialRange = {
  start: parseISO("2026-07-06"),
  end: parseISO("2026-07-17"),
};

function dateKeys(range: { start: Date; end: Date }) {
  return {
    start: format(range.start, "yyyy-MM-dd"),
    end: format(range.end, "yyyy-MM-dd"),
  };
}

test("moving a timeline bar keeps its duration", () => {
  assert.deepEqual(
    dateKeys(adjustTimelineDateRange(initialRange, "move", 3)),
    {
      start: "2026-07-09",
      end: "2026-07-20",
    },
  );
});

test("resizing the start cannot pass the end", () => {
  assert.deepEqual(
    dateKeys(adjustTimelineDateRange(initialRange, "resize-start", 30)),
    {
      start: "2026-07-17",
      end: "2026-07-17",
    },
  );
});

test("resizing the end cannot pass the start", () => {
  assert.deepEqual(
    dateKeys(adjustTimelineDateRange(initialRange, "resize-end", -30)),
    {
      start: "2026-07-06",
      end: "2026-07-06",
    },
  );
});
