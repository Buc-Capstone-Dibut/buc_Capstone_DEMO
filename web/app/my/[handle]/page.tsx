import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { ProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";
import type {
  ProfilePostItem,
  PublicResumeSummary,
  ResumePayload,
  TabKey,
  InitialData
} from "./profile-types";

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function asPublicResumeSummary(value: unknown): PublicResumeSummary | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as PublicResumeSummary;
    } catch {
      return null;
    }
  }
  if (typeof value !== "object") return null;
  return value as PublicResumeSummary;
}

function asResumePayload(value: unknown): ResumePayload | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as ResumePayload;
    } catch {
      return null;
    }
  }
  if (typeof value !== "object") return null;
  return value as ResumePayload;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function shouldLogPerf() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.MY_PROFILE_PERF_LOG === "1"
  );
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

  // Fetch session and profile in parallel
  const [sessionRes, profileRaw] = await Promise.all([
    supabase.auth.getSession(),
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
  ]);

  if (!profileRaw) notFound();
  const { data: { session } } = sessionRes;
  const isOwner = session?.user?.id === profileRaw.id;

  const phase1Ms = Date.now() - requestStart;
  const phase2Start = Date.now();

  // Fetch summary stats, resume info, and recent posts using a single query to ensure consistency
  // Use lowercase aliases as some Postgres clients may fold unquoted names, or we just handle both
  const [summaryRows, postsRaw] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT
        (SELECT COUNT(*)::int FROM "public"."posts" p WHERE p.author_id = ${profileRaw.id}::uuid) AS post_count,
        (SELECT COUNT(*)::int FROM "public"."comments" c WHERE c.author_id = ${profileRaw.id}::uuid) AS comment_count,
        (SELECT COUNT(*)::int FROM "public"."workspace_members" wm WHERE wm.user_id = ${profileRaw.id}::uuid) AS workspace_count,
        (SELECT COUNT(*)::int FROM "public"."blog_bookmarks" bb WHERE bb.user_id = ${profileRaw.id}::uuid) AS bookmark_count,
        (SELECT ur.public_summary FROM "public"."user_resumes" ur WHERE ur.user_id = ${profileRaw.id}::uuid AND ur.is_active = true LIMIT 1) AS resume_summary_json,
        (SELECT ur.resume_payload FROM "public"."user_resumes" ur WHERE ur.user_id = ${profileRaw.id}::uuid AND ur.is_active = true LIMIT 1) AS resume_payload_json,
        (SELECT ur.title FROM "public"."user_resumes" ur WHERE ur.user_id = ${profileRaw.id}::uuid AND ur.is_active = true LIMIT 1) AS resume_title,
        (SELECT uws.public_summary FROM "public"."user_workspace_settings" uws WHERE uws.user_id = ${profileRaw.id}::uuid LIMIT 1) AS workspace_summary_json
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

  const row = summaryRows[0] || {};

  // Robustly extract data from query row regardless of case folding
  const postCount = Number(row.post_count || 0);
  const commentCount = Number(row.comment_count || 0);
  const workspaceCount = Number(row.workspace_count || 0);
  const bookmarkCount = Number(row.bookmark_count || 0);

  let resumeSummary = asPublicResumeSummary(row.resume_summary_json);
  const resumeTitle = row.resume_title;

  // Force inject the title from the column if it exists, to override stale JSON summaries
  if (resumeSummary && resumeTitle) {
    resumeSummary.resumeTitle = String(resumeTitle);
  }

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
      ` preloaded={posts:${posts.length}}`,
    );
  }

  return (
    <ProfileClient
      initialData={{
        profile: {
          id: profileRaw.id,
          handle: profileRaw.handle || "",
          nickname: profileRaw.nickname,
          avatarUrl: profileRaw.avatar_url,
          bio: profileRaw.bio,
          techStack: (profileRaw.tech_stack as string[]) || [],
          reputation: profileRaw.reputation ?? 0,
          tier: profileRaw.tier || "씨앗",
        },
        stats: { postCount, commentCount, workspaceCount, bookmarkCount },
        resumeSummary,
        workspaceSummary: asRecord(row.workspace_summary_json),
        isOwner,
        posts,
        comments: [],
        bookmarks: [],
        workspaces: [],
        resumePayload: asResumePayload(row.resume_payload_json),
        prefetchedTabs,
      }}
    />
  );
}
