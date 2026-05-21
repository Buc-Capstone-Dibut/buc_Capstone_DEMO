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
 * AI 채팅 자연어 편집 — 사용자가 "표지 톤 부드럽게" 같은 한 줄 명령을 보내면
 * AI 가 어떤 페이지의 어떤 필드를 어떻게 바꿀지 patch 들을 만들어 반환.
 *
 * 요청:
 *   { message: string, activePageId?: string }
 *
 * 응답:
 *   {
 *     reply: string,           // 사용자에게 보여줄 짧은 답변 (한국어)
 *     patches: Array<{
 *       pageId: string,
 *       patch: Partial<PortfolioSitePage>
 *     }>
 *   }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = (await portfolioDelegate().findFirst({
    where: { id: params.id, user_id: user.id },
  })) as PortfolioRow | null;
  if (!row) return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });

  const document: PortfolioDocument = normalizePortfolioRowDocument(row);
  const body = (await request.json().catch(() => ({}))) as {
    message?: string;
    activePageId?: string;
  };
  const message = (body.message || "").trim();
  if (!message) return NextResponse.json({ error: "메시지가 비어 있습니다." }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY 가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const pages = (document.pages || []).map((p) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    subtitle: p.subtitle,
    eyebrow: p.eyebrow,
    narrative: p.narrative,
    emphasis: p.emphasis,
    visible: p.visible !== false,
  }));

  const activePage = body.activePageId
    ? document.pages?.find((p) => p.id === body.activePageId)
    : null;

  const prompt = `너는 웹 슬라이드 포트폴리오의 편집 어시스턴트다. 사용자가 한 줄 명령으로 슬라이드를 고치도록 도와준다.

[규칙]
- 사용자의 의도를 한국어로 친근하게 1~2문장 reply 로 답한다.
- 동시에 적용해야 할 변경을 patches 배열로 반환한다.
- 한 patch 는 { pageId, patch: { title?, subtitle?, eyebrow?, narrative?, emphasis?, visible? } } 형식.
- 한 페이지에 여러 필드를 바꾸려면 한 번에 묶어서 보낸다.
- 사용자가 명시적으로 지정한 페이지가 아니면 activePage 가 있을 때 그 페이지를 우선 대상.
- 사용자가 "전체 톤", "모든 슬라이드"를 말하면 모든 페이지에 patch 를 만들어도 된다.
- emphasis 는 문자열 배열로만 보낸다.
- blocks/composition 같은 복잡 구조는 이 endpoint 에서 다루지 않는다 (사용자에게 "블록 단위 수정은 AI 재생성을 이용해 주세요" 라고 안내).
- 사용자가 데이터를 새로 만들어달라고 해도 사실을 지어내지 않는다. 모르는 값은 "..." 처리.

[활성 페이지]
${activePage ? JSON.stringify({ id: activePage.id, type: activePage.type, title: activePage.title }, null, 2) : "(없음)"}

[전체 페이지 요약]
${JSON.stringify(pages, null, 2)}

[사용자 메시지]
"${message}"

JSON 하나만 반환:
{
  "reply": "...",
  "patches": [
    { "pageId": "...", "patch": { "title": "..." } }
  ]
}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.7, topP: 0.9 },
    });
    const result = await model.generateContent(prompt);
    const parsed = extractJsonObject(result.response.text());
    if (!parsed) {
      return NextResponse.json(
        { error: "AI 응답을 파싱하지 못했습니다." },
        { status: 502 },
      );
    }

    // 결과 sanitize — pageId 가 실제 페이지에 존재하는 것만, patch 는 허용 필드만
    const allowedKeys = [
      "title",
      "subtitle",
      "eyebrow",
      "narrative",
      "emphasis",
      "visible",
    ] as const;
    const pageIdSet = new Set((document.pages || []).map((p) => p.id));
    const patches: Array<{ pageId: string; patch: Partial<PortfolioSitePage> }> = [];
    if (Array.isArray(parsed.patches)) {
      for (const entry of parsed.patches as unknown[]) {
        const e = entry as { pageId?: string; patch?: Record<string, unknown> };
        if (!e?.pageId || !pageIdSet.has(e.pageId)) continue;
        const cleaned: Partial<PortfolioSitePage> = {};
        for (const key of allowedKeys) {
          if (e.patch && key in e.patch) {
            (cleaned as Record<string, unknown>)[key] = e.patch[key];
          }
        }
        if (Object.keys(cleaned).length) patches.push({ pageId: e.pageId, patch: cleaned });
      }
    }

    return NextResponse.json({
      reply: typeof parsed.reply === "string" ? parsed.reply : "변경을 적용했어요.",
      patches,
    });
  } catch (error) {
    console.error("ai-edit error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 호출 실패" },
      { status: 502 },
    );
  }
}
