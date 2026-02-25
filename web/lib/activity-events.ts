import prisma from "@/lib/prisma";

export const MY_ACTIVITY_EVENT_TYPES = {
  interviewCompleted: "interview_completed",
  portfolioDefenseCompleted: "portfolio_defense_completed",
  communityPostCreated: "community_post_created",
  communityCommentCreated: "community_comment_created",
  workspaceCreated: "workspace_created",
  workspaceTaskCompleted: "workspace_task_completed",
} as const;

export async function logUserActivityEvent(
  userId: string | null | undefined,
  eventType: string,
  refId?: string | null,
) {
  if (!userId || !eventType) return;

  try {
    await prisma.user_activity_events.create({
      data: {
        user_id: userId,
        event_type: eventType,
        ref_id: refId || null,
      },
    });
  } catch (error) {
    // activity logging should not break business flow
    console.warn("[activity] log failed:", error);
  }
}
