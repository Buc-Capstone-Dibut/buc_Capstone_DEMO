import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";

const INCLUDED_EVENT_TYPES = [
  MY_ACTIVITY_EVENT_TYPES.interviewCompleted,
  MY_ACTIVITY_EVENT_TYPES.portfolioDefenseCompleted,
  MY_ACTIVITY_EVENT_TYPES.communityPostCreated,
  MY_ACTIVITY_EVENT_TYPES.communityCommentCreated,
  MY_ACTIVITY_EVENT_TYPES.workspaceCreated,
  MY_ACTIVITY_EVENT_TYPES.workspaceTaskCompleted,
];

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function levelByCount(count: number): number {
  if (count <= 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = (searchParams.get("handle") || "").trim().toLowerCase();

    if (!handle) {
      return NextResponse.json(
        { success: false, error: "handle is required" },
        { status: 400 },
      );
    }

    const profile = await prisma.profiles.findUnique({
      where: { handle },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 },
      );
    }

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - 364);

    const rows = await prisma.user_activity_events.findMany({
      where: {
        user_id: profile.id,
        event_type: { in: INCLUDED_EVENT_TYPES },
        created_at: { gte: start },
      },
      select: {
        created_at: true,
      },
    });

    const counter = new Map<string, number>();
    for (const row of rows) {
      const key = toDateKey(row.created_at);
      counter.set(key, (counter.get(key) || 0) + 1);
    }

    const points: Array<{ date: string; count: number; level: number }> = [];
    for (let i = 0; i < 365; i += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + i);
      const key = toDateKey(date);
      const count = counter.get(key) || 0;
      points.push({
        date: key,
        count,
        level: levelByCount(count),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        points,
        includedEventTypes: INCLUDED_EVENT_TYPES,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch heatmap" },
      { status: 500 },
    );
  }
}
