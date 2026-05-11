import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

    const apiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY is not configured" },
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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_ID });

    const prompt = `너는 개발자 채용 이력서 전문 컨설턴트다.
사용자의 기존 이력서, 커리어 허브에 저장된 프로젝트/경력/자기소개서 기록을 모두 참고하여 지원 회사와 직무에 맞춘 한국식 A4 이력서를 JSON으로 재구성하라.

[지원 대상]
- 회사: ${targetCompany || "미지정"}
- 직무: ${targetRole || "미지정"}
- 채용공고/요구사항: ${jobDescription || "미입력"}
- 특히 강조할 강점: ${strengths || "미입력"}

[현재 편집 중인 이력서]
${compact(currentPayload, 9000)}

[커리어 허브 전체 참고 데이터]
${compact(
  {
    personalInfo: source.personalInfo,
    skills: source.skills,
    projects: source.projects,
    workExperiences: source.workExperiences,
    coverLetters: source.coverLetters,
  },
  14000,
)}

[출력 규칙]
1. 반드시 JSON 객체만 출력한다. 마크다운, 설명, 주석 금지.
2. 제공되지 않은 회사 경험, 수치, 기술은 만들지 않는다. 다만 기존 텍스트의 표현은 지원 대상에 맞게 압축/재배열할 수 있다.
3. name/email/phone/link 같은 연락처는 기존 값을 유지한다.
4. personalInfo.intro는 지원 직무에 맞는 1~2문장 핵심 요약으로 작성한다.
5. skills는 지원 직무와 관련도가 높은 순서로 8~18개를 선정한다.
6. experience/projects는 채용 담당자가 읽기 쉬운 A4 이력서 문장으로 재작성하되, 각 description은 2~4개의 줄바꿈 bullet 문장으로 작성한다.
7. projects[].achievements는 실제 근거가 있는 성과/역할 중심 2~4개로 작성한다.
8. selfIntroduction은 이력서 하단에 붙일 수 있는 450~750자 자기소개 요약으로 작성한다.

[출력 JSON 스키마]
{
  "title": "회사/직무 맞춤 이력서 제목",
  "resumePayload": {
    "personalInfo": {"name":"", "email":"", "phone":"", "intro":"", "links": {}},
    "education": [],
    "experience": [{"id":"", "company":"", "position":"", "period":"", "description":""}],
    "skills": [{"name":"", "level":"Intermediate", "category":""}],
    "selfIntroduction": "",
    "projects": [{"id":"", "name":"", "period":"", "description":"", "techStack": [], "achievements": []}]
  },
  "fitSummary": ["이 회사/직무에 맞춰 조정한 핵심 포인트 3~5개"]
}`;

    const result = await model.generateContent(prompt);
    const parsed = extractJsonObject(result.response.text());
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: "AI 응답을 이력서 JSON으로 해석하지 못했습니다." },
        { status: 502 },
      );
    }

    const nextPayload = mergeGeneratedResume(currentPayload, parsed.resumePayload);
    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : `${targetCompany || targetRole} 맞춤 이력서`;
    const fitSummary = Array.isArray(parsed.fitSummary)
      ? parsed.fitSummary.filter((item): item is string => typeof item === "string").slice(0, 5)
      : [];

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
