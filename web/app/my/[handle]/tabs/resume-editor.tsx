"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Briefcase,
  Download,
  Inbox,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { ResumePayload } from "../profile-types";
import { normalizeResumePayload } from "../profile-utils";
import { MonthRangePicker } from "@/components/features/resume/MonthRangePicker";
import { ExperienceImportModal } from "@/components/features/resume/ExperienceImportModal";
import { WorkExperienceImportModal } from "@/components/features/resume/WorkExperienceImportModal";
import {
  ResumeImportDialog,
  type ResumeImportSelection,
} from "@/components/features/resume/resume-import-dialog";
import { ResumeAiTuneDialog } from "@/components/features/resume/resume-ai-tune-dialog";
import { CollapsibleSection } from "@/components/features/resume/collapsible-section";
import { TechStackCombobox } from "@/components/features/job-postings/tech-stack-combobox";
import { AutoResizeTextarea } from "@/components/features/resume/auto-resize-textarea";
import { CategorizedSkillPicker } from "@/components/features/resume/categorized-skill-picker";
import {
  DEFAULT_RESUME_A4_OPTIONS,
  KoreanResumePreview,
  type ResumeA4Options,
} from "@/components/features/resume/KoreanResumePreview";
import type { ProjectInput } from "@/app/career/projects/types";
import type { WorkExperienceInput } from "@/app/career/work-experience/actions";

interface ResumeEditorProps {
  payload: ResumePayload;
  onChange: (payload: ResumePayload) => void;
  onSave: () => void;
  saving: boolean;
  onGoSetup: () => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  /**
   * @deprecated 더 이상 사용되지 않는다. 편집 패널은 항상 펼쳐진 상태로 유지된다.
   * 외부 호출 시그니처 호환을 위해 prop 자체는 남겨두지만 내부 동작에는 영향이 없다.
   */
  previewToggleMode?: boolean;
}

export function ResumeEditor({
  payload,
  onChange,
  onSave,
  saving,
  title = "",
  onTitleChange,
}: ResumeEditorProps) {
  const searchParams = useSearchParams();
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isWorkExpModalOpen, setIsWorkExpModalOpen] = useState(false);
  const [isResumeImportDialogOpen, setIsResumeImportDialogOpen] = useState(false);
  const [isAiTuneDialogOpen, setIsAiTuneDialogOpen] = useState(false);
  const hasAutoOpenedImportRef = useRef(false);
  const [a4Options, setA4Options] = useState<ResumeA4Options>(DEFAULT_RESUME_A4_OPTIONS);
  // 편집 패널은 항상 켜져있다 (사용자가 "클릭해서 열기" 같은 한 번 더의 조작 없이 즉시
  // 편집 가능). 과거에 있던 previewToggleMode 의 패널-숨김 기능은 제거됐다.
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editPanelRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  const [isPrefillingProfile, setIsPrefillingProfile] = useState(false);
  /**
   * 마이페이지 프로필(`/api/my/me`) 에서 이름·이메일·자기소개·기술 스택을 즉시 가져와
   * personalInfo 와 skills 의 빈 슬롯을 채운다. 이미 입력된 값은 덮어쓰지 않는다.
   */
  const handleImportFromMyPage = async () => {
    setIsPrefillingProfile(true);
    try {
      const res = await fetch("/api/my/me", { cache: "no-store" });
      if (!res.ok) throw new Error("프로필을 불러오지 못했습니다.");
      const json = await res.json();
      if (!json?.success || !json.data) throw new Error("프로필 데이터가 비어 있습니다.");
      const profile = json.data as {
        nickname?: string;
        email?: string;
        bio?: string;
        techStack?: string[];
      };
      const piPrev = payload.personalInfo;
      const next: ResumePayload = {
        ...payload,
        personalInfo: {
          ...piPrev,
          name: piPrev.name?.trim() || profile.nickname || piPrev.name,
          email: piPrev.email?.trim() || profile.email || piPrev.email,
          intro: piPrev.intro?.trim() || profile.bio || piPrev.intro,
        },
        skills:
          payload.skills.length > 0
            ? payload.skills
            : Array.isArray(profile.techStack)
              ? profile.techStack.map((name) => ({ name, level: "Intermediate" }))
              : payload.skills,
      };
      onChange(next);
      toast({
        title: "마이페이지 정보 불러오기 완료",
        description: "비어있던 항목만 채워졌습니다. 이미 입력한 값은 그대로 유지됩니다.",
      });
    } catch (error) {
      toast({
        title: "불러오기 실패",
        description: error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsPrefillingProfile(false);
    }
  };

  const pi = payload.personalInfo;

  const setPI = (patch: Partial<ResumePayload["personalInfo"]>) =>
    onChange({ ...payload, personalInfo: { ...pi, ...patch } });

  const setLinks = (patch: Partial<typeof pi.links>) =>
    onChange({
      ...payload,
      personalInfo: { ...pi, links: { ...pi.links, ...patch } },
    });


  const setExp = (
    index: number,
    patch: Partial<ResumePayload["experience"][number]>,
  ) => {
    const next = [...payload.experience];
    next[index] = { ...next[index], ...patch };
    onChange({ ...payload, experience: next });
  };

  const addExp = () =>
    onChange({
      ...payload,
      experience: [
        ...payload.experience,
        {
          id: Math.random().toString(36).substring(2, 11),
          company: "",
          position: "",
          period: "",
          description: "",
        },
      ],
    });

  const removeExp = (index: number) => {
    const item = payload.experience[index];
    onChange({
      ...payload,
      experience: payload.experience.filter((_, i) => i !== index),
    });
    toast({
      title: "경력 항목 삭제됨",
      description: `${item.company || "항목"}이(가) 목록에서 제거되었습니다. 저장 시 최종 반영됩니다.`,
    });
  };

  const setPrj = (
    index: number,
    patch: Partial<ResumePayload["projects"][number]>,
  ) => {
    const next = [...payload.projects];
    next[index] = { ...next[index], ...patch };
    onChange({ ...payload, projects: next });
  };

  const addPrj = () =>
    onChange({
      ...payload,
      projects: [
        ...payload.projects,
        {
          id: Math.random().toString(36).substring(2, 11),
          name: "",
          period: "",
          description: "",
          techStack: [],
          achievements: [],
        },
      ],
    });

  const removePrj = (index: number) => {
    const item = payload.projects[index];
    onChange({
      ...payload,
      projects: payload.projects.filter((_, i) => i !== index),
    });
    toast({
      title: "프로젝트 삭제됨",
      description: `${item.name || "항목"}이(가) 목록에서 제거되었습니다. 저장 시 최종 반영됩니다.`,
    });
  };

  const setAch = (projectIndex: number, achievementIndex: number, value: string) => {
    const next = [...payload.projects];
    const achievements = [...(next[projectIndex].achievements || [])];
    achievements[achievementIndex] = value;
    next[projectIndex] = { ...next[projectIndex], achievements };
    onChange({ ...payload, projects: next });
  };

  const addAch = (projectIndex: number) => {
    const next = [...payload.projects];
    next[projectIndex] = {
      ...next[projectIndex],
      achievements: [...(next[projectIndex].achievements || []), ""],
    };
    onChange({ ...payload, projects: next });
  };

  const removeAch = (projectIndex: number, achievementIndex: number) => {
    const nextProjects = [...payload.projects];
    const project = nextProjects[projectIndex];
    nextProjects[projectIndex] = {
      ...project,
      achievements: project.achievements.filter((_, i) => i !== achievementIndex),
    };
    onChange({ ...payload, projects: nextProjects });
    toast({
      title: "주요 성과 삭제됨",
      description: "선택한 성과 내용이 제거되었습니다.",
    });
  };

  // ========= 자기소개서(문항별) 편집 핸들러 =========
  // payload.coverLetters 가 undefined 일 때를 일관되게 다루기 위해 helper 로 감싼다.
  type CoverLetterType = NonNullable<ResumePayload["coverLetters"]>[number];
  type CoverQuestionType = NonNullable<CoverLetterType["questions"]>[number];

  const getCovers = (): CoverLetterType[] => payload.coverLetters ?? [];

  const setCovers = (next: CoverLetterType[]) =>
    onChange({ ...payload, coverLetters: next });

  const addCoverLetter = () => {
    const newCover: CoverLetterType = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 11),
      title: "새 자기소개서",
      content: "",
      createdAt: new Date().toISOString(),
      sourceExperienceIds: [],
      questions: [],
    };
    setCovers([...getCovers(), newCover]);
  };

  const removeCoverLetter = (idx: number) => {
    const list = getCovers();
    const removed = list[idx];
    setCovers(list.filter((_, i) => i !== idx));
    if (removed) {
      toast({
        title: "자기소개서 삭제됨",
        description: `${removed.title || "항목"}이(가) 제거되었습니다. 저장 시 최종 반영됩니다.`,
      });
    }
  };

  const updateCoverLetter = (idx: number, patch: Partial<CoverLetterType>) => {
    const list = [...getCovers()];
    list[idx] = { ...list[idx], ...patch };
    setCovers(list);
  };

  const addQuestion = (coverIdx: number) => {
    const list = [...getCovers()];
    const cover = list[coverIdx];
    if (!cover) return;
    const newQuestion: CoverQuestionType = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 11),
      title: "",
      maxChars: 500,
      answer: "",
      status: "draft",
    };
    list[coverIdx] = {
      ...cover,
      questions: [...(cover.questions ?? []), newQuestion],
    };
    setCovers(list);
  };

  const removeQuestion = (coverIdx: number, qIdx: number) => {
    const list = [...getCovers()];
    const cover = list[coverIdx];
    if (!cover?.questions) return;
    list[coverIdx] = {
      ...cover,
      questions: cover.questions.filter((_, i) => i !== qIdx),
    };
    setCovers(list);
  };

  const updateQuestion = (
    coverIdx: number,
    qIdx: number,
    patch: Partial<CoverQuestionType>,
  ) => {
    const list = [...getCovers()];
    const cover = list[coverIdx];
    if (!cover?.questions) return;
    const questions = [...cover.questions];
    questions[qIdx] = {
      ...questions[qIdx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    list[coverIdx] = { ...cover, questions };
    setCovers(list);
  };

  /**
   * 기존 plain content 자소서를 첫 문항의 answer 로 옮기고 문항 모드로 전환한다.
   * 이미 questions 가 있으면 동작하지 않는다.
   */
  const convertToQuestions = (coverIdx: number) => {
    const list = [...getCovers()];
    const cover = list[coverIdx];
    if (!cover) return;
    if (cover.questions && cover.questions.length > 0) return;
    const seed: CoverQuestionType = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 11),
      title: cover.title || "자기소개",
      maxChars: 1000,
      answer: cover.content || "",
      status: cover.content?.trim() ? "draft" : "draft",
    };
    list[coverIdx] = {
      ...cover,
      content: "",
      questions: [seed],
    };
    setCovers(list);
  };

  const handleImportProjects = (selected: ProjectInput[]) => {
    const newProjects = selected
        .filter(e => !payload.projects.some(p => p.id === e.id)) // Avoid duplicates
        .map(e => ({
            id: e.id || Math.random().toString(36).substring(2, 11),
            name: e.company || "프로젝트명 없음",
            period: e.period || "",
            description: e.description || "",
            techStack: e.tags || [],
            achievements: [],
        }));

    if (newProjects.length > 0) {
        onChange({
            ...payload,
            projects: [...payload.projects, ...newProjects]
        });
        toast({
            title: "프로젝트 불러오기 완료",
            description: `${newProjects.length}개의 프로젝트가 추가되었습니다.`,
        });
    } else {
        toast({
            title: "불러올 프로젝트가 없습니다.",
            description: "이미 추가된 프로젝트이거나 잘못된 요청입니다.",
            variant: "destructive"
        });
    }
  };

  const handleImportWorkExperiences = (selected: WorkExperienceInput[]) => {
    const newExps = selected
        .filter(e => !payload.experience.some(p => p.id === e.id)) // Avoid duplicates
        .map(e => ({
            id: e.id || Math.random().toString(36).substring(2, 11),
            company: e.company || "",
            position: e.position || "",
            period: e.period || "",
            description: e.description || "",
        }));

    if (newExps.length > 0) {
        onChange({
            ...payload,
            experience: [...payload.experience, ...newExps]
        });
        toast({
            title: "경력 불러오기 완료",
            description: `${newExps.length}개의 경력이 추가되었습니다.`,
        });
    } else {
        toast({
            title: "불러올 경력이 없습니다.",
            description: "이미 추가된 경력이거나 잘못된 요청입니다.",
            variant: "destructive"
        });
    }
  };

  // /resume?mode=new (옵션: &import=ask) 진입 시 가져오기 다이얼로그를 자동으로 연다.
  // 사용자가 닫거나 항목을 가져온 뒤에는 다시 자동 오픈되지 않도록 ref 로 가드.
  useEffect(() => {
    if (!searchParams) return;
    if (hasAutoOpenedImportRef.current) return;
    const mode = searchParams.get("mode");
    const importParam = searchParams.get("import");
    const id = searchParams.get("id");
    // mode=new 인데 기존 id 가 없을 때만 자동 오픈한다. (이미 저장된 이력서 편집은 제외)
    if (mode === "new" && !id && importParam !== "skip") {
      hasAutoOpenedImportRef.current = true;
      // 약간의 지연으로 페이지 첫 페인트 직후 다이얼로그가 뜨도록 한다.
      const handle = window.setTimeout(() => {
        setIsResumeImportDialogOpen(true);
      }, 150);
      return () => window.clearTimeout(handle);
    }
  }, [searchParams]);

  const handleApplyResumeImport = (selection: ResumeImportSelection) => {
    let appliedProjects = 0;
    let appliedExperiences = 0;
    let appliedCoverLetters = 0;

    const nextPayload: ResumePayload = { ...payload };

    if (selection.projects.length > 0) {
      const existingProjectKeys = new Set(
        payload.projects.map((p) =>
          p.id
            ? `id:${p.id}`
            : `np:${(p.name || "").trim().toLowerCase()}|${(p.period || "").trim()}`,
        ),
      );
      const newProjects = selection.projects
        .filter((p) => {
          const key = p.id
            ? `id:${p.id}`
            : `np:${(p.name || "").trim().toLowerCase()}|${(p.period || "").trim()}`;
          return !existingProjectKeys.has(key);
        })
        .map((p) => ({
          id: p.id || Math.random().toString(36).substring(2, 11),
          name: p.name || "프로젝트명 없음",
          period: p.period || "",
          description: p.description || "",
          techStack: p.techStack || [],
          achievements: p.achievements || [],
        }));
      if (newProjects.length > 0) {
        nextPayload.projects = [...payload.projects, ...newProjects];
        appliedProjects = newProjects.length;
      }
    }

    if (selection.experiences.length > 0) {
      const existingExpKeys = new Set(
        payload.experience.map((e) =>
          e.id
            ? `id:${e.id}`
            : `xp:${(e.company || "").trim().toLowerCase()}|${(e.position || "").trim().toLowerCase()}|${(e.period || "").trim()}`,
        ),
      );
      const newExps = selection.experiences
        .filter((e) => {
          const key = e.id
            ? `id:${e.id}`
            : `xp:${(e.company || "").trim().toLowerCase()}|${(e.position || "").trim().toLowerCase()}|${(e.period || "").trim()}`;
          return !existingExpKeys.has(key);
        })
        .map((e) => ({
          id: e.id || Math.random().toString(36).substring(2, 11),
          company: e.company || "",
          position: e.position || "",
          period: e.period || "",
          description: e.description || "",
        }));
      if (newExps.length > 0) {
        nextPayload.experience = [...nextPayload.experience, ...newExps];
        appliedExperiences = newExps.length;
      }
    }

    if (selection.coverLetters.length > 0) {
      // payload.coverLetters 배열에 추가 (중복 id 방지)
      const existingCoverIds = new Set(
        (payload.coverLetters || []).map((c) => c.id),
      );
      const newCovers = selection.coverLetters
        .filter((c) => !existingCoverIds.has(c.id))
        .map((c) => ({
          id: c.id,
          title: c.title || "(제목 없음)",
          content: c.content || "",
          createdAt: new Date().toISOString(),
          sourceExperienceIds: [] as string[],
          // 문항별 답변이 있으면 보존. import dialog 가 status 를 narrow 해 넘긴다.
          questions:
            c.questions && c.questions.length > 0
              ? c.questions.map((q) => ({
                  id: q.id,
                  title: q.title,
                  maxChars: q.maxChars,
                  answer: q.answer,
                  status: q.status,
                  updatedAt: q.updatedAt,
                }))
              : undefined,
        }));
      if (newCovers.length > 0) {
        nextPayload.coverLetters = [
          ...(payload.coverLetters || []),
          ...newCovers,
        ];
        appliedCoverLetters = newCovers.length;
      }

      // 호환: 자기소개서 본문을 selfIntroduction 영역에도 append 한다.
      // 문항이 있는 자소서는 답변들을 이어붙여 self-intro 백업본으로 보존한다.
      const contents = newCovers
        .map((c) => {
          if (c.questions && c.questions.length > 0) {
            return c.questions
              .map((q) =>
                q.answer && q.answer.trim().length > 0
                  ? `${q.title}\n${q.answer}`
                  : null,
              )
              .filter((s): s is string => Boolean(s))
              .join("\n\n");
          }
          return c.content;
        })
        .filter((s) => s && s.trim().length > 0);
      if (contents.length > 0) {
        const existing = payload.selfIntroduction?.trim() || "";
        const joined = contents.join("\n\n---\n\n");
        nextPayload.selfIntroduction = existing
          ? `${existing}\n\n---\n\n${joined}`
          : joined;
      }
    }

    if (appliedProjects + appliedExperiences + appliedCoverLetters === 0) {
      toast({
        title: "추가된 항목이 없습니다",
        description: "선택한 항목이 이미 이력서에 포함되어 있습니다.",
        variant: "destructive",
      });
      return;
    }

    onChange(nextPayload);
    toast({
      title: "기존 자료 가져오기 완료",
      description: `프로젝트 ${appliedProjects}개 · 경력 ${appliedExperiences}개 · 자기소개서 ${appliedCoverLetters}개를 이력서에 반영했습니다.`,
    });
  };

  const parseResumeFile = async (file: File) => {
    setIsParsingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/interview/parse-resume", {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success || !result?.data) {
        throw new Error(result?.error || "이력서 파일 파싱에 실패했습니다.");
      }

      onChange(normalizeResumePayload(result.data));
      toast({
        title: "이력서 파싱 완료",
        description: "파싱된 내용이 편집 폼에 반영되었습니다. 저장 버튼을 눌러 확정하세요.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "이력서 파싱 중 오류가 발생했습니다.";
      toast({
        title: "파싱 실패",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsParsingFile(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-1 gap-6",
          // 우측 미리보기에 더 넓은 비중을 줘서 A4 본문이 시원하게 보이도록 비율 조정.
          "xl:grid-cols-[minmax(320px,0.55fr)_minmax(640px,1.45fr)] 2xl:grid-cols-[minmax(360px,0.50fr)_minmax(780px,1.5fr)]",
        )}
      >
        <div ref={editPanelRef} className="space-y-5">
      {/* File parsing banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex flex-col gap-3">
        <div className="min-w-0 [word-break:keep-all]">
          <p className="text-sm font-medium leading-snug">
            기존의 이력서를 가져와 내용을 채울 수 있어요
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            이전에 저장한 프로젝트·경력·자기소개서를 한 번에 불러옵니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void parseResumeFile(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsResumeImportDialogOpen(true)}
            className="shrink-0 gap-1.5 text-xs"
          >
            <Inbox className="w-3.5 h-3.5" />
            기존 자료 가져오기
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsAiTuneDialogOpen(true)}
            className="shrink-0 gap-1.5 text-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI로 정리하기
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 gap-1.5 text-xs"
            disabled={isParsingFile}
          >
            {isParsingFile ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                파싱 중...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                파일 불러와 파싱
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Title Input — between banner and basic info */}
      <div className="px-1 space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">이력서 제목</Label>
        <Input
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          placeholder="예: 2024년 상반기 공채 지원용"
          className="text-base font-medium h-11"
        />
      </div>

      <CollapsibleSection
        title="기본 정보"
        badge="필수"
        defaultOpen
        action={
          <button
            type="button"
            onClick={handleImportFromMyPage}
            disabled={isPrefillingProfile}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-60"
          >
            {isPrefillingProfile ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Download className="h-3 w-3" aria-hidden />
            )}
            마이페이지에서 불러오기
          </button>
        }
      >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "이름", key: "name" as const, placeholder: "홍길동" },
              {
                label: "이메일",
                key: "email" as const,
                placeholder: "email@example.com",
              },
              {
                label: "전화번호",
                key: "phone" as const,
                placeholder: "010-0000-0000",
              },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  value={pi[key]}
                  onChange={(event) => setPI({ [key]: event.target.value })}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">한 줄 소개</Label>
            <Textarea
              value={pi.intro}
              onChange={(event) => setPI({ intro: event.target.value })}
              placeholder="간략한 자기소개를 작성하세요"
              className="resize-none min-h-[72px]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label: "GitHub",
                key: "github" as const,
                placeholder: "https://github.com/...",
              },
              {
                label: "Blog / Portfolio",
                key: "blog" as const,
                placeholder: "https://...",
              },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  value={pi.links[key] || ""}
                  onChange={(event) =>
                    setLinks({ [key]: event.target.value || undefined })
                  }
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="자기소개 (PROFILE SUMMARY)"
        badge={payload.selfIntroduction?.trim() ? "작성됨" : "비어있음"}
        defaultOpen={false}
      >
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            미리보기의 PROFILE SUMMARY 영역에 그대로 들어가는 본문입니다. 입력한 길이만큼 자동으로 늘어납니다.
          </p>
          <AutoResizeTextarea
            value={payload.selfIntroduction}
            onChange={(event) => onChange({ ...payload, selfIntroduction: event.target.value })}
            placeholder="지원 직무와 관련된 핵심 역량·경험을 2~5문장으로 정리하세요."
            className="text-sm leading-relaxed"
            minRows={6}
          />
      </CollapsibleSection>

      <CollapsibleSection
        title="자기소개서 (문항별)"
        badge={
          (payload.coverLetters?.length ?? 0) > 0
            ? `${payload.coverLetters!.length}개`
            : undefined
        }
        defaultOpen={false}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCoverLetter}
            className="h-7 gap-1.5 text-xs text-primary bg-primary/5 hover:bg-primary/10 border-primary/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            자소서 추가
          </Button>
        }
      >
          {(payload.coverLetters ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              기업별 자기소개서를 문항·답변 단위로 관리할 수 있습니다. "자소서 추가" 또는 "기존 자료 가져오기"로 시작하세요.
            </p>
          ) : (
            <div className="divide-y divide-border/70">
              {(payload.coverLetters ?? []).map((cover, coverIdx) => {
                const hasQuestions =
                  !!cover.questions && cover.questions.length > 0;
                return (
                  <div key={cover.id} className="space-y-4 py-4 first:pt-0 last:pb-0">
                    {/* 자소서 제목 — 큰 인풋, 외곽 박스 없음 */}
                    <div className="flex items-center gap-2">
                      <input
                        value={cover.title}
                        onChange={(e) =>
                          updateCoverLetter(coverIdx, { title: e.target.value })
                        }
                        placeholder="자기소개서 제목"
                        className="flex-1 border-0 border-b border-transparent bg-transparent px-0 py-1 text-sm font-semibold outline-none focus:border-foreground/40 placeholder:text-muted-foreground/50"
                      />
                      <button
                        type="button"
                        onClick={() => removeCoverLetter(coverIdx)}
                        aria-label="자기소개서 삭제"
                        className="rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {hasQuestions ? (
                      <ul className="space-y-5">
                        {cover.questions!.map((q, qIdx) => {
                          const answerLength = q.answer?.length ?? 0;
                          const limitHit = answerLength >= q.maxChars;
                          return (
                            <li
                              key={q.id}
                              className="space-y-1.5 border-l-2 border-muted pl-3"
                            >
                              <div className="flex items-center gap-1.5">
                                <input
                                  value={q.title}
                                  onChange={(e) =>
                                    updateQuestion(coverIdx, qIdx, {
                                      title: e.target.value,
                                    })
                                  }
                                  placeholder="문항 (예: 지원동기)"
                                  className="flex-1 border-0 bg-transparent px-0 py-0 text-[13px] font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
                                />
                                <input
                                  type="number"
                                  value={q.maxChars}
                                  onChange={(e) => {
                                    const next = Number(e.target.value);
                                    if (Number.isFinite(next) && next > 0) {
                                      updateQuestion(coverIdx, qIdx, {
                                        maxChars: Math.floor(next),
                                      });
                                    }
                                  }}
                                  className="w-14 border-0 bg-transparent px-1 py-0 text-right text-[11px] tabular-nums text-muted-foreground outline-none"
                                  min={50}
                                  step={50}
                                  aria-label="글자 제한"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeQuestion(coverIdx, qIdx)}
                                  aria-label="문항 삭제"
                                  className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                              <AutoResizeTextarea
                                value={q.answer ?? ""}
                                onChange={(e) =>
                                  updateQuestion(coverIdx, qIdx, {
                                    answer: e.target.value,
                                    status: "draft",
                                  })
                                }
                                maxLength={q.maxChars}
                                placeholder="답변을 입력하세요"
                                minRows={4}
                                className="rounded-md border-transparent bg-muted/30 px-3 py-2 text-sm leading-relaxed shadow-none focus-visible:border-foreground/20 focus-visible:bg-background focus-visible:ring-0"
                              />
                              <div
                                className={cn(
                                  "text-right text-[10.5px] tabular-nums text-muted-foreground/70",
                                  limitHit && "text-destructive",
                                )}
                              >
                                {answerLength.toLocaleString()} /{" "}
                                {q.maxChars.toLocaleString()}자
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <AutoResizeTextarea
                        value={cover.content ?? ""}
                        onChange={(e) =>
                          updateCoverLetter(coverIdx, {
                            content: e.target.value,
                          })
                        }
                        placeholder="자기소개서 본문 (또는 '문항별로 분리'를 눌러 문항으로 나눌 수 있어요)"
                        minRows={5}
                        className="rounded-md border-transparent bg-muted/30 px-3 py-2 text-sm leading-relaxed shadow-none focus-visible:border-foreground/20 focus-visible:bg-background focus-visible:ring-0"
                      />
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => addQuestion(coverIdx)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" />문항 추가
                      </button>
                      {!hasQuestions && (
                        <button
                          type="button"
                          onClick={() => convertToQuestions(coverIdx)}
                          className="inline-flex items-center rounded-md px-2 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          문항별로 분리
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </CollapsibleSection>

      <CollapsibleSection
        title="기술 스택"
        badge={payload.skills.length > 0 ? `${payload.skills.length}개` : undefined}
        defaultOpen
      >
          <CategorizedSkillPicker
            value={payload.skills}
            onChange={(nextSkills) => onChange({ ...payload, skills: nextSkills })}
          />
          <p className="text-[11px] text-muted-foreground">
            추가된 기술은 자동으로 직무별(프론트엔드 · 백엔드 · 모바일 · DevOps 등) 카테고리에 분류돼서
            이력서에 한눈에 들어오도록 표시됩니다. 자유 입력 항목은 "기타" 로 들어가며 칩의 카테고리 라벨을
            눌러 원하는 카테고리로 직접 옮길 수 있습니다.
          </p>
      </CollapsibleSection>

      <CollapsibleSection
        title="경력"
        badge={payload.experience.length > 0 ? `${payload.experience.length}개` : undefined}
        defaultOpen={false}
        action={
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] font-bold gap-1.5 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
            onClick={() => setIsWorkExpModalOpen(true)}
          >
            <Briefcase className="w-3.5 h-3.5" />
            보관함에서 불러오기
          </Button>
        }
      >
          {payload.experience.map((exp, index) => (
            <div key={exp.id || index} className="relative rounded-lg border p-4 space-y-3 bg-muted/20">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeExp(index);
                }}
                className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">회사명</Label>
                  <Input
                    value={exp.company}
                    onChange={(event) =>
                      setExp(index, { company: event.target.value })
                    }
                    placeholder="(주)회사명"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">직책</Label>
                  <Input
                    value={exp.position}
                    onChange={(event) =>
                      setExp(index, { position: event.target.value })
                    }
                    placeholder="Frontend Developer"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">기간</Label>
                <MonthRangePicker
                  value={exp.period || ""}
                  onChange={(v) => setExp(index, { period: v })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">주요 업무</Label>
                <Textarea
                  value={exp.description}
                  onChange={(event) =>
                    setExp(index, { description: event.target.value })
                  }
                  placeholder="담당한 주요 업무를 입력하세요"
                  className="resize-none min-h-[64px] text-sm"
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed py-5"
            onClick={addExp}
          >
            <Plus className="w-4 h-4 mr-2" /> 경력 추가
          </Button>
      </CollapsibleSection>

      <CollapsibleSection
        title="프로젝트"
        badge={payload.projects.length > 0 ? `${payload.projects.length}개` : undefined}
        defaultOpen={false}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="h-7 gap-1.5 text-xs text-primary bg-primary/5 hover:bg-primary/10 border-primary/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            보관함에서 불러오기
          </Button>
        }
      >
          {payload.projects.map((project, projectIndex) => (
            <div
              key={project.id || projectIndex}
              className="relative rounded-lg border p-4 space-y-3 bg-muted/20"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removePrj(projectIndex);
                }}
                className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">프로젝트명</Label>
                <Input
                  value={project.name}
                  onChange={(event) =>
                    setPrj(projectIndex, { name: event.target.value })
                  }
                  placeholder="프로젝트 이름"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">기간</Label>
                <MonthRangePicker
                  value={project.period || ""}
                  onChange={(v) => setPrj(projectIndex, { period: v })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">설명</Label>
                <Textarea
                  value={project.description}
                  onChange={(event) =>
                    setPrj(projectIndex, { description: event.target.value })
                  }
                  placeholder="프로젝트 개요 및 본인의 역할"
                  className="resize-none min-h-[64px] text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">기술 스택</Label>
                <TechStackCombobox
                  value={project.techStack}
                  onChange={(techStack) => setPrj(projectIndex, { techStack })}
                  placeholder="React, TypeScript 등 검색"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] text-muted-foreground">주요 성과</Label>
                {(project.achievements || []).map((achievement, achievementIndex) => (
                  <div key={achievementIndex} className="flex gap-2">
                    <Input
                      value={achievement}
                      onChange={(event) =>
                        setAch(projectIndex, achievementIndex, event.target.value)
                      }
                      placeholder="성과를 입력하세요"
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground h-7 px-2 hover:text-destructive"
                      onClick={() => removeAch(projectIndex, achievementIndex)}
                    >
                      삭제
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7 px-2 underline"
                  onClick={() => addAch(projectIndex)}
                >
                  항목 추가
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed py-5"
            onClick={addPrj}
          >
            <Plus className="w-4 h-4 mr-2" /> 새 프로젝트 추가하기
          </Button>
      </CollapsibleSection>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button onClick={onSave} disabled={saving} size="lg" className="gap-2 px-8">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          이력서 저장
        </Button>
      </div>
        </div>

        <div
          ref={previewRef}
          className={cn(
            "min-w-0",
            // 좌측 입력 폼이 길어져도 우측 미리보기가 항상 보이도록 sticky 처리.
            // A4 한 장의 고정 높이를 유지해야 하므로 내부 스크롤은 두지 않는다 —
            // 페이지가 길어져도 페이지 nav(이전/다음) 로 넘긴다.
            "xl:sticky xl:top-24 xl:self-start",
          )}
        >
          <KoreanResumePreview
            payload={payload}
            title={title}
            options={a4Options}
            onOptionsChange={setA4Options}
          />
        </div>
      </div>

      <ExperienceImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImport={handleImportProjects}
      />

      <WorkExperienceImportModal
        open={isWorkExpModalOpen}
        onOpenChange={setIsWorkExpModalOpen}
        onImport={handleImportWorkExperiences}
        existingIds={payload.experience.map((e) => e.id).filter(Boolean) as string[]}
      />

      <ResumeImportDialog
        open={isResumeImportDialogOpen}
        onOpenChange={setIsResumeImportDialogOpen}
        onApply={handleApplyResumeImport}
      />

      <ResumeAiTuneDialog
        open={isAiTuneDialogOpen}
        onOpenChange={setIsAiTuneDialogOpen}
        currentPayload={payload}
        onApply={(newPayload, summary) => {
          const previous = payload;
          onChange(newPayload);
          toast({
            title: "AI 가공 완료",
            description: summary,
            action: (
              <button
                type="button"
                onClick={() => onChange(previous)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent"
              >
                원본 복원
              </button>
            ),
          });
        }}
      />
    </>
  );
}
