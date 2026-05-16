"use client";

import { useState, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Plus,
  Trash2,
  User,
  Building2,
  Calendar as CalendarIcon,
  FolderGit2,
  Pencil,
} from "lucide-react";
import { ResumeData } from "@/store/interview-setup-store";
import { TechLogoChip } from "@/components/features/interview/tech-logo-chip";
import { cn } from "@/lib/utils";

interface ResumeCheckFormProps {
  resumeData: ResumeData;
  updateResumeData: (data: Partial<ResumeData>) => void;
}

/**
 * 한 줄 인라인 편집 행. 보기 시엔 텍스트만, 호버/포커스 시에 input 경계가 살아남.
 * 표(테이블) 같은 시각적 밀도를 유지하면서 수정도 즉시 가능.
 */
export function InlineRow({
  label,
  value,
  onChange,
  placeholder,
  icon,
  multiline = false,
  className,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  multiline?: boolean;
  className?: string;
}) {
  const isEmpty = !value || value.trim() === "";
  const fieldClass = cn(
    "border-transparent bg-transparent shadow-none transition-colors",
    "hover:border-input/60 focus:border-input focus:bg-background focus:shadow-sm",
    isEmpty && "text-muted-foreground",
  );
  return (
    <div
      className={cn(
        "group grid grid-cols-[110px_1fr] items-start gap-2 px-3 py-1.5 rounded-md transition-colors hover:bg-muted/40",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 pt-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={cn(fieldClass, "min-h-[2.25rem] resize-none text-sm")}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(fieldClass, "h-9 text-sm")}
        />
      )}
    </div>
  );
}

export function ResumeCheckForm({
  resumeData,
  updateResumeData,
}: ResumeCheckFormProps) {
  const [newSkill, setNewSkill] = useState("");
  const { parsedContent } = resumeData;
  const parsedPersonalInfo = parsedContent.personalInfo || {
    name: "",
    email: "",
    phone: "",
    intro: "",
    links: {},
  };
  const safePersonalInfo = {
    name: parsedPersonalInfo.name || "",
    email: parsedPersonalInfo.email || "",
    phone: parsedPersonalInfo.phone || "",
    intro: parsedPersonalInfo.intro || "",
    links: parsedPersonalInfo.links || {},
  };

  const skillsCount = parsedContent.skills?.length ?? 0;
  const experienceCount = parsedContent.experience?.length ?? 0;
  const projectsCount = parsedContent.projects?.length ?? 0;

  const updatePersonal = (patch: Record<string, unknown>) =>
    updateResumeData({
      parsedContent: {
        ...parsedContent,
        personalInfo: { ...(parsedContent.personalInfo || {}), ...patch },
      },
    });

  const updateLinks = (patch: Record<string, string>) =>
    updatePersonal({
      links: { ...(safePersonalInfo.links || {}), ...patch },
    });

  const addSkill = () => {
    if (!newSkill.trim()) return;
    updateResumeData({
      parsedContent: {
        ...parsedContent,
        skills: [
          ...parsedContent.skills,
          { name: newSkill.trim(), level: "Intermediate" },
        ],
      },
    });
    setNewSkill("");
  };

  const removeSkill = (index: number) => {
    const next = [...parsedContent.skills];
    next.splice(index, 1);
    updateResumeData({
      parsedContent: { ...parsedContent, skills: next },
    });
  };

  const updateExp = (i: number, patch: Partial<(typeof parsedContent.experience)[number]>) => {
    const next = [...parsedContent.experience];
    next[i] = { ...next[i], ...patch };
    updateResumeData({ parsedContent: { ...parsedContent, experience: next } });
  };

  const removeExp = (i: number) => {
    const next = [...parsedContent.experience];
    next.splice(i, 1);
    updateResumeData({ parsedContent: { ...parsedContent, experience: next } });
  };

  const addExp = () =>
    updateResumeData({
      parsedContent: {
        ...parsedContent,
        experience: [
          ...parsedContent.experience,
          { company: "", position: "", period: "", description: "" },
        ],
      },
    });

  const updatePrj = (
    i: number,
    patch: Partial<(typeof parsedContent.projects)[number]>,
  ) => {
    const next = [...parsedContent.projects];
    next[i] = { ...next[i], ...patch };
    updateResumeData({ parsedContent: { ...parsedContent, projects: next } });
  };

  const removePrj = (i: number) => {
    const next = [...parsedContent.projects];
    next.splice(i, 1);
    updateResumeData({ parsedContent: { ...parsedContent, projects: next } });
  };

  const addPrj = () =>
    updateResumeData({
      parsedContent: {
        ...parsedContent,
        projects: [
          ...parsedContent.projects,
          {
            name: "",
            period: "",
            description: "",
            techStack: [],
            achievements: [],
          },
        ],
      },
    });

  return (
    <div className="grid gap-4">
      {/* 1. 기본 정보 */}
      <Card>
        <CardHeader className="border-b pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-muted-foreground" aria-hidden />
            기본 정보 & 소개
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-2">
          <InlineRow
            label="이름"
            value={safePersonalInfo.name}
            onChange={(v) => updatePersonal({ name: v })}
            placeholder="예: 김정환"
          />
          <InlineRow
            label="이메일"
            value={safePersonalInfo.email}
            onChange={(v) => updatePersonal({ email: v })}
            placeholder="you@example.com"
          />
          <InlineRow
            label="한 줄 소개"
            value={safePersonalInfo.intro || ""}
            onChange={(v) => updatePersonal({ intro: v })}
            placeholder="예: 사용자 경험을 최우선으로 생각하는 3년차 프론트엔드 개발자"
          />
          <InlineRow
            label="GitHub"
            icon={<FolderGit2 className="h-3 w-3" aria-hidden />}
            value={safePersonalInfo.links?.github || ""}
            onChange={(v) => updateLinks({ github: v })}
            placeholder="https://github.com/..."
          />
          <InlineRow
            label="블로그/노션"
            icon={<Building2 className="h-3 w-3" aria-hidden />}
            value={safePersonalInfo.links?.blog || ""}
            onChange={(v) => updateLinks({ blog: v })}
            placeholder="https://..."
          />
        </CardContent>
      </Card>

      {/* 2. 보유 스킬 */}
      <Card>
        <CardHeader className="border-b pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base">
            보유 스킬
            {skillsCount > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {skillsCount}
              </span>
            )}
          </CardTitle>
          <CardDescription>면접관이 주목할 기술 역량입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {skillsCount > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {parsedContent.skills.map((skill, i) => {
                const skillName =
                  typeof skill === "string" ? skill : skill.name;
                const skillLevel =
                  typeof skill === "string" ? "Intermediate" : skill.level;
                return (
                  <TechLogoChip
                    key={`${skillName}-${i}`}
                    label={skillName}
                    sublabel={skillLevel}
                    onRemove={() => removeSkill(i)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
              등록된 스킬이 없습니다. 아래에서 추가하세요.
            </p>
          )}
          <div className="flex gap-2">
            <Input
              placeholder="예: React, Python, AWS… (Enter로 추가)"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              className="h-9 text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addSkill}
              disabled={!newSkill.trim()}
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
              추가
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. 주요 경력 */}
      <Card>
        <CardHeader className="border-b pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            주요 경력
            {experienceCount > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {experienceCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {parsedContent.experience.map((exp, i) => (
            <div
              key={i}
              className="rounded-md border bg-card transition-colors hover:border-foreground/20"
            >
              <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  경력 #{i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeExp(i)}
                  aria-label="이 경력 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
              <div className="divide-y p-2">
                <InlineRow
                  label="회사"
                  value={exp.company}
                  onChange={(v) => updateExp(i, { company: v })}
                  placeholder="회사명"
                />
                <InlineRow
                  label="직무/직책"
                  value={exp.position}
                  onChange={(v) => updateExp(i, { position: v })}
                  placeholder="예: 백엔드 엔지니어"
                />
                <InlineRow
                  label="기간"
                  icon={<CalendarIcon className="h-3 w-3" aria-hidden />}
                  value={exp.period}
                  onChange={(v) => updateExp(i, { period: v })}
                  placeholder="예: 2023.01 - 재직중"
                />
                <InlineRow
                  label="요약"
                  multiline
                  value={exp.description}
                  onChange={(v) => updateExp(i, { description: v })}
                  placeholder="주요 업무 및 성과를 한 줄 이상으로 정리"
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-dashed"
            onClick={addExp}
          >
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            경력 추가
          </Button>
        </CardContent>
      </Card>

      {/* 4. 프로젝트 (STAR) */}
      <Card>
        <CardHeader className="border-b pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderGit2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            프로젝트 경험 (STAR)
            {projectsCount > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {projectsCount}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            문제(Situation)와 해결(Action), 수치화된 성과(Result)를 강조하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {parsedContent.projects.map((project, i) => (
            <ProjectCard
              key={i}
              index={i}
              project={project}
              onPatch={(patch) => updatePrj(i, patch)}
              onRemove={() => removePrj(i)}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-dashed"
            onClick={addPrj}
          >
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            프로젝트 추가
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface ProjectDraft {
  name: string;
  period: string;
  description: string;
  techStack?: string[];
  achievements?: string[];
}

function ProjectCard({
  index,
  project,
  onPatch,
  onRemove,
}: {
  index: number;
  project: ProjectDraft;
  onPatch: (patch: Partial<ProjectDraft>) => void;
  onRemove: () => void;
}) {
  const achievements = useMemo(
    () => project.achievements ?? [],
    [project.achievements],
  );

  const updateAchievement = (ai: number, value: string) => {
    const next = [...achievements];
    next[ai] = value;
    onPatch({ achievements: next });
  };

  const addAchievement = () =>
    onPatch({ achievements: [...achievements, ""] });

  const removeAchievement = (ai: number) => {
    const next = [...achievements];
    next.splice(ai, 1);
    onPatch({ achievements: next });
  };

  return (
    <div className="rounded-md border bg-card transition-colors hover:border-foreground/20">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          프로젝트 #{index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="이 프로젝트 삭제"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
      <div className="divide-y p-2">
        <InlineRow
          label="프로젝트명"
          value={project.name}
          onChange={(v) => onPatch({ name: v })}
          placeholder="예: 학습 기록 SaaS"
        />
        <InlineRow
          label="기간"
          icon={<CalendarIcon className="h-3 w-3" aria-hidden />}
          value={project.period}
          onChange={(v) => onPatch({ period: v })}
          placeholder="예: 2024.06 - 2024.10"
        />
        <InlineRow
          label="상황·해결"
          multiline
          value={project.description}
          onChange={(v) => onPatch({ description: v })}
          placeholder="어떤 문제를 어떤 방법으로 해결했는지"
        />
      </div>
      <div className="border-t bg-muted/20 px-3 py-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
          <Pencil className="h-3 w-3" aria-hidden />
          핵심 성과 (수치화 권장)
        </div>
        <div className="space-y-1.5">
          {achievements.length === 0 && (
            <p className="rounded-sm border border-dashed bg-background px-3 py-2 text-[11px] text-muted-foreground">
              예: 페이지 로딩 2.5초 → 0.8초 단축, 월 활성 사용자 +35%
            </p>
          )}
          {achievements.map((a, ai) => (
            <div key={ai} className="flex gap-1.5">
              <Input
                value={a}
                onChange={(e) => updateAchievement(ai, e.target.value)}
                className="h-8 text-sm"
                placeholder="구체적인 결과/지표"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeAchievement(ai)}
                aria-label="이 성과 삭제"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-start border border-dashed text-xs"
            onClick={addAchievement}
          >
            <Plus className="mr-1 h-3 w-3" aria-hidden />
            성과 추가
          </Button>
        </div>
      </div>
    </div>
  );
}
