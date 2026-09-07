import { DevEvent } from "@/lib/types/dev-event";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

let cachedEvents: DevEvent[] | null = null;
let cachedEventsAt = 0;
const DEV_EVENTS_CACHE_TTL_MS = 60_000;

const DEV_EVENT_COLUMNS =
  "id, title, link, host, date, start_date, end_date, tags, category, status, source, created_at, description, thumbnail, content, summary, target_audience, fee, schedule, benefits";

const RECOMMENDATION_ALIASES: Record<string, string[]> = {
  react: ["react", "frontend", "프론트엔드", "javascript", "typescript"],
  "next.js": ["next.js", "nextjs", "frontend", "프론트엔드", "react"],
  nextjs: ["next.js", "nextjs", "frontend", "프론트엔드", "react"],
  vue: ["vue", "frontend", "프론트엔드", "javascript"],
  javascript: ["javascript", "frontend", "프론트엔드", "web"],
  typescript: ["typescript", "frontend", "프론트엔드", "web"],
  java: ["java", "backend", "백엔드", "spring"],
  spring: ["spring", "backend", "백엔드", "java"],
  kotlin: ["kotlin", "backend", "백엔드", "android", "모바일"],
  python: ["python", "backend", "백엔드", "ai", "데이터"],
  fastapi: ["fastapi", "python", "backend", "백엔드"],
  node: ["node", "node.js", "backend", "백엔드", "javascript"],
  "node.js": ["node", "node.js", "backend", "백엔드", "javascript"],
  aws: ["aws", "cloud", "클라우드", "devops"],
  docker: ["docker", "cloud", "클라우드", "devops"],
  kubernetes: ["kubernetes", "cloud", "클라우드", "devops"],
  ai: ["ai", "인공지능", "머신러닝", "데이터"],
  ml: ["ml", "머신러닝", "ai", "데이터"],
  data: ["data", "데이터", "ai"],
  android: ["android", "모바일", "kotlin"],
  ios: ["ios", "모바일", "swift"],
};

function recommendationTerms(profileTags: string[]) {
  const terms = new Set<string>();

  profileTags.forEach((tag) => {
    const normalized = tag.trim().toLowerCase();
    if (!normalized) return;
    terms.add(normalized);
    RECOMMENDATION_ALIASES[normalized]?.forEach((alias) => terms.add(alias));
  });

  return [...terms];
}

function recommendationScore(event: DevEvent, terms: string[]) {
  if (terms.length === 0) return 0;

  const eventTags = event.tags.map((tag) => tag.toLowerCase());
  const searchable = [
    event.title,
    event.host,
    event.category,
    event.summary,
    event.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return terms.reduce((score, term) => {
    if (eventTags.some((tag) => tag === term || tag.includes(term))) {
      return score + 4;
    }
    return searchable.includes(term) ? score + 1 : score;
  }, 0);
}

export async function fetchCurrentProfileTechStack(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { tech_stack: true },
    });

    return profile?.tech_stack ?? [];
  } catch (error) {
    console.warn("프로필 기반 대외활동 추천 정보를 불러오지 못했습니다:", error);
    return [];
  }
}

// 개발자 행사 데이터는 Supabase dev_events를 단일 원본으로 사용한다.
async function loadDevEvents(): Promise<DevEvent[]> {
  if (cachedEvents && Date.now() - cachedEventsAt < DEV_EVENTS_CACHE_TTL_MS) {
    return cachedEvents;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dev_events")
    .select(DEV_EVENT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;

  cachedEvents = (data as DevEvent[]) ?? [];
  cachedEventsAt = Date.now();
  return cachedEvents;
}

// 개발자 행사 목록 조회 (Supabase 기반)
export async function fetchDevEvents({
  search,
  category,
  tags,
  recommendationTags,
  page = 1,
  limit = 12,
}: {
  search?: string;
  category?: string;
  tags?: string[];
  recommendationTags?: string[];
  page?: number;
  limit?: number;
} = {}) {
  try {
    const allEvents = await loadDevEvents();

    let filteredEvents = allEvents;

    // Filter by search
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filteredEvents = filteredEvents.filter(
        (e) =>
          e.title.toLowerCase().includes(searchTerm) ||
          e.host?.toLowerCase().includes(searchTerm),
      );
    }

    // Filter by category
    if (category && category !== "all") {
      filteredEvents = filteredEvents.filter((e) => e.category === category);
    }

    // Filter by tags (Case-insensitive)
    if (tags && tags.length > 0) {
      const lowerTags = tags.map((t) => t.toLowerCase());
      filteredEvents = filteredEvents.filter((e) =>
        e.tags.some((tag) => lowerTags.includes(tag.toLowerCase())),
      );
    }

    if (recommendationTags && recommendationTags.length > 0) {
      const terms = recommendationTerms(recommendationTags);
      filteredEvents = filteredEvents
        .map((event, index) => ({
          event,
          index,
          score: recommendationScore(event, terms),
        }))
        .sort((a, b) => b.score - a.score || a.index - b.index)
        .map(({ event }) => event);
    }

    // Pagination
    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, limit);
    const totalCount = filteredEvents.length;
    const totalPages = Math.ceil(totalCount / limitNum);

    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

    return {
      events: paginatedEvents,
      totalCount,
      totalPages,
    };
  } catch (e) {
    console.error("Failed to load dev events:", e);
    return { events: [], totalCount: 0, totalPages: 0 };
  }
}

// 모든 태그 목록 조회 (Count 포함, 카테고리 필터링 지원)
export async function getAllEventTags(category?: string) {
  // Fetch events focusing on the category to get relevant tags
  const { events } = await fetchDevEvents({ category });
  const tagCounts: Record<string, number> = {};

  events.forEach((event) => {
    event.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  // Sort by count desc
  return Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count }));
}

// 개발자 행사 상세 조회
export async function fetchDevEventById(id: string) {
  // 단건 조회는 페이지네이션(12개)에 의존하면 안 됨 — 전체 목록에서 찾는다.
  const all = await loadDevEvents();
  return all.find((e) => e.id === id) || null;
}
// 마감 임박 행사 조회 (7일 이내)
export async function fetchClosingSoonEvents(days = 7) {
  // 마감 임박 판정은 전체 이벤트 대상 — 페이지네이션(12개)에 의존하지 않는다.
  const events = await loadDevEvents();
  const now = new Date();
  const targetDate = new Date();
  targetDate.setDate(now.getDate() + days);

  const parseEventDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    // 만약 "~"가 있다면 기간이므로 종료일(뒤쪽)을 사용
    const parts = dateStr.split("~");
    const endDateStr = parts.length > 1 ? parts[1] : parts[0];

    // "MM. DD(요일)" 형식 처리
    // 예: "01. 16(금)", "12. 01", "2024. 12. 01"
    const cleaned = endDateStr.trim().replace(/\(.\)/g, "").trim();

    // YYYY.MM.DD 형식인지 확인
    const ymdMatch = cleaned.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})$/);
    if (ymdMatch) {
      return new Date(
        parseInt(ymdMatch[1]),
        parseInt(ymdMatch[2]) - 1,
        parseInt(ymdMatch[3]),
      );
    }

    // MM.DD 형식인지 확인 (연도 없음 -> 현재 연도 또는 내년 추론)
    const mdMatch = cleaned.match(/^(\d{1,2})\.\s*(\d{1,2})$/);
    if (mdMatch) {
      const month = parseInt(mdMatch[1]);
      const day = parseInt(mdMatch[2]);
      const currentYear = new Date().getFullYear();

      // 일단 현재 연도로 생성
      const date = new Date(currentYear, month - 1, day);

      // 만약 생성된 날짜가 현재보다 6개월 이상 과거라면, 내년 행사일 가능성이 높음 (또는 이미 지난 행사)
      // 하지만 "마감 임박" 로직에서는 미래 날짜가 중요하므로,
      // 현재 월이 12월이고 파싱된 월이 1월이면 내년으로 취급하는 등의 로직이 필요할 수 있음.
      // 여기서는 단순하게 처리: 현재 시점보다 이전이면 내년으로 간주?
      // 아니면 그냥 현재 연도로 가정. (데이터가 주로 최신일 것이므로)
      // 문제: 12.01 ~ 01.16 의 경우 01.16은 내년일 수 있음.

      // 간단한 휴리스틱:
      // 현재 월(month)보다 파싱된 월(parsedMonth)이 작고, 그 차이가 크다면(예: 현재 11, 12월인데 1, 2월) 내년.
      // 반대로 현재 1, 2월인데 파싱된 월이 11, 12월이면 작년일 수 있지만 행사 데이터 특성상 미래일 가능성이 높음.

      // 여기서는 "종료일" 기준이므로, 현재 시각보다 과거라면 내년으로 할당해볼 수도 있으나,
      // 이미 지난 행사를 내년으로 잡으면 안됨.
      // 따라서 가장 안전한 방법: 현재 연도로 파싱.

      // 예외: 현재 12월인데 1월 데이터를 본다면 내년 1월일 것임.
      const nowMonth = new Date().getMonth() + 1;
      if (nowMonth >= 11 && month <= 2) {
        date.setFullYear(currentYear + 1);
      }

      return date;
    }

    return null;
  };

  const closingEvents = events
    .map((e) => {
      // end_date가 있으면 최우선, 아니면 date 필드 파싱
      let endDate: Date | null = null;
      if (e.end_date) {
        endDate = new Date(e.end_date);
      } else if (e.date) {
        endDate = parseEventDate(e.date);
      }
      return { ...e, parsedEndDate: endDate };
    })
    .filter((e) => {
      if (!e.parsedEndDate || isNaN(e.parsedEndDate.getTime())) return false;
      // 마감되었거나 종료일이 지난 경우 제외 (오늘 포함)
      // e.status check is nice but date is authoritative

      // 종료일이 오늘보다 미래이거나 같아야 함 (아직 안 끝남)
      // 그리고 종료일이 targetDate(7일 뒤)보다 이전이거나 같아야 함 (곧 끝남)
      // 즉: now <= passedEndDate <= now + 7days

      // 날짜 비교를 위해 시간 제거
      const end = new Date(e.parsedEndDate);
      end.setHours(23, 59, 59, 999); // 해당 일의 마지막 시간

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const targetEnd = new Date(targetDate);
      targetEnd.setHours(23, 59, 59, 999);

      return end >= todayStart && end <= targetEnd && e.status !== "closed";
    })
    .sort((a, b) => {
      // 마감 임박 순 (종료일 오름차순)
      return (
        (a.parsedEndDate?.getTime() || 0) - (b.parsedEndDate?.getTime() || 0)
      );
    })
    .slice(0, 9); // Top 9 for pagination support

  return closingEvents;
}
