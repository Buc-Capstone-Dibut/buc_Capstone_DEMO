"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, Loader2, Sparkles, X } from "lucide-react";
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
import {
  CareerFilterChip,
  CareerFilterSection,
  CareerListToolbar,
} from "@/components/features/career/career-list-toolbar";
import { useCareerFilterUrl } from "@/hooks/use-career-filter-url";

interface ProjectArchiveScreenProps {
  initialProjects: ProjectInput[];
}

type ProjectAssetFilter = "all" | "with-assets" | "without-assets";
type ProjectSort = "recent" | "title";

function getProjectStartDate(period?: string) {
  const match = (period || "").match(/(\d{4})[.:/-]?(\d{1,2})?/);
  if (!match) return "0000.00";
  return `${match[1]}.${(match[2] || "01").padStart(2, "0")}`;
}

export function ProjectArchiveScreen({
  initialProjects,
}: ProjectArchiveScreenProps) {
  const searchParams = useSearchParams();
  const initialAssets = searchParams.get("assets");
  const initialSort = searchParams.get("sort");
  const [viewMode, setViewMode] = useState<ProjectArchiveViewMode>("cards");
  const [isFormatDialogOpen, setIsFormatDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [assetFilter, setAssetFilter] = useState<ProjectAssetFilter>(
    initialAssets === "with-assets" || initialAssets === "without-assets" ? initialAssets : "all",
  );
  const [selectedTech, setSelectedTech] = useState<string[]>(
    () => searchParams.get("tech")?.split(",").filter(Boolean) || [],
  );
  const [selectedYear, setSelectedYear] = useState(searchParams.get("year") || "all");
  const [sortOrder, setSortOrder] = useState<ProjectSort>(
    initialSort === "title" ? "title" : "recent",
  );
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

  const availableTech = useMemo(
    () =>
      Array.from(
        new Set(sortedProjects.flatMap((project) => project.techStack || [])),
      ).sort((a, b) => a.localeCompare(b, "ko")),
    [sortedProjects],
  );

  const availableYears = useMemo(
    () =>
      Array.from(
        new Set(
          sortedProjects
            .map((project) => project.period?.match(/\d{4}/)?.[0])
            .filter((year): year is string => Boolean(year)),
        ),
      ).sort((a, b) => b.localeCompare(a)),
    [sortedProjects],
  );

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const next = sortedProjects.filter((project) => {
      const hasAssets = Boolean(
        project.representativeImage?.url || project.attachments?.length,
      );
      if (assetFilter === "with-assets" && !hasAssets) return false;
      if (assetFilter === "without-assets" && hasAssets) return false;
      if (selectedYear !== "all" && !project.period?.includes(selectedYear)) return false;
      if (
        selectedTech.length > 0 &&
        !selectedTech.every((tech) => project.techStack?.includes(tech))
      ) {
        return false;
      }

      if (!query) return true;
      const searchable = [
        project.company,
        project.position,
        project.role,
        project.description,
        project.result,
        ...(project.tags || []),
        ...(project.techStack || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });

    return [...next].sort((a, b) => {
      if (sortOrder === "title") {
        return (a.company || "").localeCompare(b.company || "", "ko");
      }
      return getProjectStartDate(b.period).localeCompare(getProjectStartDate(a.period));
    });
  }, [assetFilter, searchQuery, selectedTech, selectedYear, sortOrder, sortedProjects]);

  const activeProject = useMemo(
    () => filteredProjects.find((project) => project.id === activeId),
    [activeId, filteredProjects],
  );

  const resetFilters = () => {
    setSearchQuery("");
    setAssetFilter("all");
    setSelectedTech([]);
    setSelectedYear("all");
    setSortOrder("recent");
  };

  const advancedFilterCount =
    selectedTech.length +
    (selectedYear === "all" ? 0 : 1) +
    (assetFilter === "all" ? 0 : 1);

  useCareerFilterUrl({
    q: searchQuery || null,
    status: null,
    tech: selectedTech.length ? selectedTech.join(",") : null,
    year: selectedYear === "all" ? null : selectedYear,
    assets: assetFilter === "all" ? null : assetFilter,
    sort: sortOrder === "recent" ? null : sortOrder,
  });

  const handlePortfolioGenerate = () => {
    setIsFormatDialogOpen(true);
  };

  const handlePortfolioFormatSelect = (format: PortfolioCreationFormat) => {
    setIsFormatDialogOpen(false);
    navigateToPortfolioCreate(format);
  };

  const router = useRouter();
  const [isShowcasePending, startShowcaseTransition] = useTransition();

  const handleShowcaseSelect = () => {
    const csv = selectedIds.filter(Boolean).join(",");
    // Do NOT close the dialog immediately — keep it open with the spinner
    // while the navigation transitions to /showcase/new (whose loading.tsx
    // then takes over).
    startShowcaseTransition(() => {
      router.push(`/career/portfolios/showcase/new?projectIds=${encodeURIComponent(csv)}`);
    });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-48 pt-12 font-sans md:pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <ProjectArchiveHeader
          selectionMode={selectionMode}
          portfolioMode={portfolioMode}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onToggleSelectionMode={toggleSelectionMode}
          onTogglePortfolioMode={togglePortfolioMode}
          onAddNew={handleAddNew}
        />

        {sortedProjects.length > 0 ? (
          <CareerListToolbar
            ariaLabel="프로젝트 필터"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="프로젝트명·역할·기술 검색"
            sortValue={sortOrder}
            onSortChange={(value) => setSortOrder(value as ProjectSort)}
            sortOptions={[
              { value: "recent", label: "최근 프로젝트순" },
              { value: "title", label: "제목순" },
            ]}
            advancedFilterCount={advancedFilterCount}
            advancedFilters={
              <>
                <CareerFilterSection label="기술 스택">
                  {availableTech.length > 0 ? availableTech.map((tech) => (
                    <CareerFilterChip
                      key={tech}
                      active={selectedTech.includes(tech)}
                      onClick={() =>
                        setSelectedTech((current) =>
                          current.includes(tech)
                            ? current.filter((item) => item !== tech)
                            : [...current, tech],
                        )
                      }
                    >
                      {tech}
                    </CareerFilterChip>
                  )) : <span className="text-xs text-slate-400">등록된 기술 스택이 없습니다.</span>}
                </CareerFilterSection>
                <CareerFilterSection label="진행 연도">
                  <CareerFilterChip active={selectedYear === "all"} onClick={() => setSelectedYear("all")}>전체</CareerFilterChip>
                  {availableYears.map((year) => (
                    <CareerFilterChip key={year} active={selectedYear === year} onClick={() => setSelectedYear(year)}>
                      {year}년
                    </CareerFilterChip>
                  ))}
                </CareerFilterSection>
                <CareerFilterSection label="보관 자료">
                  {([
                    ["all", "전체"],
                    ["with-assets", "첨부자료 있음"],
                    ["without-assets", "첨부자료 없음"],
                  ] as const).map(([value, label]) => (
                    <CareerFilterChip key={value} active={assetFilter === value} onClick={() => setAssetFilter(value)}>
                      {label}
                    </CareerFilterChip>
                  ))}
                </CareerFilterSection>
              </>
            }
            activeFilters={[
              ...selectedTech.map((tech) => ({
                id: `tech-${tech}`,
                label: tech,
                onRemove: () => setSelectedTech((current) => current.filter((item) => item !== tech)),
              })),
              ...(selectedYear !== "all" ? [{ id: "year", label: `${selectedYear}년`, onRemove: () => setSelectedYear("all") }] : []),
              ...(assetFilter !== "all" ? [{
                id: "assets",
                label: assetFilter === "with-assets" ? "첨부자료 있음" : "첨부자료 없음",
                onRemove: () => setAssetFilter("all"),
              }] : []),
            ]}
            onReset={resetFilters}
          />
        ) : null}

        {sortedProjects.length === 0 && (
          <ProjectArchiveEmptyState
            onAddNew={handleAddNew}
            onLoadSampleData={handleLoadSampleData}
            isLoadingSample={isSeedingSample}
          />
        )}

        {sortedProjects.length > 0 && filteredProjects.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 px-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <p className="font-semibold text-slate-600 dark:text-slate-300">조건에 맞는 프로젝트가 없습니다.</p>
            <button type="button" onClick={resetFilters} className="mt-3 text-sm font-bold text-primary hover:underline">
              필터 초기화
            </button>
          </div>
        ) : null}

        {filteredProjects.length > 0 && viewMode === "cards" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project, index) => {
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

        {filteredProjects.length > 0 && viewMode === "timeline" && (
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
              {filteredProjects.map((project, index) => {
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

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
                  슬라이드형
                </span>
                <span className="mt-2 block text-sm font-medium leading-6 text-slate-500">
                  여러 슬라이드로 구성하는 포트폴리오 · PDF로 내보내 제출
                </span>
              </button>

              <button
                type="button"
                onClick={handleShowcaseSelect}
                disabled={isCreatingPortfolio || isShowcasePending}
                className="rounded-lg border border-emerald-400/40 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
                  {isShowcasePending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </span>
                <span className="mt-4 block text-base font-black text-slate-950">
                  {isShowcasePending ? "준비 중…" : "웹사이트형"}
                </span>
                <span className="mt-2 block text-sm font-medium leading-6 text-slate-500">
                  {isShowcasePending
                    ? "AI가 포트폴리오 초안을 만들고 있습니다"
                    : "한 페이지 디자인 사이트 · 공개 링크로 공유"}
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
