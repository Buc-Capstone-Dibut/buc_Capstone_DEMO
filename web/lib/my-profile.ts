import prisma from "@/lib/prisma";

const FALLBACK_HANDLE_PREFIX = "user";

export function normalizeHandle(value: string): string {
  const normalized = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || `${FALLBACK_HANDLE_PREFIX}-${Date.now().toString(36)}`;
}

export async function generateUniqueHandle(baseValue: string, excludeUserId?: string): Promise<string> {
  const base = normalizeHandle(baseValue);

  // 1차: base 그대로 시도 (쿼리 1번)
  const first = await prisma.profiles.findUnique({
    where: { handle: base },
    select: { id: true },
  });

  if (!first || first.id === excludeUserId) {
    return base;
  }

  // 2차: base-2 ~ base-100 한 번에 배치 조회 (쿼리 1번)
  const BATCH = 99;
  const candidates = Array.from({ length: BATCH }, (_, i) => `${base}-${i + 2}`);
  const taken = await prisma.profiles.findMany({
    where: { handle: { in: candidates } },
    select: { handle: true, id: true },
  });

  const takenSet = new Set(
    taken.filter((r) => r.id !== excludeUserId).map((r) => r.handle),
  );

  for (const candidate of candidates) {
    if (!takenSet.has(candidate)) return candidate;
  }

  // 3차: 랜덤 suffix fallback
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function ensureProfileForUser(params: {
  userId: string;
  nickname?: string | null;
  email?: string | null;
}) {
  const { userId, nickname, email } = params;
  const current = await prisma.profiles.findUnique({ where: { id: userId } });
  const emailBase = (email || "").split("@")[0] || "";
  const base = nickname || current?.nickname || emailBase || `${FALLBACK_HANDLE_PREFIX}-${userId.slice(0, 8)}`;

  if (current?.handle) {
    return current;
  }

  const resolvedHandle = await generateUniqueHandle(base, userId);

  if (current) {
    return prisma.profiles.update({
      where: { id: userId },
      data: {
        handle: resolvedHandle,
      },
    });
  }

  return prisma.profiles.create({
    data: {
      id: userId,
      handle: resolvedHandle,
      nickname: nickname || emailBase || "사용자",
      tech_stack: [],
    },
  });
}

export function buildResumePublicSummary(resumePayload: any) {
  const personal = resumePayload?.personalInfo || {};
  const skills = Array.isArray(resumePayload?.skills) ? resumePayload.skills : [];
  const experience = Array.isArray(resumePayload?.experience) ? resumePayload.experience : [];
  const projects = Array.isArray(resumePayload?.projects) ? resumePayload.projects : [];

  return {
    headline: String(personal?.intro || "").slice(0, 160),
    topSkills: skills
      .map((item: any) => item?.name)
      .filter(Boolean)
      .slice(0, 8),
    recentExperience: experience.slice(0, 3).map((item: any) => ({
      company: item?.company || "",
      position: item?.position || "",
      period: item?.period || "",
    })),
    topProjects: projects.slice(0, 3).map((item: any) => ({
      name: item?.name || "",
      techStack: Array.isArray(item?.techStack) ? item.techStack.slice(0, 6) : [],
    })),
  };
}

export type PublicResumeSummary = ReturnType<typeof buildResumePublicSummary>;
