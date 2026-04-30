import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  createDefaultPortfolioDocument,
  getDefaultPortfolioPageSize,
  getDefaultPortfolioPreset,
  getPortfolioPagePreset,
  normalizePortfolioDocument,
  polishPortfolioDocument,
  withPortfolioSampleImages,
  type PortfolioFormat,
  type PortfolioGenerationPreset,
  type PortfolioOrientation,
  type PortfolioPageSize,
  type PortfolioSection,
  type PortfolioSourceData,
  type PortfolioTemplateId,
} from "@/lib/career-portfolios";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "AI 요청에 실패했습니다.";
}

function extractJsonObject(text: string) {
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

function toTemplateId(value: unknown): PortfolioTemplateId {
  if (
    value === "developer-minimal" ||
    value === "case-study" ||
    value === "visual-showcase"
  ) {
    return value;
  }
  return "developer-minimal";
}

function toPortfolioFormat(value: unknown): PortfolioFormat {
  return value === "document" ? "document" : "slide";
}

function toPortfolioPageSize(value: unknown, format: PortfolioFormat): PortfolioPageSize {
  if (value === "a4" || value === "16:9") return value;
  return getDefaultPortfolioPageSize(format);
}

function toPortfolioOrientation(
  value: unknown,
  pageSize: PortfolioPageSize,
): PortfolioOrientation {
  if (value === "portrait" || value === "landscape") return value;
  return getPortfolioPagePreset(pageSize).orientation;
}

function toPortfolioGenerationPreset(
  value: unknown,
  format: PortfolioFormat,
): PortfolioGenerationPreset {
  if (
    value === "interview-pitch" ||
    value === "project-report" ||
    value === "resume-portfolio"
  ) {
    return value;
  }
  return getDefaultPortfolioPreset(format);
}

function preserveGeneratedMedia(
  baseSections: PortfolioSection[],
  generatedSections: PortfolioSection[],
) {
  return generatedSections.map((section, index) => {
    const base =
      baseSections.find((candidate) => candidate.id === section.id) ||
      baseSections[index];

    if (!base) return section;
    return {
      ...section,
      image: section.image || base.image,
      images: section.images?.length ? section.images : base.images,
    };
  });
}

async function generateText(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body.action;
    const source = (body.source || {}) as PortfolioSourceData;
    const templateId = toTemplateId(body.templateId);
    const format = toPortfolioFormat(body.format);
    const pageSize = toPortfolioPageSize(body.pageSize, format);
    const orientation = toPortfolioOrientation(body.orientation, pageSize);
    const generationPreset = toPortfolioGenerationPreset(body.generationPreset, format);

    if (action === "generate-draft") {
      const baseDocument = createDefaultPortfolioDocument(templateId, source, {
        format,
        pageSize,
        orientation,
        generationPreset,
      });
      const formatLabel = format === "document" ? "A4 세로 보고서형" : "16:9 PPT형";
      const prompt = `너는 개발자 채용 포트폴리오 아트디렉터이자 커리어 에디터다.
목표는 사용자의 실제 프로젝트/경력/개인정보만 사용해서 채용 담당자가 빠르게 이해하는 고품질 ${formatLabel} 초안을 만드는 것이다.
제공되지 않은 수치, 회사명, 성과, 기술은 절대 만들지 않는다.
이미지는 업로드 후 사용자가 직접 연결하므로 이미지 URL을 만들지 않는다.
단, 기본 문서에 이미 들어있는 대표 이미지 URL과 image/images 필드는 삭제하지 않는다.

[품질 기준]
- 표지는 한 문장으로 사용자의 포지션/강점을 명확히 보여준다.
- 각 프로젝트 페이지는 "문제/역할/해결/결과" 흐름이 보이게 제목, 부제, 본문을 재구성한다.
- PPT형은 발표 자료처럼 짧고 선명하게, A4형은 보고서처럼 맥락과 근거가 이어지게 쓴다.
- 본문은 긴 자기소개서가 아니라 포트폴리오용 요약으로 만든다.
- tags는 슬라이드에서 강조할 핵심 키워드 3~6개만 남긴다.
- 같은 표현을 반복하지 말고, 프로젝트마다 차별점을 드러낸다.
- 데이터에 없는 정량 성과를 만들지 않는다. 성과가 없으면 과정/역할/의사결정을 중심으로 쓴다.
- 전문적이지만 과장 없는 한국어 명사형/간결체를 사용한다.

[소스 데이터]
${JSON.stringify(source, null, 2)}

[기본 문서]
${JSON.stringify(baseDocument, null, 2)}

JSON 하나만 반환:
{
  "document": {
    "version": 1,
    "templateId": "${templateId}",
    "theme": 기존 theme 유지,
    "sections": 기존 섹션 수와 순서를 유지하되 title/subtitle/body/tags만 고품질 포트폴리오 PPT 문장으로 개선
  }
}`;

      const text = await generateText(prompt);
      const parsed = extractJsonObject(text);
      const normalized = normalizePortfolioDocument(
        parsed?.document
          ? {
              ...baseDocument,
              ...parsed.document,
              format: baseDocument.format,
              pageSize: baseDocument.pageSize,
              orientation: baseDocument.orientation,
              generationPreset: baseDocument.generationPreset,
            }
          : baseDocument,
        templateId,
      );
      const document = {
        ...normalized,
        sections: preserveGeneratedMedia(baseDocument.sections, normalized.sections),
      };
      return NextResponse.json({ document: polishPortfolioDocument(withPortfolioSampleImages(document)) });
    }

    if (action === "refine-section") {
      const section = (body.section || {}) as PortfolioSection;
      const instruction = typeof body.instruction === "string" ? body.instruction : "";
      const prompt = `너는 개발자 채용 포트폴리오 문장 편집자다.
제공된 섹션의 title/subtitle/body만 개선한다.
새로운 사실이나 수치를 만들지 않는다.
한국어 존댓말 또는 간결한 명사형을 섹션 맥락에 맞게 사용한다.

[사용자 요청]
${instruction || "더 명확하고 설득력 있게 다듬어줘"}

[섹션]
${JSON.stringify(section, null, 2)}

JSON 하나만 반환:
{
  "section": {
    "title": "개선된 제목",
    "subtitle": "개선된 부제",
    "body": "개선된 본문"
  }
}`;

      const text = await generateText(prompt);
      const parsed = extractJsonObject(text);
      return NextResponse.json({
        section: {
          title: parsed?.section?.title || section.title,
          subtitle: parsed?.section?.subtitle ?? section.subtitle,
          body: parsed?.section?.body ?? section.body,
        },
      });
    }

    if (action === "caption") {
      const section = (body.section || {}) as PortfolioSection;
      const prompt = `포트폴리오 이미지 caption과 alt text를 추천해라.
이미지 자체를 볼 수 없으므로 섹션 텍스트에 근거해서만 작성한다.
없는 사실을 만들지 않는다.

[섹션]
${JSON.stringify(section, null, 2)}

JSON 하나만 반환:
{
  "caption": "짧은 캡션",
  "alt": "접근성을 위한 대체 텍스트"
}`;

      const text = await generateText(prompt);
      const parsed = extractJsonObject(text);
      return NextResponse.json({
        caption: parsed?.caption || section.title || "포트폴리오 이미지",
        alt: parsed?.alt || section.title || "포트폴리오 이미지",
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("Portfolio AI route failed", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
