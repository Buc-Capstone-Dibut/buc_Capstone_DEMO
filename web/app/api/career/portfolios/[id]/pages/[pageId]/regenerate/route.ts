import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type PortfolioDocument,
  type PortfolioSitePage,
} from "@/lib/career-portfolios";
import {
  normalizePortfolioRowDocument,
  portfolioDelegate,
  type PortfolioRow,
} from "@/lib/server/career-portfolios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
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

/**
 * 활성 페이지 1장만 AI 가 다시 생성하는 endpoint.
 *
 * 요청 body:
 *   { instruction?: string }
 *     - undefined: "그대로 다시 만들기" (variety 강제)
 *     - "더 짧게 / 핵심만" / "더 임팩트" / "더 캐주얼" / 사용자 자유 입력
 *
 * 응답:
 *   { page: PortfolioSitePage }  — 호출자가 document.pages 의 해당 페이지를 교체
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; pageId: string } },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = (await portfolioDelegate().findFirst({
    where: { id: params.id, user_id: user.id },
  })) as PortfolioRow | null;
  if (!row) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const document: PortfolioDocument = normalizePortfolioRowDocument(row);
  const targetPage = document.pages?.find((p) => p.id === params.pageId);
  if (!targetPage) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    instruction?: string;
  };
  const instruction = (body.instruction || "").trim();

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY 가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  // 컨텍스트 — 전체 페이지 목록은 제목/타입만 (토큰 절약), 활성 페이지 + 소스 데이터는 풀로
  const pageList = (document.pages || []).map((p, i) => ({
    index: i,
    id: p.id,
    type: p.type,
    title: p.title,
    isTarget: p.id === params.pageId,
  }));

  const prompt = `너는 개발자 채용용 웹 슬라이드 포트폴리오의 한 페이지를 다시 만드는 커리어 에디터다.

[작업]
- 아래 [현재 페이지] 한 장만 다시 작성한다. 다른 페이지는 건드리지 않는다.
- 같은 페이지 타입(${targetPage.type})과 layout(${targetPage.layout})은 유지하되,
  title/subtitle/eyebrow/narrative/emphasis/composition/blocks 를 더 좋게 다시 쓴다.
- 사용자가 제공한 실제 프로젝트/경력 데이터만 활용한다. 없는 수치·회사·기술은 만들지 않는다.
- 이미지/URL/image 블록은 만들지 않는다.
${instruction ? `\n[사용자 추가 지시]\n- ${instruction}\n` : ""}
[다양성 룰]
- 같은 데이터라도 *이전 페이지와 다른 각도/문장 구조*로 작성한다.
- composition.pattern 은 hero-statement, split-proof, diagonal-flow, metric-spotlight, radial-map, timeline-track, evidence-wall, closing-signal 중 하나.
- focalPoint: left|right|center|top|bottom 중 하나
- density: calm|balanced|rich 중 하나
- accentShape: bar|diagonal|grid|ring|timeline 중 하나
- generationSeed: ${Math.random().toString(36).slice(2, 10)} — 매번 다른 변주.

[블록 type 허용]
text, tags, metric, timeline, flow, matrix, contribution, callout

[전체 페이지 목록 — 맥락 참고용]
${JSON.stringify(pageList, null, 2)}

[현재 페이지 — 이걸 다시 작성]
${JSON.stringify(targetPage, null, 2)}

[소스 데이터 — 사용자 실제 프로젝트/경력]
${JSON.stringify(row.source_snapshot, null, 2)}

[전체 문서 컨텍스트 — 톤/테마 참고 (다른 페이지는 변경 금지)]
${JSON.stringify(
  {
    templateId: document.templateId,
    rendererId: document.rendererId,
    theme: document.theme,
  },
  null,
  2,
)}

JSON 하나만 반환:
{
  "page": {
    "id": "${targetPage.id}",
    "type": "${targetPage.type}",
    "layout": "${targetPage.layout}",
    "title": "...",
    "subtitle": "(선택)",
    "eyebrow": "(선택)",
    "intent": "...",
    "visualDirection": "...",
    "narrative": "...",
    "emphasis": ["키워드", "..."],
    "composition": {
      "pattern": "...",
      "focalPoint": "...",
      "density": "...",
      "accentShape": "...",
      "visualMetaphor": "...",
      "primaryBlocks": ["..."]
    },
    "blocks": [ ... 4~7개 ... ]
  }
}`;

  let regeneratedPage: PortfolioSitePage | null = null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.95, topP: 0.95 },
    });
    const result = await model.generateContent(prompt);
    const parsed = extractJsonObject(result.response.text());
    if (parsed?.page) {
      // id / type / layout 은 원본 강제 유지 (renderer 가 의존)
      regeneratedPage = {
        ...(parsed.page as PortfolioSitePage),
        id: targetPage.id,
        type: targetPage.type,
        layout: targetPage.layout,
        sourceId: targetPage.sourceId,
        sourceKind: targetPage.sourceKind,
        visible: targetPage.visible,
        blocks: Array.isArray(parsed.page.blocks)
          ? (parsed.page.blocks as PortfolioSitePage["blocks"]).map((b, i) => ({
              ...b,
              id: b.id || `${targetPage.id}-blk-${i}-${Date.now().toString(36)}`,
            }))
          : targetPage.blocks,
      };
    }
  } catch (error) {
    console.error("page regenerate error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 호출 실패" },
      { status: 502 },
    );
  }

  if (!regeneratedPage) {
    return NextResponse.json(
      { error: "AI 응답을 파싱하지 못했습니다." },
      { status: 502 },
    );
  }

  return NextResponse.json({ page: regeneratedPage });
}
