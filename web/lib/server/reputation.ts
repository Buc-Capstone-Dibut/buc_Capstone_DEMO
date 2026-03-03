import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolveTierByScore } from "@/lib/reputation-tier";

export const REPUTATION_EVENT_TYPES = {
  qnaQuestionCreated: "qna_question_created",
  qnaAnswerAccepted: "qna_answer_accepted",
  workspaceTaskCompleted: "workspace_task_completed",
  workspaceCompleted: "workspace_completed",
} as const;

export const REPUTATION_DELTAS = {
  qnaQuestionCreated: 3,
  qnaAnswerAccepted: 25,
  workspaceTaskCompleted: 1,
  workspaceCompleted: 20,
} as const;

type ReputationClient = Prisma.TransactionClient | typeof prisma;

type ApplyReputationEventInput = {
  userId: string;
  eventType: string;
  delta: number;
  sourceType?: string | null;
  sourceId?: string | null;
  actorId?: string | null;
  dedupeKey?: string | null;
  metadata?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
};

function getFallbackHandle(userId: string) {
  return `user-${String(userId).replace(/-/g, "").toLowerCase()}`;
}

async function ensureProfileExists(client: ReputationClient, userId: string) {
  await client.profiles.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      handle: getFallbackHandle(userId),
      nickname: "User",
      reputation: 0,
      tier: "씨앗",
    },
  });
}

async function getUserRankSnapshot(client: ReputationClient, userId: string) {
  const profile = await client.profiles.findUnique({
    where: { id: userId },
    select: { reputation: true, tier: true },
  });

  const score = Math.max(0, profile?.reputation ?? 0);
  return {
    score,
    tier: profile?.tier || resolveTierByScore(score),
  };
}

export async function applyReputationEvent(input: ApplyReputationEventInput) {
  const client = input.tx ?? prisma;
  const userId = input.userId;
  const delta = Number.isFinite(input.delta) ? Math.trunc(input.delta) : 0;

  if (!userId || delta === 0 || !input.eventType) {
    return { applied: false, score: 0, tier: "씨앗" as const };
  }

  await ensureProfileExists(client, userId);

  if (input.dedupeKey) {
    try {
      await client.reputation_events.create({
        data: {
          user_id: userId,
          event_type: input.eventType,
          delta,
          source_type: input.sourceType ?? null,
          source_id: input.sourceId ?? null,
          actor_id: input.actorId ?? null,
          dedupe_key: input.dedupeKey,
          metadata: input.metadata ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const snapshot = await getUserRankSnapshot(client, userId);
        return {
          applied: false,
          score: snapshot.score,
          tier: snapshot.tier,
          duplicated: true,
        };
      }
      throw error;
    }
  } else {
    await client.reputation_events.create({
      data: {
        user_id: userId,
        event_type: input.eventType,
        delta,
        source_type: input.sourceType ?? null,
        source_id: input.sourceId ?? null,
        actor_id: input.actorId ?? null,
        dedupe_key: null,
        metadata: input.metadata ?? null,
      },
    });
  }

  const updated = await client.profiles.update({
    where: { id: userId },
    data: {
      reputation: { increment: delta },
      updated_at: new Date(),
    },
    select: { reputation: true, tier: true },
  });

  const clampedScore = Math.max(0, updated.reputation ?? 0);
  if ((updated.reputation ?? 0) < 0) {
    await client.profiles.update({
      where: { id: userId },
      data: { reputation: 0, updated_at: new Date() },
    });
  }

  const nextTier = resolveTierByScore(clampedScore);
  const currentTier = updated.tier || "씨앗";

  if (currentTier !== nextTier) {
    await client.profiles.update({
      where: { id: userId },
      data: {
        tier: nextTier,
        updated_at: new Date(),
      },
    });
  }

  return {
    applied: true,
    score: clampedScore,
    tier: nextTier,
    duplicated: false,
  };
}

export async function tryApplyReputationEvent(input: ApplyReputationEventInput) {
  try {
    return await applyReputationEvent(input);
  } catch (error) {
    console.warn("[reputation] apply failed:", error);
    return { applied: false, score: 0, tier: "씨앗" as const };
  }
}
