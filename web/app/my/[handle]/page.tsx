import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { ProfileClient } from "./profile-client";

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

  const phase2Start = Date.now();
  const [
    postCount,
    commentCount,
    workspaceCount,
    bookmarkCount,
    resumeRow,
    wsSettingsRow,
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
  ]);
  const phase2Ms = Date.now() - phase2Start;

  if (shouldLogPerf()) {
    const totalMs = Date.now() - requestStart;
    console.log(
      `[my-profile] handle=${handle} total_ms=${totalMs} phase1_ms=${phase1Ms} phase2_ms=${phase2Ms}` +
        ` counts={posts:${postCount},comments:${commentCount},bookmarks:${bookmarkCount}}`,
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
        resumeSummary: (resumeRow?.public_summary as any) || null,
        workspaceSummary: (wsSettingsRow?.public_summary as any) || null,
        isOwner,
        posts: [],
        comments: [],
        bookmarks: [],
        heatmap: [],
        resumePayload: null,
      }}
    />
  );
}
