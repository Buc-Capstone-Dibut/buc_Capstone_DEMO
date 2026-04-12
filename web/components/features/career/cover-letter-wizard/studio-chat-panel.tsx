"use client";

import type { RefObject } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  chatBottomRef: RefObject<HTMLDivElement>;
  onChatInputChange: (value: string) => void;
  onApplySuggestedAnswer: (answer: string) => void;
  onSubmit: () => void;
};

export function CoverLetterWizardStudioChatPanel({
  activeMessages,
  chatInput,
  isStreaming,
  requestBanner,
  selectedQuestion,
  selectedQuestionId,
  streamPhaseLabel,
  chatBottomRef,
  onChatInputChange,
  onApplySuggestedAnswer,
  onSubmit,
}: CoverLetterWizardStudioChatPanelProps) {
  const hasChatInput = chatInput.trim().length > 0;
  const composerHint = requestBanner
    ? `${requestBanner.tone === "error" ? "AI 요청 오류" : "AI 응답 생성 중"} · ${
        requestBanner.message
      }${requestBanner.statusCode ? ` (코드: ${requestBanner.statusCode})` : ""}`
    : streamPhaseLabel || "Enter 전송 · Shift+Enter 줄바꿈";

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
        <div className="h-full overflow-y-auto">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-5 pb-44 pt-5">
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/95 to-white/0 px-4 pb-5 pt-14">
          <div className="pointer-events-auto mx-auto w-full max-w-4xl">
            <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-2 shadow-[0_18px_55px_rgba(15,23,42,0.16)] ring-1 ring-white/70 backdrop-blur-xl">
              <Textarea
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
                    onSubmit();
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
                  onClick={onSubmit}
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
