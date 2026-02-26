import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { MY_ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";
import { ProfileClient } from "./profile-client";

const INCLUDED_EVENT_TYPES = [
  MY_ACTIVITY_EVENT_TYPES.interviewCompleted,
  MY_ACTIVITY_EVENT_TYPES.portfolioDefenseCompleted,
  MY_ACTIVITY_EVENT_TYPES.communityPostCreated,
  MY_ACTIVITY_EVENT_TYPES.communityCommentCreated,
  MY_ACTIVITY_EVENT_TYPES.workspaceCreated,
  MY_ACTIVITY_EVENT_TYPES.workspaceTaskCompleted,
];

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function levelByCount(n: number) {
  if (n <= 0) return 0;
  if (n <= 1) return 1;
  if (n <= 3) return 2;
  if (n <= 6) return 3;
  return 4;
}

export default async function MyProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const handle = decodeURIComponent(params.handle || "").toLowerCase();
  if (!handle) notFound();

  const supabase = await createClient();

  // Round-trip 1: profile lookup + session check in parallel
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

  if (!profileRaw) notFound();

  const isOwner = Boolean(session?.user?.id && session.user.id === profileRaw.id);

  const start365 = new Date();
  start365.setUTCHours(0, 0, 0, 0);
  start365.setUTCDate(start365.getUTCDate() - 364);

  // Round-trip 2: all content queries in parallel (server-side, no HTTP overhead)
  const [
    postCount,
    commentCount,
    workspaceCount,
    resumeRow,
    wsSettingsRow,
    posts,
    comments,
    bookmarks,
    activityRows,
  ] = await Promise.all([
    prisma.posts.count({ where: { author_id: profileRaw.id } }),
    prisma.comments.count({ where: { author_id: profileRaw.id } }),
    prisma.workspace_members.count({ where: { user_id: profileRaw.id } }),
    prisma.user_resume_profiles.findUnique({
      where: { user_id: profileRaw.id },
      select: { public_summary: true, resume_payload: true },
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
    prisma.comments.findMany({
      where: { author_id: profileRaw.id },
      orderBy: { created_at: "desc" },
      take: 100,
      select: {
        id: true,
        content: true,
        post_id: true,
        created_at: true,
        posts: { select: { id: true, title: true } },
      },
    }),
    prisma.blog_bookmarks.findMany({
      where: { user_id: profileRaw.id },
      orderBy: { created_at: "desc" },
      take: 100,
      select: {
        id: true,
        created_at: true,
        blogs: {
          select: {
            id: true,
            title: true,
            summary: true,
            author: true,
            tags: true,
            external_url: true,
            thumbnail_url: true,
            published_at: true,
          },
        },
      },
    }),
    prisma.user_activity_events.findMany({
      where: {
        user_id: profileRaw.id,
        event_type: { in: INCLUDED_EVENT_TYPES },
        created_at: { gte: start365 },
      },
      select: { created_at: true },
    }),
  ]);

  // Build heatmap from activity rows
  const counter = new Map<string, number>();
  for (const r of activityRows) {
    const k = toDateKey(r.created_at);
    counter.set(k, (counter.get(k) || 0) + 1);
  }
  const heatmap = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(start365);
    d.setUTCDate(start365.getUTCDate() + i);
    const k = toDateKey(d);
    const count = counter.get(k) || 0;
    return { date: k, count, level: levelByCount(count) };
  });

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
        stats: { postCount, commentCount, workspaceCount },
        resumeSummary: (resumeRow?.public_summary as any) || null,
        workspaceSummary: (wsSettingsRow?.public_summary as any) || null,
        isOwner,
        posts: posts.map((p) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          tags: p.tags || [],
          views: p.views || 0,
          likes: p.likes || 0,
          createdAt: p.created_at?.toISOString() ?? null,
          updatedAt: p.updated_at?.toISOString() ?? null,
        })),
        comments: comments.map((c) => ({
          id: c.id,
          content: c.content,
          postId: c.post_id,
          postTitle: c.posts?.title || "",
          createdAt: c.created_at?.toISOString() ?? null,
        })),
        bookmarks: bookmarks.map((b) => ({
          id: b.id,
          createdAt: b.created_at?.toISOString() ?? null,
          blog: {
            id: String(b.blogs.id),
            title: b.blogs.title,
            summary: b.blogs.summary,
            author: b.blogs.author,
            tags: (b.blogs.tags as string[]) || [],
            externalUrl: b.blogs.external_url,
            thumbnailUrl: b.blogs.thumbnail_url,
            publishedAt: b.blogs.published_at?.toISOString() ?? null,
          },
        })),
        heatmap,
        resumePayload: isOwner ? ((resumeRow?.resume_payload as any) ?? null) : null,
      }}
    />
  );
}
