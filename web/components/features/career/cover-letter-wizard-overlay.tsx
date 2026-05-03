"use client";

import { X } from "lucide-react";
import { CoverLetterWizardCompletionDialog } from "./cover-letter-wizard/completion-dialog";
import { CoverLetterWizardIntakeDialog } from "./cover-letter-wizard/intake-dialog";
import { CoverLetterWizardStudioChatPanel } from "./cover-letter-wizard/studio-chat-panel";
import { CoverLetterWizardStudioSidebar } from "./cover-letter-wizard/studio-sidebar";
import {
  type CoverLetterWizardOverlayProps,
  useCoverLetterWizard,
} from "./cover-letter-wizard/use-cover-letter-wizard";

export function CoverLetterWizardOverlay(props: CoverLetterWizardOverlayProps) {
  const {
    phase,
    intakeStep,
    form,
    chatInput,
    isStreaming,
    streamPhaseLabel,
    requestBanner,
    selectedQuestion,
    selectedQuestionId,
    activeMessages,
    expandedExperienceIds,
    experienceSnapshot,
    footerStatusText,
    isSaving,
    latestUpdatedLabel,
    nextSuggestedQuestionId,
    questionMessages,
    questionWorkflowMap,
    allQuestionsConfirmed,
    handleCancelIntake,
    handleIntakeBack,
    handleIntakeSubmit,
    handleFormChange,
    handleQuestionChange,
    handleQuestionAdd,
    handleQuestionRemove,
    handleChatInputChange,
    handleApplySuggestedAnswer,
    handleChatSubmit,
    handleSelectQuestion,
    handleToggleExperience,
    handleComplete,
    handleContinueToCoverLetters,
    handleExit,
  } = useCoverLetterWizard(props);

  return (
    <div className="fixed inset-0 z-[80]">
      {phase === "intake" && (
        <CoverLetterWizardIntakeDialog
          form={form}
          intakeStep={intakeStep}
          onCancel={handleCancelIntake}
          onBack={handleIntakeBack}
          onSubmit={handleIntakeSubmit}
          onFormChange={handleFormChange}
          onQuestionChange={handleQuestionChange}
          onQuestionAdd={handleQuestionAdd}
          onQuestionRemove={handleQuestionRemove}
        />
      )}

      {phase === "studio" && (
        <div className="h-full px-3 py-3 bg-white">
          <button
            onClick={handleExit}
            className="fixed right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="닫기"
            title="닫기"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="h-full overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
              <CoverLetterWizardStudioChatPanel
                activeMessages={activeMessages}
                chatInput={chatInput}
                isStreaming={isStreaming}
                requestBanner={requestBanner}
                selectedQuestion={selectedQuestion}
                selectedQuestionId={selectedQuestionId}
                streamPhaseLabel={streamPhaseLabel}
                onChatInputChange={handleChatInputChange}
                onApplySuggestedAnswer={handleApplySuggestedAnswer}
                onSubmit={handleChatSubmit}
              />

              <CoverLetterWizardStudioSidebar
                allQuestionsConfirmed={allQuestionsConfirmed}
                expandedExperienceIds={expandedExperienceIds}
                experienceSnapshot={experienceSnapshot}
                footerStatusText={footerStatusText}
                form={form}
                isSaving={isSaving}
                latestUpdatedLabel={latestUpdatedLabel}
                nextSuggestedQuestionId={nextSuggestedQuestionId}
                questionMessages={questionMessages}
                questionWorkflowMap={questionWorkflowMap}
                selectedQuestionId={selectedQuestionId}
                onComplete={handleComplete}
                onSelectQuestion={handleSelectQuestion}
                onToggleExperience={handleToggleExperience}
              />
            </div>
          </div>
        </div>
      )}

      {phase === "completed" && (
        <CoverLetterWizardCompletionDialog
          onContinue={handleContinueToCoverLetters}
          onClose={handleExit}
        />
      )}
    </div>
  );
}
