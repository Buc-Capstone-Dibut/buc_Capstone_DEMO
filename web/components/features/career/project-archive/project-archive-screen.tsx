"use client";

import { useMemo, useState } from "react";
import { CoverLetterWizardOverlay } from "@/components/features/career/cover-letter-wizard-overlay";
import { cn } from "@/lib/utils";
import type { ProjectInput } from "@/app/career/projects/types";
import { ProjectSavedModal } from "./project-saved-modal";
import { ProjectArchiveEmptyState } from "./project-archive-empty-state";
import { ProjectArchiveHeader } from "./project-archive-header";
import { ProjectArchiveSelectionBar } from "./project-archive-selection-bar";
import { ProjectEditorDrawer } from "./project-editor-drawer";
import { ProjectGridCard } from "./project-grid-card";
import { ProjectTimelineCard } from "./project-timeline-card";
import { useProjectArchive } from "./use-project-archive";
import type { ProjectArchiveViewMode } from "./project-archive.types";

interface ProjectArchiveScreenProps {
  initialProjects: ProjectInput[];
}

export function ProjectArchiveScreen({
  initialProjects,
}: ProjectArchiveScreenProps) {
  const [viewMode, setViewMode] = useState<ProjectArchiveViewMode>("cards");
  const {
    activeId,
    formData,
    handleAddNew,
    handleProjectClick,
    handleDeleteProject,
    handleIntakeComplete,
    handleSaveProject,
    isSaving,
    isWizardSetupOpen,
    navigateToAiSetup,
    navigateToPortfolioCreate,
    closeSavedModal,
    handleOpenCareerLetters,
    selectedIds,
    selectionMode,
    portfolioMode,
    isCreatingPortfolio,
    setActiveId,
    setFormData,
    showSavedModal,
    sortedProjects,
    toggleSelectionMode,
    togglePortfolioMode,
    wizardExperienceIds,
    wizardSeed,
    closeWizard,
  } = useProjectArchive(initialProjects);

  const activeProject = useMemo(
    () => sortedProjects.find((project) => project.id === activeId),
    [activeId, sortedProjects],
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-48 pt-12 font-sans md:pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <ProjectArchiveHeader
          selectionMode={selectionMode}
          portfolioMode={portfolioMode}
          viewMode={viewMode}
          projectCount={sortedProjects.length}
          onViewModeChange={setViewMode}
          onToggleSelectionMode={toggleSelectionMode}
          onTogglePortfolioMode={togglePortfolioMode}
          onAddNew={handleAddNew}
        />

        {sortedProjects.length === 0 && (
          <ProjectArchiveEmptyState onAddNew={handleAddNew} />
        )}

        {sortedProjects.length > 0 && viewMode === "cards" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedProjects.map((project, index) => {
              const isActive = activeId === project.id;
              const isSelected = selectedIds.includes(project.id!);

              return (
                <ProjectGridCard
                  key={project.id || `${project.company || "project"}-${index}`}
                  project={project}
                  isActive={isActive}
                  isSelected={isSelected}
                  selectionMode={selectionMode || portfolioMode}
                  portfolioMode={portfolioMode}
                  onOpen={handleProjectClick}
                  onDelete={handleDeleteProject}
                />
              );
            })}
          </div>
        )}

        {sortedProjects.length > 0 && viewMode === "timeline" && (
          <div
            className={cn(
              "relative w-full pb-20 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
              activeId !== null && !selectionMode && !portfolioMode
                ? "translate-x-0"
                : "lg:translate-x-[20%]",
            )}
          >
            <div className="absolute bottom-0 left-1/2 top-4 w-[2px] -translate-x-1/2 rounded-full bg-slate-200 dark:bg-slate-800/60" />

            <div className="relative z-10 flex flex-col gap-10">
              {sortedProjects.map((project, index) => {
                const isActive = activeId === project.id;
                const isSelected = selectedIds.includes(project.id!);

                return (
                  <ProjectTimelineCard
                    key={project.id || `${project.company || "project"}-${index}`}
                    project={project}
                    isActive={isActive}
                    isSelected={isSelected}
                    selectionMode={selectionMode || portfolioMode}
                    portfolioMode={portfolioMode}
                    formData={formData}
                    setFormData={setFormData}
                    onCardClick={handleProjectClick}
                    onDelete={handleDeleteProject}
                    onSave={handleSaveProject}
                    onCloseActive={() => setActiveId(null)}
                    isSaving={isSaving}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {viewMode === "cards" && !selectionMode && !portfolioMode && (
        <ProjectEditorDrawer
          project={activeProject}
          formData={formData}
          setFormData={setFormData}
          onClose={() => setActiveId(null)}
          onSave={handleSaveProject}
          isSaving={isSaving}
        />
      )}

      {(selectionMode || portfolioMode) && selectedIds.length > 0 && (
        <ProjectArchiveSelectionBar
          selectedCount={selectedIds.length}
          onGenerate={portfolioMode ? navigateToPortfolioCreate : navigateToAiSetup}
          actionLabel={
            portfolioMode
              ? "선택한 프로젝트로 포트폴리오 생성"
              : "선택한 프로젝트로 자소서 생성"
          }
          disabled={portfolioMode && isCreatingPortfolio}
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
        <ProjectSavedModal
          onOpenCareerLetters={handleOpenCareerLetters}
          onClose={closeSavedModal}
        />
      )}
    </div>
  );
}
