import { differenceInCalendarDays } from "date-fns";

export function parseDevEventEndDate(
  value: string | null | undefined,
  now = new Date(),
): Date | null {
  if (!value) return null;

  const end = value.split("~").pop()!.replace(/\([^)]*\)/g, "").trim();
  const match = end.match(
    /^(?:(\d{4})[./-]\s*)?(\d{1,2})[./-]\s*(\d{1,2})(?=$|[T\s.])/,
  );
  if (!match) return null;

  let year = match[1] ? Number(match[1]) : now.getFullYear();
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!match[1] && now.getMonth() >= 10 && month <= 2) {
    year += 1;
  }

  // Date-only deadlines represent a calendar day, not midnight in UTC.
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function formatDevEventDDay(
  value: string | null | undefined,
  now = new Date(),
): string {
  if (!value) return "";
  const end = parseDevEventEndDate(value, now);
  if (!end) return "D-?";

  const days = differenceInCalendarDays(end, now);
  if (days === 0) return "D-Day";
  if (days < 0) return "마감";
  return `D-${days}`;
}
