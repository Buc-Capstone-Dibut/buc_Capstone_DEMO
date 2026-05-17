"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2, Presentation, Sparkles, X } from "lucide-react";
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
import { useProjectArchive, type PortfolioCreationFormat } from "./use-project-archive";
import type { ProjectArchiveViewMode } from "./project-archive.types";

interface ProjectArchiveScreenProps {
  initialProjects: ProjectInput[];
}

export function ProjectArchiveScreen({
  initialProjects,
}: ProjectArchiveScreenProps) {
  const [viewMode, setViewMode] = useState<ProjectArchiveViewMode>("cards");
  const [isFormatDialogOpen, setIsFormatDialogOpen] = useState(false);
  const {
    activeId,
    formData,
    handleAddNew,
    handleProjectClick,
    handleDeleteProject,
    handleLoadSampleData,
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
    isSeedingSample,
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

  const handlePortfolioGenerate = () => {
    setIsFormatDialogOpen(true);
  };

  const handlePortfolioFormatSelect = (format: PortfolioCreationFormat) => {
    setIsFormatDialogOpen(false);
    navigateToPortfolioCreate(format);
  };

  const router = useRouter();

  const handleShowcaseSelect = () => {
    setIsFormatDialogOpen(false);
    const csv = selectedIds.filter(Boolean).join(",");
    router.push(`/career/portfolios/showcase/new?projectIds=${encodeURIComponent(csv)}`);
  };

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
          <ProjectArchiveEmptyState
            onAddNew={handleAddNew}
            onLoadSampleData={handleLoadSampleData}
            isLoadingSample={isSeedingSample}
          />
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
          onGenerate={portfolioMode ? handlePortfolioGenerate : navigateToAiSetup}
          actionLabel={
            portfolioMode
              ? "선택한 프로젝트로 포트폴리오 생성"
              : "선택한 프로젝트로 자소서 생성"
          }
          disabled={portfolioMode && isCreatingPortfolio}
        />
      )}

      {isFormatDialogOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-950">포트폴리오 형식 선택</h3>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                  선택한 프로젝트를 어떤 화면 형식으로 생성할지 고르세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormatDialogOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handlePortfolioFormatSelect("site")}
                disabled={isCreatingPortfolio}
                className="rounded-lg border border-primary/25 bg-primary/5 p-4 text-left transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                  <Globe2 className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-base font-black text-slate-950">
                  웹 슬라이드형
                </span>
                <span className="mt-2 block text-sm font-medium leading-6 text-slate-500">
                  브라우저에서 여러 페이지를 넘기는 HTML 기반 포트폴리오
                </span>
              </button>

              <button
                type="button"
                onClick={() => handlePortfolioFormatSelect("slide")}
                disabled={isCreatingPortfolio}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Presentation className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-base font-black text-slate-950">
                  PPT 16:9형
                </span>
                <span className="mt-2 block text-sm font-medium leading-6 text-slate-500">
                  기존 슬라이드 편집기로 세부 배치를 조정하는 포트폴리오
                </span>
              </button>

              <button
                type="button"
                onClick={handleShowcaseSelect}
                disabled={isCreatingPortfolio}
                className="rounded-lg border border-emerald-400/40 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="mt-4 block text-base font-black text-slate-950">
                  디자인 템플릿 (베타)
                </span>
                <span className="mt-2 block text-sm font-medium leading-6 text-slate-500">
                  GSAP 인터랙션이 살아 있는 단일 페이지 포트폴리오 + 공개 URL
                </span>
              </button>
            </div>
          </div>
        </div>
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
