import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  PORTFOLIO_CANVAS_STYLE_VERSION,
  buildPortfolioPublicSummary,
  createDefaultPortfolioDocument,
  createFallbackPortfolioEvidenceBrief,
  createFallbackPortfolioGenerationPlan,
  getPortfolioTemplate,
  normalizePortfolioEvidenceBrief,
  normalizePortfolioDocument,
  polishPortfolioDocument,
  withPortfolioSampleImages,
  type PortfolioDocument,
  type PortfolioEvidenceBrief,
  type PortfolioGenerationPlan,
  type PortfolioSection,
  type PortfolioSitePage,
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

function hasImageSource(image: PortfolioSitePage["image"]) {
  return Boolean(image?.url || image?.assetId);
}

function preserveGeneratedPageMedia(
  basePages: PortfolioSitePage[],
  generatedPages: PortfolioSitePage[],
) {
  return generatedPages.map((page, index) => {
    const base = basePages.find((candidate) => candidate.id === page.id) || basePages[index];
    if (!base) return page;

    const baseImageBlocks = base.blocks.filter((block) => block.type === "image");
    return {
      ...page,
      image: hasImageSource(page.image) ? page.image : base.image,
      blocks: page.blocks.map((block, blockIndex) => {
        if (block.type !== "image") return block;
        const baseBlock =
          base.blocks.find((candidate) => candidate.id === block.id) ||
          baseImageBlocks[blockIndex] ||
          baseImageBlocks[0];
        return {
          ...block,
          image: hasImageSource(block.image) ? block.image : baseBlock?.image || base.image,
        };
      }),
    };
  });
}

async function generatePortfolioEvidenceBrief(input: {
  source: PortfolioSourceData;
  plan: PortfolioGenerationPlan;
}): Promise<PortfolioEvidenceBrief> {
  const fallback = createFallbackPortfolioEvidenceBrief(input.source, input.plan);
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return fallback;

  const prompt = `너는 개발자 채용 포트폴리오를 만들기 전에 프로젝트를 면접용 케이스스터디로 해부하는 커리어 분석가다.
목표는 빈약한 입력을 가능한 선에서 풍부하게 보강하되, 사용자가 제공하지 않은 사실/수치/성과/기술은 절대 만들지 않는 것이다.

[보강 규칙]
- confirmed는 소스 데이터에 명시된 사실만 쓴다.
- inferred는 소스 데이터의 설명, 역할, 기술 스택에서 합리적으로 추론 가능한 내용만 쓴다.
- 기술 이름, 수치, 회사명, 사용자 수, 성능 개선율, 매출, 합격률은 소스에 없으면 절대 만들지 않는다.
- 근거가 부족한 성과/수치/어려움/검증 방법은 missingFields에 넣는다.
- "문제 정의, 구현, 검증" 같은 일반론만 반복하지 말고 프로젝트마다 다른 selling point와 slide angle을 만든다.
- slideAngles는 실제 슬라이드 제목으로 쓸 수 있게 질문형 또는 주장형으로 쓴다.
- recommendedSlideCount는 데이터가 부족하면 6~8, 보통이면 9~11, 충분하면 12~16으로 정한다.

[소스 데이터]
${JSON.stringify(input.source, null, 2)}

[기본 생성 플랜]
${JSON.stringify(input.plan, null, 2)}

JSON 하나만 반환:
{
  "evidenceBrief": {
    "careerThesis": "전체 포트폴리오를 관통하는 한 문장",
    "strongestSignals": ["가장 강한 근거"],
    "weakSignals": ["보강하면 좋은 약한 근거"],
    "recommendedSlideCount": 11,
    "projectBriefs": [
      {
        "sourceId": "프로젝트 id",
        "title": "프로젝트명",
        "confirmed": ["사용자 입력에 있는 사실"],
        "inferred": ["입력값에서 합리적으로 추론한 내용"],
        "technicalDecisions": ["기술 선택/구현 판단"],
        "hardParts": ["어려웠던 점 또는 제약"],
        "proofPoints": ["결과/검증/근거"],
        "sellingPoints": ["면접에서 팔 수 있는 포인트"],
        "missingFields": ["추가 질문이 필요한 내용"],
        "slideAngles": ["슬라이드 제목으로 쓸 수 있는 각도"]
      }
    ]
  }
}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const parsed = extractJsonObject(result.response.text());
    return normalizePortfolioEvidenceBrief(parsed?.evidenceBrief || parsed, fallback);
  } catch (error) {
    console.error("Portfolio evidence brief generation failed", error);
    return fallback;
  }
}

async function generatePortfolioDraft(input: {
  source: PortfolioSourceData;
  templateId: PortfolioTemplateId;
  baseDocument: PortfolioDocument;
  plan: PortfolioGenerationPlan;
  evidenceBrief: PortfolioEvidenceBrief;
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
- 프로젝트 성격에 맞춰 STAR, 기술 구조/구현, 역할/기여도, Before-Action-Impact 중 하나가 자연스럽게 드러나도록 body의 소제목을 구성한다.
- PPT형은 제목을 발표 자료처럼 짧고 선명하게, A4형은 보고서처럼 소제목과 설명이 연결되게 쓴다.
- 본문은 PPT형 3~5줄, A4형 5~8줄 안에서 포트폴리오용 요약으로 만든다.
- tags는 슬라이드 핵심 키워드 3~6개만 남긴다.
- 데이터에 없는 정량 성과를 만들지 않는다.
- 전문적이지만 과장 없는 한국어 명사형/간결체를 사용한다.

[소스 데이터]
${JSON.stringify(input.source, null, 2)}

[생성 플랜]
${JSON.stringify(input.plan, null, 2)}

[프로젝트 근거 브리프]
${JSON.stringify(input.evidenceBrief, null, 2)}

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

async function generatePortfolioSiteDraft(input: {
  source: PortfolioSourceData;
  templateId: PortfolioTemplateId;
  baseDocument: PortfolioDocument;
  plan: PortfolioGenerationPlan;
  evidenceBrief: PortfolioEvidenceBrief;
}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return input.baseDocument;

  const prompt = `너는 개발자 채용용 웹 슬라이드 포트폴리오를 만드는 커리어 에디터이자 발표자료 아트디렉터다.
렌더러는 HTML/CSS 웹 슬라이드로 표현되지만, 너는 안전한 JSON 데이터만 반환한다.
사용자의 실제 프로젝트/경력/개인정보만 사용한다. 없는 수치, 성과, 회사명, 기술은 절대 만들지 않는다.
이미지 URL, image 필드, image block은 만들지 않는다. 이 포트폴리오는 텍스트와 그래픽 블록 중심으로 렌더링된다.

[핵심 방향]
- 정해진 카드 템플릿을 채우는 방식이 아니다. 먼저 각 프로젝트/경력의 설득 포인트를 읽고, 노베이스로 슬라이드 의도와 발표 흐름을 설계한다.
- 단, 앱 렌더러가 안전하게 그릴 수 있도록 최종 결과는 아래 JSON 스키마와 허용 block type 안에서만 만든다.
- 각 page에는 intent, visualDirection, narrative, emphasis, composition을 반드시 채운다.
- intent는 해당 슬라이드가 면접관에게 남겨야 할 한 문장 목적이다.
- visualDirection은 렌더러가 참고할 시각 구도다. 예: large-title-with-vertical-rule, diagonal-problem-to-result-flow, technical-cluster-map, process-ribbon-and-evidence-matrix, minimal-closing.
- narrative는 발표자가 그 장에서 말할 핵심 스토리 1~3문장이다.
- emphasis는 화면에서 크게 강조할 키워드 3~6개다.
- composition은 실제 PPT 구성을 고르는 구조화 설계다.
  - pattern은 hero-statement, split-proof, diagonal-flow, metric-spotlight, radial-map, timeline-track, evidence-wall, closing-signal 중 하나만 사용한다.
  - focalPoint는 left, right, center, top, bottom 중 하나다.
  - density는 calm, balanced, rich 중 하나다.
  - accentShape는 bar, diagonal, grid, ring, timeline 중 하나다.
  - visualMetaphor는 "문제에서 결과로 상승하는 사선", "기술 축 지도", "증거 벽"처럼 한글 짧은 구도 설명이다.
  - primaryBlocks는 headline, summary, problem, role, solution, result, lesson, impact, decision, evidence, next, body 중 2~4개를 고른다.

[품질 기준]
- 각 페이지는 실제 발표자료처럼 한 화면에 하나의 메시지를 담고, 그 메시지를 뒷받침하는 근거 블록을 3~6개 배치한다.
- 모든 프로젝트 페이지는 프로젝트 근거 브리프의 confirmed/inferred/technicalDecisions/hardParts/proofPoints/sellingPoints 중 최소 2개 이상을 반영한다.
- missingFields에 있는 내용은 사실처럼 쓰지 말고, 근거가 없는 수치/성과는 생성하지 않는다.
- slideAngles를 페이지 제목, intent, visualDirection에 적극 반영해 프로젝트마다 다른 관점이 드러나게 한다.
- 표지는 포지션과 강점을 즉시 이해할 수 있게 쓴다.
- 프로젝트 페이지는 summary, problem, role, solution, result, flow, matrix, contribution, callout 블록을 적극 활용한다.
- project-detail 페이지는 작업 흐름, 의사결정, 배운 점을 구체적으로 정리한다.
- text block content는 2~4문장 또는 2~4개의 짧은 줄바꿈 문장으로 작성한다.
- flow block은 문제 → 역할 → 해결 → 결과 또는 기획 → 구현 → 검증 → 개선처럼 4단계 흐름을 만든다.
- matrix block은 기술, 판단 기준, 증거 요소를 짧은 명사형 키워드로 구성한다.
- contribution block의 value는 데이터에 있는 값만 쓰고, 없으면 역할/기간/프로젝트 수처럼 사실형 값만 쓴다.
- callout block은 면접에서 강조할 핵심 포인트를 한 문단으로 정리한다.
- 같은 pattern이 3장 이상 연속되지 않게 하고, 프로젝트별로 서로 다른 composition을 섞는다.
- blocks의 type, role, layout, page 수와 순서는 기본 문서를 최대한 유지하되, 기본 문서에 있는 flow/matrix/contribution/callout은 삭제하지 않는다.
- blocks에 image type을 넣지 않는다.
- layout은 editorial-cover, profile-map, tech-radar, project-index, case-study-flow, project-dashboard, evidence-board, closing-impact 중 문맥에 맞게 유지한다.

[소스 데이터]
${JSON.stringify(input.source, null, 2)}

[생성 플랜]
${JSON.stringify(input.plan, null, 2)}

[프로젝트 근거 브리프]
${JSON.stringify(input.evidenceBrief, null, 2)}

[기본 웹 슬라이드 문서]
${JSON.stringify(input.baseDocument, null, 2)}

JSON 하나만 반환:
{
  "document": {
    "version": 1,
    "templateId": "${input.templateId}",
    "format": "site",
    "pageSize": "16:9",
    "orientation": "landscape",
    "generationPreset": "web-slide",
    "theme": 기존 theme 유지,
    "pages": 기존 페이지 수와 순서를 유지하되 각 page의 intent/visualDirection/narrative/emphasis/composition/title/subtitle/eyebrow/blocks를 고품질 발표자료 구조로 개선
  }
}`;

  try {
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
                format: "site",
                pageSize: "16:9",
                orientation: "landscape",
                generationPreset: "web-slide",
              }
            : input.baseDocument,
          input.templateId,
        ),
      ),
    );
    const preservedPages = preserveGeneratedPageMedia(
      input.baseDocument.pages || [],
      normalized.pages || [],
    );

    return polishPortfolioDocument(
      withPortfolioSampleImages({
        ...normalized,
        pages: preservedPages,
      }),
    );
  } catch (error) {
    console.error("Portfolio site draft generation failed", error);
    return input.baseDocument;
  }
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
  const formatLabel =
    input.format === "site"
      ? "HTML 웹 슬라이드형"
      : input.format === "document"
        ? "A4 세로 보고서형"
        : "16:9 PPT형";
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
      input.format === "site"
        ? "웹 슬라이드형은 브라우저에서 넘기는 여러 HTML 페이지로, 페이지당 메시지 하나와 명확한 섹션 블록을 우선한다."
        : input.format === "document"
          ? "A4 보고서형은 한 페이지 안에 맥락과 근거를 더 충분히 담고, shadcnBlock 기반 표/타임라인/요약 박스를 우선한다."
          : "PPT형은 한 장당 메시지 하나, 큰 제목, 이미지/shadcnBlock 인포그래픽 중심으로 구성한다.",
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
      "componentPattern": "star-method|problem-solution-result|architecture-stack|role-contribution|before-after-impact|system-architecture-map|impact-matrix|metric-trend|decision-tree|competency-radar",
      "infographicType": "shadcnBlock|flow|metric|timeline"
    }
  ],
  "slidePlan": [
    {
      "type": "hero|about|skills|index|project|experience|quote|gallery|retrospective|contact",
      "title": "슬라이드 제목",
      "purpose": "슬라이드 목적",
      "sourceId": "선택 사항",
      "infographicType": "shadcnBlock|flow|metric|timeline|techLogo"
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
  evidenceBrief?: PortfolioEvidenceBrief;
}) {
  const pageCount =
    input.document.format === "site"
      ? input.document.pages?.length || input.document.sections.length
      : input.document.sections.length;
  const infographicCount =
    input.document.format === "site"
      ? (input.document.pages || []).reduce(
          (count, page) =>
            count +
            page.blocks.filter((block) =>
              ["metric", "timeline", "tags", "flow", "matrix", "contribution", "callout"].includes(
                block.type,
              ),
            ).length,
          0,
        )
      : input.document.sections.reduce(
          (count, section) =>
            count +
            (section.canvas?.elements || []).filter((element) =>
              ["flow", "metric", "timeline", "techLogo", "shadcnBlock"].includes(element.kind),
            ).length,
          0,
        );
  const representativeImageCount = input.source.projects.filter(
    (project) => project.representativeImage?.url,
  ).length;
  const score =
    60 +
    Math.min(15, pageCount) +
    Math.min(15, infographicCount) +
    Math.min(10, representativeImageCount * 3);

  return {
    score: Math.min(100, score),
    pageCount,
    slideCount: pageCount,
    format: input.document.format,
    pageSize: input.document.pageSize,
    projectCount: input.source.projects.length,
    representativeImageCount,
    infographicCount,
    strengths: input.plan.strengths,
    evidence: input.evidenceBrief
      ? {
          careerThesis: input.evidenceBrief.careerThesis,
          strongestSignals: input.evidenceBrief.strongestSignals,
          weakSignals: input.evidenceBrief.weakSignals,
          missingFieldCount: input.evidenceBrief.projectBriefs.reduce(
            (count, brief) => count + brief.missingFields.length,
            0,
          ),
          recommendedSlideCount: input.evidenceBrief.recommendedSlideCount,
        }
      : undefined,
    warnings: input.source.projects.length
      ? input.evidenceBrief?.weakSignals.slice(0, 3) || []
      : ["선택된 프로젝트가 없어 기본 포트폴리오 흐름으로 생성됨"],
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      let streamClosed = false;
      const send = (event: string, data: unknown) => {
        if (streamClosed || request.signal.aborted) return false;
        try {
          controller.enqueue(encoder.encode(encodeSse(event, data)));
          return true;
        } catch {
          streamClosed = true;
          return false;
        }
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

        send("stage", { label: "프로젝트 데이터 분석 중", progress: 12 });
        const plan = await generatePortfolioPlan({
          source,
          templateId,
          format,
          pageSize,
          generationPreset,
        });
        send("plan", { plan });

        send("stage", { label: "프로젝트 근거 보강 중", progress: 28 });
        const evidenceBrief = await generatePortfolioEvidenceBrief({ source, plan });
        send("evidence", { evidenceBrief });

        send("stage", { label: "핵심 경험 정리 중", progress: 42 });
        const baseDocument = polishPortfolioDocument(
          withPortfolioSampleImages(
            createDefaultPortfolioDocument(templateId, source, {
              format,
              pageSize,
              orientation,
              generationPreset,
              evidenceBrief,
            }),
          ),
        );
        send("document", { document: baseDocument });

        send("stage", { label: "대표 이미지 선택 중", progress: 52 });
        send("stage", {
          label: format === "site" ? "웹 슬라이드 페이지 구성 중" : "슬라이드 구성 설계 중",
          progress: 64,
        });
        const generatedDocument =
          format === "site"
            ? await generatePortfolioSiteDraft({
                source,
                templateId,
                baseDocument,
                plan,
                evidenceBrief,
              })
            : await generatePortfolioDraft({
                source,
                templateId,
                baseDocument,
                plan,
                evidenceBrief,
              });
        const polishedDocument = polishPortfolioDocument(withPortfolioSampleImages(generatedDocument));

        send("stage", {
          label: format === "site" ? "HTML 렌더링 블록 정돈 중" : "인포그래픽 배치 중",
          progress: 82,
        });
        send("stage", { label: "디자인 자동 정돈 중", progress: 90 });
        if (polishedDocument.format !== "site") {
          for (const [index, section] of polishedDocument.sections.entries()) {
            if (!send("section", {
              index,
              total: polishedDocument.sections.length,
              section,
            })) break;
            await sleep(110);
          }
        }

        send("stage", { label: "저장 중", progress: 96 });
        const publicSummary = buildPortfolioPublicSummary(polishedDocument);
        const generationQuality = buildGenerationQuality({
          source,
          document: polishedDocument,
          plan,
          evidenceBrief,
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
        streamClosed = true;
        try {
          controller.close();
        } catch {
          // The browser may close the SSE connection before generation finishes.
        }
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
