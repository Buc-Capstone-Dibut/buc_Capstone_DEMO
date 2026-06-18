"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  Bot,
  Briefcase,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackgroundJobsPanel } from "@/components/features/career/background-jobs/background-jobs-panel";
import {
  useBackgroundJobsStore,
  useVisibleCompletedJobs,
} from "@/components/features/career/background-jobs/use-background-jobs-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  findCurrentSiteHelperPage,
  retrieveSiteHelperKnowledge,
} from "@/lib/site-helper/retrieve";
import type { SiteHelperChatMessage, SiteHelperSource } from "@/lib/site-helper/types";

type ChatMessage = SiteHelperChatMessage & {
  id: string;
  sources?: SiteHelperSource[];
  isError?: boolean;
  isComplete?: boolean;
};

const STARTER_QUESTIONS = [
  "처음인데 뭐부터 하면 돼?",
  "AI 면접은 어떻게 시작해?",
  "포트폴리오는 어디서 만들어?",
  "팀원 모집은 어디서 해?",
];

// 화이트리스트 — 5개 메인 탭의 "메인 화면" 에서만 도우미 표시.
// 다른 페이지에선 사이드 패널/모달 등을 가리므로 숨김.
// 쿼리스트링은 무시하고 pathname 만 정확 매칭.
// export — 토스트 시스템이 도우미 위치에 맞춰 offset 동적 조정 시 참조.
export const VISIBLE_MAIN_PATHS = [
  "/",              // 랜딩(홈) — 로그인 전후 모두 노출
  "/insights",      // 인사이트 (header 는 /insights/tech-blog 로 link 됨)
  "/insights/tech-blog",
  "/insights/activities",  // 인사이트 — 대외활동
  "/community",        // 커뮤니티 (실제로는 /community/board 로 redirect)
  "/community/board",  // 커뮤니티 기본 탭 — 게시판
  "/community/squad",  // 커뮤니티 스쿼드 탭
  "/workspace",     // 워크스페이스
  "/career",           // 커리어 관리 (실제로는 /career/projects 로 redirect)
  "/career/projects",  // 커리어 관리 기본 탭 — 프로젝트 보관함
  "/interview",     // AI 면접
];

/** pathname 이 도우미 챗봇이 보이는 메인 페이지인지 — 토스트가 위치 조정 시 사용 */
export function isSiteHelperVisible(pathname: string | null | undefined): boolean {
  return VISIBLE_MAIN_PATHS.includes(pathname || "");
}

// react-markdown + its unified/remark/micromark pipeline (~50KB gz) was pulled
// into the global bundle because this chat mounts in the root layout. Load it
// only when a markdown message actually renders. ssr:false — client-only chat.
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toApiHistory(messages: ChatMessage[]) {
  return messages
    .filter((message) => !message.isError && message.content.trim().length > 0)
    .slice(-6)
    .map(({ role, content }) => ({ role, content }));
}

function getSourceHint(source: SiteHelperSource) {
  return source.details?.[0] || source.summary;
}

export function SiteHelperChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "tasks">("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // 백그라운드 작업 카운트 — 탭 배지 / 닫힌 위젯 dot 용
  const activeJobsCount = useBackgroundJobsStore(
    (s) => Object.keys(s.activeJobs).length,
  );
  const completedJobs = useVisibleCompletedJobs();
  const totalTaskCount = activeJobsCount + completedJobs.length;

  // 새 작업이 생기면 자동으로 작업 탭 열어주고 위젯 열기 (toast 와 별도로 직관적 피드백)
  const previousActiveCountRef = useRef(activeJobsCount);
  useEffect(() => {
    if (activeJobsCount > previousActiveCountRef.current && !open) {
      // 작업 늘었지만 위젯 닫혀 있음 → 그대로. (toast 가 알림 역할)
      // 자동 오픈은 의도와 어긋날 수 있으므로 비활성. 사용자가 직접 열면 작업 탭으로 가도록만 처리.
    }
    previousActiveCountRef.current = activeJobsCount;
  }, [activeJobsCount, open]);
  const [isStreaming, setIsStreaming] = useState(false);
  // 한 번 호버해서 링이 가득 차면 이후엔 다시 애니메이션이 돌지 않도록 잠금
  const [ringFilledOnce, setRingFilledOnce] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // 화이트리스트 정확 매칭 — pathname 이 VISIBLE_MAIN_PATHS 에 정확히 있을 때만 노출
  const hidden = !isSiteHelperVisible(pathname);
  const currentPage = useMemo(() => findCurrentSiteHelperPage(pathname), [pathname]);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const updateMessage = (id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, ...patch } : message)),
    );
  };

  const appendAssistantChunk = (id: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id
          ? { ...message, content: `${message.content}${chunk}` }
          : message,
      ),
    );
  };

  const sendMessage = async (rawMessage?: string) => {
    const message = (rawMessage ?? input).trim();
    if (!message || isStreaming) return;

    const retrieval = retrieveSiteHelperKnowledge(message, pathname);
    const sources = retrieval.matches.slice(0, 3);
    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: message,
    };
    const assistantId = createMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      sources,
      isComplete: false,
    };

    const history = toApiHistory(messages);
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/site-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          currentPath: pathname,
          history,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "사이트 도우미 응답을 가져오지 못했습니다.");
      }

      if (!response.body) {
        throw new Error("스트리밍 응답을 열 수 없습니다.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        appendAssistantChunk(assistantId, decoder.decode(value, { stream: true }));
      }

      const rest = decoder.decode();
      if (rest) appendAssistantChunk(assistantId, rest);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: message.content || "응답을 중지했습니다.",
                  isComplete: true,
                }
              : message,
          ),
        );
      } else {
        updateMessage(assistantId, {
          content:
            error instanceof Error
              ? error.message
              : "사이트 도우미 응답 생성 중 오류가 발생했습니다.",
          isError: true,
          isComplete: true,
        });
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, isComplete: true } : message,
        ),
      );
      setIsStreaming(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void sendMessage();
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const resetChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setIsStreaming(false);
  };

  if (hidden) return null;

  return (
    <TooltipProvider delayDuration={150}>
      {/* z-30 — header(z-50) / Sheet/Drawer(z-50) / 사이드 패널(z-[55]) 보다 뒤.
          사이드 패널 열리면 도우미가 가려짐 (덜 거슬리는 자연스러운 깊이감).
          편집기 로딩 오버레이는 이제 화이트리스트로 화면 자체에서 도우미 숨김 처리. */}
      <div className="fixed bottom-24 right-4 z-30 md:bottom-6 md:right-6">
        {open && (
          <section
            className={cn(
              "mb-3 flex h-[min(620px,calc(100vh-8rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl",
              "md:h-[620px] md:w-[400px]",
            )}
            aria-label="Debut 사이트 도우미"
          >
            <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-neutral-950">
                    Debut 사이트 도우미
                  </h2>
                  <p className="truncate text-xs text-neutral-500">
                    {currentPage
                      ? `현재 페이지: ${currentPage.title}`
                      : "기능 위치와 사용 방법을 안내합니다"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={resetChat}
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="sr-only">대화 초기화</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>대화 초기화</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setOpen(false)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">닫기</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>닫기</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* 탭 — 채팅 / 백그라운드 작업 */}
            <div className="flex shrink-0 items-center gap-0.5 border-b border-neutral-200 px-2">
              <button
                type="button"
                onClick={() => setTab("chat")}
                className={cn(
                  "relative flex h-9 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-bold transition",
                  tab === "chat"
                    ? "text-primary"
                    : "text-neutral-500 hover:text-neutral-700",
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                채팅
                {tab === "chat" ? (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setTab("tasks")}
                className={cn(
                  "relative flex h-9 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-bold transition",
                  tab === "tasks"
                    ? "text-primary"
                    : "text-neutral-500 hover:text-neutral-700",
                )}
              >
                <Briefcase className="h-3.5 w-3.5" />
                작업
                {totalTaskCount > 0 ? (
                  <span
                    className={cn(
                      "ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-black tabular-nums",
                      activeJobsCount > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-neutral-100 text-neutral-500",
                    )}
                  >
                    {totalTaskCount}
                  </span>
                ) : null}
                {tab === "tasks" ? (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                ) : null}
              </button>
            </div>

            {tab === "tasks" ? (
              <BackgroundJobsPanel onClose={() => setOpen(false)} />
            ) : (
            <>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-semibold text-neutral-950">
                      어떤 기능을 찾고 계신가요?
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      Debut의 페이지 위치, 기능 사용 흐름, 다음에 눌러야 할 메뉴를
                      안내해드립니다.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {STARTER_QUESTIONS.map((question) => (
                      <button
                        key={question}
                        type="button"
                        className="rounded-md border border-primary/15 bg-white px-3 py-2 text-left text-sm text-neutral-700 transition hover:border-primary/30 hover:bg-primary/5 hover:text-[#3D5A22]"
                        onClick={() => sendMessage(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[88%] rounded-lg px-3 py-2 text-sm leading-6",
                          message.role === "user"
                            ? "border border-primary/20 bg-primary/10 text-[#3D5A22]"
                            : message.isError
                              ? "border border-red-200 bg-red-50 text-red-700"
                              : "border border-neutral-200 bg-neutral-50 text-neutral-800",
                        )}
                      >
                        {message.content ? (
                          message.role === "assistant" ? (
                            <div className="prose prose-sm max-w-none break-words prose-p:my-0 prose-ul:my-2 prose-li:my-0 prose-strong:text-neutral-900">
                              <ReactMarkdown
                                components={{
                                  a: ({ children }) => <span>{children}</span>,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                          )
                        ) : (
                          <div className="flex items-center gap-2 text-neutral-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            답변을 준비하고 있습니다.
                          </div>
                        )}

                        {message.role === "assistant" &&
                          message.isComplete &&
                          message.content.trim().length > 0 &&
                          message.sources &&
                          message.sources.length > 0 && (
                            <div
                              className="mt-3 space-y-2 border-t border-neutral-200/70 pt-3 animate-fade-in-up"
                              style={{ animationFillMode: "both" }}
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                                관련 기능
                              </p>
                              {message.sources.map((source, sourceIndex) => (
                                <div
                                  key={source.id}
                                  className="rounded-md border border-primary/15 bg-white p-2 animate-fade-in-up"
                                  style={{
                                    animationDelay: `${120 + sourceIndex * 120}ms`,
                                    animationFillMode: "both",
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-neutral-900">
                                        {source.title}
                                      </p>
                                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-neutral-500">
                                        {getSourceHint(source)}
                                      </p>
                                    </div>
                                    <Button
                                      asChild
                                      size="sm"
                                      variant="outline"
                                      className="h-7 shrink-0 rounded-md border-primary/20 bg-white px-2 text-xs text-[#3D5A22] hover:bg-primary/5 hover:text-[#3D5A22]"
                                    >
                                      <Link href={source.route}>
                                        이동
                                        <ArrowRight className="h-3 w-3" />
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-neutral-200 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="예: AI 면접은 어떻게 시작해?"
                  rows={1}
                  className="max-h-28 min-h-10 flex-1 resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm leading-5 outline-none transition placeholder:text-neutral-400 focus:border-primary/50"
                  disabled={isStreaming}
                />
                {isStreaming ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 shrink-0"
                        onClick={stopStreaming}
                      >
                        <Square className="h-4 w-4" />
                        <span className="sr-only">응답 중지</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>응답 중지</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="submit"
                        size="icon"
                        className="h-10 w-10 shrink-0 bg-primary text-white hover:bg-primary/90"
                        disabled={!input.trim()}
                      >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">전송</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>전송</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="mt-2 text-[11px] leading-4 text-neutral-400">
                사이트 안내 전용입니다. 개인 문서나 워크스페이스 내용은 읽지 않습니다.
              </p>
            </form>
            </>
            )}
          </section>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "site-helper-chat-trigger group relative h-[95px] w-[95px] overflow-visible rounded-full bg-transparent p-0 text-[#3D5A22] shadow-none hover:bg-transparent focus-visible:ring-primary/40",
                ringFilledOnce && "is-filled",
              )}
              onClick={() => setOpen((value) => !value)}
              onAnimationEnd={(event) => {
                if (event.animationName === "site-helper-ring-fill") {
                  setRingFilledOnce(true);
                }
              }}
              aria-label={open ? "Debut 사이트 도우미 닫기" : "Debut 사이트 도우미 열기"}
              aria-expanded={open}
            >
              <span
                aria-hidden="true"
                className="absolute inset-[5px] rounded-full bg-white/95 shadow-[0_14px_34px_rgba(61,90,34,0.18)] transition-transform duration-200 group-hover:scale-[1.03]"
              />
              <img
                src="/images/site-helper-ai-chat.png"
                alt=""
                className="site-helper-chat-mascot pointer-events-none relative z-10 h-[85px] w-[85px] object-contain transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105"
                draggable={false}
              />
              {open && (
                <span
                  aria-hidden="true"
                  className="absolute right-0.5 top-0.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-primary text-white shadow-md"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              {/* 진행 중 백그라운드 작업 dot — 위젯 닫혀 있을 때만 */}
              {!open && activeJobsCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-1 z-20 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-amber-500 px-1 text-[10px] font-black tabular-nums text-white shadow-md"
                >
                  {activeJobsCount}
                </span>
              ) : null}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Debut 사이트 도우미</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
