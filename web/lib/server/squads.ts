import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getTeamTypeQueryValues } from "@/lib/team-types";

type EventRecord = {
  id: string;
  title: string;
};

type SquadWithActivity = {
  activity_id: string | null;
  leader: unknown;
  [key: string]: unknown;
};

export async function fetchRecentSquads(limit = 9) {
  const supabase = await createClient();

  const { data: squads, error } = await supabase
    .from("squads")
    .select(
      `
      id,
      title,
      type,
      status,
      created_at,
      recruited_count,
      capacity
    `,
    )
    .eq("status", "recruiting")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch recent squads:", error);
    return [];
  }

  return squads;
}

export async function fetchSquads({ page = 1, limit = 9, type = "all", activityId }: { page?: number; limit?: number; type?: string; activityId?: string } = {}) {
  const supabase = await createClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Build single query with projection + pagination.
  // planned count is significantly cheaper than exact on large tables.
  let query = supabase.from("squads").select(
    `
      *,
      leader:leader_id (
        id, nickname, avatar_url, tier
      )
    `,
    { count: "planned" },
  );
  if (type !== "all") {
    query = query.in("type", getTeamTypeQueryValues(type));
  }
  if (activityId) {
    query = query.eq("activity_id", activityId);
  }

  const { data: squads, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to fetch squads:", error);
    return { squads: [], totalCount: 0, totalPages: 0 };
  }

  // 3. Map Activity — cache()로 같은 요청 내 중복 파일 파싱 방지
  const getEventMap = cache(async () => {
    const { fetchDevEvents } = await import("./dev-events");
    const { events } = await fetchDevEvents();
    return new Map(events.map((event: EventRecord) => [event.id, event.title]));
  });
  const eventMap = await getEventMap();
  const safeSquads = (squads ?? []) as SquadWithActivity[];

  const enhancedSquads =
    safeSquads.map((squad) => ({
      ...squad,
      leader: squad.leader,
      activity: squad.activity_id
        ? {
          id: squad.activity_id,
          title: eventMap.get(squad.activity_id) || "알 수 없는 활동",
        }
        : null,
    }));

  return {
    squads: enhancedSquads,
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function fetchSquadsByActivityId(activityId: string, limit?: number) {
  const supabase = await createClient();

  let query = supabase
    .from("squads")
    .select(
      `
      *,
      leader:leader_id (
        id, nickname, avatar_url, tier
      )
    `,
    )
    .eq("activity_id", activityId)
    .eq("status", "recruiting") // Only show recruiting ones by default
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: squads, error } = await query;

  if (error) {
    console.error("Failed to fetch squads by activity:", error);
    return [];
  }

  // Enhance with activity info (using cache helper as in fetchSquads)
  const getEventMap = cache(async () => {
    const { fetchDevEvents } = await import("./dev-events");
    const { events } = await fetchDevEvents();
    return new Map(events.map((event: EventRecord) => [event.id, event.title]));
  });
  const eventMap = await getEventMap();
  const safeSquads = (squads ?? []) as SquadWithActivity[];

  return safeSquads.map((squad) => ({
    ...squad,
    leader: squad.leader,
    activity: squad.activity_id
      ? {
        id: squad.activity_id,
        title: eventMap.get(squad.activity_id) || "알 수 없는 활동",
      }
      : null,
  }));
}
