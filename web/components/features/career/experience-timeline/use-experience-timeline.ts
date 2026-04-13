"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ExperienceInput } from "@/app/career/experiences/actions";
import {
  deleteExperienceAction,
  saveExperienceAction,
} from "@/app/career/experiences/actions";
import {
  MAX_WIZARD_EXPERIENCES,
  buildExperienceContextString,
  buildExperienceSnapshot,
  buildMinimalExperienceSnapshot,
  sortExperiencesByPeriodDesc,
} from "./experience-timeline.utils";
import type {
  ExperienceTimelineFormData,
  ExperienceTimelineSeed,
  ExperienceTimelineSnapshotItem,
  ExperienceTimelineWizardDraft,
} from "./experience-timeline.types";

function isExperienceSnapshotItem(
  value: unknown,
): value is ExperienceTimelineSnapshotItem {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ExperienceTimelineSnapshotItem).id === "string" &&
    typeof (value as ExperienceTimelineSnapshotItem).title === "string" &&
    Array.isArray((value as ExperienceTimelineSnapshotItem).tags)
  );
}

export function useExperienceTimeline(initialExperiences: ExperienceInput[]) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [isWizardSetupOpen, setIsWizardSetupOpen] = useState(false);
  const [wizardSeed, setWizardSeed] = useState(0);
  const [wizardExperienceIds, setWizardExperienceIds] = useState<string[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);

  const [experiences, setExperiences] = useState<ExperienceInput[]>(
    initialExperiences || [],
  );
  const [formData, setFormData] = useState<ExperienceTimelineFormData>({});
  const [isSaving, setIsSaving] = useState(false);

  const sortedExperiences = sortExperiencesByPeriodDesc(experiences);

  useEffect(() => {
    const isSaved = searchParams.get("coverLetterSaved") === "1";
    if (!isSaved) return;
    setShowSavedModal(true);
  }, [searchParams]);

  const closeSavedModal = () => {
    setShowSavedModal(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("coverLetterSaved");
    params.delete("coverLetterId");
    const nextQuery = params.toString();
    router.replace(
      nextQuery ? `/career/experiences?${nextQuery}` : "/career/experiences",
    );
  };

  const handleOpenCareerLetters = () => {
    setShowSavedModal(false);
    router.replace("/career/cover-letters");
  };

  const handleAddNew = () => {
    router.push("/career/experiences/new");
  };

  const handleSaveExperience = async (closeFn: () => void) => {
    if (!formData.company?.trim()) {
      alert("활동명을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveExperienceAction(formData as ExperienceInput);
      if (result.success && result.experience) {
        setExperiences((prev) => {
          const exists = prev.find((experience) => experience.id === result.experience!.id);
          if (exists) {
            return prev.map((experience) =>
              experience.id === result.experience!.id ? result.experience! : experience,
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

  const handleDeleteExperience = async (id: string) => {
    if (!confirm("정말 이 경험을 삭제하시겠습니까?")) return;

    try {
      await deleteExperienceAction(id);
      setExperiences((prev) => prev.filter((experience) => experience.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (error) {
      console.error(error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleCardClick = (experience: ExperienceInput) => {
    if (selectionMode) {
      setSelectedIds((prev) => {
        if (!experience.id) return prev;
        if (prev.includes(experience.id)) {
          return prev.filter((id) => id !== experience.id);
        }
        if (prev.length >= MAX_WIZARD_EXPERIENCES) {
          alert(
            `자소서 작성 모드는 최대 ${MAX_WIZARD_EXPERIENCES}개 경험만 선택할 수 있습니다.`,
          );
          return prev;
        }
        return [...prev, experience.id];
      });
      return;
    }

    const shouldOpen = activeId !== experience.id;
    setActiveId((prev) => (prev === experience.id ? null : experience.id || null));
    if (shouldOpen) {
      setFormData(experience);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (!prev) {
        setActiveId(null);
      } else {
        setSelectedIds([]);
      }
      return !prev;
    });
  };

  const navigateToAiSetup = () => {
    const selectedExpsAll = experiences.filter(
      (experience) => experience.id && selectedIds.includes(experience.id),
    );
    if (selectedExpsAll.length === 0) {
      alert("자소서 생성을 위해 최소 1개의 경험을 선택해주세요.");
      return;
    }

    const selectedExps = selectedExpsAll.slice(0, MAX_WIZARD_EXPERIENCES);
    if (selectedExpsAll.length > MAX_WIZARD_EXPERIENCES) {
      alert(
        `선택된 경험이 많아 상위 ${MAX_WIZARD_EXPERIENCES}개 경험으로 우선 진행합니다.`,
      );
    }

    const fullContextString = buildExperienceContextString(selectedExps);

    try {
      sessionStorage.setItem("wizard_context_data", fullContextString);
      sessionStorage.setItem(
        "wizard_experience_snapshot",
        JSON.stringify(buildExperienceSnapshot(selectedExps)),
      );
    } catch (storageError) {
      console.error("Failed to persist wizard context:", storageError);
      sessionStorage.removeItem("wizard_context_data");
      sessionStorage.setItem(
        "wizard_experience_snapshot",
        JSON.stringify(buildMinimalExperienceSnapshot(selectedExps)),
      );
    }

    const selectedExperienceIds = selectedExps
      .map((experience) => experience.id)
      .filter((id): id is string => Boolean(id));
    setWizardExperienceIds(selectedExperienceIds);
    setWizardSeed((prev) => prev + 1);
    setIsWizardSetupOpen(true);
  };

  const handleIntakeComplete = (draft: ExperienceTimelineWizardDraft) => {
    const now = new Date().toISOString();
    const coverLetterId = crypto.randomUUID();
    const title =
      draft.workspaceName.trim() ||
      `${draft.company}_${draft.role}`.trim() ||
      "새 자기소개서";

    let sourceExperienceSnapshot: ExperienceTimelineSnapshotItem[] = [];
    try {
      const raw = sessionStorage.getItem("wizard_experience_snapshot");
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          sourceExperienceSnapshot = parsed.filter(isExperienceSnapshotItem);
        }
      }
    } catch (error) {
      console.error("Failed to parse wizard snapshot seed:", error);
    }

    const seed: ExperienceTimelineSeed = {
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
    experiences,
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
    closeWizard: () => setIsWizardSetupOpen(false),
  };
}
