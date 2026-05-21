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

  // 컨텍스트 — 연결성 강화: 이전·다음 페이지는 풀 컨텐츠로, 나머지는 요약으로
  const allPages = document.pages || [];
  const targetIdx = allPages.findIndex((p) => p.id === params.pageId);

  // 인접 페이지 (직전 2장 + 직후 2장) 는 풀 컨텐츠 — 톤·문체·키워드 참조용
  const neighborWindow = allPages
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => Math.abs(i - targetIdx) <= 2 && i !== targetIdx)
    .map(({ p, i }) => ({
      position: i < targetIdx ? `이전 -${targetIdx - i}` : `다음 +${i - targetIdx}`,
      index: i,
      type: p.type,
      title: p.title,
      subtitle: p.subtitle,
      eyebrow: p.eyebrow,
      narrative: p.narrative,
      emphasis: p.emphasis,
      composition: p.composition,
    }));

  // 전체 페이지 목록 — 흐름 파악용 (제목 + 타입만)
  const fullPageList = allPages.map((p, i) => ({
    index: i,
    type: p.type,
    title: p.title,
    isTarget: i === targetIdx,
    emphasis: p.emphasis,
  }));

  // 이미 사용된 composition.pattern 분포 — AI가 *과하게 변주*하지 않도록
  const usedPatterns = allPages
    .map((p) => p.composition?.pattern)
    .filter(Boolean) as string[];

  // 전체 deck 의 voice sample — narrative 길이·문체 통계
  const voiceSamples = allPages
    .filter((p) => p.id !== params.pageId && p.narrative)
    .slice(0, 3)
    .map((p) => p.narrative);

  const prompt = `너는 개발자 채용용 웹 슬라이드 포트폴리오의 한 페이지를 다시 만드는 커리어 에디터다.

[작업]
- 아래 [현재 페이지] 한 장만 다시 작성한다. 다른 페이지는 건드리지 않는다.
- 같은 페이지 타입(${targetPage.type})과 layout(${targetPage.layout})은 유지하되,
  title/subtitle/eyebrow/narrative/emphasis/composition/blocks 를 더 좋게 다시 쓴다.
- 사용자가 제공한 실제 프로젝트/경력 데이터만 활용한다. 없는 수치·회사·기술은 만들지 않는다.
- 이미지/URL/image 블록은 만들지 않는다.
${instruction ? `\n[사용자 추가 지시 — 최우선]\n- ${instruction}\n` : ""}
[가장 중요한 원칙 — 연결성]
이 페이지는 더 큰 발표자료의 한 장이다. **앞뒤 페이지와 자연스럽게 이어져야 한다.**
- 톤(어조), 문장 길이, 격식 수준은 [인접 페이지] 의 narrative 와 비슷하게 유지하라.
  예: 다른 페이지가 "...했습니다" 체면 이 페이지도 "...했습니다" 체로. "...했음" 체면 그쪽으로.
- emphasis 키워드는 [전체 페이지 목록] 에 이미 등장한 핵심 키워드와 어휘 vocabulary 를 공유한다.
  완전히 새로운 단어만 쓰지 말고, 다른 페이지 키워드 1~2개를 자연스럽게 재사용해 통일감을 만들어라.
- intent 와 narrative 는 [이전 페이지] 가 만들어둔 문맥을 받아서, [다음 페이지] 로 자연스럽게 흘러가게 쓴다.
  예: 이전이 "문제 정의" 라면 이 페이지는 그 문제를 받아서 다루고, 다음이 "결과" 라면 결과로 이어지는 마무리.

[톤 샘플 — 동일한 어조로 작성]
${voiceSamples.length ? voiceSamples.map((s, i) => `샘플 ${i + 1}: "${s}"`).join("\n") : "(다른 페이지에 narrative 가 없으므로 자연스러운 발표자료 톤으로)"}

[composition 변주 — 너무 튀지 않게]
- 가능한 pattern: hero-statement, split-proof, diagonal-flow, metric-spotlight, radial-map, timeline-track, evidence-wall, closing-signal
- 다만 [이미 사용된 패턴] 과 *완전히 같은* 패턴은 피하되, **인접 페이지와 시각적으로 충돌하는 극단적 패턴은 선택하지 마라**.
  예: 인접이 calm density 면 이 페이지도 balanced 까지만, rich 로 갑자기 점프 X.
- focalPoint: left|right|center|top|bottom — 인접 페이지와 다른 방향 1개 정도만 변주.
- density: calm|balanced|rich — 인접 페이지에서 ±1 단계 이내로.
- accentShape: bar|diagonal|grid|ring|timeline.

[이미 다른 페이지에서 사용된 composition.pattern]
${JSON.stringify(usedPatterns)}

[블록 type 허용]
text, tags, metric, timeline, flow, matrix, contribution, callout

[인접 페이지 — 톤·문체·구도를 맞출 기준]
${JSON.stringify(neighborWindow, null, 2)}

[전체 페이지 흐름 — 어디에 속하는지 파악]
${JSON.stringify(fullPageList, null, 2)}

[현재 페이지 — 이걸 다시 작성]
${JSON.stringify(targetPage, null, 2)}

[소스 데이터 — 사용자 실제 프로젝트/경력]
${JSON.stringify(row.source_snapshot, null, 2)}

[문서 메타 — 디자인 톤 참고용 (변경 금지)]
${JSON.stringify(
  {
    templateId: document.templateId,
    rendererId: document.rendererId,
    theme: document.theme,
  },
  null,
  2,
)}

[변주 시그니처 (작은 다양성)]
generationSeed: ${Math.random().toString(36).slice(2, 10)} — 같은 페이지를 다시 만들 때 *세부 표현* 만 조금씩 달라지게 사용. 톤·어조·전체 구조는 위 [연결성] 규칙을 따른다.

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
      // 연결성을 위해 살짝 보수적: 변주는 generationSeed 로 두고, 톤은 일관되게.
      generationConfig: { temperature: 0.75, topP: 0.9 },
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
