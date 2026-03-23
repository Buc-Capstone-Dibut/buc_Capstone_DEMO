"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "../database.types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "../../lib/prisma"; // Import Prisma Singleton
import { isTeamType, normalizeTeamType } from "@/lib/team-types";
import {
  normalizeWorkspaceCategory,
  seedWorkspaceDefaults,
} from "@/lib/server/workspace-bootstrap";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// Helper to get authenticated user or mock in dev
async function getUserId() {
  const cookieStore = await cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user.id) return session.user.id;

  // Dev Bypass (Mock ID)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Return the specific Mock ID used in seeds
    return "00000000-0000-0000-0000-000000000001";
  }

  return null;
}

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;
  const tagsString = formData.get("tags") as string;

  if (!title || !content || !category) {
    return { error: "필수 입력 항목이 누락되었습니다." };
  }

  const authorId = await getUserId();
  if (!authorId) {
    return { error: "로그인이 필요합니다." };
  }

  let tags: string[] = [];
  try {
    tags = JSON.parse(tagsString || "[]");
  } catch {
    tags = [];
  }

  try {
    const post = await prisma.posts.create({
      data: {
        title,
        content,
        category,
        tags,
        author_id: authorId, // Relies on Prisma Schema relation (posts_author_id_fkey)
        views: 0,
        likes: 0,
      },
    });

    revalidatePath("/community/board");
    return redirect(`/community/board/${post.id}`);
  } catch (error: unknown) {
    console.error("Post creation error:", error);
    return {
      error: `게시글 작성 중 오류가 발생했습니다: ${getErrorMessage(error, "Unknown error")}`,
    };
  }
}

export async function createComment(postId: string, content: string) {
  if (!postId || !content) return { error: "내용을 입력해주세요." };

  const authorId = await getUserId();
  if (!authorId) return { error: "로그인이 필요합니다." };

  try {
    await prisma.comments.create({
      data: {
        post_id: postId,
        content,
        author_id: authorId,
      },
    });

    revalidatePath(`/community/board/${postId}`);
  } catch (error: unknown) {
    console.error("Comment creation error:", error);
    return { error: "댓글 작성 중 오류가 발생했습니다." };
  }
}

// --- Squads Actions (Also refactored to Prisma) ---

export async function createSquad(formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const type = formData.get("type") as string;
  const capacity = parseInt((formData.get("capacity") as string) || "4");
  const techStackString = formData.get("tech_stack") as string;
  const placeType = formData.get("place_type") as string;
  const location = formData.get("location") as string;
  const recruitmentPeriod = formData.get("recruitment_period") as string;
  const activityId = formData.get("activity_id") as string;

  // Use client-provided user_id if valid (for dev) or fall back to session
  const clientUserId = formData.get("user_id") as string;
  let leaderId = await getUserId();

  if (!leaderId && clientUserId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    leaderId = clientUserId; // Trust client in dev mode if session missing
  }

  if (!title || !content || !leaderId) {
    return { error: "필수 입력 항목이 누락되었거나 로그인이 필요합니다." };
  }

  if (!isTeamType(type)) {
    return { error: "유효하지 않은 팀 유형입니다." };
  }

  let techStack: string[] = [];
  try {
    techStack = JSON.parse(techStackString || "[]");
  } catch {
    techStack = [];
  }

  try {
    // Transaction: Create Squad + Add Leader as Member
    const squad = await prisma.$transaction(async (tx) => {
      const newSquad = await tx.squads.create({
        data: {
          title,
          content,
          type: normalizeTeamType(type),
          capacity,
          tech_stack: techStack,
          place_type: placeType,
          location,
          recruitment_period: recruitmentPeriod || null,
          activity_id: activityId || null,
          leader_id: leaderId,
          recruited_count: 1,
        },
      });

      await tx.squad_members.create({
        data: {
          squad_id: newSquad.id,
          user_id: leaderId!,
          role: "leader",
        },
      });

      const draftWorkspace = await tx.workspaces.create({
        data: {
          name: title,
          description: content,
          category: normalizeWorkspaceCategory(type),
          from_squad_id: newSquad.id,
          space_status: "DRAFT",
        },
      });

      await tx.workspace_members.create({
        data: {
          workspace_id: draftWorkspace.id,
          user_id: leaderId!,
          role: "owner",
        },
      });

      await seedWorkspaceDefaults(tx, draftWorkspace.id);

      return newSquad;
    });

    revalidatePath("/community/squad");
    return redirect(`/community/squad/${squad.id}`);
  } catch (error: unknown) {
    console.error("Squad creation error:", error);
    return {
      error: `팀 모집글 작성 중 오류가 발생했습니다: ${getErrorMessage(error, "Unknown error")}`,
    };
  }
}

export async function applyToSquad(squadId: string, message: string) {
  const userId = await getUserId();
  if (!userId) return { error: "로그인이 필요합니다." };

  try {
    await prisma.squad_applications.create({
      data: {
        squad_id: squadId,
        user_id: userId,
        message,
        status: "pending",
      },
    });

    revalidatePath(`/community/squad/${squadId}`);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      // Unique constraint violation
      return { error: "이미 지원하셨습니다." };
    }
    console.error("Application error:", error);
    return { error: "지원 중 오류가 발생했습니다." };
  }
}

export async function cancelApplication(squadId: string) {
  const userId = await getUserId();
  if (!userId) return { error: "로그인이 필요합니다." };

  try {
    // Prisma deleteMany to handle composite key or explicit unique ID
    // squad_applications has generic ID but we select by squad_id + user_id
    // Wait, Schema says: @@unique([squad_id, user_id])
    // So we can use delete with where clause if we know the unique constraint name?
    // Or finds first then delete?
    // Prisma `deleteMany` is easiest for non-id queries
    await prisma.squad_applications.deleteMany({
      where: {
        squad_id: squadId,
        user_id: userId,
      },
    });

    revalidatePath(`/community/squad/${squadId}`);
  } catch (error) {
    console.error("Cancel error:", error);
    return { error: "취소 중 오류가 발생했습니다." };
  }
}

export async function acceptApplicant(squadId: string, applicantId: string) {
  // Logic: Update App Status -> Add Member -> Update Squad Count
  try {
    await prisma.$transaction(async (tx) => {
      await tx.squad_applications.updateMany({
        where: { squad_id: squadId, user_id: applicantId },
        data: { status: "accepted" },
      });

      const existingSquadMember = await tx.squad_members.findFirst({
        where: { squad_id: squadId, user_id: applicantId },
        select: { id: true },
      });

      if (!existingSquadMember) {
        await tx.squad_members.create({
          data: {
            squad_id: squadId,
            user_id: applicantId,
            role: "member",
          },
        });

        await tx.squads.update({
          where: { id: squadId },
          data: { recruited_count: { increment: 1 } },
        });
      }

      const linkedWorkspace = await tx.workspaces.findUnique({
        where: { from_squad_id: squadId },
        select: { id: true, space_status: true },
      });

      if (!linkedWorkspace) return;

      if (linkedWorkspace.space_status === "DRAFT") {
        await tx.workspaces.update({
          where: { id: linkedWorkspace.id },
          data: {
            space_status: "ACTIVE",
            activated_at: new Date(),
          },
        });
      }

      const existingWorkspaceMember = await tx.workspace_members.findUnique({
        where: {
          workspace_id_user_id: {
            workspace_id: linkedWorkspace.id,
            user_id: applicantId,
          },
        },
      });

      if (!existingWorkspaceMember) {
        await tx.workspace_members.create({
          data: {
            workspace_id: linkedWorkspace.id,
            user_id: applicantId,
            role: "member",
          },
        });
      }
    });
    revalidatePath(`/community/squad/${squadId}`);
  } catch (error: unknown) {
    console.error("Accept error:", error);
    return {
      error: `수락 처리 중 오류: ${getErrorMessage(error, "Unknown error")}`,
    };
  }
}

export async function rejectApplicant(squadId: string, applicantId: string) {
  try {
    await prisma.squad_applications.updateMany({
      where: { squad_id: squadId, user_id: applicantId },
      data: { status: "rejected" },
    });
    revalidatePath(`/community/squad/${squadId}`);
  } catch {
    return { error: "거절 처리 중 오류가 발생했습니다." };
  }
}

export async function closeRecruitment(squadId: string) {
  try {
    await prisma.squads.update({
      where: { id: squadId },
      data: { status: "closed" },
    });
    revalidatePath(`/community/squad/${squadId}`);
  } catch {
    return { error: "마감 처리 중 오류가 발생했습니다." };
  }
}
