"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X, Trash2, Plus, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ResumePayload } from "../profile-types";
import { normalizeResumePayload } from "../profile-utils";

interface ResumeEditorProps {
  payload: ResumePayload;
  onChange: (payload: ResumePayload) => void;
  onSave: () => void;
  saving: boolean;
  onGoSetup: () => void;
}

export function ResumeEditor({
  payload,
  onChange,
  onSave,
  saving,
  onGoSetup,
}: ResumeEditorProps) {
  const [newSkill, setNewSkill] = useState("");
  const [isParsingFile, setIsParsingFile] = useState(false);
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
    const next = [...payload.skills];
    next.splice(index, 1);
    onChange({ ...payload, skills: next });
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
        { company: "", position: "", period: "", description: "" },
      ],
    });

  const removeExp = (index: number) => {
    const next = [...payload.experience];
    next.splice(index, 1);
    onChange({ ...payload, experience: next });
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
        { name: "", period: "", description: "", techStack: [], achievements: [] },
      ],
    });

  const removePrj = (index: number) => {
    const next = [...payload.projects];
    next.splice(index, 1);
    onChange({ ...payload, projects: next });
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
    const next = [...payload.projects];
    const achievements = [...(next[projectIndex].achievements || [])];
    achievements.splice(achievementIndex, 1);
    next[projectIndex] = { ...next[projectIndex], achievements };
    onChange({ ...payload, projects: next });
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
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">이 이력서가 면접 세션에 사용됩니다</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              AI 면접 시 이력서 기반으로 맞춤 질문이 생성됩니다.
            </p>
          </div>
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
          <Button
            variant="outline"
            size="sm"
            onClick={onGoSetup}
            className="shrink-0 gap-1.5 text-xs"
          >
            면접 시작하기
          </Button>
        </div>
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
                  onClick={() => removeSkill(index)}
                  className="opacity-50 hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            경력
          </p>
          {payload.experience.map((exp, index) => (
            <div key={index} className="relative rounded-lg border p-4 space-y-3 bg-muted/20">
              <button
                onClick={() => removeExp(index)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
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
                <Input
                  value={exp.period}
                  onChange={(event) => setExp(index, { period: event.target.value })}
                  placeholder="2022.03 ~ 2024.02"
                  className="h-8 text-sm"
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            프로젝트
          </p>
          {payload.projects.map((project, projectIndex) => (
            <div
              key={projectIndex}
              className="relative rounded-lg border p-4 space-y-3 bg-muted/20"
            >
              <button
                onClick={() => removePrj(projectIndex)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  <Input
                    value={project.period}
                    onChange={(event) =>
                      setPrj(projectIndex, { period: event.target.value })
                    }
                    placeholder="2023.06 ~ 2023.12"
                    className="h-8 text-sm"
                  />
                </div>
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
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAch(projectIndex, achievementIndex)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7 px-2"
                  onClick={() => addAch(projectIndex)}
                >
                  <Plus className="w-3 h-3 mr-1" /> 성과 추가
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
    </div>
  );
}
