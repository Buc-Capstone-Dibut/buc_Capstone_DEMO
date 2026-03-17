import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DevEvent, DevEventRow } from "@/lib/types/dev-event";

export const MISSING_DEV_EVENT_TITLE = "삭제되었거나 종료된 활동";

const DEV_EVENTS_SELECT = `
  id,
  source_key,
  source,
  source_title,
  title,
  link,
  host,
  date,
  start_date,
  end_date,
  tags,
  category,
  status,
  summary,
  description,
  content,
  thumbnail,
  target_audience,
  fee,
  schedule,
  benefits,
  last_seen_at,
  created_at,
  updated_at
`;

function normalizeStringArray(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function normalizeDevEvent(row: DevEventRow): DevEvent {
  return {
    ...row,
    tags: normalizeStringArray(row.tags),
    target_audience: normalizeStringArray(row.target_audience),
    schedule: normalizeStringArray(row.schedule),
    benefits: normalizeStringArray(row.benefits),
  };
}

function parseEventDateString(
  dateStr: string | null,
  referenceDate = new Date(),
): Date | null {
  if (!dateStr) return null;

  const parts = dateStr.split("~");
  const endDateStr = parts.length > 1 ? parts[1] : parts[0];
  const cleaned = endDateStr.trim().replace(/\(.\)/g, "").trim();

  const ymdMatch = cleaned.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})$/);
  if (ymdMatch) {
    return new Date(
      Number.parseInt(ymdMatch[1], 10),
      Number.parseInt(ymdMatch[2], 10) - 1,
      Number.parseInt(ymdMatch[3], 10),
    );
  }

  const mdMatch = cleaned.match(/^(\d{1,2})\.\s*(\d{1,2})$/);
  if (!mdMatch) {
    return null;
  }

  const month = Number.parseInt(mdMatch[1], 10);
  const day = Number.parseInt(mdMatch[2], 10);
  const currentYear = referenceDate.getFullYear();
  const inferredDate = new Date(currentYear, month - 1, day);
  const nowMonth = referenceDate.getMonth() + 1;

  if (nowMonth >= 11 && month <= 2) {
    inferredDate.setFullYear(currentYear + 1);
  }

  return inferredDate;
}

function getEventDeadline(event: DevEvent, referenceDate = new Date()): Date | null {
  if (event.end_date) {
    const endDate = new Date(event.end_date);
    return Number.isNaN(endDate.getTime()) ? null : endDate;
  }

  return parseEventDateString(event.date, referenceDate);
}

function getTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortDevEvents(events: DevEvent[], sort: string | undefined): DevEvent[] {
  if (sort === "deadline") {
    return [...events].sort((left, right) => {
      const leftDeadline = getEventDeadline(left)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDeadline = getEventDeadline(right)?.getTime() ?? Number.MAX_SAFE_INTEGER;

      if (leftDeadline !== rightDeadline) {
        return leftDeadline - rightDeadline;
      }

      return getTimestamp(right.last_seen_at) - getTimestamp(left.last_seen_at);
    });
  }

  return [...events].sort((left, right) => {
    const lastSeenDiff =
      getTimestamp(right.last_seen_at) - getTimestamp(left.last_seen_at);
    if (lastSeenDiff !== 0) {
      return lastSeenDiff;
    }

    return getTimestamp(right.created_at) - getTimestamp(left.created_at);
  });
}

const fetchAllDevEvents = cache(async (): Promise<DevEvent[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dev_events")
      .select(DEV_EVENTS_SELECT)
      .order("last_seen_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch dev events:", error);
      return [];
    }

    return (data ?? []).map((row) => normalizeDevEvent(row as DevEventRow));
  } catch (error) {
    console.error("Failed to load dev events:", error);
    return [];
  }
});

export async function fetchDevEvents({
  search,
  category,
  tags,
  sort = "latest",
  page = 1,
  limit = 12,
}: {
  search?: string;
  category?: string;
  tags?: string[];
  sort?: string;
  page?: number;
  limit?: number;
} = {}) {
  const allEvents = await fetchAllDevEvents();

  let filteredEvents = allEvents;

  if (search?.trim()) {
    const searchTerm = search.trim().toLowerCase();
    filteredEvents = filteredEvents.filter(
      (event) =>
        event.title.toLowerCase().includes(searchTerm) ||
        event.host?.toLowerCase().includes(searchTerm) ||
        event.summary?.toLowerCase().includes(searchTerm) ||
        event.source_title.toLowerCase().includes(searchTerm),
    );
  }

  if (category && category !== "all") {
    filteredEvents = filteredEvents.filter((event) => event.category === category);
  }

  if (tags?.length) {
    const lowerTags = tags.map((tag) => tag.toLowerCase());
    filteredEvents = filteredEvents.filter((event) =>
      event.tags.some((tag) => lowerTags.includes(tag.toLowerCase())),
    );
  }

  filteredEvents = sortDevEvents(filteredEvents, sort);

  const pageNum = Math.max(1, page);
  const limitNum = Math.max(1, limit);
  const totalCount = filteredEvents.length;
  const totalPages = Math.ceil(totalCount / limitNum);
  const startIndex = (pageNum - 1) * limitNum;
  const events = filteredEvents.slice(startIndex, startIndex + limitNum);

  return {
    events,
    totalCount,
    totalPages,
  };
}

export async function getAllEventTags(category?: string) {
  const allEvents = await fetchAllDevEvents();
  const filteredEvents =
    category && category !== "all"
      ? allEvents.filter((event) => event.category === category)
      : allEvents;
  const tagCounts: Record<string, number> = {};

  filteredEvents.forEach((event) => {
    event.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count }));
}

export async function fetchDevEventById(id: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dev_events")
      .select(DEV_EVENTS_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`Failed to fetch dev event ${id}:`, error);
      return null;
    }

    return data ? normalizeDevEvent(data as DevEventRow) : null;
  } catch (error) {
    console.error(`Failed to load dev event ${id}:`, error);
    return null;
  }
}

export async function fetchDevEventTitleMap(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("dev_events")
      .select("id, title")
      .in("id", uniqueIds);

    if (error) {
      console.error("Failed to fetch dev event title map:", error);
      return new Map<string, string>();
    }

    return new Map((data ?? []).map((event) => [event.id, event.title]));
  } catch (error) {
    console.error("Failed to load dev event title map:", error);
    return new Map<string, string>();
  }
}

export async function fetchClosingSoonEvents(days = 7) {
  const events = await fetchAllDevEvents();
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + days);

  return events
    .map((event) => ({
      event,
      deadline: getEventDeadline(event, now),
    }))
    .filter(({ event, deadline }) => {
      if (!deadline || Number.isNaN(deadline.getTime()) || event.status === "closed") {
        return false;
      }

      const endOfDeadline = new Date(deadline);
      endOfDeadline.setHours(23, 59, 59, 999);

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const targetEnd = new Date(targetDate);
      targetEnd.setHours(23, 59, 59, 999);

      return endOfDeadline >= todayStart && endOfDeadline <= targetEnd;
    })
    .sort((left, right) => {
      const leftDeadline = left.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDeadline = right.deadline?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftDeadline - rightDeadline;
    })
    .slice(0, 9)
    .map(({ event }) => event);
}
