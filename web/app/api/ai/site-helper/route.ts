import { NextResponse } from "next/server";
import { buildFallbackSiteHelperAnswer, retrieveSiteHelperKnowledge } from "@/lib/site-helper/retrieve";
import { buildSiteHelperMessages, buildSiteHelperSystemPrompt } from "@/lib/site-helper/prompt";
import { createSiteHelperStreamResponse } from "@/lib/site-helper/provider";
import type { SiteHelperChatMessage } from "@/lib/site-helper/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_MESSAGE_LENGTH = 1000;

function normalizeHistory(value: unknown): SiteHelperChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as { role?: unknown; content?: unknown };
      if (candidate.role !== "user" && candidate.role !== "assistant") return null;
      if (typeof candidate.content !== "string") return null;
      const content = candidate.content.trim();
      if (!content) return null;
      return {
        role: candidate.role,
        content: content.slice(0, MAX_MESSAGE_LENGTH),
      };
    })
    .filter((item): item is SiteHelperChatMessage => Boolean(item))
    .slice(-6);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      message?: unknown;
      currentPath?: unknown;
      history?: unknown;
    } | null;

    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json(
        { success: false, error: "질문을 입력해주세요." },
        { status: 400 },
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { success: false, error: `질문은 ${MAX_MESSAGE_LENGTH}자 이내로 입력해주세요.` },
        { status: 400 },
      );
    }

    const currentPath = typeof body?.currentPath === "string" ? body.currentPath : null;
    const history = normalizeHistory(body?.history);
    const retrieval = retrieveSiteHelperKnowledge(message, currentPath);
    const fallbackText = buildFallbackSiteHelperAnswer(retrieval);
    const system = buildSiteHelperSystemPrompt(retrieval);
    const messages = buildSiteHelperMessages(history, message);

    return await createSiteHelperStreamResponse({
      system,
      messages,
      fallbackText,
    });
  } catch (error) {
    console.error("[site-helper] failed to stream answer", error);
    return NextResponse.json(
      { success: false, error: "사이트 도우미 응답 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
