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
  ChevronLeft,
  Download,
  Inbox,
  Loader2,
  PencilLine,
  Plus,
  Trash2,
  Upload,
  X,
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
import { TechStackCombobox } from "@/components/features/job-postings/tech-stack-combobox";
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
   * true 일 때 미리보기 클릭으로 좌측 편집 패널을 펼치고, 미리보기·편집 패널 바깥을
   * 클릭하면 다시 접는다. /resume 페이지에서만 사용한다. 마이페이지 탭은 항상 펼친
   * 상태를 유지하기 위해 기본값(false)을 그대로 둔다.
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
  previewToggleMode = false,
}: ResumeEditorProps) {
  const searchParams = useSearchParams();
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isWorkExpModalOpen, setIsWorkExpModalOpen] = useState(false);
  const [isResumeImportDialogOpen, setIsResumeImportDialogOpen] = useState(false);
  const hasAutoOpenedImportRef = useRef(false);
  const [a4Options, setA4Options] = useState<ResumeA4Options>(DEFAULT_RESUME_A4_OPTIONS);
  // 미리보기-토글 모드의 좌측 패널 표시 여부. 기본 닫힘.
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editPanelRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  // previewToggleMode + 편집 패널이 열린 상태에서, 패널과 미리보기 영역 바깥을
  // 클릭하면 패널을 접는다. shadcn Popover/Dialog 같은 portal 요소는 외부로 보지 않는다.
  useEffect(() => {
    if (!previewToggleMode || !isEditPanelOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (editPanelRef.current?.contains(target)) return;
      if (previewRef.current?.contains(target)) return;
      // Radix portal (popover, dropdown, dialog) 안에서 일어난 클릭은 무시.
      if (
        target.closest(
          "[data-radix-popper-content-wrapper], [data-radix-portal], [role='dialog'], [role='listbox']",
        )
      ) {
        return;
      }
      setIsEditPanelOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [previewToggleMode, isEditPanelOpen]);

  const showEditPanel = !previewToggleMode || isEditPanelOpen;

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
        }));
      if (newCovers.length > 0) {
        nextPayload.coverLetters = [
          ...(payload.coverLetters || []),
          ...newCovers,
        ];
        appliedCoverLetters = newCovers.length;
      }

      // 호환: 자기소개서 본문을 selfIntroduction 영역에도 append 한다.
      const contents = newCovers
        .map((c) => c.content)
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
          showEditPanel
            ? "xl:grid-cols-[minmax(340px,0.72fr)_minmax(560px,1.28fr)] 2xl:grid-cols-[minmax(380px,0.68fr)_minmax(680px,1.32fr)]"
            : "max-w-5xl mx-auto",
        )}
      >
        {showEditPanel && (
        <div ref={editPanelRef} className="space-y-5">
      {/* File parsing banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">기존의 이력서를 가져와 내용을 채울 수 있어요</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            이전에 저장한 프로젝트·경력·자기소개서를 한 번에 불러옵니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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

      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            기본 정보
          </p>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              자기소개서 (포트폴리오)
            </p>
          </div>
          <Textarea
            value={payload.selfIntroduction}
            onChange={(event) => onChange({ ...payload, selfIntroduction: event.target.value })}
            placeholder="AI 가이드를 통해 나의 프로젝트를 전문적인 문장으로 구성해보세요. 작성된 내용은 이곳에 자동으로 반영됩니다."
            className="min-h-[200px] text-sm leading-relaxed"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            기술 스택
          </p>
          <TechStackCombobox
            value={payload.skills.map((s) => s.name)}
            onChange={(nextNames) => {
              // 기존 항목의 level/category 메타데이터는 보존하고,
              // 신규 항목은 기본 "Intermediate" 로 채운다.
              const prevByName = new Map(
                payload.skills.map((s) => [s.name, s]),
              );
              const nextSkills = nextNames.map(
                (name) => prevByName.get(name) ?? { name, level: "Intermediate" },
              );
              onChange({ ...payload, skills: nextSkills });
            }}
            placeholder="React, Next.js 등 검색하거나 직접 입력 후 Enter"
          />
          <p className="text-[11px] text-muted-foreground">
            사전 등록된 기술은 로고가 자동 매칭되며, 자유 입력도 함께 저장됩니다. 기존 항목의 숙련도 메타데이터는 유지됩니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              경력
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px] font-bold gap-1.5 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
              onClick={() => setIsWorkExpModalOpen(true)}
            >
              <Briefcase className="w-3.5 h-3.5" />
              내 경력 보관함에서 불러오기
            </Button>
          </div>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              프로젝트
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="h-8 gap-1.5 text-xs text-primary bg-primary/5 hover:bg-primary/10 border-primary/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              프로젝트 보관함에서 불러오기
            </Button>
          </div>
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
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2 pt-2">
        {previewToggleMode ? (
          <Button
            variant="ghost"
            onClick={() => setIsEditPanelOpen(false)}
            className="text-slate-500"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> 미리보기로 돌아가기
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onSave} disabled={saving} size="lg" className="gap-2 px-8">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          이력서 저장
        </Button>
      </div>
        </div>
        )}

        <div
          ref={previewRef}
          className={cn(
            "min-w-0",
            showEditPanel && "xl:sticky xl:top-24 xl:self-start",
            previewToggleMode &&
              !isEditPanelOpen &&
              "group relative cursor-pointer transition-shadow hover:shadow-lg",
          )}
          onClick={() => {
            if (previewToggleMode && !isEditPanelOpen) setIsEditPanelOpen(true);
          }}
          role={previewToggleMode && !isEditPanelOpen ? "button" : undefined}
          aria-label={
            previewToggleMode && !isEditPanelOpen
              ? "미리보기를 클릭해 편집 패널 열기"
              : undefined
          }
        >
          {previewToggleMode && !isEditPanelOpen && (
            <div className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-md backdrop-blur-sm">
              <PencilLine className="h-3.5 w-3.5" aria-hidden />
              클릭하여 편집 패널 열기
            </div>
          )}
          {previewToggleMode && isEditPanelOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditPanelOpen(false);
              }}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow-md ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="편집 패널 닫기"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
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
    </>
  );
}
