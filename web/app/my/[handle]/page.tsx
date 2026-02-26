import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { ProfileClient } from "./profile-client";
import type {
  ProfilePostItem,
  PublicResumeSummary,
  TabKey,
} from "./profile-types";

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

type SummaryRow = {
  postCount: number;
  commentCount: number;
  workspaceCount: number;
  bookmarkCount: number;
  resumeSummary: Prisma.JsonValue | null;
  workspaceSummary: Prisma.JsonValue | null;
};

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

  const phase2Start = Date.now();
  const [summaryRows, postsRaw] = await Promise.all([
    prisma.$queryRaw<SummaryRow[]>`
      SELECT
        (SELECT COUNT(*)::int FROM "public"."posts" p WHERE p.author_id = ${profileRaw.id}::uuid) AS "postCount",
        (SELECT COUNT(*)::int FROM "public"."comments" c WHERE c.author_id = ${profileRaw.id}::uuid) AS "commentCount",
        (SELECT COUNT(*)::int FROM "public"."workspace_members" wm WHERE wm.user_id = ${profileRaw.id}::uuid) AS "workspaceCount",
        (SELECT COUNT(*)::int FROM "public"."blog_bookmarks" bb WHERE bb.user_id = ${profileRaw.id}::uuid) AS "bookmarkCount",
        (SELECT urp.public_summary FROM "public"."user_resume_profiles" urp WHERE urp.user_id = ${profileRaw.id}::uuid LIMIT 1) AS "resumeSummary",
        (SELECT uws.public_summary FROM "public"."user_workspace_settings" uws WHERE uws.user_id = ${profileRaw.id}::uuid LIMIT 1) AS "workspaceSummary"
    `,
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
  ]);
  const phase2Ms = Date.now() - phase2Start;

  const summary = summaryRows[0];
  const postCount = summary?.postCount ?? 0;
  const commentCount = summary?.commentCount ?? 0;
  const workspaceCount = summary?.workspaceCount ?? 0;
  const bookmarkCount = summary?.bookmarkCount ?? 0;

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

  const prefetchedTabs: Partial<Record<TabKey, boolean>> = {
    posts: true,
    resume: !isOwner,
  };

  if (shouldLogPerf()) {
    const totalMs = Date.now() - requestStart;
    console.log(
      `[my-profile] handle=${handle} total_ms=${totalMs} phase1_ms=${phase1Ms} phase2_ms=${phase2Ms}` +
        ` counts={posts:${postCount},comments:${commentCount},bookmarks:${bookmarkCount}}` +
        ` preloaded={posts:${posts.length},heatmap:0}`,
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
        resumeSummary: asPublicResumeSummary(summary?.resumeSummary ?? null),
        workspaceSummary: asRecord(summary?.workspaceSummary ?? null),
        isOwner,
        posts,
        comments: [],
        bookmarks: [],
        heatmap: [],
        resumePayload: null,
        prefetchedTabs,
      }}
    />
  );
}
