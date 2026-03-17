import { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  fetchDevEventTitleMap,
  MISSING_DEV_EVENT_TITLE,
} from "@/lib/server/dev-events";

type SquadWithLeader = Database["public"]["Tables"]["squads"]["Row"] & {
  leader: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "id" | "nickname" | "avatar_url" | "tier"
  > | null;
};

async function buildActivityTitleMap(activityIds: Array<string | null>) {
  const eventMap = await fetchDevEventTitleMap(
    activityIds.filter((activityId): activityId is string => Boolean(activityId)),
  );

  return eventMap;
}

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

  const eventMap = await buildActivityTitleMap(
    ((squads ?? []) as SquadWithLeader[]).map((squad) => squad.activity_id),
  );

  const enhancedSquads =
    ((squads ?? []) as SquadWithLeader[]).map((s) => ({
      ...s,
      leader: s.leader,
      activity: s.activity_id
        ? {
            id: s.activity_id,
            title: eventMap.get(s.activity_id) || MISSING_DEV_EVENT_TITLE,
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

  const eventMap = await buildActivityTitleMap(
    ((squads ?? []) as SquadWithLeader[]).map((squad) => squad.activity_id),
  );

  return (
    ((squads ?? []) as SquadWithLeader[]).map((s) => ({
      ...s,
      leader: s.leader,
      activity: s.activity_id
        ? {
            id: s.activity_id,
            title: eventMap.get(s.activity_id) || MISSING_DEV_EVENT_TITLE,
          }
        : null,
    })) || []
  );
}
