"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import { syncResumeToProfile } from "@/lib/my-profile";
import {
  getWorkspaceCareerImportCandidate,
  getWorkspaceCareerImportCandidates,
  markWorkspaceCareerImportCandidateImported,
  type WorkspaceCareerImportCandidate,
} from "@/lib/server/workspace-career-import";

export type ExperienceInput = NonNullable<ResumePayload["timeline"]>[number];
export type WorkspaceExperienceImportCandidate = WorkspaceCareerImportCandidate;
export type ProjectInput = ExperienceInput;
export type WorkspaceProjectImportCandidate = WorkspaceCareerImportCandidate;
type MutableResumePayload = Partial<ResumePayload> &
  Record<string, unknown> & {
    timeline?: ExperienceInput[];
  };

const googleApiKey =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const google = googleApiKey
  ? createGoogleGenerativeAI({
      apiKey: googleApiKey,
    })
  : null;

const workspaceDraftSchema = z.object({
  description: z.string().max(500).optional(),
  situation: z.string().max(2000).optional(),
  role: z.string().max(1200).optional(),
  solution: z.string().max(2000).optional(),
  difficulty: z.string().max(1200).optional(),
  result: z.string().max(2000).optional(),
  lesson: z.string().max(1200).optional(),
  tags: z.array(z.string().max(40)).max(10).optional(),
  techStack: z.array(z.string().max(40)).max(12).optional(),
});

function normalizeShortText(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, maxLength);
}

function normalizeTagArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const dedupe = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const tag = item.trim();
    if (!tag) continue;
    dedupe.add(tag.slice(0, 40));
    if (dedupe.size >= 10) break;
  }
  return Array.from(dedupe.values());
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fencedMatch?.[1] || trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  const jsonCandidate = candidate.slice(start, end + 1);
  try {
    return JSON.parse(jsonCandidate) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toMutableResumePayload(value: unknown): MutableResumePayload {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) } as MutableResumePayload;
  }
  return {};
}

function getTimeline(payload: MutableResumePayload): ExperienceInput[] {
  if (!Array.isArray(payload.timeline)) return [];
  return [...payload.timeline];
}

function buildWorkspaceDraftFallback(
  candidate: WorkspaceCareerImportCandidate,
): Partial<ExperienceInput> {
  const baseExperience = buildExperienceFromWorkspaceCandidate(candidate);
  const taskListPreview = candidate.completedTaskTitles.slice(0, 4).join(", ");

  return {
    company: baseExperience.company,
    position: baseExperience.position,
    period: baseExperience.period,
    description:
      baseExperience.description ||
      `${candidate.workspaceName} 워크스페이스 종료 프로젝트입니다.`,
    tags: baseExperience.tags || [],
    techStack: baseExperience.techStack || [],
    situation: normalizeShortText(
      `${candidate.workspaceName} 프로젝트를 진행하며 ${
        candidate.workspaceCategory || "팀 활동"
      } 목표를 달성해야 했고, 완료 태스크를 중심으로 성과를 정리했습니다.`,
      800,
    ),
    role: normalizeShortText(
      candidate.teamRole || normalizeRoleLabel(candidate.role),
      400,
    ),
    solution: normalizeShortText(
      taskListPreview
        ? `완료 태스크 중심으로 우선순위를 관리하며 ${taskListPreview} 작업을 수행했습니다.`
        : candidate.taskSummary,
      1200,
    ),
    difficulty: normalizeShortText(
      "협업 과정에서 일정/품질 균형을 맞추는 점이 가장 큰 도전이었습니다.",
      700,
    ),
    result: normalizeShortText(baseExperience.result, 1200),
    lesson: normalizeShortText(
      "역할 분담과 진행 상황 공유를 정기화하면 프로젝트 완성도를 안정적으로 높일 수 있음을 배웠습니다.",
      700,
    ),
  };
}

async function buildWorkspaceDraftWithAi(
  candidate: WorkspaceCareerImportCandidate,
): Promise<{ draft: Partial<ExperienceInput>; usedAi: boolean }> {
  const fallback = buildWorkspaceDraftFallback(candidate);

  if (!google) {
    return { draft: fallback, usedAi: false };
  }

  const aiPrompt = `
너는 한국어 커리어 코치다.
아래 워크스페이스 프로젝트 데이터를 바탕으로 "프로젝트 작성 폼 초안"을 JSON으로만 생성해라.
문장 길이는 각 항목 1~3문장으로 간결하게 작성해라.

[워크스페이스 활동 데이터]
${JSON.stringify(
    {
      workspaceName: candidate.workspaceName,
      workspaceCategory: candidate.workspaceCategory,
      role: candidate.role,
      teamRole: candidate.teamRole,
      period: buildWorkspacePeriodLabel(candidate),
      resultType: candidate.resultType,
      resultLink: candidate.resultLink,
      resultNote: candidate.resultNote,
      taskSummary: candidate.taskSummary,
      completedTaskTitles: candidate.completedTaskTitles.slice(0, 12),
      focusTags: candidate.focusTags,
    },
    null,
    2,
  )}

[출력 JSON 스키마]
{
  "description": "string",
  "situation": "string",
  "role": "string",
  "solution": "string",
  "difficulty": "string",
  "result": "string",
  "lesson": "string",
  "tags": ["string"],
  "techStack": ["string"]
}

주의:
- JSON 외 텍스트 금지.
- "tags"는 3~8개의 짧은 키워드.
- "techStack"은 실제 사용 기술명만 0~8개로 작성하고, 확인되지 않은 기술은 만들지 마라.
`;

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: aiPrompt,
      temperature: 0.3,
    });

    const parsedJson = extractJsonObject(text);
    if (!parsedJson) {
      return { draft: fallback, usedAi: false };
    }

    const parsed = workspaceDraftSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { draft: fallback, usedAi: false };
    }

    const aiDraft = parsed.data;
    const nextTags = Array.from(
      new Set([...(aiDraft.tags || []), ...(fallback.tags || [])]),
    )
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10);
    const nextTechStack = Array.from(
      new Set([...(aiDraft.techStack || []), ...(fallback.techStack || [])]),
    )
      .map((tech) => tech.trim())
      .filter(Boolean)
      .slice(0, 12);

    return {
      draft: {
        ...fallback,
        description: normalizeShortText(aiDraft.description, 500) || fallback.description,
        situation: normalizeShortText(aiDraft.situation, 2000) || fallback.situation,
        role: normalizeShortText(aiDraft.role, 1200) || fallback.role,
        solution: normalizeShortText(aiDraft.solution, 2000) || fallback.solution,
        difficulty: normalizeShortText(aiDraft.difficulty, 1200) || fallback.difficulty,
        result: normalizeShortText(aiDraft.result, 2000) || fallback.result,
        lesson: normalizeShortText(aiDraft.lesson, 1200) || fallback.lesson,
        tags: normalizeTagArray(nextTags),
        techStack: normalizeTagArray(nextTechStack),
      },
      usedAi: true,
    };
  } catch (error) {
    console.warn("[career] workspace draft AI generation failed:", error);
    return { draft: fallback, usedAi: false };
  }
}

async function ensureActiveResume(userId: string) {
  let activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: userId, is_active: true },
  });

  if (activeResume) {
    return activeResume;
  }

  activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  if (!activeResume) {
    return prisma.user_resumes.create({
      data: {
        user_id: userId,
        title: "새 이력서",
        is_active: true,
        resume_payload: {
          experience: [],
          personalInfo: { name: "", email: "", phone: "", intro: "", links: {} },
          education: [],
          skills: [],
          selfIntroduction: "",
          projects: [],
          coverLetters: [],
        },
        public_summary: {},
      },
    });
  }

  await prisma.user_resumes.update({
    where: { id: activeResume.id },
    data: { is_active: true },
  });

  return activeResume;
}

function formatYearMonth(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}.${month}`;
}

function buildWorkspacePeriodLabel(candidate: WorkspaceCareerImportCandidate): string {
  if (candidate.periodLabel) {
    return candidate.periodLabel;
  }

  const start = formatYearMonth(candidate.startedAt);
  const end = formatYearMonth(candidate.completedAt);

  if (start && end) {
    return `${start} ~ ${end}`;
  }
  if (start) return `${start} ~ 진행`;
  if (end) return `~ ${end}`;
  return "기간 미상";
}

function normalizeRoleLabel(role: string): string {
  const normalized = role.trim().toLowerCase();
  if (normalized === "owner") return "프로젝트 리더";
  if (normalized === "admin") return "운영 담당";
  if (normalized === "viewer") return "참여자";
  return "팀원";
}

function buildExperienceFromWorkspaceCandidate(
  candidate: WorkspaceCareerImportCandidate,
): ExperienceInput {
  const primaryRole = candidate.teamRole || normalizeRoleLabel(candidate.role);
  const description =
    candidate.resultNote ||
    candidate.taskSummary ||
    "워크스페이스 종료 프로젝트 활동입니다.";
  const tags = [
    ...(candidate.focusTags || []),
    "워크스페이스",
    candidate.workspaceCategory || "",
    candidate.resultType || "",
  ]
    .map((value) => value.trim())
    .filter((value, index, arr) => Boolean(value) && arr.indexOf(value) === index);

  const resultLines = [
    candidate.resultType ? `종료 결과: ${candidate.resultType}` : "",
    candidate.resultLink ? `결과 링크: ${candidate.resultLink}` : "",
  ].filter(Boolean);

  return {
    id: crypto.randomUUID(),
    company: candidate.workspaceName,
    position: primaryRole,
    period: buildWorkspacePeriodLabel(candidate),
    description,
    tags,
    role: primaryRole,
    solution: candidate.taskSummary || undefined,
    result:
      resultLines.length > 0 ? resultLines.join("\n") : candidate.taskSummary || undefined,
  };
}

export async function saveExperienceAction(data: ExperienceInput) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;

  const activeResume = await ensureActiveResume(userId);

  const payload = toMutableResumePayload(activeResume.resume_payload);
  const experiences = getTimeline(payload);

  if (data.id) {
    // Update existing
    const index = experiences.findIndex((experience) => experience.id === data.id);
    if (index !== -1) {
      experiences[index] = { ...experiences[index], ...data };
    } else {
      experiences.push(data);
    }
  } else {
    // Create new
    data.id = crypto.randomUUID();
    experiences.push(data);
  }

  payload.timeline = experiences;

  await prisma.user_resumes.update({
    where: { id: activeResume.id },
    data: { resume_payload: payload as Prisma.InputJsonValue }
  });

  // --- 전역 프로필 동기화 ---
  await syncResumeToProfile(userId, payload);

  revalidatePath("/career/experiences");
  revalidatePath("/career/projects");
  return { success: true, experience: data };
}

export async function deleteExperienceAction(id: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;

  const activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: userId, is_active: true }
  });

  if (!activeResume) throw new Error("No active resume");

  const payload = toMutableResumePayload(activeResume.resume_payload);
  let experiences = getTimeline(payload);
  experiences = experiences.filter((experience) => experience.id !== id);
  payload.timeline = experiences;

  await prisma.user_resumes.update({
    where: { id: activeResume.id },
    data: { resume_payload: payload as Prisma.InputJsonValue }
  });

  // Explicitly delete from master profile to avoid merge-only reappearances
  const profile = await prisma.user_resume_profiles.findUnique({
    where: { user_id: userId }
  });

  if (profile && profile.resume_payload) {
    const profilePayload = toMutableResumePayload(profile.resume_payload);
    if (Array.isArray(profilePayload.timeline)) {
      profilePayload.timeline = profilePayload.timeline.filter(
        (experience) => experience.id !== id,
      );
      await prisma.user_resume_profiles.update({
        where: { user_id: userId },
        data: { resume_payload: profilePayload as Prisma.InputJsonValue }
      });
    }
  }

  // --- 전역 프로필 동기화 ---
  await syncResumeToProfile(userId, payload);

  revalidatePath("/career/experiences");
  revalidatePath("/career/projects");
  return { success: true };
}

export async function getExperiencesByIdsAction(ids: string[]) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Read from master profile first (authoritative source for career experiences)
  const profile = await prisma.user_resume_profiles.findUnique({
    where: { user_id: userId }
  });

  if (profile && profile.resume_payload) {
    const payload = toMutableResumePayload(profile.resume_payload);
    const experiences = getTimeline(payload);
    const matched = experiences.filter(e => ids.includes(e.id!));
    if (matched.length > 0) return matched;
  }

  // Fallback to active resume
  const activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: userId, is_active: true }
  });

  if (!activeResume) return [];

  const payload = toMutableResumePayload(activeResume.resume_payload);
  const experiences = getTimeline(payload);

  return experiences.filter((experience) => ids.includes(experience.id!));
}

export async function getAllExperiencesAction() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;

  // Read from master profile first (authoritative source for career experiences)
  const profile = await prisma.user_resume_profiles.findUnique({
    where: { user_id: userId }
  });

  if (profile && profile.resume_payload) {
    const payload = toMutableResumePayload(profile.resume_payload);
    const experiences = getTimeline(payload);
    return experiences;
  }

  // Fallback to active resume
  const activeResume = await prisma.user_resumes.findFirst({
    where: { user_id: userId, is_active: true }
  });

  if (!activeResume) return [];

  const payload = toMutableResumePayload(activeResume.resume_payload);
  const experiences = getTimeline(payload);

  return experiences;
}

export async function getWorkspaceExperienceImportCandidatesAction() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;
  return getWorkspaceCareerImportCandidates(userId);
}

export async function importWorkspaceExperienceCandidateAction(workspaceId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;
  const normalizedWorkspaceId = workspaceId.trim();

  if (!normalizedWorkspaceId) {
    throw new Error("워크스페이스 식별자가 올바르지 않습니다.");
  }

  const candidate = await getWorkspaceCareerImportCandidate(userId, normalizedWorkspaceId);
  if (!candidate) {
    throw new Error("불러올 수 있는 워크스페이스 프로젝트 후보가 없습니다.");
  }

  if (candidate.status === "IMPORTED") {
    throw new Error("이미 불러온 워크스페이스 프로젝트입니다.");
  }

  const activeResume = await ensureActiveResume(userId);
  const payload = toMutableResumePayload(activeResume.resume_payload);
  const experiences = getTimeline(payload);
  const nextExperience = buildExperienceFromWorkspaceCandidate(candidate);

  payload.timeline = [...experiences, nextExperience];

  await prisma.user_resumes.update({
    where: { id: activeResume.id },
    data: { resume_payload: payload as Prisma.InputJsonValue },
  });

  await syncResumeToProfile(userId, payload);
  await markWorkspaceCareerImportCandidateImported(
    userId,
    normalizedWorkspaceId,
    nextExperience.id!,
  );

  revalidatePath("/career/experiences");
  revalidatePath("/career/projects");

  return {
    success: true,
    experience: nextExperience,
  };
}

export async function prepareWorkspaceExperienceDraftAction(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;
  const normalizedWorkspaceId = workspaceId.trim();

  if (!normalizedWorkspaceId) {
    throw new Error("워크스페이스 식별자가 올바르지 않습니다.");
  }

  const candidate = await getWorkspaceCareerImportCandidate(userId, normalizedWorkspaceId);
  if (!candidate) {
    throw new Error("불러올 수 있는 워크스페이스 프로젝트 후보가 없습니다.");
  }

  const { draft, usedAi } = await buildWorkspaceDraftWithAi(candidate);

  return {
    success: true,
    workspaceId: normalizedWorkspaceId,
    workspaceName: candidate.workspaceName,
    usedAi,
    message: usedAi
      ? "AI가 워크스페이스 활동 내역을 분석해 초안을 채웠습니다. 확인 후 수정하고 다음 단계로 넘어가세요."
      : "워크스페이스 활동 내역 기반으로 기본 초안을 채웠습니다. 확인 후 수정하고 다음 단계로 넘어가세요.",
    draft: {
      company: normalizeShortText(draft.company, 120) || candidate.workspaceName,
      position:
        normalizeShortText(draft.position, 120) ||
        candidate.teamRole ||
        normalizeRoleLabel(candidate.role),
      period:
        normalizeShortText(draft.period, 80) || buildWorkspacePeriodLabel(candidate),
      description: normalizeShortText(draft.description, 500) || "",
      tags: normalizeTagArray(draft.tags),
      techStack: normalizeTagArray(draft.techStack),
      situation: normalizeShortText(draft.situation, 2000) || "",
      role: normalizeShortText(draft.role, 1200) || "",
      solution: normalizeShortText(draft.solution, 2000) || "",
      difficulty: normalizeShortText(draft.difficulty, 1200) || "",
      result: normalizeShortText(draft.result, 2000) || "",
      lesson: normalizeShortText(draft.lesson, 1200) || "",
    } satisfies Partial<ExperienceInput>,
  };
}

export async function markWorkspaceExperienceCandidateImportedAction(
  workspaceId: string,
  importedExperienceId: string,
) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;
  const normalizedWorkspaceId = workspaceId.trim();
  const normalizedExperienceId = importedExperienceId.trim();

  if (!normalizedWorkspaceId || !normalizedExperienceId) {
    throw new Error("워크스페이스 또는 프로젝트 식별자가 올바르지 않습니다.");
  }

  const updated = await markWorkspaceCareerImportCandidateImported(
    userId,
    normalizedWorkspaceId,
    normalizedExperienceId,
  );

  revalidatePath("/career/experiences");
  revalidatePath("/career/projects");

  return { success: Boolean(updated) };
}

export async function saveProjectAction(data: ProjectInput) {
  return saveExperienceAction(data);
}

export async function deleteProjectAction(id: string) {
  return deleteExperienceAction(id);
}

export async function getProjectsByIdsAction(ids: string[]) {
  return getExperiencesByIdsAction(ids);
}

export async function getAllProjectsAction() {
  return getAllExperiencesAction();
}

export async function getWorkspaceProjectImportCandidatesAction() {
  return getWorkspaceExperienceImportCandidatesAction();
}

export async function importWorkspaceProjectCandidateAction(workspaceId: string) {
  return importWorkspaceExperienceCandidateAction(workspaceId);
}

export async function prepareWorkspaceProjectDraftAction(workspaceId: string) {
  return prepareWorkspaceExperienceDraftAction(workspaceId);
}

export async function markWorkspaceProjectCandidateImportedAction(
  workspaceId: string,
  importedProjectId: string,
) {
  return markWorkspaceExperienceCandidateImportedAction(
    workspaceId,
    importedProjectId,
  );
}
