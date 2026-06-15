import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import {
  REPUTATION_EVENT_TYPES,
  tryApplyReputationEvent,
} from "@/lib/server/reputation";

type Difficulty = "bronze" | "silver" | "gold";

const DIFFICULTY_DELTAS: Record<Difficulty, number> = {
  bronze: 3,
  silver: 5,
  gold: 8,
};

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { problemId, difficulty } = body as {
      problemId?: string;
      difficulty?: Difficulty;
    };
    const userId = session.user.id;

    if (!problemId) {
      return NextResponse.json(
        { error: "Missing required field: problemId" },
        { status: 400 },
      );
    }

    const delta =
      (difficulty && DIFFICULTY_DELTAS[difficulty]) ?? DIFFICULTY_DELTAS.bronze;

    const result = await tryApplyReputationEvent({
      userId,
      eventType: REPUTATION_EVENT_TYPES.ctpProblemSolved,
      delta,
      sourceType: "ctp_problem",
      sourceId: problemId,
      dedupeKey: `ctp:${userId}:${problemId}`,
    });

    return NextResponse.json({
      ok: true,
      applied: result.applied,
      duplicated: "duplicated" in result ? result.duplicated : false,
      score: result.score,
      tier: result.tier,
    });
  } catch (e: unknown) {
    // 채점 흐름을 깨지 않도록 graceful 처리 (500 대신 ok:false).
    console.warn("[ctp/solved] POST failed:", e);
    return NextResponse.json({ ok: false, applied: false, duplicated: false });
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ solved: [] });
    }

    const rows = await prisma.reputation_events.findMany({
      where: {
        user_id: session.user.id,
        event_type: REPUTATION_EVENT_TYPES.ctpProblemSolved,
      },
      select: { source_id: true },
    });

    const solved = rows
      .map((row) => row.source_id)
      .filter((id): id is string => Boolean(id));

    return NextResponse.json({ solved });
  } catch (e: unknown) {
    console.warn("[ctp/solved] GET failed:", e);
    return NextResponse.json({ solved: [] });
  }
}
