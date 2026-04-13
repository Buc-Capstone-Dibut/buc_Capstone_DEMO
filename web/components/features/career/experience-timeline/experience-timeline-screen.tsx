"use client";

import { CoverLetterWizardOverlay } from "@/components/features/career/cover-letter-wizard-overlay";
import { cn } from "@/lib/utils";
import type { ExperienceInput } from "@/app/career/experiences/actions";
import { ExperienceSavedModal } from "./experience-saved-modal";
import { ExperienceTimelineCard } from "./experience-timeline-card";
import { ExperienceTimelineEmptyState } from "./experience-timeline-empty-state";
import { ExperienceTimelineHeader } from "./experience-timeline-header";
import { ExperienceTimelineSelectionBar } from "./experience-timeline-selection-bar";
import { useExperienceTimeline } from "./use-experience-timeline";

interface ExperienceTimelineScreenProps {
  initialExperiences: ExperienceInput[];
}

export function ExperienceTimelineScreen({
  initialExperiences,
}: ExperienceTimelineScreenProps) {
  const {
    activeId,
    formData,
    handleAddNew,
    handleCardClick,
    handleDeleteExperience,
    handleIntakeComplete,
    handleSaveExperience,
    isSaving,
    isWizardSetupOpen,
    navigateToAiSetup,
    closeSavedModal,
    handleOpenCareerLetters,
    selectedIds,
    selectionMode,
    setActiveId,
    setFormData,
    showSavedModal,
    sortedExperiences,
    toggleSelectionMode,
    wizardExperienceIds,
    wizardSeed,
    closeWizard,
  } = useExperienceTimeline(initialExperiences);

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-48 pt-12 font-sans md:pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <ExperienceTimelineHeader
          selectionMode={selectionMode}
          onToggleSelectionMode={toggleSelectionMode}
          onAddNew={handleAddNew}
        />

        <div
          className={cn(
            "relative w-full pb-20 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            sortedExperiences.length > 0 && activeId !== null && !selectionMode
              ? "translate-x-0"
              : sortedExperiences.length > 0
                ? "lg:translate-x-[20%]"
                : "translate-x-0",
          )}
        >
          {sortedExperiences.length > 0 && (
            <div className="absolute bottom-0 left-1/2 top-4 w-[2px] -translate-x-1/2 rounded-full bg-slate-200 dark:bg-slate-800/60" />
          )}

          {sortedExperiences.length === 0 && (
            <ExperienceTimelineEmptyState onAddNew={handleAddNew} />
          )}

          <div className="relative z-10 flex flex-col gap-10">
            {sortedExperiences.map((experience) => {
              const isActive = activeId === experience.id;
              const isSelected = selectedIds.includes(experience.id!);

              return (
                <ExperienceTimelineCard
                  key={experience.id}
                  experience={experience}
                  isActive={isActive}
                  isSelected={isSelected}
                  selectionMode={selectionMode}
                  formData={formData}
                  setFormData={setFormData}
                  onCardClick={handleCardClick}
                  onDelete={handleDeleteExperience}
                  onSave={handleSaveExperience}
                  onCloseActive={() => setActiveId(null)}
                  isSaving={isSaving}
                />
              );
            })}
          </div>
        </div>
      </div>

      {selectionMode && selectedIds.length > 0 && (
        <ExperienceTimelineSelectionBar
          selectedCount={selectedIds.length}
          onGenerate={navigateToAiSetup}
        />
      )}

      {isWizardSetupOpen && (
        <CoverLetterWizardOverlay
          key={`wizard-setup-${wizardSeed}`}
          experienceIds={wizardExperienceIds}
          entrySource="career"
          onCancel={closeWizard}
          onExit={closeWizard}
          onIntakeComplete={handleIntakeComplete}
        />
      )}

      {showSavedModal && (
        <ExperienceSavedModal
          onOpenCareerLetters={handleOpenCareerLetters}
          onClose={closeSavedModal}
        />
      )}
    </div>
  );
}
