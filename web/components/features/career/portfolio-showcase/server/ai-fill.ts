import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NeonEditorialContent } from "../templates/neon-editorial/types";
import type { ProjectSnapshot } from "../shared/project-snapshot-types";

type SeedSource = {
  personalInfo?: {
    name?: string;
    intro?: string;
    email?: string;
  };
  skills?: Array<{ name?: string }>;
};

/**
 * Fill in the content with AI-generated copy based on the user's selected
 * timeline project snapshots and personal info. Returns a new content
 * object on success. Best-effort: any error / missing API key / no
 * projects returns the input unchanged.
 */
export async function aiFillNeonEditorialContent(input: {
  content: NeonEditorialContent;
  source: SeedSource;
  snapshots: ProjectSnapshot[];
}): Promise<NeonEditorialContent> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return input.content;

  // If the user has no projects selected, the LLM has nothing to work with
  // — return input unchanged so the user can fill manually in the editor.
  if (!input.snapshots.length) return input.content;

  try {
    const prompt = buildPrompt(input);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJsonObject(text);
    if (!parsed) return input.content;
    return mergeIntoContent(input.content, parsed);
  } catch {
    return input.content;
  }
}

function buildPrompt(input: {
  content: NeonEditorialContent;
  source: SeedSource;
  snapshots: ProjectSnapshot[];
}): string {
  const name = input.source.personalInfo?.name?.trim() || "Portfolio";
  const intro = input.source.personalInfo?.intro?.trim() || "";
  const projectSummaries = input.snapshots
    .map((p, i) => {
      const obj = p as Record<string, unknown>;
      const title = String(obj.company ?? obj.position ?? `Project ${i + 1}`);
      const role = String(obj.position ?? "");
      const period = String(obj.period ?? "");
      const description = String(obj.description ?? obj.role ?? "");
      const result = String(obj.result ?? "");
      const techStack = Array.isArray(obj.techStack) ? (obj.techStack as string[]).join(", ") : "";
      return `${i + 1}. ${title} (${period}, ${role})\n   설명: ${description}\n   결과: ${result}\n   기술: ${techStack}`;
    })
    .join("\n");

  return `너는 한국 개발자 채용 시장의 포트폴리오 카피라이터다.
아래 사용자 정보와 프로젝트 요약을 바탕으로 "Neon Editorial" 디자인 포트폴리오의 핵심 카피를 채워라.
사용자가 제공하지 않은 수치, 회사명, 성과, 기술은 절대 만들지 마라. 데이터에 없는 정량 성과는 KPI에 넣지 마라.

[사용자]
이름: ${name}
한 줄 소개(원본): ${intro}

[선택된 프로젝트 ${input.snapshots.length}개]
${projectSummaries}

[출력 규칙]
- bio: 사용자의 직무 정체성을 한 줄로 (~40자, 한국어). 과장 없이.
- aboutQuote: 일하는 태도를 보여주는 짧은 인용구 (한국어, 50자 이내).
- aboutParagraphs: 2개 문단. 1) 어떤 종류 개발자인지 + 강점, 2) 최근 프로젝트 흐름·기여.
- strengths: 정확히 4개. 각각 { num: "01"~"04", title: 영문 대문자 키워드 (예: "PERFORMANCE OBSESSION"), body: 한국어 한두 문장 }.
- kpis: 정확한 정량 성과가 프로젝트 결과에 명시되어 있으면 그것만 추출 (최대 3개). { num: number, suffix: "%"|"K+"|"ms"|"개" 등, label: 한국어 짧은 설명 }. 명시된 수치 없으면 빈 배열로.
- marqueeKeywords: 프로젝트들의 techStack을 종합해 핵심 키워드 6~8개 (영문 대문자, 한 단어 또는 짧은 구). 중복 제거.

JSON 하나만 반환:
{
  "bio": "...",
  "aboutQuote": "...",
  "aboutParagraphs": ["...", "..."],
  "strengths": [{ "num": "01", "title": "...", "body": "..." }, ...],
  "kpis": [...],
  "marqueeKeywords": ["...", ...]
}`;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function mergeIntoContent(
  current: NeonEditorialContent,
  ai: Record<string, unknown>,
): NeonEditorialContent {
  const next: NeonEditorialContent = {
    ...current,
    hero: { ...current.hero },
    about: { ...current.about },
    contact: { ...current.contact },
  };

  if (typeof ai.bio === "string" && ai.bio.trim()) {
    next.hero.bio = ai.bio.trim();
  }
  if (typeof ai.aboutQuote === "string" && ai.aboutQuote.trim()) {
    next.about.quote = ai.aboutQuote.trim();
  }
  if (Array.isArray(ai.aboutParagraphs)) {
    const arr = ai.aboutParagraphs.filter(
      (s): s is string => typeof s === "string" && s.trim().length > 0,
    );
    if (arr.length) next.about.paragraphs = arr;
  }
  if (Array.isArray(ai.strengths)) {
    const arr = ai.strengths
      .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
      .map((s, i) => ({
        num: String((s.num as string) ?? String(i + 1).padStart(2, "0")),
        title: String((s.title as string) ?? ""),
        body: String((s.body as string) ?? ""),
      }))
      .filter((s) => s.title || s.body)
      .slice(0, 4);
    if (arr.length) next.about.strengths = arr;
  }
  if (Array.isArray(ai.kpis)) {
    const arr = ai.kpis
      .filter((k): k is Record<string, unknown> => typeof k === "object" && k !== null)
      .map((k) => ({
        num: typeof k.num === "number" ? k.num : Number(k.num) || 0,
        suffix: String(k.suffix ?? ""),
        label: String(k.label ?? ""),
      }))
      .filter((k) => k.label && Number.isFinite(k.num))
      .slice(0, 3);
    next.kpis = arr; // overwrite even if empty (LLM said no measurable KPIs)
  }
  if (Array.isArray(ai.marqueeKeywords)) {
    const arr = ai.marqueeKeywords
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim().toUpperCase())
      .slice(0, 8);
    if (arr.length) next.marqueeKeywords = arr;
  }

  return next;
}
