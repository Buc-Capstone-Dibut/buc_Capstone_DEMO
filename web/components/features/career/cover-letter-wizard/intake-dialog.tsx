"use client";

import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CoverLetterQuestion,
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
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">문항 정보 (최대 6개)</h3>
              <div className="border-y border-slate-200/90 divide-y divide-slate-200/90">
                {form.questions.map((question) => (
                  <div key={question.id} className="py-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-8">
                        <Label>문항*</Label>
                        <Input
                          className="mt-2 h-10"
                          placeholder="문항 제목"
                          value={question.title}
                          onChange={(e) =>
                            onQuestionChange(question.id, { title: e.target.value })
                          }
                        />
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
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={onQuestionAdd}
                disabled={form.questions.length >= 6}
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
