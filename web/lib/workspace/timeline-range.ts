import { addDays, max, min } from "date-fns";

export type TimelineInteractionMode =
  | "move"
  | "resize-start"
  | "resize-end";

export type TimelineDateRange = {
  start: Date;
  end: Date;
};

export function adjustTimelineDateRange(
  initialRange: TimelineDateRange,
  mode: TimelineInteractionMode,
  deltaDays: number,
): TimelineDateRange {
  if (mode === "move") {
    return {
      start: addDays(initialRange.start, deltaDays),
      end: addDays(initialRange.end, deltaDays),
    };
  }

  if (mode === "resize-start") {
    return {
      start: min([addDays(initialRange.start, deltaDays), initialRange.end]),
      end: initialRange.end,
    };
  }

  return {
    start: initialRange.start,
    end: max([addDays(initialRange.end, deltaDays), initialRange.start]),
  };
}
