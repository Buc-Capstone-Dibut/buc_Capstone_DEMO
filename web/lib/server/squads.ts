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

export async function fetchSquads({ page = 1, limit = 9, type = "all" } = {}) {
  const supabase = await createClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 1. Build Query
  let query = supabase.from("squads").select("*", { count: "exact" });
  if (type !== "all") {
    query = query.eq("type", type);
  }

  // 1. Get Count & Data
  const { data: squads, count, error } = await query
    .select(`
      *,
      leader:leader_id (
        id, nickname, avatar_url, tier
      )
    `)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to fetch squads:", error);
    return { squads: [], totalCount: 0, totalPages: 0 };
  }

  // 3. Map Activity
  const { fetchDevEvents } = await import("./dev-events");
  const { events } = await fetchDevEvents();
  const eventMap = new Map(events.map((e) => [e.id, e.title]));

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
