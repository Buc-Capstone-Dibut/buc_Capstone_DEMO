import prisma from "@/lib/prisma";

const DOC_LIVE_PRESENCE_TTL_MS = 30_000;

type ProfileSnapshot = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
};

export type WorkspaceDocCollabParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  mode: string;
  isDirty: boolean;
  lastSeenAt: string;
};

export type WorkspaceDocCollabState = {
  isActive: boolean;
  participantCount: number;
  startedAt: string | null;
  lastActivityAt: string | null;
  startedBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  participants: WorkspaceDocCollabParticipant[];
  currentUserParticipating: boolean;
};

type TouchDocPresenceInput = {
  workspaceId: string;
  docId: string;
  userId: string;
  mode: "NORMAL" | "COLLAB";
  isDirty: boolean;
  active?: boolean;
};

function getPresenceCutoff(reference = new Date()) {
  return new Date(reference.getTime() - DOC_LIVE_PRESENCE_TTL_MS);
}

function getProfileName(profile: ProfileSnapshot | null | undefined) {
  return profile?.nickname?.trim() || "Unknown";
}

function buildInactiveCollabState(): WorkspaceDocCollabState {
  return {
    isActive: false,
    participantCount: 0,
    startedAt: null,
    lastActivityAt: null,
    startedBy: null,
    participants: [],
    currentUserParticipating: false,
  };
}

async function cleanupStalePresence(workspaceId: string, docIds?: string[]) {
  const cutoff = getPresenceCutoff();

  await prisma.workspace_doc_live_presence.deleteMany({
    where: {
      workspace_id: workspaceId,
      ...(docIds && docIds.length > 0 ? { doc_id: { in: docIds } } : {}),
      last_seen_at: {
        lt: cutoff,
      },
    },
  });
}

async function finalizeInactiveSessions(workspaceId: string, docIds?: string[]) {
  const activeSessions = await prisma.workspace_doc_collab_sessions.findMany({
    where: {
      workspace_id: workspaceId,
      status: "ACTIVE",
      ...(docIds && docIds.length > 0 ? { doc_id: { in: docIds } } : {}),
    },
    select: {
      doc_id: true,
    },
  });

  if (activeSessions.length === 0) return;

  const candidateDocIds = activeSessions.map((session) => session.doc_id);
  const collabPresence = await prisma.workspace_doc_live_presence.findMany({
    where: {
      workspace_id: workspaceId,
      doc_id: {
        in: candidateDocIds,
      },
      mode: "COLLAB",
    },
    select: {
      doc_id: true,
    },
  });

  const docsWithParticipants = new Set(
    collabPresence.map((presence) => presence.doc_id),
  );
  const now = new Date();
  const staleDocIds = candidateDocIds.filter(
    (docId) => !docsWithParticipants.has(docId),
  );

  if (staleDocIds.length === 0) return;

  await prisma.workspace_doc_collab_sessions.updateMany({
    where: {
      workspace_id: workspaceId,
      doc_id: {
        in: staleDocIds,
      },
      status: "ACTIVE",
    },
    data: {
      status: "ENDED",
      ended_at: now,
      last_activity_at: now,
    },
  });
}

async function normalizeCollabState(
  workspaceId: string,
  docId: string,
  currentUserId?: string,
): Promise<WorkspaceDocCollabState> {
  const session = await prisma.workspace_doc_collab_sessions.findUnique({
    where: {
      doc_id: docId,
    },
    select: {
      status: true,
      started_at: true,
      last_activity_at: true,
      started_by_profile: {
        select: {
          id: true,
          nickname: true,
          avatar_url: true,
        },
      },
    },
  });

  if (!session || session.status !== "ACTIVE") {
    return buildInactiveCollabState();
  }

  const participants = await prisma.workspace_doc_live_presence.findMany({
    where: {
      workspace_id: workspaceId,
      doc_id: docId,
      mode: "COLLAB",
    },
    orderBy: {
      last_seen_at: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          avatar_url: true,
        },
      },
    },
  });

  if (participants.length === 0) {
    const now = new Date();
    await prisma.workspace_doc_collab_sessions.update({
      where: {
        doc_id: docId,
      },
      data: {
        status: "ENDED",
        ended_at: now,
        last_activity_at: now,
      },
    });
    return buildInactiveCollabState();
  }

  return {
    isActive: true,
    participantCount: participants.length,
    startedAt: session.started_at?.toISOString() ?? null,
    lastActivityAt: session.last_activity_at?.toISOString() ?? null,
    startedBy: session.started_by_profile
      ? {
          id: session.started_by_profile.id,
          name: getProfileName(session.started_by_profile),
          avatarUrl: session.started_by_profile.avatar_url,
        }
      : null,
    participants: participants.map((participant) => ({
      userId: participant.user_id,
      name: getProfileName(participant.user),
      avatarUrl: participant.user?.avatar_url ?? null,
      mode: participant.mode,
      isDirty: participant.is_dirty,
      lastSeenAt: participant.last_seen_at.toISOString(),
    })),
    currentUserParticipating: Boolean(
      currentUserId &&
        participants.some((participant) => participant.user_id === currentUserId),
    ),
  };
}

export async function getDocCollabState(
  workspaceId: string,
  docId: string,
  currentUserId?: string,
) {
  await cleanupStalePresence(workspaceId, [docId]);
  await finalizeInactiveSessions(workspaceId, [docId]);
  return normalizeCollabState(workspaceId, docId, currentUserId);
}

export async function getWorkspaceDocsCollabStateMap(
  workspaceId: string,
  docIds: string[],
  currentUserId?: string,
) {
  if (docIds.length === 0) {
    return new Map<string, WorkspaceDocCollabState>();
  }

  await cleanupStalePresence(workspaceId, docIds);
  await finalizeInactiveSessions(workspaceId, docIds);

  const states = await Promise.all(
    docIds.map(async (docId) => [
      docId,
      await normalizeCollabState(workspaceId, docId, currentUserId),
    ] as const),
  );

  return new Map(states);
}

export async function touchDocPresence({
  workspaceId,
  docId,
  userId,
  mode,
  isDirty,
  active = true,
}: TouchDocPresenceInput) {
  if (!active) {
    await prisma.workspace_doc_live_presence.deleteMany({
      where: {
        workspace_id: workspaceId,
        doc_id: docId,
        user_id: userId,
      },
    });
    return;
  }

  await prisma.workspace_doc_live_presence.upsert({
    where: {
      doc_id_user_id: {
        doc_id: docId,
        user_id: userId,
      },
    },
    create: {
      workspace_id: workspaceId,
      doc_id: docId,
      user_id: userId,
      mode,
      is_dirty: isDirty,
      last_seen_at: new Date(),
    },
    update: {
      mode,
      is_dirty: isDirty,
      last_seen_at: new Date(),
    },
  });
}

export async function startDocCollabSession(
  workspaceId: string,
  docId: string,
  userId: string,
) {
  await cleanupStalePresence(workspaceId, [docId]);
  await finalizeInactiveSessions(workspaceId, [docId]);

  const blockers = await prisma.workspace_doc_live_presence.findMany({
    where: {
      workspace_id: workspaceId,
      doc_id: docId,
      mode: "NORMAL",
      is_dirty: true,
      last_seen_at: {
        gte: getPresenceCutoff(),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          avatar_url: true,
        },
      },
    },
  });

  if (blockers.length > 0) {
    return {
      ok: false as const,
      status: 409,
      error:
        "아직 저장하지 않은 팀원이 있어 협업을 시작할 수 없습니다. 저장 후 다시 시도하세요.",
      blockers: blockers.map((blocker) => ({
        userId: blocker.user_id,
        name: getProfileName(blocker.user),
      })),
    };
  }

  const existingSession = await prisma.workspace_doc_collab_sessions.findUnique({
    where: {
      doc_id: docId,
    },
    select: {
      doc_id: true,
      status: true,
      started_at: true,
      started_by: true,
    },
  });

  const now = new Date();
  await prisma.workspace_doc_collab_sessions.upsert({
    where: {
      doc_id: docId,
    },
    create: {
      doc_id: docId,
      workspace_id: workspaceId,
      status: "ACTIVE",
      started_by: userId,
      started_at: now,
      last_activity_at: now,
    },
    update: {
      workspace_id: workspaceId,
      status: "ACTIVE",
      started_by:
        existingSession?.status === "ACTIVE" ? existingSession.started_by : userId,
      started_at:
        existingSession?.status === "ACTIVE"
          ? existingSession.started_at
          : now,
      ended_at: null,
      last_activity_at: now,
    },
  });

  await touchDocPresence({
    workspaceId,
    docId,
    userId,
    mode: "COLLAB",
    isDirty: false,
  });

  return {
    ok: true as const,
    state: await getDocCollabState(workspaceId, docId, userId),
  };
}

export async function leaveDocCollabSession(
  workspaceId: string,
  docId: string,
  userId: string,
) {
  await prisma.workspace_doc_live_presence.deleteMany({
    where: {
      workspace_id: workspaceId,
      doc_id: docId,
      user_id: userId,
    },
  });

  await cleanupStalePresence(workspaceId, [docId]);

  const remainingParticipants = await prisma.workspace_doc_live_presence.count({
    where: {
      workspace_id: workspaceId,
      doc_id: docId,
      mode: "COLLAB",
      last_seen_at: {
        gte: getPresenceCutoff(),
      },
    },
  });

  const now = new Date();
  if (remainingParticipants === 0) {
    await prisma.workspace_doc_collab_sessions.upsert({
      where: {
        doc_id: docId,
      },
      create: {
        doc_id: docId,
        workspace_id: workspaceId,
        status: "ENDED",
        ended_at: now,
        last_activity_at: now,
      },
      update: {
        workspace_id: workspaceId,
        status: "ENDED",
        ended_at: now,
        last_activity_at: now,
      },
    });
  } else {
    await prisma.workspace_doc_collab_sessions.updateMany({
      where: {
        doc_id: docId,
        workspace_id: workspaceId,
      },
      data: {
        last_activity_at: now,
      },
    });
  }

  return {
    ended: remainingParticipants === 0,
    state: await getDocCollabState(workspaceId, docId, userId),
  };
}

export const workspaceDocLivePresenceTtlMs = DOC_LIVE_PRESENCE_TTL_MS;
