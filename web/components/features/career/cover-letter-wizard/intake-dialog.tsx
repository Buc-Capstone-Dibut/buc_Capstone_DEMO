"use client";

import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  type CoverLetterQuestion,
  COVER_LETTER_QUESTION_PRESETS,
  type IntakeStep,
  type WizardForm,
  toDateInputValue,
} from "./model";

type JobPostingOption = {
  id: string;
  companyName: string;
  roleTitle: string;
  schedules?: Array<{ kind: string; startAt: string }>;
};

type CoverLetterWizardIntakeDialogProps = {
  form: WizardForm;
  intakeStep: IntakeStep;
  onCancel: () => void;
  onBack: () => void;
  onSubmit: () => void;
  onFormChange: (patch: Partial<Omit<WizardForm, "questions">>) => void;
  onQuestionChange: (
    id: string,
    patch: Partial<Pick<CoverLetterQuestion, "title" | "maxChars" | "answer">>,
  ) => void;
  onQuestionAdd: () => void;
  onQuestionRemove: (id: string) => void;
};

export function CoverLetterWizardIntakeDialog({
  form,
  intakeStep,
  onCancel,
  onBack,
  onSubmit,
  onFormChange,
  onQuestionChange,
  onQuestionAdd,
  onQuestionRemove,
}: CoverLetterWizardIntakeDialogProps) {
  const canAddQuestion = form.questions.length < 6;
  const [activePresetQuestionId, setActivePresetQuestionId] = useState<string | null>(null);
  const [pendingFocusQuestionIndex, setPendingFocusQuestionIndex] = useState<number | null>(null);
  const titleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // 우측 패널: 내 채용공고 목록 (step 1에서만 노출)
  const [postings, setPostings] = useState<JobPostingOption[]>([]);
  const [postingsLoading, setPostingsLoading] = useState(false);
  const [postingsLoaded, setPostingsLoaded] = useState(false);
  const [postingsPage, setPostingsPage] = useState(1);
  const POSTINGS_PAGE_SIZE = 5;
  const postingsTotalPages = Math.max(
    1,
    Math.ceil(postings.length / POSTINGS_PAGE_SIZE),
  );
  const pagedPostings = postings.slice(
    (postingsPage - 1) * POSTINGS_PAGE_SIZE,
    postingsPage * POSTINGS_PAGE_SIZE,
  );

  useEffect(() => {
    if (intakeStep !== 1 || postingsLoaded) return;
    const ctrl = new AbortController();
    setPostingsLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/my/job-postings?pageSize=30&sort=newest", {
          cache: "no-store",
          signal: ctrl.signal,
        });
        const json = await res.json();
        if (json?.success) {
          setPostings((json.data?.items ?? []) as JobPostingOption[]);
        }
        setPostingsLoaded(true);
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") setPostingsLoaded(true);
      } finally {
        setPostingsLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [intakeStep, postingsLoaded]);

  const handleSelectPosting = (p: JobPostingOption) => {
    const deadlineEvent = (p.schedules ?? []).find(
      (s) => s.kind === "deadline" || s.kind === "document_due",
    );
    let nextDeadline = form.deadline;
    if (deadlineEvent?.startAt) {
      const d = new Date(deadlineEvent.startAt);
      if (!Number.isNaN(d.getTime())) nextDeadline = d.toISOString().slice(0, 10);
    }
    onFormChange({
      company: p.companyName ?? "",
      role: p.roleTitle ?? "",
      deadline: nextDeadline,
      targetJobPostingId: p.id,
    });
  };

  const handleClearPostingLink = () => {
    onFormChange({ targetJobPostingId: null });
  };

  useEffect(() => {
    if (pendingFocusQuestionIndex === null) return;
    const nextQuestion = form.questions[pendingFocusQuestionIndex];
    if (!nextQuestion) return;
    window.setTimeout(() => {
      titleInputRefs.current[nextQuestion.id]?.focus();
    }, 0);
    setPendingFocusQuestionIndex(null);
  }, [form.questions, pendingFocusQuestionIndex]);

  const handleQuestionTitleEnter = (index: number) => {
    const nextQuestion = form.questions[index + 1];
    setActivePresetQuestionId(null);

    if (nextQuestion) {
      setPendingFocusQuestionIndex(index + 1);
      return;
    }

    if (canAddQuestion) {
      setPendingFocusQuestionIndex(form.questions.length);
      onQuestionAdd();
    }
  };

  const dialogWidthClass =
    intakeStep === 1 ? "max-w-3xl" : "max-w-lg";
  const linkedPosting =
    intakeStep === 1 && form.targetJobPostingId
      ? postings.find((p) => p.id === form.targetJobPostingId) ?? null
      : null;

  return (
    <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4 sm:p-6">
      <div
        className={cn(
          "w-full rounded-2xl border bg-white shadow-2xl max-h-[88vh] overflow-hidden",
          dialogWidthClass,
        )}
      >
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">자소서 작성 설정</h2>
            <p className="text-xs text-slate-500 mt-1">
              {intakeStep}/2 단계
              {intakeStep === 1 && (
                <span className="ml-2 text-slate-400">
                  · 좌측에 직접 입력하거나 우측의 내 채용공고에서 가져오세요
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-slate-500 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {intakeStep === 1 ? (
          <div className="grid max-h-[75vh] grid-cols-1 overflow-hidden md:grid-cols-[1fr_300px]">
            {/* 좌측: 폼 */}
            <div className="space-y-5 overflow-y-auto px-6 py-5">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">기업분석 정보</h3>
                {linkedPosting && (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[12px]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="truncate text-slate-700">
                      <span className="font-semibold">{linkedPosting.companyName}</span>
                      <span className="mx-1 text-slate-400">·</span>
                      {linkedPosting.roleTitle}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearPostingLink}
                      className="ml-auto rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700"
                      title="공고 연결 해제"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div>
                  <Label>기업*</Label>
                  <Input
                    className="mt-2 h-11"
                    placeholder="예: 삼성전자 DS"
                    value={form.company}
                    onChange={(e) => onFormChange({ company: e.target.value })}
                  />
                </div>
                <div>
                  <Label>사업부 (선택)</Label>
                  <Input
                    className="mt-2 h-11"
                    placeholder="예: 메모리 사업부"
                    value={form.division}
                    onChange={(e) => onFormChange({ division: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>직무*</Label>
                    <Input
                      className="mt-2 h-11"
                      placeholder="예: 소프트웨어 개발"
                      value={form.role}
                      onChange={(e) => onFormChange({ role: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>마감일정*</Label>
                    <Input
                      className="mt-2 h-11"
                      type="date"
                      value={toDateInputValue(form.deadline)}
                      onChange={(e) => onFormChange({ deadline: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 우측: 내 채용공고 */}
            <aside className="flex flex-col overflow-hidden border-t bg-slate-50/50 md:border-l md:border-t-0">
              <div className="flex items-center gap-2 border-b bg-white px-4 py-3">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <h3 className="text-xs font-semibold text-slate-700">
                  내 채용공고에서 가져오기
                </h3>
                {postings.length > 0 && (
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {postings.length}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {postingsLoading ? (
                  <div className="flex h-32 items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    불러오는 중…
                  </div>
                ) : postings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                    <Inbox className="h-6 w-6 text-slate-300" aria-hidden />
                    <p className="text-[11px] text-muted-foreground">
                      등록된 채용공고가 없습니다
                    </p>
                    <a
                      href="/my/job-postings"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      공고 등록하러 가기 →
                    </a>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200/70">
                    {pagedPostings.map((p) => {
                      const active = p.id === form.targetJobPostingId;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectPosting(p)}
                            className={cn(
                              "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors",
                              active ? "bg-primary/10" : "hover:bg-white",
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                {p.companyName}
                              </span>
                              {active && (
                                <CheckCircle2
                                  className="h-3 w-3 shrink-0 text-primary"
                                  aria-hidden
                                />
                              )}
                            </div>
                            <span className="truncate text-[13px] font-bold text-foreground">
                              {p.roleTitle}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {postings.length > POSTINGS_PAGE_SIZE && (
                <div className="flex items-center justify-between gap-2 border-t bg-white px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setPostingsPage((p) => Math.max(1, p - 1))}
                    disabled={postingsPage === 1}
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {postingsPage} / {postingsTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPostingsPage((p) =>
                        Math.min(postingsTotalPages, p + 1),
                      )
                    }
                    disabled={postingsPage >= postingsTotalPages}
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="다음 페이지"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </aside>
          </div>
        ) : (
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
          {intakeStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">문항 정보 (최대 6개)</h3>
                <p className="mt-1 text-xs text-slate-500">
                  문항 제목은 직접 입력할 수 있고, 입력칸을 클릭하면 추천 문항을 참고할 수 있습니다.
                </p>
              </div>

              <div className="border-y border-slate-200/90 divide-y divide-slate-200/90">
                {form.questions.map((question, questionIndex) => (
                  <div key={question.id} className="py-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-8">
                        <Label>문항*</Label>
                        <div className="mt-2">
                          <Input
                            ref={(node) => {
                              titleInputRefs.current[question.id] = node;
                            }}
                            className="h-10"
                            placeholder="문항 제목"
                            value={question.title}
                            onFocus={() => setActivePresetQuestionId(question.id)}
                            onBlur={() => {
                              window.setTimeout(() => {
                                setActivePresetQuestionId((current) =>
                                  current === question.id ? null : current,
                                );
                              }, 120);
                            }}
                            onChange={(e) =>
                              onQuestionChange(question.id, { title: e.target.value })
                            }
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") return;
                              event.preventDefault();
                              handleQuestionTitleEnter(questionIndex);
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-span-3">
                        <Label>글자수*</Label>
                        <Input
                          className="mt-2 h-10"
                          type="number"
                          min={1}
                          value={question.maxChars || ""}
                          onChange={(e) =>
                            onQuestionChange(question.id, {
                              maxChars: Number(e.target.value || 0),
                            })
                          }
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-slate-500 hover:bg-slate-100"
                          onClick={() => onQuestionRemove(question.id)}
                          title="문항 삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {activePresetQuestionId === question.id && (
                        <div className="col-span-8">
                          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 px-3 py-2">
                              <p className="text-[11px] font-semibold text-slate-500">
                                추천 문항
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                선택하지 않아도 직접 입력할 수 있습니다.
                              </p>
                            </div>
                            <div className="max-h-36 overflow-y-scroll py-1 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400">
                              {COVER_LETTER_QUESTION_PRESETS.map((preset) => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    onQuestionChange(question.id, {
                                      title: preset.title,
                                      maxChars: preset.maxChars,
                                    });
                                    setActivePresetQuestionId(null);
                                  }}
                                  className="flex h-9 w-full items-center px-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-primary/5 hover:text-primary"
                                >
                                  {preset.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={onQuestionAdd}
                disabled={!canAddQuestion}
                className="w-full h-10 rounded-lg border bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <Plus className="mr-1 inline h-4 w-4" />
                문항 추가 ({form.questions.length}/6)
              </button>
            </div>
          )}
        </div>
        )}

        <div className="border-t px-6 py-4 flex items-center justify-end gap-2">
          {intakeStep === 1 ? (
            <>
              <Button variant="outline" onClick={onCancel}>
                취소
              </Button>
              <Button onClick={onSubmit}>다음</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onBack}>
                이전
              </Button>
              <Button onClick={onSubmit}>AI 채팅 빌딩 시작</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
