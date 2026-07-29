const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeDateOnly(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const candidate = DATE_ONLY_PATTERN.test(trimmed)
    ? trimmed
    : trimmed.slice(0, 10);

  if (!DATE_ONLY_PATTERN.test(candidate)) return null;
  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === candidate ? candidate : null;
}

export function parseDateOnly(value: unknown): Date | null {
  const normalized = normalizeDateOnly(value);
  return normalized ? new Date(`${normalized}T00:00:00.000Z`) : null;
}

export function assertValidDateRange(startDate: unknown, endDate: unknown) {
  const start = normalizeDateOnly(startDate);
  const end = normalizeDateOnly(endDate);

  if (start && end && start > end) {
    throw new Error("시작일은 종료일보다 늦을 수 없습니다.");
  }

  return { startDate: start, endDate: end };
}

export function getTodayDateKey(timeZone = "Asia/Seoul") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function formatTaskDateRange(
  startDate?: string | null,
  endDate?: string | null,
) {
  const start = normalizeDateOnly(startDate);
  const end = normalizeDateOnly(endDate);

  if (!start && !end) return null;
  if (!start) return `~ ${formatDateOnlyLabel(end!)}`;
  if (!end) return `${formatDateOnlyLabel(start)} ~`;
  if (start === end) return formatDateOnlyLabel(start);
  return `${formatDateOnlyLabel(start)}–${formatDateOnlyLabel(end)}`;
}

function formatDateOnlyLabel(value: string) {
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}
