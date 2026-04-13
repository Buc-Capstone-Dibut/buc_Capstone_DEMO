"use client";

import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type ExperienceSnapshot,
  type QuestionMessageMap,
  type QuestionWorkflowMap,
  type WizardForm,
  createDefaultWorkflowState,
  getWorkflowStageLabel,
} from "./model";

type CoverLetterWizardStudioSidebarProps = {
  allQuestionsConfirmed: boolean;
  expandedExperienceIds: string[];
  experienceSnapshot: ExperienceSnapshot[];
  footerStatusText: string;
  form: WizardForm;
  isSaving: boolean;
  latestUpdatedLabel: string;
  nextSuggestedQuestionId: string | null;
  questionMessages: QuestionMessageMap;
  questionWorkflowMap: QuestionWorkflowMap;
  selectedQuestionId: string | null;
  onComplete: () => void;
  onSelectQuestion: (id: string) => void;
  onToggleExperience: (id: string) => void;
};

export function CoverLetterWizardStudioSidebar({
  allQuestionsConfirmed,
  expandedExperienceIds,
  experienceSnapshot,
  footerStatusText,
  form,
  isSaving,
  latestUpdatedLabel,
  nextSuggestedQuestionId,
  questionMessages,
  questionWorkflowMap,
  selectedQuestionId,
  onComplete,
  onSelectQuestion,
  onToggleExperience,
}: CoverLetterWizardStudioSidebarProps) {
  return (
    <aside className="min-h-0 overflow-y-auto bg-slate-50/70 p-4">
      <div className="space-y-4 border-b border-slate-200 pb-4">
        <div className="text-xs font-semibold text-slate-500">실시간 패널</div>
        <div className="grid grid-cols-[84px_1fr] items-center text-xs">
          <span className="text-slate-500">기업</span>
          <span className="font-medium text-slate-800">{form.company || "미입력"}</span>
        </div>
        <div className="grid grid-cols-[84px_1fr] items-center text-xs">
          <span className="text-slate-500">직무</span>
          <span className="font-medium text-slate-800">{form.role || "미입력"}</span>
        </div>
        <div className="grid grid-cols-[84px_1fr] items-center text-xs">
          <span className="text-slate-500">마감일</span>
          <span className="font-medium text-slate-800">{form.deadline || "미입력"}</span>
        </div>
        <div className="grid grid-cols-[84px_1fr] items-center text-xs">
          <span className="text-slate-500">최근 수정일</span>
          <span className="font-medium text-slate-800">{latestUpdatedLabel}</span>
        </div>
      </div>

      <div className="space-y-2 border-b border-slate-200 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500">기반 경험</h3>
          <span className="text-[11px] text-slate-500">{experienceSnapshot.length}개</span>
        </div>
        <div className="space-y-2">
          {experienceSnapshot.length > 0 ? (
            experienceSnapshot.map((experience) => (
              <div
                key={experience.id}
                className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() => onToggleExperience(experience.id)}
                >
                  <p className="text-xs font-medium text-slate-700">{experience.title}</p>
                  {expandedExperienceIds.includes(experience.id) ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  )}
                </button>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(experience.tags || []).slice(0, 4).map((tag) => (
                    <span
                      key={`${experience.id}-${tag}`}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {expandedExperienceIds.includes(experience.id) && (
                  <div className="mt-2 space-y-1 rounded-md border border-slate-200 bg-white p-2 text-[11px] text-slate-600">
                    {experience.period ? (
                      <p>
                        <span className="text-slate-500">기간:</span> {experience.period}
                      </p>
                    ) : null}
                    {experience.description ? (
                      <p>
                        <span className="text-slate-500">요약:</span> {experience.description}
                      </p>
                    ) : null}
                    {experience.situation ? (
                      <p>
                        <span className="text-slate-500">상황:</span> {experience.situation}
                      </p>
                    ) : null}
                    {experience.role ? (
                      <p>
                        <span className="text-slate-500">역할:</span> {experience.role}
                      </p>
                    ) : null}
                    {experience.solution ? (
                      <p>
                        <span className="text-slate-500">행동:</span> {experience.solution}
                      </p>
                    ) : null}
                    {experience.result ? (
                      <p>
                        <span className="text-slate-500">결과:</span> {experience.result}
                      </p>
                    ) : null}
                    {experience.lesson ? (
                      <p>
                        <span className="text-slate-500">배운점:</span> {experience.lesson}
                      </p>
                    ) : null}
                    {!experience.period &&
                    !experience.description &&
                    !experience.situation &&
                    !experience.role &&
                    !experience.solution &&
                    !experience.result &&
                    !experience.lesson ? (
                      <p className="text-slate-500">상세 경험 데이터가 없습니다.</p>
                    ) : null}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-[11px] text-slate-500">선택된 경험이 없습니다.</p>
          )}
        </div>
      </div>

      <div className="space-y-3 border-b border-slate-200 py-4">
        <h4 className="text-xs font-semibold text-slate-500">문항 목록</h4>
        <div className="space-y-2">
          {form.questions.map((question, idx) => {
            const active = selectedQuestionId === question.id;
            const hasAnswer = (question.answer || "").trim().length > 0;
            const chatMessages = questionMessages[question.id] || [];
            const userTurns = chatMessages.filter((message) => message.role === "user").length;
            const assistantTurns = chatMessages.filter(
              (message) => message.role === "assistant",
            ).length;
            const workflow = questionWorkflowMap[question.id] || createDefaultWorkflowState();
            const isConfirmed = Boolean(workflow.confirmedAt);

            return (
              <button
                key={question.id}
                type="button"
                onClick={() => onSelectQuestion(question.id)}
                className={`w-full rounded-md border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-primary bg-primary/5"
                    : nextSuggestedQuestionId === question.id
                      ? "border-primary/50 bg-primary/5 animate-pulse"
                    : "border-slate-200 bg-white/80 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-xs font-semibold text-slate-700">
                    {idx + 1}. {question.title || "문항 제목 미입력"}
                  </p>
                  {isConfirmed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : hasAnswer ? (
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{question.maxChars}자</p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  단계 {getWorkflowStageLabel(workflow.stage)} · 사용자 {userTurns} · AI{" "}
                  {assistantTurns}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-200 pt-4">
        <Button
          className="h-9 w-full text-xs"
          onClick={onComplete}
          disabled={isSaving || !allQuestionsConfirmed}
        >
          완료
        </Button>
        <div className="text-[11px] text-slate-500">{footerStatusText}</div>
      </div>
    </aside>
  );
}
