"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Loader2, Upload, Download, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ResumePayload } from "../profile-types";
import { normalizeResumePayload } from "../profile-utils";
import { MonthRangePicker } from "@/components/features/resume/MonthRangePicker";
import { ExperienceImportModal } from "@/components/features/resume/ExperienceImportModal";
import { WorkExperienceImportModal } from "@/components/features/resume/WorkExperienceImportModal";
import type { WorkExperienceInput } from "@/app/career/work-experience/actions";

interface ResumeEditorProps {
  payload: ResumePayload;
  onChange: (payload: ResumePayload) => void;
  onSave: () => void;
  saving: boolean;
  onGoSetup: () => void;
  title?: string;
  onTitleChange?: (title: string) => void;
}

export function ResumeEditor({
  payload,
  onChange,
  onSave,
  saving,
  onGoSetup,
  title = "",
  onTitleChange,
}: ResumeEditorProps) {
  const [newSkill, setNewSkill] = useState("");
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isWorkExpModalOpen, setIsWorkExpModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  const pi = payload.personalInfo;

  const setPI = (patch: Partial<ResumePayload["personalInfo"]>) =>
    onChange({ ...payload, personalInfo: { ...pi, ...patch } });

  const setLinks = (patch: Partial<typeof pi.links>) =>
    onChange({
      ...payload,
      personalInfo: { ...pi, links: { ...pi.links, ...patch } },
    });

  const addSkill = () => {
    const name = newSkill.trim();
    if (!name) return;
    onChange({
      ...payload,
      skills: [...payload.skills, { name, level: "Intermediate" }],
    });
    setNewSkill("");
  };

  const removeSkill = (index: number) => {
    const item = payload.skills[index];
    onChange({
      ...payload,
      skills: payload.skills.filter((_, i) => i !== index),
    });
    toast({
      title: "기술 스택 삭제됨",
      description: `${item.name} 항목이 목록에서 제거되었습니다.`,
    });
  };

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

  const handleImportExperiences = (selected: any[]) => {
    const newProjects = selected
        .filter(e => !payload.projects.some(p => p.id === e.id)) // Avoid duplicates
        .map(e => ({
            id: e.id || Math.random().toString(36).substring(2, 11),
            name: e.company || "경험 기반 프로젝트",
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
            title: "경험 불러오기 완료",
            description: `${newProjects.length}개의 경험이 프로젝트로 추가되었습니다.`,
        });
    } else {
        toast({
            title: "불러올 경험이 없습니다.",
            description: "이미 추가된 경험이거나 잘못된 요청입니다.",
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
    <div className="space-y-5">
      {/* File parsing banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">기존의 이력서를 가져와 내용을 채울 수 있어요</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
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
            placeholder="AI 가이드를 통해 나의 경험을 전문적인 문장으로 구성해보세요. 작성된 내용은 이곳에 자동으로 반영됩니다."
            className="min-h-[200px] text-sm leading-relaxed"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            기술 스택
          </p>
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {payload.skills.map((skill, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs gap-1 pl-2.5 pr-1 h-7 cursor-default"
              >
                {skill.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeSkill(index);
                  }}
                  className="opacity-50 hover:opacity-100 transition px-1 text-[10px] font-bold"
                >
                  삭제
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(event) => setNewSkill(event.target.value)}
              onKeyDown={(event) =>
                event.key === "Enter" && (event.preventDefault(), addSkill())
              }
              placeholder="기술명 입력 후 Enter"
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addSkill}>
              추가
            </Button>
          </div>
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
              내 경험 보관함에서 불러오기
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
                <Label className="text-[11px] text-muted-foreground">
                  기술 스택 (쉼표 구분)
                </Label>
                <Input
                  value={project.techStack.join(", ")}
                  onChange={(event) =>
                    setPrj(projectIndex, {
                      techStack: event.target.value
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="React, TypeScript, Node.js"
                  className="h-8 text-sm"
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

      <div className="flex justify-end pt-2">
        <Button onClick={onSave} disabled={saving} size="lg" className="gap-2 px-8">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          이력서 저장
        </Button>
      </div>

      <ExperienceImportModal 
        open={isImportModalOpen} 
        onOpenChange={setIsImportModalOpen} 
        onImport={handleImportExperiences} 
      />
      
      <WorkExperienceImportModal 
        open={isWorkExpModalOpen} 
        onOpenChange={setIsWorkExpModalOpen} 
        onImport={handleImportWorkExperiences} 
        existingIds={payload.experience.map((e) => e.id).filter(Boolean) as string[]}
      />
    </div>
  );
}
