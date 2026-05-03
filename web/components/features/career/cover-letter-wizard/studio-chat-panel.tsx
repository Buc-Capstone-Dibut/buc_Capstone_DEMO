"use client";

import { useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAnchoredScroll } from "@/hooks/use-anchored-scroll";
import {
  normalizeWizardMessage,
  type CoverLetterQuestion,
  type Message,
} from "./model";

type CoverLetterWizardStudioChatPanelProps = {
  activeMessages: Message[];
  chatInput: string;
  isStreaming: boolean;
  requestBanner:
    | {
        tone: "progress" | "error";
        message: string;
        statusCode?: number;
      }
    | null;
  selectedQuestion: CoverLetterQuestion | null;
  selectedQuestionId: string | null;
  streamPhaseLabel: string;
  onChatInputChange: (value: string) => void;
  onApplySuggestedAnswer: (answer: string) => void;
  onSubmit: () => void;
};

const CHAT_SUGGESTION_LIMIT = 3;

function uniqueSuggestions(suggestions: string[]) {
  return Array.from(new Set(suggestions.map((suggestion) => suggestion.trim()).filter(Boolean)));
}

function buildChatSuggestions(
  activeMessages: Message[],
  selectedQuestion: CoverLetterQuestion | null,
) {
  const normalizedMessages = activeMessages.map(normalizeWizardMessage);
  const latestMessage = [...normalizedMessages]
    .reverse()
    .find((message) => message.content.trim() || message.suggestedAnswer?.trim());
  const hasDraftAnswer = Boolean(selectedQuestion?.answer?.trim());
  const maxChars = selectedQuestion?.maxChars || 700;

  if (!selectedQuestion) {
    return uniqueSuggestions([
      "작성 방향을 먼저 잡아줘",
      "필요한 프로젝트를 추천해줘",
      "초안 작성 전에 확인할 질문을 해줘",
    ]).slice(0, CHAT_SUGGESTION_LIMIT);
  }

  if (!latestMessage && !hasDraftAnswer) {
    return uniqueSuggestions([
      "이 문항의 작성 방향을 잡아줘",
      "강조할 핵심 역량을 추천해줘",
      "어떤 프로젝트를 연결하면 좋을지 골라줘",
    ]).slice(0, CHAT_SUGGESTION_LIMIT);
  }

  if (latestMessage?.role === "user") {
    return uniqueSuggestions([
      "방금 내용으로 초안을 만들어줘",
      "핵심 메시지만 먼저 정리해줘",
      "부족한 정보를 질문해줘",
    ]).slice(0, CHAT_SUGGESTION_LIMIT);
  }

  if (latestMessage?.suggestedAnswer?.trim()) {
    return uniqueSuggestions([
      "이 답안을 더 구체적으로 다듬어줘",
      `${maxChars}자 안으로 압축해줘`,
      "첫 문장을 더 강하게 바꿔줘",
    ]).slice(0, CHAT_SUGGESTION_LIMIT);
  }

  if (hasDraftAnswer) {
    return uniqueSuggestions([
      "현재 답안을 더 자연스럽게 다듬어줘",
      "문항 의도에 맞게 근거를 보강해줘",
      `${maxChars}자 안으로 다시 정리해줘`,
    ]).slice(0, CHAT_SUGGESTION_LIMIT);
  }

  return uniqueSuggestions([
    "방금 답변을 초안으로 이어서 써줘",
    "더 설득력 있는 근거를 제안해줘",
    "다음에 답할 내용을 질문해줘",
  ]).slice(0, CHAT_SUGGESTION_LIMIT);
}

export function CoverLetterWizardStudioChatPanel({
  activeMessages,
  chatInput,
  isStreaming,
  requestBanner,
  selectedQuestion,
  selectedQuestionId,
  streamPhaseLabel,
  onChatInputChange,
  onApplySuggestedAnswer,
  onSubmit,
}: CoverLetterWizardStudioChatPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    bottomRef: chatBottomRef,
    hasNewContent,
    handleScroll,
    isAtBottom,
    requestScrollOnContentChange,
    scrollContainerRef,
    scrollToBottom,
  } = useAnchoredScroll<HTMLDivElement>({
    bottomThreshold: 132,
    defaultBehavior: "smooth",
  });
  const hasChatInput = chatInput.trim().length > 0;
  const chatSuggestions = useMemo(
    () => buildChatSuggestions(activeMessages, selectedQuestion),
    [activeMessages, selectedQuestion],
  );
  const visibleChatSuggestions = isStreaming ? [] : chatSuggestions;
  const composerHint = requestBanner
    ? `${requestBanner.tone === "error" ? "AI 요청 오류" : "AI 응답 생성 중"} · ${
        requestBanner.message
      }${requestBanner.statusCode ? ` (코드: ${requestBanner.statusCode})` : ""}`
    : streamPhaseLabel || "Enter 전송 · Shift+Enter 줄바꿈";

  useEffect(() => {
    requestScrollOnContentChange({
      behavior: isStreaming ? "auto" : "smooth",
    });
  }, [activeMessages, isStreaming, requestScrollOnContentChange]);

  useEffect(() => {
    if (!chatInput) return;
    requestScrollOnContentChange({ behavior: "auto" });
  }, [chatInput, requestScrollOnContentChange]);

  useEffect(() => {
    scrollToBottom("auto");
  }, [selectedQuestionId, scrollToBottom]);

  const handleSubmit = () => {
    scrollToBottom("smooth");
    onSubmit();
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChatInputChange(suggestion);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="flex min-h-0 flex-col border-r bg-white">
      <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              현재 문항
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
              {selectedQuestion?.title || "문항을 선택해주세요"}
            </p>
          </div>
          {selectedQuestion ? (
            <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600">
              {selectedQuestion.maxChars}자
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-slate-50/40">
        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto overscroll-contain scroll-smooth"
          onScroll={handleScroll}
        >
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-5 pb-56 pt-5">
            {activeMessages.map((rawMessage, idx) => {
              const message = normalizeWizardMessage(rawMessage);

              return message.role === "user" ? (
                <div
                  key={`${selectedQuestionId || "unknown"}-${message.role}-${idx}`}
                  className="flex justify-end"
                >
                  <div className="max-w-[82%] whitespace-pre-wrap rounded-3xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-[1.65] text-primary-foreground shadow-sm">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div
                  key={`${selectedQuestionId || "unknown"}-${message.role}-${idx}`}
                  className="w-full"
                >
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-medium text-slate-500">
                    <span
                      aria-hidden="true"
                      className={`assistant-avatar-mark ${
                        message.status === "thinking" || message.status === "streaming"
                          ? "assistant-avatar-mark-active"
                          : ""
                      }`}
                    />
                    <span className="rounded-full bg-white px-2 py-0.5 shadow-sm ring-1 ring-slate-200">
                      {selectedQuestion?.title || "문항"}
                    </span>
                  </div>
                  <div className="px-1 py-1">
                    <div
                      className={`max-w-none whitespace-pre-wrap break-words text-[15px] leading-[1.38] ${
                        message.status === "thinking" || message.status === "streaming"
                          ? "ai-thinking-shimmer"
                          : "text-slate-700"
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => {
                            void node;
                            return <p className="my-0 leading-[1.38]" {...props} />;
                          },
                          ul: ({ node, ...props }) => {
                            void node;
                            return <ul className="my-0 list-disc pl-5" {...props} />;
                          },
                          ol: ({ node, ...props }) => {
                            void node;
                            return <ol className="my-0 list-decimal pl-5" {...props} />;
                          },
                          li: ({ node, ...props }) => {
                            void node;
                            return (
                              <li
                                className="my-0 leading-[1.3] [&>ol]:my-0 [&>ol]:pt-0.5 [&>p]:my-0 [&>ul]:my-0 [&>ul]:pt-0.5"
                                {...props}
                              />
                            );
                          },
                          h1: ({ node, ...props }) => {
                            void node;
                            return <h1 className="mb-0 mt-1 text-base font-semibold" {...props} />;
                          },
                          h2: ({ node, ...props }) => {
                            void node;
                            return (
                              <h2 className="mb-0 mt-1 text-[15px] font-semibold" {...props} />
                            );
                          },
                          h3: ({ node, ...props }) => {
                            void node;
                            return <h3 className="mb-0 mt-1 text-sm font-semibold" {...props} />;
                          },
                          pre: ({ node, ...props }) => {
                            void node;
                            return (
                              <pre
                                className="my-0 overflow-x-auto rounded-md bg-slate-100 p-3 leading-[1.38]"
                                {...props}
                              />
                            );
                          },
                          blockquote: ({ node, ...props }) => {
                            void node;
                            return (
                              <blockquote
                                className="my-0 border-l-2 border-slate-200 pl-3"
                                {...props}
                              />
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {isStreaming && idx === activeMessages.length - 1 && (
                      <span className="ml-1 mt-1 inline-block h-4 w-1 animate-pulse rounded bg-primary align-middle" />
                    )}
                  </div>
                  {message.suggestedAnswer?.trim() ? (
                    <div className="mt-3 border-l-2 border-slate-200 pl-4">
                      <p className="mb-2 text-[11px] font-semibold text-slate-500">
                        문항 적용 후보
                      </p>
                      <div className="max-w-none whitespace-pre-wrap break-words text-sm leading-[1.38] text-slate-800">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ node, ...props }) => {
                              void node;
                              return <p className="my-0 leading-[1.38]" {...props} />;
                            },
                            ul: ({ node, ...props }) => {
                              void node;
                              return <ul className="my-0 list-disc pl-5" {...props} />;
                            },
                            ol: ({ node, ...props }) => {
                              void node;
                              return <ol className="my-0 list-decimal pl-5" {...props} />;
                            },
                            li: ({ node, ...props }) => {
                              void node;
                              return (
                                <li
                                  className="my-0 leading-[1.3] [&>ol]:my-0 [&>ol]:pt-0.5 [&>p]:my-0 [&>ul]:my-0 [&>ul]:pt-0.5"
                                  {...props}
                                />
                              );
                            },
                            h1: ({ node, ...props }) => {
                              void node;
                              return (
                                <h1 className="mb-0 mt-1 text-base font-semibold" {...props} />
                              );
                            },
                            h2: ({ node, ...props }) => {
                              void node;
                              return (
                                <h2 className="mb-0 mt-1 text-[15px] font-semibold" {...props} />
                              );
                            },
                            h3: ({ node, ...props }) => {
                              void node;
                              return <h3 className="mb-0 mt-1 text-sm font-semibold" {...props} />;
                            },
                            pre: ({ node, ...props }) => {
                              void node;
                              return (
                                <pre
                                  className="my-0 overflow-x-auto rounded-md bg-slate-100 p-3 leading-[1.38]"
                                  {...props}
                                />
                              );
                            },
                            blockquote: ({ node, ...props }) => {
                              void node;
                              return (
                                <blockquote
                                  className="my-0 border-l-2 border-slate-200 pl-3"
                                  {...props}
                                />
                              );
                            },
                          }}
                        >
                          {message.suggestedAnswer.trim()}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          className="h-8 px-3 text-xs"
                          onClick={() =>
                            onApplySuggestedAnswer(message.suggestedAnswer?.trim() || "")
                          }
                        >
                          적용하기
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>
        </div>

        {hasNewContent && !isAtBottom ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-44 z-10 flex justify-center px-4">
            <Button
              type="button"
              size="sm"
              className="pointer-events-auto h-8 rounded-full bg-slate-900 px-3 text-xs text-white shadow-lg hover:bg-slate-800"
              onClick={() => scrollToBottom("smooth")}
            >
              <ArrowDown className="mr-1.5 h-3.5 w-3.5" />새 응답 보기
            </Button>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/95 to-white/0 px-4 pb-5 pt-20">
          <div className="pointer-events-auto mx-auto w-full max-w-4xl">
            {visibleChatSuggestions.length > 0 ? (
              <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                  추천 입력
                </span>
                {visibleChatSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="max-w-full rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 text-left text-[11px] font-medium leading-none text-slate-600 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <span className="block truncate">{suggestion}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-2 shadow-[0_18px_55px_rgba(15,23,42,0.16)] ring-1 ring-white/70 backdrop-blur-xl">
              <Textarea
                ref={textareaRef}
                value={chatInput}
                onChange={(e) => onChatInputChange(e.target.value)}
                placeholder={
                  selectedQuestion?.title
                    ? `'${selectedQuestion.title}' 문항 기준으로 원하는 방향을 입력하세요`
                    : "원하는 작성 방향을 입력하세요"
                }
                className="min-h-[74px] resize-none border-0 bg-transparent px-3 py-2 pr-28 text-sm leading-[1.55] shadow-none focus-visible:ring-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3 px-2 pb-1">
                <span className="min-w-0 truncate text-[10px] text-slate-400">
                  {composerHint}
                </span>
                <Button
                  type="button"
                  aria-label="AI에 요청"
                  onClick={handleSubmit}
                  disabled={isStreaming}
                  className={`h-8 w-8 shrink-0 rounded-full p-0 shadow-sm transition-all ${
                    hasChatInput
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-primary/20 text-primary/60 opacity-70 hover:bg-primary/25"
                  }`}
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
