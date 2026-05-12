"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
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
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const HIDDEN_PATH_PREFIXES = [
  "/interview/room",
  "/interview/training/portfolio/room",
];

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
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const hidden = HIDDEN_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
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
      <div className="fixed bottom-24 right-4 z-40 md:bottom-6 md:right-6">
        {open && (
          <section
            className={cn(
              "mb-3 flex h-[min(620px,calc(100vh-8rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl",
              "md:h-[620px] md:w-[400px]",
            )}
            aria-label="Dibut 사이트 도우미"
          >
            <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-neutral-950">
                    Dibut 사이트 도우미
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

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-semibold text-neutral-950">
                      어떤 기능을 찾고 계신가요?
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      Dibut의 페이지 위치, 기능 사용 흐름, 다음에 눌러야 할 메뉴를
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
          </section>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="h-12 w-12 rounded-full bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90"
              onClick={() => setOpen((value) => !value)}
              aria-label="Dibut 사이트 도우미 열기"
            >
              {open ? (
                <X className="h-5 w-5" />
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Dibut 사이트 도우미</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
