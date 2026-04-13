import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type WorkspaceCareerImportCandidateStatus = "PENDING" | "IMPORTED";

export type WorkspaceCareerImportCandidate = {
  workspaceId: string;
  workspaceName: string;
  workspaceCategory: string | null;
  role: string;
  teamRole: string | null;
  periodLabel: string | null;
  focusTags: string[];
  startedAt: string | null;
  completedAt: string | null;
  resultType: string | null;
  resultLink: string | null;
  resultNote: string | null;
  completedTaskTitles: string[];
  taskSummary: string;
  status: WorkspaceCareerImportCandidateStatus;
  importedExperienceId: string | null;
  importedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_WORKSPACE_PUBLIC_SUMMARY = {
  version: 1,
  links: {
    github: "",
    blog: "",
  },
};

type CandidateListUpdater = (
  current: WorkspaceCareerImportCandidate[],
) => WorkspaceCareerImportCandidate[];

type WorkspaceCareerImportDbClient = {
  user_workspace_settings: Pick<
    typeof prisma.user_workspace_settings,
    "findUnique" | "upsert"
  >;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asTrimmedString(value: unknown, maxLength = 300): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function asNullableString(value: unknown, maxLength = 500): string | null {
  const text = asTrimmedString(value, maxLength);
  return text.length > 0 ? text : null;
}

function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normalizeTaskTitles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const dedupe = new Set<string>();

  for (const item of value) {
    const title = asTrimmedString(item, 200);
    if (!title) continue;
    dedupe.add(title);
    if (dedupe.size >= 50) break;
  }

  return Array.from(dedupe.values());
}

function normalizeFocusTags(value: unknown): string[] {
  const source =
    Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  if (!Array.isArray(source)) return [];

  const dedupe = new Set<string>();
  for (const item of source) {
    const tag = asTrimmedString(item, 40);
    if (!tag) continue;
    dedupe.add(tag);
    if (dedupe.size >= 12) break;
  }

  return Array.from(dedupe.values());
}

function normalizeStatus(value: unknown): WorkspaceCareerImportCandidateStatus {
  return asTrimmedString(value, 20).toUpperCase() === "IMPORTED"
    ? "IMPORTED"
    : "PENDING";
}

function normalizeCandidate(value: unknown): WorkspaceCareerImportCandidate | null {
  const source = asRecord(value);
  const workspaceId = asTrimmedString(source.workspaceId, 80);
  const workspaceName = asTrimmedString(source.workspaceName, 120);

  if (!workspaceId || !workspaceName) {
    return null;
  }

  const createdAt = normalizeIsoDate(source.createdAt) || new Date().toISOString();
  const updatedAt = normalizeIsoDate(source.updatedAt) || createdAt;
  const status = normalizeStatus(source.status);
  const importedAt =
    status === "IMPORTED" ? normalizeIsoDate(source.importedAt) : null;

  return {
    workspaceId,
    workspaceName,
    workspaceCategory: asNullableString(source.workspaceCategory, 80),
    role: asTrimmedString(source.role, 60) || "member",
    teamRole: asNullableString(source.teamRole, 80),
    periodLabel: asNullableString(source.periodLabel, 80),
    focusTags: normalizeFocusTags(source.focusTags),
    startedAt: normalizeIsoDate(source.startedAt),
    completedAt: normalizeIsoDate(source.completedAt),
    resultType: asNullableString(source.resultType, 80),
    resultLink: asNullableString(source.resultLink, 800),
    resultNote: asNullableString(source.resultNote, 1200),
    completedTaskTitles: normalizeTaskTitles(source.completedTaskTitles),
    taskSummary: asTrimmedString(source.taskSummary, 1200),
    status,
    importedExperienceId:
      status === "IMPORTED"
        ? asNullableString(source.importedExperienceId, 80)
        : null,
    importedAt,
    createdAt,
    updatedAt,
  };
}

function sortCandidates(
  candidates: WorkspaceCareerImportCandidate[],
): WorkspaceCareerImportCandidate[] {
  return [...candidates].sort((a, b) => {
    const aCompleted = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bCompleted = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    if (aCompleted !== bCompleted) return bCompleted - aCompleted;

    const aCreated = new Date(a.createdAt).getTime();
    const bCreated = new Date(b.createdAt).getTime();
    return bCreated - aCreated;
  });
}

function parseCandidateList(value: unknown): WorkspaceCareerImportCandidate[] {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((candidate) => normalizeCandidate(candidate))
    .filter((candidate): candidate is WorkspaceCareerImportCandidate =>
      Boolean(candidate),
    );

  const dedupe = new Map<string, WorkspaceCareerImportCandidate>();
  for (const candidate of normalized) {
    dedupe.set(candidate.workspaceId, candidate);
  }

  return sortCandidates(Array.from(dedupe.values()));
}

async function updateCandidateList(
  userId: string,
  updater: CandidateListUpdater,
  db: WorkspaceCareerImportDbClient = prisma,
): Promise<WorkspaceCareerImportCandidate[]> {
  const row = await db.user_workspace_settings.findUnique({
    where: { user_id: userId },
    select: {
      settings_payload: true,
      public_summary: true,
    },
  });

  const payload = asRecord(row?.settings_payload);
  const current = parseCandidateList(payload.careerImportCandidates);
  const next = sortCandidates(updater(current));
  const nextPayload = {
    ...payload,
    careerImportCandidates: next,
  };
  const nextPayloadValue = nextPayload as Prisma.InputJsonValue;
  const nextPublicSummaryValue = (row?.public_summary ||
    DEFAULT_WORKSPACE_PUBLIC_SUMMARY) as Prisma.InputJsonValue;

  await db.user_workspace_settings.upsert({
    where: { user_id: userId },
    update: {
      settings_payload: nextPayloadValue,
    },
    create: {
      user_id: userId,
      settings_payload: nextPayloadValue,
      public_summary: nextPublicSummaryValue,
    },
  });

  return next;
}

export async function getWorkspaceCareerImportCandidates(
  userId: string,
  db: WorkspaceCareerImportDbClient = prisma,
): Promise<WorkspaceCareerImportCandidate[]> {
  const row = await db.user_workspace_settings.findUnique({
    where: { user_id: userId },
    select: {
      settings_payload: true,
    },
  });

  const payload = asRecord(row?.settings_payload);
  return parseCandidateList(payload.careerImportCandidates);
}

export async function getWorkspaceCareerImportCandidate(
  userId: string,
  workspaceId: string,
  db: WorkspaceCareerImportDbClient = prisma,
): Promise<WorkspaceCareerImportCandidate | null> {
  const candidates = await getWorkspaceCareerImportCandidates(userId, db);
  return candidates.find((candidate) => candidate.workspaceId === workspaceId) || null;
}

export async function upsertWorkspaceCareerImportCandidate(
  userId: string,
  candidateInput: Omit<
    WorkspaceCareerImportCandidate,
    "createdAt" | "updatedAt"
  > & { createdAt?: string | null; updatedAt?: string | null },
  db: WorkspaceCareerImportDbClient = prisma,
) {
  const nowIso = new Date().toISOString();

  const candidate = normalizeCandidate({
    ...candidateInput,
    createdAt: candidateInput.createdAt || nowIso,
    updatedAt: nowIso,
  });

  if (!candidate) {
    throw new Error("Invalid workspace career import candidate");
  }

  const next = await updateCandidateList(userId, (current) => {
    const existing = current.find(
      (item) => item.workspaceId === candidate.workspaceId,
    );
    const nextCandidate =
      existing?.status === "IMPORTED"
        ? {
            ...candidate,
            status: "IMPORTED" as const,
            importedAt: existing.importedAt,
            importedExperienceId: existing.importedExperienceId,
            createdAt: existing.createdAt,
          }
        : {
            ...candidate,
            createdAt: existing?.createdAt || candidate.createdAt,
          };

    return [
      ...current.filter((item) => item.workspaceId !== candidate.workspaceId),
      nextCandidate,
    ];
  }, db);

  return next.find((item) => item.workspaceId === candidate.workspaceId) || null;
}

export async function markWorkspaceCareerImportCandidateImported(
  userId: string,
  workspaceId: string,
  importedExperienceId: string,
  db: WorkspaceCareerImportDbClient = prisma,
) {
  const nowIso = new Date().toISOString();
  let updatedCandidate: WorkspaceCareerImportCandidate | null = null;

  await updateCandidateList(
    userId,
    (current) =>
      current.map((candidate) => {
        if (candidate.workspaceId !== workspaceId) return candidate;
        updatedCandidate = {
          ...candidate,
          status: "IMPORTED",
          importedExperienceId,
          importedAt: nowIso,
          updatedAt: nowIso,
        };
        return updatedCandidate;
      }),
    db,
  );

  return updatedCandidate;
}
