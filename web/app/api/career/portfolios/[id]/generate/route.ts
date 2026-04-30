import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  PORTFOLIO_CANVAS_STYLE_VERSION,
  buildPortfolioPublicSummary,
  createDefaultPortfolioDocument,
  createFallbackPortfolioGenerationPlan,
  getPortfolioTemplate,
  normalizePortfolioDocument,
  polishPortfolioDocument,
  withPortfolioSampleImages,
  type PortfolioDocument,
  type PortfolioGenerationPlan,
  type PortfolioSection,
  type PortfolioSourceData,
  type PortfolioTemplateId,
} from "@/lib/career-portfolios";
import {
  mapPortfolioRow,
  portfolioDelegate,
  toPortfolioFormat,
  toPortfolioGenerationPreset,
  toPortfolioOrientation,
  toPortfolioPageSize,
  type PortfolioRow,
} from "@/lib/server/career-portfolios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function asSourceData(value: unknown): PortfolioSourceData {
  if (value && typeof value === "object") {
    return value as PortfolioSourceData;
  }
  return {
    personalInfo: { name: "", email: "", phone: "", intro: "", links: {} },
    skills: [],
    projects: [],
    workExperiences: [],
    coverLetters: [],
  };
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

async function generatePortfolioDraft(input: {
  source: PortfolioSourceData;
  templateId: PortfolioTemplateId;
  baseDocument: PortfolioDocument;
  plan: PortfolioGenerationPlan;
}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return input.baseDocument;

  const formatLabel =
    input.baseDocument.format === "document"
      ? "A4 세로 보고서형 포트폴리오"
      : "16:9 가로 PPT 포트폴리오";
  const prompt = `너는 개발자 채용 포트폴리오 아트디렉터이자 커리어 에디터다.
목표는 사용자의 실제 프로젝트/경력/개인정보만 사용해서 채용 담당자가 빠르게 이해하는 고품질 ${formatLabel} 초안을 만드는 것이다.
제공되지 않은 수치, 회사명, 성과, 기술은 절대 만들지 않는다.
이미지 URL을 새로 만들지 않는다. 기본 문서의 image/images 필드는 유지한다.

[품질 기준]
- 표지는 한 문장으로 사용자의 포지션/강점을 명확히 보여준다.
- 각 프로젝트 페이지는 "문제/역할/해결/결과" 흐름이 보이게 제목, 부제, 본문을 재구성한다.
- PPT형은 제목을 발표 자료처럼 짧고 선명하게, A4형은 보고서처럼 소제목과 설명이 연결되게 쓴다.
- 본문은 PPT형 3~5줄, A4형 5~8줄 안에서 포트폴리오용 요약으로 만든다.
- tags는 슬라이드 핵심 키워드 3~6개만 남긴다.
- 데이터에 없는 정량 성과를 만들지 않는다.
- 전문적이지만 과장 없는 한국어 명사형/간결체를 사용한다.

[소스 데이터]
${JSON.stringify(input.source, null, 2)}

[생성 플랜]
${JSON.stringify(input.plan, null, 2)}

[기본 문서]
${JSON.stringify(input.baseDocument, null, 2)}

JSON 하나만 반환:
{
  "document": {
    "version": 1,
    "templateId": "${input.templateId}",
    "theme": 기존 theme 유지,
    "sections": 기존 섹션 수와 순서를 유지하되 title/subtitle/body/tags만 고품질 포트폴리오 PPT 문장으로 개선
  }
}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const parsed = extractJsonObject(result.response.text());
  const normalized = polishPortfolioDocument(
    withPortfolioSampleImages(
      normalizePortfolioDocument(
        parsed?.document
          ? {
              ...input.baseDocument,
              ...parsed.document,
              format: input.baseDocument.format,
              pageSize: input.baseDocument.pageSize,
              orientation: input.baseDocument.orientation,
              generationPreset: input.baseDocument.generationPreset,
            }
          : input.baseDocument,
        input.templateId,
      ),
    ),
  );

  return {
    ...normalized,
    sections: preserveGeneratedMedia(input.baseDocument.sections, normalized.sections),
  };
}

async function generatePortfolioPlan(input: {
  source: PortfolioSourceData;
  templateId: PortfolioTemplateId;
  format: PortfolioDocument["format"];
  pageSize: PortfolioDocument["pageSize"];
  generationPreset: PortfolioDocument["generationPreset"];
}): Promise<PortfolioGenerationPlan> {
  const fallbackPlan = createFallbackPortfolioGenerationPlan(input.source);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return fallbackPlan;

  const template = getPortfolioTemplate(input.templateId);
  const formatLabel = input.format === "document" ? "A4 세로 보고서형" : "16:9 PPT형";
  const prompt = `너는 한국 채용시장용 개발자 포트폴리오 기획자다.
제공된 데이터만 근거로 ${formatLabel} 생성 플랜을 만든다.
없는 수치, 없는 성과, 없는 회사명, 없는 수상은 절대 만들지 않는다.
데이터가 부족하면 담당 역할, 구현 기능, 검증한 내용 중심으로 기획한다.

[템플릿 블루프린트]
${JSON.stringify(template.blueprint, null, 2)}

[출력 포맷]
${JSON.stringify(
  {
    format: input.format,
    pageSize: input.pageSize,
    generationPreset: input.generationPreset,
    rule:
      input.format === "document"
        ? "A4 보고서형은 한 페이지 안에 맥락과 근거를 더 충분히 담고, 표/타임라인/요약 박스를 우선한다."
        : "PPT형은 한 장당 메시지 하나, 큰 제목, 이미지/인포그래픽 중심으로 구성한다.",
  },
  null,
  2,
)}

[소스 데이터]
${JSON.stringify(input.source, null, 2)}

JSON 하나만 반환:
{
  "position": "추정 포지션",
  "strengths": ["강점 1", "강점 2", "강점 3"],
  "projectMessages": [
    {
      "sourceId": "프로젝트 id",
      "title": "프로젝트명",
      "role": "역할",
      "coreMessage": "핵심 메시지",
      "problem": "문제",
      "solution": "해결",
      "result": "결과",
      "projectType": "web-service|data-ai|collaboration|backend-api|general",
      "imageHint": "representative|dashboard|workspace|team|studio",
      "infographicType": "flow|metric|timeline"
    }
  ],
  "slidePlan": [
    {
      "type": "hero|about|skills|index|project|experience|quote|gallery|retrospective|contact",
      "title": "슬라이드 제목",
      "purpose": "슬라이드 목적",
      "sourceId": "선택 사항",
      "infographicType": "flow|metric|timeline|techLogo"
    }
  ]
}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const parsed = extractJsonObject(result.response.text());
    if (!parsed || typeof parsed !== "object") return fallbackPlan;
    return {
      ...fallbackPlan,
      ...(parsed as Partial<PortfolioGenerationPlan>),
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length
        ? parsed.strengths.slice(0, 3)
        : fallbackPlan.strengths,
      projectMessages: Array.isArray(parsed.projectMessages) && parsed.projectMessages.length
        ? parsed.projectMessages.slice(0, 4)
        : fallbackPlan.projectMessages,
      slidePlan: Array.isArray(parsed.slidePlan) && parsed.slidePlan.length
        ? parsed.slidePlan.slice(0, getPortfolioTemplate(input.templateId).blueprint.targetSlideCount)
        : fallbackPlan.slidePlan,
    };
  } catch (error) {
    console.error("Portfolio plan generation failed", error);
    return fallbackPlan;
  }
}

function buildGenerationQuality(input: {
  source: PortfolioSourceData;
  document: PortfolioDocument;
  plan: PortfolioGenerationPlan;
}) {
  const infographicCount = input.document.sections.reduce(
    (count, section) =>
      count +
      (section.canvas?.elements || []).filter((element) =>
        ["flow", "metric", "timeline", "techLogo"].includes(element.kind),
      ).length,
    0,
  );
  const representativeImageCount = input.source.projects.filter(
    (project) => project.representativeImage?.url,
  ).length;
  const score =
    60 +
    Math.min(15, input.document.sections.length) +
    Math.min(15, infographicCount) +
    Math.min(10, representativeImageCount * 3);

  return {
    score: Math.min(100, score),
    pageCount: input.document.sections.length,
    slideCount: input.document.sections.length,
    format: input.document.format,
    pageSize: input.document.pageSize,
    projectCount: input.source.projects.length,
    representativeImageCount,
    infographicCount,
    strengths: input.plan.strengths,
    warnings: input.source.projects.length ? [] : ["선택된 프로젝트가 없어 기본 포트폴리오 흐름으로 생성됨"],
  };
}

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = (await portfolioDelegate().findFirst({
    where: { id: params.id, user_id: user.id },
  })) as PortfolioRow | null;

  if (!row) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };

      try {
        if (request.signal.aborted) return;
        const templateId = toTemplateId(row.template_id);
        const format = toPortfolioFormat(row.format);
        const pageSize = toPortfolioPageSize(row.page_size, format);
        const orientation = toPortfolioOrientation(row.orientation, pageSize);
        const generationPreset = toPortfolioGenerationPreset(row.generation_preset, format);
        const source = asSourceData(row.source_snapshot);
        const template = getPortfolioTemplate(templateId);

        await portfolioDelegate().update({
          where: { id: row.id },
          data: {
            generation_status: "running",
            generation_quality: { stage: "started", format, pageSize },
            updated_at: new Date(),
          },
        });

        send("stage", { label: "프로젝트 데이터 분석 중" });
        const plan = await generatePortfolioPlan({
          source,
          templateId,
          format,
          pageSize,
          generationPreset,
        });
        send("plan", { plan });

        send("stage", { label: "핵심 경험 정리 중" });
        const baseDocument = polishPortfolioDocument(
          withPortfolioSampleImages(
            createDefaultPortfolioDocument(templateId, source, {
              format,
              pageSize,
              orientation,
              generationPreset,
            }),
          ),
        );
        send("document", { document: baseDocument });

        send("stage", { label: "대표 이미지 선택 중" });
        send("stage", { label: "슬라이드 구성 설계 중" });
        const generatedDocument = await generatePortfolioDraft({
          source,
          templateId,
          baseDocument,
          plan,
        });
        const polishedDocument = polishPortfolioDocument(withPortfolioSampleImages(generatedDocument));

        send("stage", { label: "인포그래픽 배치 중" });
        send("stage", { label: "디자인 자동 정돈 중" });
        polishedDocument.sections.forEach((section, index) => {
          send("section", {
            index,
            total: polishedDocument.sections.length,
            section,
          });
        });

        send("stage", { label: "저장 중" });
        const publicSummary = buildPortfolioPublicSummary(polishedDocument);
        const generationQuality = buildGenerationQuality({
          source,
          document: polishedDocument,
          plan,
        });
        const updatedRow = await portfolioDelegate().update({
          where: { id: row.id },
          data: {
            document_payload: polishedDocument,
            format: polishedDocument.format,
            page_size: polishedDocument.pageSize,
            orientation: polishedDocument.orientation,
            generation_preset: polishedDocument.generationPreset,
            public_summary: publicSummary,
            generation_plan: plan,
            generation_status: "completed",
            generation_quality: generationQuality,
            template_blueprint: template.blueprint,
            thumbnail_url: publicSummary.thumbnailUrl || template.previewImage,
            generated_at: new Date(),
            canvas_version: PORTFOLIO_CANVAS_STYLE_VERSION,
            updated_at: new Date(),
          },
        });

        send("complete", {
          item: mapPortfolioRow(updatedRow),
          document: polishedDocument,
          quality: generationQuality,
        });
      } catch (error) {
        console.error("Portfolio stream generation failed", error);
        await portfolioDelegate().update({
          where: { id: row.id },
          data: {
            generation_status: "failed",
            generation_quality: {
              stage: "failed",
              error: error instanceof Error ? error.message : "포트폴리오 생성에 실패했습니다.",
            },
            updated_at: new Date(),
          },
        }).catch(() => undefined);
        send("portfolio-error", {
          error: error instanceof Error ? error.message : "포트폴리오 생성에 실패했습니다.",
        });
      } finally {
        controller.close();
      }
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
