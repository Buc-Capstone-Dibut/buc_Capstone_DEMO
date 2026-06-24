import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { generateGeminiText, hasGeminiTextBackend } from "@/lib/ai/gemini-text";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";
import { normalizeResumePayload } from "@/app/my/[handle]/profile-utils";
import { getPortfolioSourceData } from "@/lib/server/career-portfolios";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const MODEL_ID = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

function compact(value: unknown, maxLength = 9000) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fencedMatch?.[1] || trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** Gemini 1회 호출 → JSON 객체 추출. 실패 시 null (호출부에서 섹션별 폴백). */
async function generateJsonSection(
  prompt: string,
): Promise<Record<string, unknown> | null> {
  try {
    const text = await generateGeminiText({
      model: MODEL_ID,
      prompt,
      temperature: 0.4,
      // 이력서 문장 재작성은 깊은 추론이 불필요 → thinking 끄기(가장 큰 지연 요인 제거).
      disableThinking: true,
    });
    return extractJsonObject(text);
  } catch (error) {
    console.error("[resume-generate] section 호출 실패", error);
    return null;
  }
}

function mergeGeneratedResume(current: ResumePayload, generated: unknown): ResumePayload {
  const row = asRecord(generated);
  const next = normalizeResumePayload({
    ...current,
    ...row,
    personalInfo: {
      ...current.personalInfo,
      ...asRecord(row.personalInfo),
      links: {
        ...current.personalInfo.links,
        ...asRecord(asRecord(row.personalInfo).links),
      },
    },
    education: Array.isArray(row.education) ? row.education : current.education,
    experience: Array.isArray(row.experience) ? row.experience : current.experience,
    skills: Array.isArray(row.skills) ? row.skills : current.skills,
    projects: Array.isArray(row.projects) ? row.projects : current.projects,
    coverLetters: current.coverLetters || [],
  });

  return {
    ...next,
    personalInfo: {
      ...next.personalInfo,
      name: current.personalInfo.name || next.personalInfo.name,
      email: current.personalInfo.email || next.personalInfo.email,
      phone: current.personalInfo.phone || next.personalInfo.phone,
      links: {
        ...next.personalInfo.links,
        ...current.personalInfo.links,
      },
    },
  };
}

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasGeminiTextBackend()) {
      return NextResponse.json(
        { success: false, error: "AI 백엔드(Vertex 또는 GEMINI_API_KEY)가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const body = await req.json();
    const currentPayload = normalizeResumePayload(body.currentPayload);
    const targetCompany = String(body.targetCompany || "").trim();
    const targetRole = String(body.targetRole || "").trim();
    const jobDescription = String(body.jobDescription || "").trim();
    const strengths = String(body.strengths || "").trim();

    if (!targetCompany && !targetRole) {
      return NextResponse.json(
        { success: false, error: "지원 회사 또는 지원 직무를 입력해 주세요." },
        { status: 400 },
      );
    }

    const source = await getPortfolioSourceData(session.user.id);

    const targetBlock = `[지원 대상]
- 회사: ${targetCompany || "미지정"}
- 직무: ${targetRole || "미지정"}
- 채용공고/요구사항: ${jobDescription || "미입력"}
- 특히 강조할 강점: ${strengths || "미입력"}`;

    const commonRule =
      "제공되지 않은 회사 경험·수치·기술은 만들지 마라. 기존 텍스트의 표현만 지원 대상에 맞게 압축/재배열할 수 있다.";

    const experiences = currentPayload.experience ?? [];
    const projects = currentPayload.projects ?? [];

    // ── 1) 프로필(제목/인트로/자기소개/스킬/핵심포인트) ──
    const profilePrompt = `너는 개발자 채용 이력서 컨설턴트다. 아래 지원 대상과 지원자 자료를 참고해 '프로필 영역'만 JSON으로 작성하라.
${targetBlock}

[현재 이력서 요약]
${compact(
  {
    personalInfo: currentPayload.personalInfo,
    skills: currentPayload.skills,
    selfIntroduction: currentPayload.selfIntroduction,
  },
  5000,
)}

[커리어 허브 참고]
${compact({ personalInfo: source.personalInfo, skills: source.skills, coverLetters: source.coverLetters }, 6000)}

[규칙]
1. 반드시 JSON 객체만 출력. 마크다운/설명/주석 금지.
2. ${commonRule}
3. name/email/phone/link 같은 연락처는 다루지 않는다.
4. intro: 지원 직무에 맞는 1~2문장 핵심 요약.
5. skills: 지원 직무 관련도 높은 순 8~16개, 각 {name, level, category}.
6. selfIntroduction: 300~500자 자기소개 요약.
7. fitSummary: 지원 대상에 맞춰 조정한 핵심 포인트 3~5개.

[출력 JSON]
{"title":"회사/직무 맞춤 이력서 제목","intro":"","selfIntroduction":"","skills":[{"name":"","level":"Intermediate","category":""}],"fitSummary":[]}`;

    // ── 2) 경력 description (순서 유지) ──
    const experiencePrompt = `너는 개발자 채용 이력서 컨설턴트다. 아래 경력들을 지원 직무에 맞춘 A4 이력서용 description 으로 각각 재작성하라.
${targetBlock}

[경력 목록] (입력 순서·개수를 그대로 유지)
${experiences
  .map(
    (exp, i) =>
      `${i}. ${exp.company || ""} / ${exp.position || ""} / ${exp.period || ""}\n원문: ${exp.description || "(없음)"}`,
  )
  .join("\n")}

[규칙]
1. 반드시 JSON 객체만 출력. 마크다운/설명/주석 금지.
2. ${commonRule}
3. 각 description 은 2~3개의 줄바꿈(\\n) bullet 문장으로.
4. 입력과 같은 순서·개수의 배열로 출력.

[출력 JSON]
{"descriptions":["경력0 description","경력1 description"]}`;

    // ── 3) 프로젝트 description + achievements (순서 유지) ──
    const projectPrompt = `너는 개발자 채용 이력서 컨설턴트다. 아래 프로젝트들을 지원 직무에 맞춰 A4 이력서용으로 재작성하라.
${targetBlock}

[프로젝트 목록] (입력 순서·개수를 그대로 유지)
${projects
  .map(
    (proj, i) =>
      `${i}. ${proj.name || ""} / ${proj.period || ""} / ${(proj.techStack || []).join(", ")}\n원문: ${proj.description || "(없음)"}`,
  )
  .join("\n")}

[규칙]
1. 반드시 JSON 객체만 출력. 마크다운/설명/주석 금지.
2. ${commonRule}
3. 각 description 은 2~3개의 줄바꿈(\\n) bullet 문장으로.
4. achievements 는 실제 근거가 있는 성과/역할 중심 2~4개.
5. 입력과 같은 순서·개수의 배열로 출력.

[출력 JSON]
{"items":[{"description":"","achievements":[]}]}`;

    // 세 영역을 동시에 생성 → 전체 대기시간 ≈ 가장 느린 한 호출.
    const [profileRes, experienceRes, projectRes] = await Promise.all([
      generateJsonSection(profilePrompt),
      experiences.length > 0 ? generateJsonSection(experiencePrompt) : Promise.resolve(null),
      projects.length > 0 ? generateJsonSection(projectPrompt) : Promise.resolve(null),
    ]);

    // 세 호출이 모두 실패했을 때만 오류로 본다.
    if (!profileRes && !experienceRes && !projectRes) {
      return NextResponse.json(
        { success: false, error: "AI 응답을 이력서로 해석하지 못했습니다." },
        { status: 502 },
      );
    }

    const profile = asRecord(profileRes);

    // 경력 description 머지 (실패/누락 시 원본 유지)
    const experienceDescriptions = asStringArray(asRecord(experienceRes).descriptions);
    const mergedExperience = experiences.map((exp, i) => {
      const next = experienceDescriptions[i];
      return typeof next === "string" && next.trim()
        ? { ...exp, description: next }
        : exp;
    });

    // 프로젝트 description/achievements 머지 (실패/누락 시 원본 유지)
    const projectItems = Array.isArray(asRecord(projectRes).items)
      ? (asRecord(projectRes).items as unknown[])
      : [];
    const mergedProjects = projects.map((proj, i) => {
      const item = asRecord(projectItems[i]);
      const description =
        typeof item.description === "string" && item.description.trim()
          ? item.description
          : proj.description;
      const achievements = Array.isArray(item.achievements)
        ? asStringArray(item.achievements)
        : proj.achievements;
      return { ...proj, description, achievements };
    });

    // 프로필 영역은 정의된 값만 generated 에 실어서 머지(undefined 덮어쓰기 방지).
    const generated: Record<string, unknown> = {
      experience: mergedExperience,
      projects: mergedProjects,
    };
    if (typeof profile.intro === "string" && profile.intro.trim()) {
      generated.personalInfo = { intro: profile.intro };
    }
    if (typeof profile.selfIntroduction === "string" && profile.selfIntroduction.trim()) {
      generated.selfIntroduction = profile.selfIntroduction;
    }
    if (Array.isArray(profile.skills) && profile.skills.length > 0) {
      generated.skills = profile.skills;
    }

    const nextPayload = mergeGeneratedResume(currentPayload, generated);
    const title =
      typeof profile.title === "string" && profile.title.trim()
        ? profile.title.trim()
        : `${targetCompany || targetRole} 맞춤 이력서`;
    const fitSummary = asStringArray(profile.fitSummary).slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        title,
        resumePayload: nextPayload,
        applicationTarget: {
          company: targetCompany,
          role: targetRole,
          jobDescription,
        },
        fitSummary,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "맞춤형 이력서 생성 실패";
    console.error("[resume-generate]", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
