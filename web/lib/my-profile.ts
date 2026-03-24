import prisma from "@/lib/prisma";

const FALLBACK_HANDLE_PREFIX = "user";
const PROVIDER_AVATAR_HOST_PATTERNS = [
  "googleusercontent.com",
  "githubusercontent.com",
  "avatars.githubusercontent.com",
  "gravatar.com",
  "twimg.com",
];

type AuthProfileSeedSource = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  raw_user_meta_data?: Record<string, unknown> | null;
} | null | undefined;

function pickFirstString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function isProviderManagedAvatarUrl(value?: string | null) {
  if (!value) return false;
  return PROVIDER_AVATAR_HOST_PATTERNS.some((pattern) =>
    value.toLowerCase().includes(pattern),
  );
}

export function extractAuthProfileSeed(source: AuthProfileSeedSource) {
  const metadata = source?.user_metadata ?? {};
  const rawMetadata = source?.raw_user_meta_data ?? {};

  return {
    email:
      pickFirstString([
        source?.email,
        metadata.email,
        rawMetadata.email,
      ]) ?? null,
    nickname:
      pickFirstString([
        metadata.nickname,
        rawMetadata.nickname,
        metadata.full_name,
        rawMetadata.full_name,
        metadata.name,
        rawMetadata.name,
      ]) ?? null,
    avatarUrl:
      pickFirstString([
        metadata.avatar_url,
        rawMetadata.avatar_url,
        metadata.picture,
        rawMetadata.picture,
        metadata.avatar,
        rawMetadata.avatar,
      ]) ?? null,
  };
}

function shouldSyncAvatarUrl(currentAvatarUrl?: string | null, nextAvatarUrl?: string | null) {
  if (!nextAvatarUrl) return false;
  if (!currentAvatarUrl) return true;
  if (currentAvatarUrl === nextAvatarUrl) return false;
  return isProviderManagedAvatarUrl(currentAvatarUrl);
}

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
  avatarUrl?: string | null;
}) {
  const { userId, nickname, email, avatarUrl } = params;
  const current = await prisma.profiles.findUnique({ where: { id: userId } });
  const emailBase = (email || "").split("@")[0] || "";
  const base = nickname || current?.nickname || emailBase || `${FALLBACK_HANDLE_PREFIX}-${userId.slice(0, 8)}`;

  const updates: Record<string, unknown> = {};
  if ((!current?.nickname || !current.nickname.trim()) && nickname) {
    updates.nickname = nickname;
  }
  if (shouldSyncAvatarUrl(current?.avatar_url, avatarUrl)) {
    updates.avatar_url = avatarUrl;
  }

  if (current?.handle) {
    if (Object.keys(updates).length === 0) {
      return current;
    }

    return prisma.profiles.update({
      where: { id: userId },
      data: updates,
    });
  }

  const resolvedHandle = await generateUniqueHandle(base, userId);

  if (current) {
    return prisma.profiles.update({
      where: { id: userId },
      data: {
        handle: resolvedHandle,
        ...updates,
      },
    });
  }

  return prisma.profiles.create({
    data: {
      id: userId,
      handle: resolvedHandle,
      nickname: nickname || emailBase || "사용자",
      avatar_url: avatarUrl || null,
      tech_stack: [],
    },
  });
}

export function buildResumePublicSummary(resumePayload: any, title?: string) {
  const personal = resumePayload?.personalInfo || {};
  const skills = Array.isArray(resumePayload?.skills) ? resumePayload.skills : [];
  const experience = Array.isArray(resumePayload?.experience) ? resumePayload.experience : [];
  const projects = Array.isArray(resumePayload?.projects) ? resumePayload.projects : [];

  return {
    resumeTitle: title || "",
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

/**
 * Syncs specific resume data (experiences, projects, cover letters) to the master user profile.
 * This ensures that data written in any resume editor is reflected back into the global career hub.
 */
export async function syncResumeToProfile(userId: string, incomingPayload: any) {
  if (!prisma) return;

  // 1. Fetch current profile
  const profile = await prisma.user_resume_profiles.findUnique({
    where: { user_id: userId }
  });

  const masterPayload: any = profile?.resume_payload || {
    personalInfo: { name: "", email: "", phone: "", intro: "", links: {} },
    experience: [],
    projects: [],
    skills: [],
    selfIntroduction: "",
    coverLetters: []
  };

  const incomingExp = Array.isArray(incomingPayload.experience) ? incomingPayload.experience : [];
  const incomingPrj = Array.isArray(incomingPayload.projects) ? incomingPayload.projects : [];
  const incomingCl = Array.isArray(incomingPayload.coverLetters) ? incomingPayload.coverLetters : [];

  // 2. Merge Experiences (Master Pool)
  // We treat both projects and experiences from resumes as "Experiences" in the global hub if they have descriptions
  const masterExperiences = Array.isArray(masterPayload.experience) ? masterPayload.experience : [];
  const expMap = new Map(masterExperiences.map((e: any) => [e.id || e.company, e]));

  // Merge incoming experiences
  incomingExp.forEach((e: any) => {
    const key = e.id || e.company;
    if (key) {
      const existing = expMap.get(key);
      // Merge: priority to incoming, but preserve older fields if not in incoming
      expMap.set(key, existing ? { ...existing, ...e } : e);
    }
  });

  masterPayload.experience = Array.from(expMap.values());

  // 3. Merge Cover Letters
  const masterCoverLetters = Array.isArray(masterPayload.coverLetters) ? masterPayload.coverLetters : [];
  const clMap = new Map();
  // We use title + content excerpt as a fallback key for cover letters if ID is missing or inconsistent
  masterCoverLetters.forEach((c: any) => {
    const key = c.id || `${c.title}-${(c.content || "").slice(0, 20)}`;
    clMap.set(key, c);
  });

  incomingCl.forEach((c: any) => {
    const key = c.id || `${c.title}-${(c.content || "").slice(0, 20)}`;
    if (key) {
      const existing = clMap.get(key);
      clMap.set(key, existing ? { ...existing, ...c } : c);
    }
  });

  // Special handling: If selfIntroduction is in the resume, ensure we have a corresponding record in coverLetters pool if it's significant
  if (incomingPayload.selfIntroduction && incomingPayload.selfIntroduction.length > 50) {
    const si = incomingPayload.selfIntroduction.trim();
    const title = incomingPayload.personalInfo?.name ? `${incomingPayload.personalInfo.name}의 자기소개서` : "작성된 자기소개서";
    
    // Check if any existing cover letter has the exact same content
    const existingMatches = Array.from(clMap.values()).some((c: any) => (c.content || "").trim() === si);
    
    if (!existingMatches) {
      // Create a unique key for this content to prevent repeated additions within the same session
      const key = `si-${si.slice(0, 30).replace(/\s+/g, '')}`;
      if (!clMap.has(key)) {
        clMap.set(key, {
            id: crypto.randomUUID(),
            title,
            content: si,
            createdAt: new Date().toISOString(),
            sourceExperienceIds: []
        });
      }
    }
  }

  // If selfIntroduction is provided in the resume, sync it to the master too
  if (incomingPayload.selfIntroduction !== undefined) {
    masterPayload.selfIntroduction = incomingPayload.selfIntroduction;
  }

  masterPayload.coverLetters = Array.from(clMap.values());

  // 4. Update the profile
  await prisma.user_resume_profiles.upsert({
    where: { user_id: userId },
    update: {
      resume_payload: masterPayload,
      updated_at: new Date()
    },
    create: {
      user_id: userId,
      resume_payload: masterPayload,
      public_summary: buildResumePublicSummary(masterPayload)
    }
  });
}
