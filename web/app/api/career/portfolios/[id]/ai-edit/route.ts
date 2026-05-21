import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type PortfolioDocument,
  type PortfolioSitePage,
  type PortfolioSitePageType,
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
 * AI 채팅 자연어 편집 v2.
 *
 * 요청:
 *   {
 *     message: string,
 *     activePageId?: string,
 *     history?: Array<{ role: "user" | "assistant"; content: string }>  // 대화 컨텍스트
 *   }
 *
 * 응답:
 *   {
 *     reply: string,
 *     patches: Array<{
 *       op: "patch_page" | "delete_page" | "add_page" | "toggle_visibility";
 *       pageId?: string;
 *       fields?: Partial<PortfolioSitePage>;   // patch_page
 *       newPage?: Partial<PortfolioSitePage> & { type: PortfolioSitePageType };  // add_page
 *       insertAfterPageId?: string;            // add_page
 *     }>,
 *     debug?: { droppedReason?: string }
 *   }
 */

type AiPatch =
  | {
      op: "patch_page";
      pageId: string;
      fields: Partial<PortfolioSitePage>;
    }
  | { op: "delete_page"; pageId: string }
  | { op: "toggle_visibility"; pageId: string; visible: boolean }
  | {
      op: "add_page";
      newPage: Partial<PortfolioSitePage> & { type: PortfolioSitePageType };
      insertAfterPageId?: string;
    };

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
    history?: Array<{ role: "user" | "assistant"; content: string }>;
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

  const allPages = document.pages || [];
  const activePage = body.activePageId
    ? allPages.find((p) => p.id === body.activePageId)
    : null;

  const pageList = allPages.map((p, i) => ({
    id: p.id,
    index: i,
    type: p.type,
    title: p.title,
    visible: p.visible !== false,
    isActive: p.id === body.activePageId,
  }));

  // 대화 컨텍스트
  const recentHistory = (body.history || []).slice(-6); // 최근 3턴

  const historyBlock = recentHistory.length
    ? `\n[직전 대화 — 이전 명령의 연속이면 자연스럽게 이어서 처리]\n${recentHistory
        .map((m) => `${m.role === "user" ? "사용자" : "AI"}: ${m.content}`)
        .join("\n")}\n`
    : "";

  const prompt = `너는 한국 채용용 웹 슬라이드 포트폴리오 편집 어시스턴트다.
사용자의 한국어 명령을 분석해 patches 배열로 응답한다.

[가능한 작업]
1) patch_page  — 페이지의 텍스트 필드 (title/subtitle/eyebrow/intent/narrative/emphasis/visible) 수정
2) delete_page — 페이지 삭제 (확신할 때만)
3) toggle_visibility — 표시/숨김 토글
4) add_page    — 새 페이지 추가 (type 필수: cover/profile/skills/project-index/case-study/project-detail/experience/retrospective/contact)

[규칙]
- reply 는 한국어 1~2문장 친근한 답변. 무엇을 했는지 명확히.
- patches 의 pageId 는 [전체 페이지] 의 id 를 *정확히* 사용. 없으면 활성 페이지를 기본값.
- 페이지를 지칭하는 표현 ("표지", "마지막", "프로필", "케이스 1", "현재" 등) 은 정확한 pageId 로 매핑.
- 사용자가 "줄여줘", "더 짧게" 같은 톤 명령이면 narrative/subtitle 등 글자 줄이기.
- 사용자가 "톤 부드럽게" 같으면 narrative 풀어쓰기.
- 사실 없는 정보는 만들지 않는다. 모르는 수치/회사는 빈칸 유지.
- emphasis 는 문자열 배열만.
- 블록 단위 수정 (block.content 등) 은 이 endpoint 에서 다루지 않는다 — patches 에 포함하지 말고 reply 에 "슬라이드의 해당 블록을 직접 클릭해 편집해주세요" 라고 안내.

[활성 페이지]
${activePage ? JSON.stringify({ id: activePage.id, type: activePage.type, title: activePage.title }, null, 2) : "(없음)"}

[전체 페이지]
${JSON.stringify(pageList, null, 2)}
${historyBlock}
[사용자 메시지]
"${message}"

JSON 하나만 반환:
{
  "reply": "...",
  "patches": [
    { "op": "patch_page", "pageId": "...", "fields": { "title": "..." } }
  ]
}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.6, topP: 0.9 },
    });
    const result = await model.generateContent(prompt);
    const parsed = extractJsonObject(result.response.text());
    if (!parsed) {
      return NextResponse.json(
        { error: "AI 응답을 파싱하지 못했습니다." },
        { status: 502 },
      );
    }

    const pageIdSet = new Set(allPages.map((p) => p.id));
    const allowedFields = [
      "title",
      "subtitle",
      "eyebrow",
      "intent",
      "narrative",
      "emphasis",
      "visible",
    ] as const;
    const allowedTypes: PortfolioSitePageType[] = [
      "cover",
      "profile",
      "skills",
      "project-index",
      "case-study",
      "project-detail",
      "experience",
      "retrospective",
      "contact",
    ];

    const patches: AiPatch[] = [];
    let droppedReason = "";

    if (Array.isArray(parsed.patches)) {
      for (const raw of parsed.patches as unknown[]) {
        const e = raw as Record<string, unknown>;
        const op = e?.op as string | undefined;

        // pageId 해결: 정확 ID → 부분 매칭 (title/type/index) → 활성 페이지
        const resolvePageId = (input: unknown): string | null => {
          if (typeof input !== "string" || !input) return null;
          if (pageIdSet.has(input)) return input;
          const byTitle = allPages.find(
            (p) => p.title === input || p.title.includes(input),
          );
          if (byTitle) return byTitle.id;
          const byType = allPages.find((p) => p.type === input);
          if (byType) return byType.id;
          // "현재" / "active" / "이 페이지"
          if (/현재|active|이\s*페이지|active page/i.test(input)) {
            return body.activePageId || allPages[0]?.id || null;
          }
          // "마지막"
          if (/마지막|last/i.test(input)) return allPages[allPages.length - 1]?.id || null;
          // "첫"
          if (/첫|first/i.test(input)) return allPages[0]?.id || null;
          return null;
        };

        if (op === "patch_page") {
          const pageId = resolvePageId(e.pageId) || body.activePageId || "";
          if (!pageId || !pageIdSet.has(pageId)) {
            droppedReason = `pageId "${String(e.pageId)}" 매칭 실패`;
            continue;
          }
          const rawFields = (e.fields || {}) as Record<string, unknown>;
          const fields: Partial<PortfolioSitePage> = {};
          for (const k of allowedFields) {
            if (k in rawFields) (fields as Record<string, unknown>)[k] = rawFields[k];
          }
          if (Object.keys(fields).length) patches.push({ op, pageId, fields });
          else droppedReason = "patch 필드가 비어 있음";
        } else if (op === "delete_page") {
          const pageId = resolvePageId(e.pageId);
          if (pageId && allPages.length > 1) patches.push({ op, pageId });
          else droppedReason = "삭제할 페이지 매칭 실패 또는 마지막 페이지";
        } else if (op === "toggle_visibility") {
          const pageId = resolvePageId(e.pageId);
          const visible = typeof e.visible === "boolean" ? e.visible : false;
          if (pageId) patches.push({ op, pageId, visible });
          else droppedReason = "표시 토글 페이지 매칭 실패";
        } else if (op === "add_page") {
          const newPage = e.newPage as Partial<PortfolioSitePage> & { type?: string };
          const type =
            newPage?.type && allowedTypes.includes(newPage.type as PortfolioSitePageType)
              ? (newPage.type as PortfolioSitePageType)
              : null;
          if (type) {
            patches.push({
              op,
              newPage: { ...newPage, type },
              insertAfterPageId:
                typeof e.insertAfterPageId === "string"
                  ? resolvePageId(e.insertAfterPageId) || undefined
                  : undefined,
            });
          } else {
            droppedReason = "추가 페이지 type 잘못됨";
          }
        }
      }
    }

    return NextResponse.json({
      reply: typeof parsed.reply === "string" ? parsed.reply : "처리했어요.",
      patches,
      debug:
        patches.length === 0 && Array.isArray(parsed.patches) && parsed.patches.length
          ? { droppedReason: droppedReason || "알 수 없음" }
          : undefined,
    });
  } catch (error) {
    console.error("ai-edit error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 호출 실패" },
      { status: 502 },
    );
  }
}
