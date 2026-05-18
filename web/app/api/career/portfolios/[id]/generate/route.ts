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
  normalizePortfolioFreeSlides,
  polishPortfolioDocument,
  withPortfolioSampleImages,
  type PortfolioDocument,
  type PortfolioEvidenceBrief,
  type PortfolioFreeSlide,
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

  // 템플릿별 가이드 — 같은 데이터라도 템플릿이 바뀌면 슬라이드 톤/구도가 달라야 한다.
  const templateGuide =
    input.templateId === "developer-minimal"
      ? `[선택된 템플릿: Minimal Tech]
- 페이지 8~9장으로 압축. 본문 어절 길이는 짧게, 메트릭과 키워드 중심.
- 표지(cover)는 minimal-statement — 짧고 강한 한 줄 + 큰 숫자/메트릭 한두 개.
- 프로젝트당 1장만. 케이스 흐름은 4단 flow + 1개 callout 정도.
- 화려한 매거진/그라데이션 톤 금지. 차분한 sans-serif·여백·정렬.
- composition.density 는 calm 또는 balanced 위주. accentShape 는 bar/grid 위주.`
      : input.templateId === "case-study"
        ? `[선택된 템플릿: Editorial Magazine]
- 페이지 12~14장. 매거진 톤 — 깊은 about + 프로젝트당 3장(문제·과정·결과 분리) + 회고.
- 표지(cover)는 editorial-headline — 부제와 emphasis 키워드를 매거진 표지처럼.
- 프로젝트 페이지는 case-study-flow + project-dashboard + evidence-board 3장 시리즈.
- narrative 길이를 길게(3~5문장). 인용구 같은 callout 적극 활용.
- composition.pattern 은 evidence-wall / split-proof / timeline-track 우선. density rich.`
        : `[선택된 템플릿: Bold Showcase]
- 페이지 10~11장. 결과 임팩트 중심. 어두운 배경 / 큰 숫자 / 컬러 블록 톤.
- 표지(cover)는 bold-impact — 한 단어급 헤드라인 + 거대한 BigNumber/ImpactDelta.
- 프로젝트당 2장(케이스 + 결과). project-detail 은 항상 metric-spotlight 위주.
- narrative 는 짧고 굵게(2~3문장). 키워드는 강한 명사형.
- composition.pattern 은 hero-statement / metric-spotlight / closing-signal 우선. density rich.`;

  const prompt = `너는 개발자 채용용 웹 슬라이드 포트폴리오를 만드는 커리어 에디터이자 발표자료 아트디렉터다.
렌더러는 HTML/CSS 웹 슬라이드로 표현되지만, 너는 안전한 JSON 데이터만 반환한다.
사용자의 실제 프로젝트/경력/개인정보만 사용한다. 없는 수치, 성과, 회사명, 기술은 절대 만들지 않는다.
이미지 URL, image 필드, image block은 만들지 않는다. 이 포트폴리오는 텍스트와 그래픽 블록 중심으로 렌더링된다.

${templateGuide}

[절대 금지]
- "프로젝트와 경험을 근거 중심의 웹 슬라이드 포트폴리오로 정리합니다", "구현 결과와 배운 점을 정리했습니다", "해결해야 할 문제를 정의했습니다" 같은 추상적·메타적 자기소개 문장을 본문/intent/narrative/callout에 그대로 쓰지 않는다.
- 사용자가 제공한 description/situation/role/solution/result/lesson/techStack 중 하나도 활용하지 않는 fallback 문장은 만들지 않는다.
- 데이터가 비어 있으면 사용자에게 입력을 권하는 안내 문장으로 대체한다(예: "프로젝트 결과를 추가하면 이 자리에 표시됩니다").
- 같은 단어/표현을 슬라이드 여러 장에 반복하지 않는다(예: "구현했습니다", "정리했습니다" 같은 동사 마무리를 반복 금지).

[핵심 방향]
- 정해진 카드 템플릿을 채우는 방식이 아니다. 먼저 각 프로젝트/경력의 설득 포인트를 읽고, 노베이스로 슬라이드 의도와 발표 흐름을 설계한다.
- 단, 앱 렌더러가 안전하게 그릴 수 있도록 최종 결과는 아래 JSON 스키마와 허용 block type 안에서만 만든다.
- 각 page에는 intent, visualDirection, narrative, emphasis, composition을 반드시 채운다.
- intent는 해당 슬라이드가 면접관에게 남겨야 할 한 문장 목적이다. 슬라이드마다 *서로 다른* 관점(문제 정의 / 협업 / 기술 선택 / 임팩트 / 회고)을 골라 작성한다.
- visualDirection은 렌더러가 참고할 시각 구도다. 예: large-title-with-vertical-rule, diagonal-problem-to-result-flow, technical-cluster-map, process-ribbon-and-evidence-matrix, minimal-closing.
- narrative는 그 장에서 말할 핵심 스토리. 줄바꿈 포함 3~5문장(약 180~300자)로 작성하고 사용자 데이터(역할/문제/해결/결과)를 구체적으로 인용한다.
- emphasis는 화면에서 크게 강조할 키워드 4~6개. 기술 이름과 도메인 키워드를 섞는다.
- composition은 실제 PPT 구성을 고르는 구조화 설계다.
  - pattern은 hero-statement, split-proof, diagonal-flow, metric-spotlight, radial-map, timeline-track, evidence-wall, closing-signal 중 하나만 사용한다.
  - focalPoint는 left, right, center, top, bottom 중 하나다.
  - density는 calm, balanced, rich 중 하나다.
  - accentShape는 bar, diagonal, grid, ring, timeline 중 하나다.
  - visualMetaphor는 "문제에서 결과로 상승하는 사선", "기술 축 지도", "증거 벽"처럼 한글 짧은 구도 설명이다.
  - primaryBlocks는 headline, summary, problem, role, solution, result, lesson, impact, decision, evidence, next, body 중 2~4개를 고른다.

[다양성 강제 룰 — 매우 중요]
- 전체 슬라이드 N장에서 같은 composition.pattern을 *연속으로 2장 이상* 사용하지 않는다. 서로 다른 pattern으로 의도적으로 변주한다.
- 같은 프로젝트의 case-study / project-detail 슬라이드들도 *서로 다른 pattern + 다른 focalPoint + 다른 accentShape*를 골라 시각적으로 구분되게 한다.
- 표지(cover)와 마감(contact) 슬라이드는 hero-statement / closing-signal로 임팩트 있는 단순 구도. 중간 슬라이드는 split-proof, diagonal-flow, metric-spotlight, evidence-wall 등으로 다양화.
- density도 계속 balanced만 쓰지 않고 슬라이드마다 calm, balanced, rich를 섞는다. 핵심 슬라이드 1~2장은 rich, 마감/표지는 calm.
- 같은 사용자 데이터로 두 번 생성할 때 결과가 *분명히 다르게* 나오도록 매번 다른 각도를 선택한다(매 호출에 약간의 무작위성 부여).

[품질 기준]
- 각 페이지는 실제 발표자료처럼 한 화면에 하나의 메시지를 담고, 그 메시지를 뒷받침하는 근거 블록을 4~7개 배치한다.
- 모든 프로젝트 페이지는 사용자의 description/situation/role/solution/result/lesson/techStack 중 최소 3개 이상을 본문에 인용한다.
- 프로젝트 근거 브리프의 confirmed/technicalDecisions/hardParts/proofPoints/sellingPoints도 적극 활용하되, 사용자 raw 데이터를 우선한다.
- missingFields에 있는 내용은 사실처럼 쓰지 말고, 근거가 없는 수치/성과는 생성하지 않는다.
- slideAngles를 페이지 제목, intent, visualDirection에 적극 반영해 프로젝트마다 다른 관점이 드러나게 한다.
- 표지는 사용자의 personalInfo.intro와 plan.strengths를 직접 인용해 포지션과 강점을 즉시 이해할 수 있게 쓴다.
- 프로젝트 페이지는 summary, problem, role, solution, result, lesson, flow, matrix, contribution, callout 블록을 적극 활용한다.
- summary block content는 사용자의 description을 그대로 사용한 한 문장으로 시작하고, 그 뒤에 "문제 상황: ...", "담당 역할: ...", "해결 방식: ...", "결과/성과: ..." 형태로 줄바꿈된 라인을 4~6줄 추가한다.
- problem/role/solution/result/lesson block은 각각 사용자가 제공한 그 필드를 우선 사용하고, 없으면 evidence brief에서 가져온다.
- flow block은 4단계 흐름을 만들되, "문제 정의", "해결 구현", "결과 검증" 같은 일반 단어 대신 사용자 데이터에서 추출한 구체 단어를 쓴다(예: "1만 동시 접속 대응", "Redis 캐시 도입", "P99 70% 단축").
- matrix block은 기술 스택, 판단 기준, 증거 요소를 짧은 명사형 키워드로 구성한다. project.techStack을 적극 반영한다.
- contribution block의 value는 데이터에 있는 값만 쓰고, 없으면 역할/기간/프로젝트 수처럼 사실형 값만 쓴다.
- callout block은 면접에서 강조할 핵심 포인트를 사용자 데이터를 인용해서 한 문단으로 정리한다(2~3문장).
- blocks의 type, role, layout, page 수와 순서는 기본 문서를 최대한 유지하되, 기본 문서에 있는 flow/matrix/contribution/callout은 삭제하지 않는다.
- blocks에 image type을 넣지 않는다.
- layout은 editorial-cover, profile-map, tech-radar, project-index, case-study-flow, project-dashboard, evidence-board, closing-impact 중 문맥에 맞게 유지한다.

[생성 시그니처]
- generationSeed: ${Math.random().toString(36).slice(2, 10)} — 이 값에 따라 같은 데이터라도 다른 composition/intent/narrative 조합을 선택하라.

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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.95, topP: 0.95 },
    });
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

/**
 * 옵션 A: AI 가 슬라이드를 JSON 트리(FreeSlideNode)로 *자유 디자인*한다.
 * 정해진 컴포넌트/composition 가 아니라, AI 가 `<div className="...">` 트리를
 * 직접 그려서 매번 완전히 다른 결과가 나오게 한다. 안전을 위해 normalize 단계
 * (lib/career-portfolios) 에서 tag 화이트리스트 + className 검사 + style allowlist.
 */
async function generatePortfolioFreeSlides(input: {
  source: PortfolioSourceData;
  templateId: PortfolioTemplateId;
  plan: PortfolioGenerationPlan;
  evidenceBrief: PortfolioEvidenceBrief;
}): Promise<PortfolioFreeSlide[] | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  const template = getPortfolioTemplate(input.templateId);
  const templateGuide =
    input.templateId === "developer-minimal"
      ? `[Minimal Tech] 흰 배경, 큰 sans 타이포(font-sans / Inter), 넓은 여백, 한 색 강조만(emerald/sky 등 한 색).
- 그리드 단순(1~2 컬럼), 텍스트 좌측 정렬, 메트릭은 큰 숫자로 강조.
- 화려한 그라데이션·이모티콘·border-radius 큰 곡선 금지. 절제된 angular 디자인.
- 페이지 7~9장.`
      : input.templateId === "case-study"
        ? `[Editorial Magazine] 크림/베이지 종이 톤(bg-amber-50 / bg-stone-50), serif 헤딩(font-serif),
중앙 정렬, 큰 인용구(blockquote), 매거진 컬럼 그리드.
- 각 프로젝트마다 "문제 / 과정 / 결과" 3장으로 풀어쓰기. drop cap, 큰 인용 부호 적극.
- 페이지 12~14장.`
        : `[Bold Showcase] 다크 네이비/블랙 배경(bg-slate-900 / bg-zinc-950), 강한 컬러 블록(분홍·노랑·시안 등),
거대한 BigNumber(text-8xl 이상), 풀블리드 컬러 강조.
- text 는 흰색·밝은 톤. 대비 강하게.
- 페이지 9~11장.`;

  const seed = Math.random().toString(36).slice(2, 10);
  const prompt = `너는 개발자 포트폴리오 슬라이드를 *AI 자율로 디자인*하는 시니어 UI 아트디렉터다.
사용자 데이터를 보고 슬라이드 N장을 *JSON 트리* 로 만들어 반환한다. 정해진 컴포넌트/카드 템플릿은 없다 — 매 슬라이드를 그리드·여백·타이포·색·강조 방식이 *서로 다르게* 직접 디자인해라.

[안전 룰 — 절대 어기지 마라]
- tag 는 다음만 사용: div, section, header, footer, article, main, aside, p, h1, h2, h3, h4, h5, h6, span, strong, em, ul, ol, li, blockquote, figure, figcaption, hr, br
- script, img, iframe, link, style, button, a, input, form 같은 태그는 절대 사용하지 않는다.
- className 은 Tailwind CSS 클래스만 사용. (예: "h-full grid grid-cols-[1.1fr_1fr] gap-12 px-20 py-16 bg-slate-950 text-slate-50")
- style 객체에는 다음 키만 사용: color, backgroundColor, background, padding, margin, borderRadius, border, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textAlign, textTransform, opacity, width, height, maxWidth, maxHeight, minWidth, minHeight, display, gridTemplateColumns, gridTemplateRows, gridColumn, gridRow, gap, position(relative/absolute), top, bottom, left, right, boxShadow, whiteSpace
- url(), expression(), javascript: 같은 위험한 값은 style 에 절대 쓰지 않는다.
- text 는 평문만(HTML 금지). HTML 마크업이 필요하면 children 으로 노드 만든다.
- 트리 깊이 8 이하, 슬라이드당 노드 200 이하.

[루트 디자인 가이드]
- 슬라이드 루트는 항상 16:9 비율의 div. className 은 보통 "h-full w-full overflow-hidden ..." 로 시작.
- 화면 전체를 채우는 디자인을 만들어라(text-xs 같은 작은 글자만 가득 두지 말고, 큰 헤딩·여백·시각 블록을 균형 있게).
- 각 슬라이드 intent 한 줄을 정한 뒤, 그 intent 를 시각화하는 데 집중.
- 사용자 데이터(description/situation/role/solution/result/lesson/techStack)를 *그대로 인용*. 없는 수치/회사명/성과는 만들지 않는다.

[다양성 강제]
- 슬라이드 N장 모두 *완전히 다른 레이아웃*. 같은 그리드/같은 배치 반복 금지.
- 한 장은 hero statement, 한 장은 큰 메트릭, 한 장은 4단 흐름, 한 장은 인용구, 한 장은 매트릭스/타임라인 등 — *시각 패턴이 매번 다르게*.
- generationSeed: ${seed} — 이 값에 따라 같은 데이터라도 매번 다른 톤·구도 선택.

${templateGuide}

[사용자 데이터]
${JSON.stringify(input.source, null, 2)}

[생성 플랜(참고용)]
${JSON.stringify(input.plan, null, 2)}

[근거 브리프(참고용)]
${JSON.stringify(input.evidenceBrief, null, 2)}

[테마 색상(참고)]
primary: ${template.theme.primary}, accent: ${template.theme.accent}, background: ${template.theme.background}

[반환 형식 — JSON 하나만, 코드 펜스 안에]
{
  "slides": [
    {
      "id": "slide-1",
      "intent": "표지 — 한 줄 인상",
      "sourceKind": "manual",
      "root": {
        "tag": "div",
        "className": "h-full w-full grid grid-cols-[1.2fr_1fr] gap-12 px-20 py-16",
        "children": [
          {
            "tag": "div",
            "className": "flex flex-col justify-center",
            "children": [
              { "tag": "p", "className": "text-xs font-black uppercase tracking-[0.3em] text-emerald-600", "text": "PORTFOLIO 2026" },
              { "tag": "h1", "className": "mt-4 text-6xl font-black leading-[0.95] text-slate-950", "text": "백엔드 리드 김지원" },
              { "tag": "p", "className": "mt-6 max-w-[460px] text-base font-bold leading-7 text-slate-700", "text": "1만 동시 접속에서도 P99 220ms 를 지키는 시스템을 설계합니다." }
            ]
          },
          {
            "tag": "div",
            "className": "flex flex-col justify-center border-l-[8px] border-emerald-600 pl-10",
            "children": [
              { "tag": "p", "className": "text-7xl font-black text-emerald-600 leading-none", "text": "850→220ms" },
              { "tag": "p", "className": "mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500", "text": "P99 응답시간" }
            ]
          }
        ]
      }
    }
  ]
}

총 슬라이드 수는 위 템플릿 가이드에 따른다. 표지 + 프로필/스킬 1~2장 + 프로젝트 슬라이드(템플릿별 개수) + 마무리 1장 정도로 흐름.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.95, topP: 0.95 },
    });
    const result = await model.generateContent(prompt);
    const parsed = extractJsonObject(result.response.text());
    const slidesRaw = parsed && Array.isArray((parsed as { slides?: unknown }).slides)
      ? (parsed as { slides: unknown[] }).slides
      : null;
    if (!slidesRaw) return null;
    const normalized = normalizePortfolioFreeSlides(slidesRaw);
    return normalized || null;
  } catch (error) {
    console.error("Portfolio free-slides generation failed", error);
    return null;
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

      // 긴 AI 호출 동안 SSE 연결이 idle로 끊기지 않도록 주기 신호 송신.
      // SSE comment(`:`로 시작)는 클라이언트 이벤트로 노출되지 않으면서 연결만 유지한다.
      const heartbeat = setInterval(() => {
        if (streamClosed || request.signal.aborted) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          streamClosed = true;
          clearInterval(heartbeat);
        }
      }, 7000);

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
          label: format === "site" ? "AI 가 슬라이드 자유 디자인 중" : "슬라이드 구성 설계 중",
          progress: 64,
        });
        let generatedDocument: PortfolioDocument;
        if (format === "site") {
          // 옵션 A: AI 자율 슬라이드 우선 시도. 실패 시 기존 site draft 로 폴백.
          const freeSlides = await generatePortfolioFreeSlides({
            source,
            templateId,
            plan,
            evidenceBrief,
          });
          if (freeSlides && freeSlides.length >= 4) {
            generatedDocument = {
              ...baseDocument,
              freeSlides,
            };
          } else {
            generatedDocument = await generatePortfolioSiteDraft({
              source,
              templateId,
              baseDocument,
              plan,
              evidenceBrief,
            });
          }
        } else {
          generatedDocument = await generatePortfolioDraft({
            source,
            templateId,
            baseDocument,
            plan,
            evidenceBrief,
          });
        }
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
        clearInterval(heartbeat);
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
