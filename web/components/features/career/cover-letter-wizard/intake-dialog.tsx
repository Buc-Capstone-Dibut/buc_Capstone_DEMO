"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CoverLetterQuestion,
  COVER_LETTER_QUESTION_PRESETS,
  type IntakeStep,
  type WizardForm,
  toDateInputValue,
} from "./model";

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

  return (
    <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg rounded-2xl border bg-white shadow-2xl max-h-[88vh] overflow-hidden">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">자소서 작성 설정</h2>
            <p className="text-xs text-slate-500 mt-1">{intakeStep}/2 단계</p>
          </div>
          <button
            onClick={onCancel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-slate-500 hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
          {intakeStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">기업분석 정보</h3>
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
          )}

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
                          value={question.maxChars}
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
