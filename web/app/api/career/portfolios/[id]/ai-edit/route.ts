import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type PortfolioDocument,
  type PortfolioSiteBlock,
  type PortfolioSiteBlockType,
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
    }
  | {
      op: "add_block";
      pageId: string;
      block: Omit<PortfolioSiteBlock, "id"> & { type: PortfolioSiteBlockType };
    }
  | { op: "delete_block"; pageId: string; blockId: string }
  | {
      op: "update_block_items";
      pageId: string;
      blockId: string;
      items: string[];
    }
  | { op: "reorder_blocks"; pageId: string; blockIds: string[] };

/**
 * 페이지 타입별로 *실제 렌더되는* 블록 타입 (8 개 디자인 합집합 기준).
 * 이 화이트리스트에 없는 타입 추가 요청은 reject — 안 보이는 블록 만들지 않도록.
 */
const PAGE_TYPE_BLOCKS: Record<PortfolioSitePageType, PortfolioSiteBlockType[]> = {
  cover: ["metric", "callout"],
  profile: ["contribution", "text", "callout", "metric"],
  skills: ["matrix", "tags", "text"],
  "project-index": ["timeline", "flow", "text"],
  "case-study": ["flow", "text", "callout", "metric", "contribution"],
  "project-detail": ["metric", "flow", "callout", "contribution", "text", "matrix"],
  experience: ["flow", "text", "contribution", "metric", "callout"],
  retrospective: ["timeline", "text", "callout", "flow"],
  contact: ["callout", "text"],
};

/** items 가 의미 있는 블록 타입 */
const ITEMS_BLOCK_TYPES: PortfolioSiteBlockType[] = ["flow", "timeline", "matrix", "tags"];

// 쿼터 — 디자인 깨짐 / overflow 방지
const MAX_BLOCKS_PER_PAGE = 8;
const MAX_SAME_TYPE_PER_PAGE = 4;
const MAX_ITEMS_PER_ARRAY = 12;
const MAX_LABEL_LEN = 60;
const MAX_VALUE_LEN = 24;
const MAX_CAPTION_LEN = 120;
const MAX_CONTENT_LEN = 400;
const MAX_ITEM_LEN = 150;

function clip(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.slice(0, max);
}

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

  // 활성 페이지 + 모든 블록 컨텍스트 (블록 ops 결정에 필요).
  // AI 가 "X 빼" 같은 요청을 처리하려면 X 의 위치 (emphasis vs items) 를 알아야 함.
  // 그래서 각 block 의 items 전체 + content/caption 전체를 노출 (적당히 truncate).
  const activePageBlocks = activePage
    ? activePage.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        label: b.label,
        value: b.value,
        caption: b.caption,
        content: b.content ? b.content.slice(0, 200) : undefined,
        items: Array.isArray(b.items) ? b.items.slice(0, 12) : undefined,
      }))
    : [];

  const activePageAllowedBlockTypes = activePage
    ? PAGE_TYPE_BLOCKS[activePage.type] || []
    : [];

  // 활성 페이지의 페이지 단위 텍스트 필드 — emphasis 가 여기에 있어야 AI 가 "키워드 X 빼" 처리 가능
  const activePageTextFields = activePage
    ? {
        title: activePage.title,
        subtitle: activePage.subtitle,
        eyebrow: activePage.eyebrow,
        intent: activePage.intent,
        narrative: activePage.narrative
          ? activePage.narrative.slice(0, 300)
          : undefined,
        emphasis: activePage.emphasis || [],
      }
    : null;

  const prompt = `너는 한국 채용용 웹 슬라이드 포트폴리오 편집 어시스턴트다.
사용자의 한국어 명령을 분석해 patches 배열로 응답한다.

[가능한 작업 — 페이지 단위]
1) patch_page  — 페이지의 *텍스트 필드만* 수정 (title/subtitle/eyebrow/intent/narrative/emphasis/visible)
2) delete_page — 페이지 삭제
3) toggle_visibility — 표시/숨김 토글
4) add_page    — 새 페이지 추가

[가능한 작업 — 블록 단위]
5) add_block          — 페이지에 블록 추가. block = { type, label?, value?, caption?, content?, items? }
6) delete_block       — blockId 로 블록 삭제
7) update_block_items — flow/timeline/matrix/tags 블록의 items 배열 교체
8) reorder_blocks     — 한 페이지 안 블록 순서 변경. blockIds 는 현재 페이지의 *모든* 블록 id

[⚠️ 디자인 보호 절대 규칙 — 어기면 변경 무시됨]
- 페이지의 type/layout/composition/visualDirection/sourceId 등 *디자인 구조* 필드 절대 patch 금지
- patch_page 의 fields 는 위의 7개 텍스트 필드만 허용 (다른 키는 서버에서 제거)
- 블록 추가는 *해당 페이지 타입이 실제 사용하는 블록 타입*만 가능. 아래 [페이지별 허용 블록] 외 타입은 reject
- 한 페이지에 같은 type 의 블록 ${MAX_SAME_TYPE_PER_PAGE}개 초과 추가 금지
- 한 페이지 총 블록 ${MAX_BLOCKS_PER_PAGE}개 초과 금지
- items 배열 ${MAX_ITEMS_PER_ARRAY}개 초과 금지, 각 항목 ${MAX_ITEM_LEN}자 이내

[페이지별 허용 블록 타입]
${Object.entries(PAGE_TYPE_BLOCKS)
  .map(([k, v]) => `  ${k}: ${v.join(" / ")}`)
  .join("\n")}

[블록 타입별 의미 — add_block 시 사실 만들지 말고 빈 값으로]
- text: 짧은 본문 단락 (label + content)
- callout: 강조 박스 (label + content). 핵심 깨달음 / 결과
- metric: 숫자 카드 (label="전환율 상승" + value="32%" + caption?)
- contribution: 기여도 (label + value 0~100% 형태)
- flow: 단계 흐름 (items[]). 4단계 권장
- timeline: 연대기 (items[]). 시점별 항목
- matrix: 행렬/스킬 (items[])
- tags: 키워드 칩 (items[])

[규칙]
- reply 는 한국어 1~2문장 친근한 답변. 무엇을 했는지 명확히.
- patches 의 pageId/blockId 는 아래 컨텍스트의 id 를 *정확히* 사용.
- 페이지 표현 ("표지" / "마지막" / "프로필" / "현재") 은 활성 페이지 우선 → 정확한 id 매핑.
- 블록 표현 ("그 metric" / "첫 callout") 은 활성 페이지의 블록 중 매칭.
- 사용자가 "줄여줘", "더 짧게" 같은 톤 명령이면 narrative/subtitle 등 글자 줄이기.
- 사실 없는 정보는 만들지 않는다. 모르는 수치/회사는 빈칸 유지.
- emphasis 는 문자열 배열만.

[⭐ "X 항목 빼" / "X 빼줘" 처리 가이드 — 가장 흔한 케이스]
사용자가 특정 텍스트 항목을 제거하라고 할 때 — X 가 어디 있는지 *컨텍스트에서 정확히 찾고* 그 위치에 맞는 op 사용:

1. X 가 활성 페이지의 emphasis 배열에 있으면:
   → patch_page, fields: { emphasis: [현재 배열에서 X 제외한 새 배열 전체] }

2. X 가 어떤 block 의 items 배열에 있으면 (flow/timeline/matrix/tags):
   → update_block_items, blockId: <그 block id>, items: [현재 items 에서 X 제외한 새 배열]

3. X 가 어떤 block 의 label/value/content 자체이면:
   → 블록 통째로 삭제 의도이면 delete_block

⚠️ "X 빼" 요청에서 patches 가 비어 있으면 안 됨. 아래 컨텍스트의 emphasis 와 모든 block.items 를 *반드시 모두 훑어* X 를 찾을 것.
만약 모든 곳을 봐도 X 가 없으면 reply 에 "X 항목을 못 찾았어요" 라고 명시.

[기타 op 예시]
- 사용자가 "이 페이지에 metric 추가" 같이 말하면 → add_block, type=metric, label/value 는 사용자 의도 추측 (없으면 빈 값).
- 사용자가 "callout 빼" → delete_block, 활성 페이지의 첫 callout 블록 id.
- 사용자가 "흐름 4단계로 정리" → update_block_items, 활성 페이지의 flow 블록의 items 를 4개로.

[활성 페이지]
${activePage ? JSON.stringify({
  id: activePage.id,
  type: activePage.type,
  title: activePage.title,
  텍스트필드: activePageTextFields,
  허용블록타입: activePageAllowedBlockTypes,
  현재블록수: activePage.blocks.length,
  blocks: activePageBlocks,
}, null, 2) : "(없음)"}

[전체 페이지]
${JSON.stringify(pageList, null, 2)}
${historyBlock}
[사용자 메시지]
"${message}"

JSON 하나만 반환:
{
  "reply": "...",
  "patches": [
    { "op": "add_block", "pageId": "...", "block": { "type": "metric", "label": "...", "value": "" } }
  ]
}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // 블록 단위 ops 는 구조적 작업 — temperature 낮춰 결정적으로
      generationConfig: { temperature: 0.3, topP: 0.85 },
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
        } else if (op === "add_block") {
          const pageId = resolvePageId(e.pageId) || body.activePageId || "";
          const page = allPages.find((p) => p.id === pageId);
          if (!page) {
            droppedReason = `add_block: pageId 매칭 실패 "${String(e.pageId)}"`;
            continue;
          }
          const rawBlock = (e.block || {}) as Record<string, unknown>;
          const blockType = rawBlock.type as PortfolioSiteBlockType;
          const allowed = PAGE_TYPE_BLOCKS[page.type] || [];
          if (!allowed.includes(blockType)) {
            droppedReason = `add_block: "${blockType}" 은 ${page.type} 페이지에서 렌더되지 않음 (허용: ${allowed.join(", ")})`;
            continue;
          }
          if (page.blocks.length >= MAX_BLOCKS_PER_PAGE) {
            droppedReason = `add_block: 페이지당 블록 최대 ${MAX_BLOCKS_PER_PAGE}개 초과`;
            continue;
          }
          const sameTypeCount = page.blocks.filter((b) => b.type === blockType).length;
          if (sameTypeCount >= MAX_SAME_TYPE_PER_PAGE) {
            droppedReason = `add_block: "${blockType}" 블록 최대 ${MAX_SAME_TYPE_PER_PAGE}개 초과`;
            continue;
          }
          // 필드별 sanitize
          const sanitized: Omit<PortfolioSiteBlock, "id"> & { type: PortfolioSiteBlockType } = {
            type: blockType,
            label: rawBlock.label !== undefined ? clip(rawBlock.label, MAX_LABEL_LEN) : undefined,
            value: rawBlock.value !== undefined ? clip(rawBlock.value, MAX_VALUE_LEN) : undefined,
            caption:
              rawBlock.caption !== undefined ? clip(rawBlock.caption, MAX_CAPTION_LEN) : undefined,
            content:
              rawBlock.content !== undefined ? clip(rawBlock.content, MAX_CONTENT_LEN) : undefined,
            items: undefined,
          };
          if (ITEMS_BLOCK_TYPES.includes(blockType) && Array.isArray(rawBlock.items)) {
            sanitized.items = (rawBlock.items as unknown[])
              .filter((v): v is string => typeof v === "string" && v.trim() !== "")
              .slice(0, MAX_ITEMS_PER_ARRAY)
              .map((v) => clip(v, MAX_ITEM_LEN));
          }
          patches.push({ op, pageId, block: sanitized });
        } else if (op === "delete_block") {
          const pageId = resolvePageId(e.pageId) || body.activePageId || "";
          const page = allPages.find((p) => p.id === pageId);
          if (!page) {
            droppedReason = "delete_block: page 없음";
            continue;
          }
          const blockId = typeof e.blockId === "string" ? e.blockId : "";
          if (!page.blocks.some((b) => b.id === blockId)) {
            droppedReason = `delete_block: blockId "${blockId}" 매칭 실패`;
            continue;
          }
          patches.push({ op, pageId, blockId });
        } else if (op === "update_block_items") {
          const pageId = resolvePageId(e.pageId) || body.activePageId || "";
          const page = allPages.find((p) => p.id === pageId);
          if (!page) {
            droppedReason = "update_block_items: page 없음";
            continue;
          }
          const blockId = typeof e.blockId === "string" ? e.blockId : "";
          const block = page.blocks.find((b) => b.id === blockId);
          if (!block) {
            droppedReason = `update_block_items: blockId "${blockId}" 매칭 실패`;
            continue;
          }
          if (!ITEMS_BLOCK_TYPES.includes(block.type)) {
            droppedReason = `update_block_items: "${block.type}" 블록은 items 미지원`;
            continue;
          }
          if (!Array.isArray(e.items)) {
            droppedReason = "update_block_items: items 가 배열 아님";
            continue;
          }
          const items = (e.items as unknown[])
            .filter((v): v is string => typeof v === "string" && v.trim() !== "")
            .slice(0, MAX_ITEMS_PER_ARRAY)
            .map((v) => clip(v, MAX_ITEM_LEN));
          patches.push({ op, pageId, blockId, items });
        } else if (op === "reorder_blocks") {
          const pageId = resolvePageId(e.pageId) || body.activePageId || "";
          const page = allPages.find((p) => p.id === pageId);
          if (!page) {
            droppedReason = "reorder_blocks: page 없음";
            continue;
          }
          if (!Array.isArray(e.blockIds)) {
            droppedReason = "reorder_blocks: blockIds 배열 아님";
            continue;
          }
          const incoming = (e.blockIds as unknown[]).filter(
            (v): v is string => typeof v === "string",
          );
          const currentIds = page.blocks.map((b) => b.id);
          // 정확히 같은 집합이어야 — 추가/삭제 없음
          const sameSet =
            incoming.length === currentIds.length &&
            incoming.every((id) => currentIds.includes(id)) &&
            currentIds.every((id) => incoming.includes(id));
          if (!sameSet) {
            droppedReason = "reorder_blocks: blockIds 가 페이지 블록 집합과 불일치";
            continue;
          }
          patches.push({ op, pageId, blockIds: incoming });
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
