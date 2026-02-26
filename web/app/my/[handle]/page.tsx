import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";
import { ProfileClient } from "./profile-client";
import type {
  ActivityHeatmapPoint,
  ProfilePostItem,
  PublicResumeSummary,
  TabKey,
} from "./profile-types";

const HEATMAP_INCLUDED_EVENT_TYPES = [
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

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function asPublicResumeSummary(value: unknown): PublicResumeSummary | null {
  if (!value || typeof value !== "object") return null;
  return value as PublicResumeSummary;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function shouldLogPerf() {
  return process.env.NODE_ENV === "production" || process.env.MY_PROFILE_PERF_LOG === "1";
}

export default async function MyProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const handle = decodeURIComponent(params.handle || "").toLowerCase();
  if (!handle) notFound();

  const requestStart = Date.now();
  const supabase = await createClient();

  const phase1Start = Date.now();
  const [profileRaw, { data: { session } }] = await Promise.all([
    prisma.profiles.findUnique({
      where: { handle },
      select: {
        id: true,
        handle: true,
        nickname: true,
        avatar_url: true,
        bio: true,
        tech_stack: true,
        reputation: true,
        tier: true,
        created_at: true,
      },
    }),
    supabase.auth.getSession(),
  ]);
  const phase1Ms = Date.now() - phase1Start;

  if (!profileRaw) notFound();

  const isOwner = Boolean(session?.user?.id && session.user.id === profileRaw.id);
  const heatmapStart = new Date();
  heatmapStart.setUTCHours(0, 0, 0, 0);
  heatmapStart.setUTCDate(heatmapStart.getUTCDate() - 364);

  const phase2Start = Date.now();
  const [
    postCount,
    commentCount,
    workspaceCount,
    bookmarkCount,
    resumeRow,
    wsSettingsRow,
    postsRaw,
    activityRows,
  ] = await Promise.all([
    prisma.posts.count({ where: { author_id: profileRaw.id } }),
    prisma.comments.count({ where: { author_id: profileRaw.id } }),
    prisma.workspace_members.count({ where: { user_id: profileRaw.id } }),
    prisma.blog_bookmarks.count({ where: { user_id: profileRaw.id } }),
    prisma.user_resume_profiles.findUnique({
      where: { user_id: profileRaw.id },
      select: { public_summary: true },
    }),
    prisma.user_workspace_settings.findUnique({
      where: { user_id: profileRaw.id },
      select: { public_summary: true },
    }),
    prisma.posts.findMany({
      where: { author_id: profileRaw.id },
      orderBy: { created_at: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        category: true,
        tags: true,
        views: true,
        likes: true,
        created_at: true,
        updated_at: true,
      },
    }),
    prisma.user_activity_events.findMany({
      where: {
        user_id: profileRaw.id,
        event_type: { in: HEATMAP_INCLUDED_EVENT_TYPES },
        created_at: { gte: heatmapStart },
      },
      select: {
        created_at: true,
      },
    }),
  ]);
  const phase2Ms = Date.now() - phase2Start;

  const posts: ProfilePostItem[] = postsRaw.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    tags: item.tags || [],
    views: item.views || 0,
    likes: item.likes || 0,
    createdAt: toIsoString(item.created_at),
    updatedAt: toIsoString(item.updated_at),
  }));

  const dailyCount = new Map<string, number>();
  for (const row of activityRows) {
    const key = toDateKey(row.created_at);
    dailyCount.set(key, (dailyCount.get(key) || 0) + 1);
  }

  const heatmap: ActivityHeatmapPoint[] = [];
  for (let i = 0; i < 365; i += 1) {
    const date = new Date(heatmapStart);
    date.setUTCDate(heatmapStart.getUTCDate() + i);
    const key = toDateKey(date);
    const count = dailyCount.get(key) || 0;
    heatmap.push({
      date: key,
      count,
      level: levelByCount(count),
    });
  }

  const prefetchedTabs: Partial<Record<TabKey, boolean>> = {
    posts: true,
    activity: true,
    resume: !isOwner,
  };

  if (shouldLogPerf()) {
    const totalMs = Date.now() - requestStart;
    console.log(
      `[my-profile] handle=${handle} total_ms=${totalMs} phase1_ms=${phase1Ms} phase2_ms=${phase2Ms}` +
        ` counts={posts:${postCount},comments:${commentCount},bookmarks:${bookmarkCount}}` +
        ` preloaded={posts:${posts.length},heatmap:${heatmap.length}}`,
    );
  }

  return (
    <ProfileClient
      initialData={{
        profile: {
          id: profileRaw.id,
          handle: profileRaw.handle,
          nickname: profileRaw.nickname,
          avatarUrl: profileRaw.avatar_url,
          bio: profileRaw.bio,
          techStack: profileRaw.tech_stack || [],
          reputation: profileRaw.reputation ?? 0,
          tier: profileRaw.tier || "Unranked",
        },
        stats: { postCount, commentCount, workspaceCount, bookmarkCount },
        resumeSummary: asPublicResumeSummary(resumeRow?.public_summary ?? null),
        workspaceSummary: asRecord(wsSettingsRow?.public_summary ?? null),
        isOwner,
        posts,
        comments: [],
        bookmarks: [],
        heatmap,
        resumePayload: null,
        prefetchedTabs,
      }}
    />
  );
}
