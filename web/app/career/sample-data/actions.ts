"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import {
  buildResumePublicSummary,
  ensureProfileForUser,
  extractAuthProfileSeed,
} from "@/lib/my-profile";

type CareerProject = NonNullable<ResumePayload["timeline"]>[number] & {
  source?: string;
  sample?: boolean;
  seedVersion?: number;
};
type CareerWorkExperience = ResumePayload["experience"][number] & {
  source?: string;
  sample?: boolean;
  seedVersion?: number;
};
type CareerResumeProject = ResumePayload["projects"][number] & {
  source?: string;
  sample?: boolean;
  seedVersion?: number;
};
type CareerSkill = ResumePayload["skills"][number] & {
  source?: string;
  sample?: boolean;
  seedVersion?: number;
};

type MutableResumePayload = Partial<ResumePayload> &
  Record<string, unknown> & {
    timeline?: CareerProject[];
    experience?: CareerWorkExperience[];
    projects?: CareerResumeProject[];
    skills?: CareerSkill[];
  };

const SAMPLE_SOURCE = "career-sample";
const SAMPLE_SEED_VERSION = 1;

const SAMPLE_PROJECTS: CareerProject[] = [
  {
    id: "career-sample-project-ai-interview",
    company: "AI 면접 코칭 플랫폼",
    position: "프론트엔드 리드",
    period: "2025.03 ~ 2025.06",
    description:
      "지원자가 모의 면접을 진행하고 AI 피드백 리포트를 확인할 수 있는 웹 서비스를 설계했습니다.",
    tags: ["AI", "면접", "대시보드", "사용자 경험"],
    techStack: ["Next.js", "TypeScript", "Supabase", "Gemini API", "Tailwind CSS"],
    situation:
      "면접 준비 과정에서 질문 연습, 답변 기록, 피드백 확인이 각각 분리되어 있어 사용자가 개선 흐름을 이어가기 어려웠습니다.",
    role:
      "면접 진행 화면과 결과 리포트의 정보 구조를 설계하고, 녹화/텍스트 피드백 데이터를 한 화면에서 확인하는 프론트엔드 흐름을 구현했습니다.",
    solution:
      "세션 단위로 질문과 답변을 저장하고, 역량별 점수와 개선 제안을 카드와 타임라인으로 나누어 반복 학습이 가능하도록 구성했습니다.",
    difficulty:
      "AI 응답 지연과 사용자의 체감 속도 사이의 간극이 컸고, 리포트 생성 중 이탈을 줄이는 상태 설계가 필요했습니다.",
    result:
      "리포트 확인까지의 단계를 단순화하고, 생성 상태를 명확히 표시해 테스트 사용자들이 피드백을 더 빠르게 이해할 수 있게 했습니다.",
    lesson:
      "AI 기능은 결과 품질뿐 아니라 대기 상태와 실패 복구 흐름까지 제품 경험으로 설계해야 한다는 점을 배웠습니다.",
    source: SAMPLE_SOURCE,
    sample: true,
    seedVersion: SAMPLE_SEED_VERSION,
  },
  {
    id: "career-sample-project-workspace",
    company: "팀 협업 워크스페이스",
    position: "풀스택 개발",
    period: "2024.09 ~ 2024.12",
    description:
      "프로젝트 팀이 문서, 칸반, 메시지를 한 공간에서 관리할 수 있는 협업 워크스페이스를 개발했습니다.",
    tags: ["협업", "워크스페이스", "칸반", "실시간"],
    techStack: ["React", "Prisma", "PostgreSQL", "Socket.IO", "Zustand"],
    situation:
      "팀 프로젝트 진행 중 업무 현황과 산출물이 여러 도구에 흩어져 있어 진행률 파악과 기록 관리가 어려웠습니다.",
    role:
      "워크스페이스 정보 구조, 칸반 보드, 멤버 권한, 최근 활동 흐름을 담당하고 서버 API와 클라이언트 상태를 연결했습니다.",
    solution:
      "업무 상태를 칸반 컬럼 기준으로 관리하고, 문서와 메시지를 워크스페이스 단위로 묶어 프로젝트 맥락을 잃지 않도록 설계했습니다.",
    difficulty:
      "권한별 접근 범위와 실시간 갱신 타이밍을 맞추는 과정에서 데이터 정합성 문제가 발생했습니다.",
    result:
      "팀별 작업 보드와 문서 접근 경로를 통합해 회의 전 진행 상황을 확인하는 시간이 줄었습니다.",
    lesson:
      "협업 도구에서는 기능 개수보다 팀이 같은 상태를 보고 있다고 느끼게 하는 데이터 모델이 중요하다는 점을 배웠습니다.",
    source: SAMPLE_SOURCE,
    sample: true,
    seedVersion: SAMPLE_SEED_VERSION,
  },
];

const SAMPLE_WORK_EXPERIENCES: CareerWorkExperience[] = [
  {
    id: "career-sample-work-frontend-intern",
    company: "디버트 랩스",
    position: "프론트엔드 개발 인턴",
    period: "2024.07 ~ 2024.08",
    description:
      "Next.js 기반 서비스의 커리어 관리 화면을 개선하고, 사용자 입력 데이터를 이력서와 포트폴리오 생성 흐름에 연결했습니다.",
    source: SAMPLE_SOURCE,
    sample: true,
    seedVersion: SAMPLE_SEED_VERSION,
  },
];

const SAMPLE_SKILLS: CareerSkill[] = [
  { name: "TypeScript", level: "Advanced", category: "Frontend", source: SAMPLE_SOURCE, sample: true, seedVersion: SAMPLE_SEED_VERSION },
  { name: "React", level: "Advanced", category: "Frontend", source: SAMPLE_SOURCE, sample: true, seedVersion: SAMPLE_SEED_VERSION },
  { name: "Next.js", level: "Advanced", category: "Frontend", source: SAMPLE_SOURCE, sample: true, seedVersion: SAMPLE_SEED_VERSION },
  { name: "Tailwind CSS", level: "Intermediate", category: "Frontend", source: SAMPLE_SOURCE, sample: true, seedVersion: SAMPLE_SEED_VERSION },
  { name: "Prisma", level: "Intermediate", category: "Backend", source: SAMPLE_SOURCE, sample: true, seedVersion: SAMPLE_SEED_VERSION },
  { name: "PostgreSQL", level: "Intermediate", category: "Backend", source: SAMPLE_SOURCE, sample: true, seedVersion: SAMPLE_SEED_VERSION },
  { name: "Supabase", level: "Intermediate", category: "Backend", source: SAMPLE_SOURCE, sample: true, seedVersion: SAMPLE_SEED_VERSION },
  { name: "Gemini API", level: "Intermediate", category: "AI", source: SAMPLE_SOURCE, sample: true, seedVersion: SAMPLE_SEED_VERSION },
];

function toResumeProject(project: CareerProject): CareerResumeProject {
  const achievement = project.result || project.solution || project.description;
  return {
    id: project.id,
    name: project.company,
    period: project.period,
    description: project.description,
    techStack: project.techStack || [],
    achievements: achievement ? [achievement] : [],
    tags: project.tags,
    ...(project.representativeImage
      ? { representativeImage: project.representativeImage }
      : {}),
    situation: project.situation,
    role: project.role,
    solution: project.solution,
    difficulty: project.difficulty,
    result: project.result,
    lesson: project.lesson,
    source: SAMPLE_SOURCE,
    sample: true,
    seedVersion: SAMPLE_SEED_VERSION,
  };
}

function asPayload(value: unknown): MutableResumePayload {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) } as MutableResumePayload;
  }
  return {};
}

function ensurePayloadShape(payload: MutableResumePayload): MutableResumePayload {
  return {
    ...payload,
    personalInfo:
      typeof payload.personalInfo === "object" && payload.personalInfo !== null
        ? payload.personalInfo
        : { name: "", email: "", phone: "", intro: "", links: {} },
    education: Array.isArray(payload.education) ? payload.education : [],
    experience: Array.isArray(payload.experience) ? payload.experience : [],
    timeline: Array.isArray(payload.timeline) ? payload.timeline : [],
    projects: Array.isArray(payload.projects) ? payload.projects : [],
    skills: Array.isArray(payload.skills) ? payload.skills : [],
    selfIntroduction:
      typeof payload.selfIntroduction === "string" ? payload.selfIntroduction : "",
    coverLetters: Array.isArray(payload.coverLetters) ? payload.coverLetters : [],
  };
}

function appendMissingById<T extends { id?: string }>(current: T[], samples: T[]) {
  const ids = new Set(current.map((item) => item.id).filter(Boolean));
  const appended = samples.filter((item) => item.id && !ids.has(item.id));
  return {
    items: [...current, ...appended],
    added: appended.length,
  };
}

function appendMissingSkills(current: CareerSkill[]) {
  const names = new Set(
    current
      .map((skill) => skill.name.trim().toLowerCase())
      .filter(Boolean),
  );
  const appended = SAMPLE_SKILLS.filter((skill) => !names.has(skill.name.toLowerCase()));
  return {
    items: [...current, ...appended],
    added: appended.length,
  };
}

function mergeSampleData(payload: MutableResumePayload) {
  const next = ensurePayloadShape(payload);
  const projectMerge = appendMissingById(next.timeline || [], SAMPLE_PROJECTS);
  const resumeProjectMerge = appendMissingById(
    next.projects || [],
    SAMPLE_PROJECTS.map(toResumeProject),
  );
  const workMerge = appendMissingById(next.experience || [], SAMPLE_WORK_EXPERIENCES);
  const skillMerge = appendMissingSkills(next.skills || []);
  const personalInfo = {
    name: "",
    email: "",
    phone: "",
    intro: "",
    links: {},
    ...(next.personalInfo || {}),
  };

  if (!personalInfo.intro?.trim()) {
    personalInfo.intro =
      "사용자 경험과 데이터 흐름을 함께 고민하며, AI 기반 커리어 서비스를 만드는 프론트엔드 개발자입니다.";
  }

  return {
    payload: {
      ...next,
      personalInfo,
      timeline: projectMerge.items,
      projects: resumeProjectMerge.items,
      experience: workMerge.items,
      skills: skillMerge.items,
      selfIntroduction:
        next.selfIntroduction?.trim() ||
        "문제를 구조화하고 사용자 흐름을 끝까지 완성하는 개발자가 되고 싶습니다. 프로젝트마다 데이터 모델, 화면 상태, 생성형 AI 응답 흐름을 함께 고려하며 실제 사용자가 결과물을 완성할 수 있는 경험을 만드는 데 집중했습니다.",
    } satisfies MutableResumePayload,
    added: {
      projects: projectMerge.added,
      resumeProjects: resumeProjectMerge.added,
      workExperiences: workMerge.added,
      skills: skillMerge.added,
    },
  };
}

export async function seedCareerSampleDataAction() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const seed = extractAuthProfileSeed(session.user);
  await ensureProfileForUser({
    userId,
    nickname: seed.nickname,
    email: seed.email,
    avatarUrl: seed.avatarUrl,
  });

  const [activeResume, latestResume, profile] = await Promise.all([
    prisma.user_resumes.findFirst({
      where: { user_id: userId, is_active: true },
      orderBy: { updated_at: "desc" },
    }),
    prisma.user_resumes.findFirst({
      where: { user_id: userId },
      orderBy: { updated_at: "desc" },
    }),
    prisma.user_resume_profiles.findUnique({
      where: { user_id: userId },
    }),
  ]);

  const targetResume = activeResume || latestResume;
  const activeMerge = mergeSampleData(asPayload(targetResume?.resume_payload));
  const profileMerge = mergeSampleData(
    asPayload(profile?.resume_payload || targetResume?.resume_payload),
  );
  const title = targetResume?.title || "샘플 커리어 이력서";

  if (targetResume) {
    await prisma.user_resumes.update({
      where: { id: targetResume.id },
      data: {
        title,
        is_active: true,
        resume_payload: activeMerge.payload as Prisma.InputJsonValue,
        public_summary: buildResumePublicSummary(activeMerge.payload, title) as Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.user_resumes.create({
      data: {
        user_id: userId,
        title,
        is_active: true,
        resume_payload: activeMerge.payload as Prisma.InputJsonValue,
        public_summary: buildResumePublicSummary(activeMerge.payload, title) as Prisma.InputJsonValue,
        source_type: "sample",
      },
    });
  }

  await prisma.user_resume_profiles.upsert({
    where: { user_id: userId },
    update: {
      resume_payload: profileMerge.payload as Prisma.InputJsonValue,
      public_summary: buildResumePublicSummary(profileMerge.payload) as Prisma.InputJsonValue,
      updated_at: new Date(),
    },
    create: {
      user_id: userId,
      resume_payload: profileMerge.payload as Prisma.InputJsonValue,
      public_summary: buildResumePublicSummary(profileMerge.payload) as Prisma.InputJsonValue,
      source_type: "sample",
    },
  });

  revalidatePath("/career/projects");
  revalidatePath("/career/work-experience");
  revalidatePath("/career/cover-letters");
  revalidatePath("/career/portfolios");
  revalidatePath("/career/resumes");
  revalidatePath("/resume");

  return {
    success: true,
    added: {
      projects: Math.max(activeMerge.added.projects, profileMerge.added.projects),
      workExperiences: Math.max(
        activeMerge.added.workExperiences,
        profileMerge.added.workExperiences,
      ),
      skills: Math.max(activeMerge.added.skills, profileMerge.added.skills),
    },
    projects: profileMerge.payload.timeline || [],
    workExperiences: profileMerge.payload.experience || [],
    skills: profileMerge.payload.skills || [],
  };
}
