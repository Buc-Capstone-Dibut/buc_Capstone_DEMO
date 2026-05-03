"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProjectInput } from "@/app/career/projects/types";
import {
  deleteProjectAction,
  saveProjectAction,
} from "@/app/career/projects/actions";
import {
  MAX_WIZARD_PROJECTS,
  buildProjectContextString,
  buildProjectSnapshot,
  buildMinimalProjectSnapshot,
  sortProjectsByPeriodDesc,
} from "./project-archive.utils";
import type {
  ProjectArchiveFormData,
  ProjectArchiveSeed,
  ProjectArchiveSnapshotItem,
  ProjectArchiveWizardDraft,
} from "./project-archive.types";

function isProjectSnapshotItem(
  value: unknown,
): value is ProjectArchiveSnapshotItem {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ProjectArchiveSnapshotItem).id === "string" &&
    typeof (value as ProjectArchiveSnapshotItem).title === "string" &&
    Array.isArray((value as ProjectArchiveSnapshotItem).tags)
  );
}

export function useProjectArchive(initialProjects: ProjectInput[]) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [portfolioMode, setPortfolioMode] = useState(false);
  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false);
  const [isWizardSetupOpen, setIsWizardSetupOpen] = useState(false);
  const [wizardSeed, setWizardSeed] = useState(0);
  const [wizardExperienceIds, setWizardExperienceIds] = useState<string[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);

  const [projects, setProjects] = useState<ProjectInput[]>(
    initialProjects || [],
  );
  const [formData, setFormData] = useState<ProjectArchiveFormData>({});
  const [isSaving, setIsSaving] = useState(false);

  const sortedProjects = sortProjectsByPeriodDesc(projects);

  useEffect(() => {
    const isSaved = searchParams.get("coverLetterSaved") === "1";
    if (!isSaved) return;
    setShowSavedModal(true);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("portfolioMode") !== "1") return;
    setPortfolioMode(true);
    setSelectionMode(false);
    setSelectedIds([]);
    setActiveId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("portfolioMode");
    router.replace(params.toString() ? `/career/projects?${params.toString()}` : "/career/projects");
  }, [router, searchParams]);

  const closeSavedModal = () => {
    setShowSavedModal(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("coverLetterSaved");
    params.delete("coverLetterId");
    const nextQuery = params.toString();
    router.replace(
      nextQuery ? `/career/projects?${nextQuery}` : "/career/projects",
    );
  };

  const handleOpenCareerLetters = () => {
    setShowSavedModal(false);
    router.replace("/career/cover-letters");
  };

  const handleAddNew = () => {
    router.push("/career/projects/new");
  };

  const handleSaveProject = async (closeFn: () => void) => {
    if (!formData.company?.trim()) {
      alert("프로젝트명을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveProjectAction(formData as ProjectInput);
      if (result.success && result.experience) {
        setProjects((prev) => {
          const exists = prev.find((project) => project.id === result.experience!.id);
          if (exists) {
            return prev.map((project) =>
              project.id === result.experience!.id ? result.experience! : project,
            );
          }
          return [...prev, result.experience!];
        });
        closeFn();
      }
    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("정말 이 프로젝트를 삭제하시겠습니까?")) return;

    try {
      await deleteProjectAction(id);
      setProjects((prev) => prev.filter((project) => project.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (error) {
      console.error(error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const readJsonResponse = async (response: Response) => {
    const text = await response.text();
    if (!text.trim()) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(
        response.ok
          ? "서버 응답을 읽지 못했습니다. 잠시 후 다시 시도하세요."
          : `서버 오류가 발생했습니다. (${response.status})`,
      );
    }
  };

  const createPortfolioFromProjects = async (selectedProjects: ProjectInput[]) => {
    const projectKeys = selectedProjects
      .map((project) => project.id)
      .filter((id): id is string => Boolean(id));
    if (projectKeys.length === 0) {
      alert("먼저 프로젝트를 저장한 뒤 포트폴리오를 생성해주세요.");
      return;
    }
    if (isCreatingPortfolio) return;

    const projectTitles = selectedProjects.map(
      (project) => project.company || project.position || "프로젝트",
    );
    const sourceProjectTitle =
      projectTitles.length > 1
        ? `${projectTitles[0]} 외 ${projectTitles.length - 1}개`
        : projectTitles[0] || "프로젝트";

    setIsCreatingPortfolio(true);
    try {
      const response = await fetch("/api/career/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${sourceProjectTitle} 포트폴리오`,
          format: "slide",
          pageSize: "16:9",
          orientation: "landscape",
          generationPreset: "interview-pitch",
          sourceProjectId: projectKeys[0],
          sourceProjectTitle,
          sourceSelection: {
            projectKeys,
            experienceKeys: [],
            coverLetterKeys: [],
            includePersonalInfo: true,
            includeSkills: true,
            format: "slide",
            pageSize: "16:9",
            orientation: "landscape",
            generationPreset: "interview-pitch",
          },
        }),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "포트폴리오 생성 실패");
      }
      const item = payload.item as { id?: string } | undefined;
      if (!item?.id) throw new Error("생성된 포트폴리오 정보를 읽지 못했습니다.");

      const editUrl = `/career/portfolios/${item.id}/edit?generate=1`;
      const opened = window.open(editUrl, "_blank", "noopener,noreferrer");
      if (!opened) router.push(editUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : "포트폴리오 생성에 실패했습니다.");
    } finally {
      setIsCreatingPortfolio(false);
    }
  };

  const navigateToPortfolioCreate = () => {
    const selectedProjects = projects.filter(
      (project) => project.id && selectedIds.includes(project.id),
    );
    if (selectedProjects.length === 0) {
      alert("포트폴리오 생성을 위해 최소 1개의 프로젝트를 선택해주세요.");
      return;
    }
    void createPortfolioFromProjects(selectedProjects);
  };

  const handleProjectClick = (project: ProjectInput) => {
    if (portfolioMode) {
      setSelectedIds((prev) => {
        if (!project.id) return prev;
        if (prev.includes(project.id)) {
          return prev.filter((id) => id !== project.id);
        }
        return [...prev, project.id];
      });
      return;
    }

    if (selectionMode) {
      setSelectedIds((prev) => {
        if (!project.id) return prev;
        if (prev.includes(project.id)) {
          return prev.filter((id) => id !== project.id);
        }
        if (prev.length >= MAX_WIZARD_PROJECTS) {
          alert(
            `자소서 작성 모드는 최대 ${MAX_WIZARD_PROJECTS}개 프로젝트만 선택할 수 있습니다.`,
          );
          return prev;
        }
        return [...prev, project.id];
      });
      return;
    }

    const shouldOpen = activeId !== project.id;
    setActiveId((prev) => (prev === project.id ? null : project.id || null));
    if (shouldOpen) {
      setFormData(project);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (!prev) {
        setActiveId(null);
        setPortfolioMode(false);
      } else {
        setSelectedIds([]);
      }
      return !prev;
    });
  };

  const togglePortfolioMode = () => {
    setPortfolioMode((prev) => {
      if (!prev) {
        setActiveId(null);
        setSelectionMode(false);
        setSelectedIds([]);
      }
      return !prev;
    });
  };

  const navigateToAiSetup = () => {
    const selectedProjectsAll = projects.filter(
      (project) => project.id && selectedIds.includes(project.id),
    );
    if (selectedProjectsAll.length === 0) {
      alert("자소서 생성을 위해 최소 1개의 프로젝트를 선택해주세요.");
      return;
    }

    const selectedProjects = selectedProjectsAll.slice(0, MAX_WIZARD_PROJECTS);
    if (selectedProjectsAll.length > MAX_WIZARD_PROJECTS) {
      alert(
        `선택된 프로젝트가 많아 상위 ${MAX_WIZARD_PROJECTS}개 프로젝트로 우선 진행합니다.`,
      );
    }

    const fullContextString = buildProjectContextString(selectedProjects);

    try {
      sessionStorage.setItem("wizard_context_data", fullContextString);
      sessionStorage.setItem(
        "wizard_experience_snapshot",
        JSON.stringify(buildProjectSnapshot(selectedProjects)),
      );
    } catch (storageError) {
      console.error("Failed to persist wizard context:", storageError);
      sessionStorage.removeItem("wizard_context_data");
      sessionStorage.setItem(
        "wizard_experience_snapshot",
        JSON.stringify(buildMinimalProjectSnapshot(selectedProjects)),
      );
    }

    const selectedExperienceIds = selectedProjects
      .map((project) => project.id)
      .filter((id): id is string => Boolean(id));
    setWizardExperienceIds(selectedExperienceIds);
    setWizardSeed((prev) => prev + 1);
    setIsWizardSetupOpen(true);
  };

  const handleIntakeComplete = (draft: ProjectArchiveWizardDraft) => {
    const now = new Date().toISOString();
    const coverLetterId = crypto.randomUUID();
    const title =
      draft.workspaceName.trim() ||
      `${draft.company}_${draft.role}`.trim() ||
      "새 자기소개서";

    let sourceExperienceSnapshot: ProjectArchiveSnapshotItem[] = [];
    try {
      const raw = sessionStorage.getItem("wizard_experience_snapshot");
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          sourceExperienceSnapshot = parsed.filter(isProjectSnapshotItem);
        }
      }
    } catch (error) {
      console.error("Failed to parse wizard snapshot seed:", error);
    }

    const seed: ProjectArchiveSeed = {
      id: coverLetterId,
      title,
      content: "",
      createdAt: now,
      sourceExperienceIds: wizardExperienceIds,
      sourceExperienceSnapshot,
      applicationTarget: `${draft.company} ${draft.role}`.trim(),
      company: draft.company,
      division: draft.division || undefined,
      role: draft.role,
      deadline: draft.deadline,
      workspaceName: draft.workspaceName,
      colorTag: draft.colorTag,
      questions: draft.questions.map((question) => ({
        id: question.id,
        title: question.title,
        maxChars: Number(question.maxChars) || 500,
        answer: question.answer || "",
        status: question.status || ((question.answer || "").trim() ? "done" : "draft"),
        updatedAt: question.updatedAt || now,
      })),
      chatHistory: [],
      perQuestionWorkflow: Object.fromEntries(
        draft.questions.map((question) => [
          question.id,
          {
            stage: "direction",
            refineCount: 0,
          },
        ]),
      ),
    };

    sessionStorage.setItem("wizard_cover_letter_seed", JSON.stringify(seed));
    setIsWizardSetupOpen(false);

    const params = new URLSearchParams();
    params.set("source", "career");
    params.set("coverLetterId", coverLetterId);
    if (wizardExperienceIds.length > 0) {
      params.set("experienceIds", wizardExperienceIds.join(","));
    }
    router.push(`/career/cover-letter-wizard?${params.toString()}`);
  };

  return {
    activeId,
    projects,
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
    closeWizard: () => setIsWizardSetupOpen(false),
  };
}
