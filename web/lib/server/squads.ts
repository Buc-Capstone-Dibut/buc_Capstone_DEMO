import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

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
    query = query.eq("type", type);
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
    return new Map(events.map((e: { id: string; title: string }) => [e.id, e.title]));
  });
  const eventMap = await getEventMap();

  const enhancedSquads =
    (squads as any[])?.map((s) => ({
      ...s,
      // @ts-ignore
      leader: s.leader,
      activity: s.activity_id
        ? {
          id: s.activity_id,
          title: eventMap.get(s.activity_id) || "알 수 없는 활동",
        }
        : null,
    })) || [];

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
    return new Map(events.map((e: { id: string; title: string }) => [e.id, e.title]));
  });
  const eventMap = await getEventMap();

  return (
    (squads as any[])?.map((s) => ({
      ...s,
      leader: s.leader,
      activity: s.activity_id
        ? {
          id: s.activity_id,
          title: eventMap.get(s.activity_id) || "알 수 없는 활동",
        }
        : null,
    })) || []
  );
}
