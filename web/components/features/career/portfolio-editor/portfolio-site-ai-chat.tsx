"use client";

/**
 * 우측 하단 플로팅 AI 채팅 위젯 v2.
 *
 * 사용 예:
 *   - "표지 톤 부드럽게"
 *   - "마지막 페이지 숨겨"
 *   - "프로필 narrative 줄여줘"
 *   - "스킬 페이지 새로 추가"
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, Sparkles, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioSitePage, PortfolioSitePageType } from "@/lib/career-portfolios";

export type AiPatch =
  | { op: "patch_page"; pageId: string; fields: Partial<PortfolioSitePage> }
  | { op: "delete_page"; pageId: string }
  | { op: "toggle_visibility"; pageId: string; visible: boolean }
  | {
      op: "add_page";
      newPage: Partial<PortfolioSitePage> & { type: PortfolioSitePageType };
      insertAfterPageId?: string;
    };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  patchesApplied?: number;
  error?: boolean;
  patchesSnapshot?: AiPatch[]; // 적용된 patches — Undo 용
};

type Props = {
  portfolioId: string;
  activePageId: string | null;
  onApplyPatches: (patches: AiPatch[]) => void;
  /** 직전 변경 되돌리기 */
  onUndoLast?: () => void;
  /** Undo 가능 여부 (편집기에 의해 전달) */
  canUndo?: boolean;
  disabled?: boolean;
};

export function PortfolioSiteAiChat({
  portfolioId,
  activePageId,
  onApplyPatches,
  onUndoLast,
  canUndo,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "안녕하세요! 슬라이드를 어떻게 고치고 싶은지 한국어로 말해주세요.\n예: \"표지 톤 부드럽게\", \"마지막 페이지 숨겨\", \"프로필 narrative 줄여줘\"\n\n블록 내용 (metric/callout 등) 은 슬라이드에서 직접 클릭해 편집할 수 있어요.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((cur) => [...cur, { role: "user", content: text }]);
    setBusy(true);
    try {
      // 대화 히스토리: 최근 6개 메시지 (3턴) 보냄
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(`/api/career/portfolios/${portfolioId}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, activePageId, history }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI 호출 실패");
      const patches: AiPatch[] = Array.isArray(payload.patches) ? payload.patches : [];
      if (patches.length) onApplyPatches(patches);

      let content = payload.reply || "처리했어요.";
      if (patches.length === 0) {
        content +=
          payload.debug?.droppedReason
            ? `\n\n⚠️ 변경을 시도했지만 적용에 실패했어요 (${payload.debug.droppedReason}). 더 구체적으로 말씀해 주세요.`
            : "\n\n⚠️ 적용할 변경을 만들지 못했어요. 더 구체적인 명령을 시도해 보세요.";
      }
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content,
          patchesApplied: patches.length,
          error: patches.length === 0,
          patchesSnapshot: patches,
        },
      ]);
    } catch (error) {
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "에러가 발생했어요.",
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="fixed bottom-5 right-5 z-[60] flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-[12.5px] font-bold text-white shadow-[0_18px_40px_rgba(15,80,40,0.28)] transition hover:shadow-[0_22px_50px_rgba(15,80,40,0.36)] disabled:opacity-40"
          aria-label="AI 편집기 열기"
        >
          <Sparkles className="h-4 w-4" />
          AI 편집
        </button>
      ) : null}

      {open ? (
        <div className="fixed bottom-5 right-5 z-[60] flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-[#d8e4d0] bg-white shadow-[0_30px_80px_rgba(15,42,28,0.25)]">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#d8e4d0]/60 bg-gradient-to-r from-primary/10 to-emerald-50 px-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
                <MessageCircle className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[12.5px] font-black text-slate-900">AI 편집</p>
                <p className="text-[10px] font-semibold text-slate-500">자연어로 슬라이드 수정</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {canUndo && onUndoLast ? (
                <button
                  type="button"
                  onClick={onUndoLast}
                  className="flex h-7 items-center gap-1 rounded-md border border-[#d8e4d0] bg-white px-2 text-[10.5px] font-bold text-slate-600 transition hover:bg-slate-50"
                  title="직전 AI 변경 되돌리기"
                >
                  <Undo2 className="h-3 w-3" /> Undo
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="닫기"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[88%] whitespace-pre-line break-words rounded-2xl px-3 py-2 text-[12.5px] leading-6",
                  m.role === "user"
                    ? "ml-auto bg-primary text-white"
                    : m.error
                      ? "bg-amber-50 text-amber-800"
                      : "bg-slate-100 text-slate-800",
                )}
              >
                {m.content}
                {m.patchesApplied ? (
                  <p className="mt-1 text-[10px] font-bold opacity-70">
                    ✓ {m.patchesApplied}개 변경 적용됨
                  </p>
                ) : null}
              </div>
            ))}
            {busy ? (
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-[12px] text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                AI 가 변경사항을 만들고 있어요...
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-[#d8e4d0]/60 bg-slate-50 p-2">
            <div className="flex items-end gap-1.5 rounded-xl border border-[#d8e4d0] bg-white px-2 py-1.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="명령 입력 후 Enter (Shift+Enter 줄바꿈)"
                rows={1}
                disabled={busy || disabled}
                className="min-h-[28px] max-h-[80px] flex-1 resize-none bg-transparent text-[12.5px] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || disabled || !input.trim()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-white transition hover:bg-primary/90 disabled:opacity-30"
                aria-label="보내기"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
