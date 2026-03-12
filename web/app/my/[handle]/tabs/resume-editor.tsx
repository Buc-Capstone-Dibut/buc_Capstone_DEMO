"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, X, Trash2, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ResumePayload } from "../profile-types";
import { normalizeResumePayload } from "../profile-utils";

interface ResumeEditorProps {
  payload: ResumePayload;
  onChange: (payload: ResumePayload) => void;
  onSave: () => void;
  saving: boolean;
}

export function ResumeEditor({
  payload,
  onChange,
  onSave,
  saving,
}: ResumeEditorProps) {
  const [newSkill, setNewSkill] = useState("");
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
    const item = project.achievements[achievementIndex];
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


  return (
    <div className="space-y-5">

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
            <Badge variant="outline" className="text-[10px] font-normal border-primary/20 text-primary bg-primary/5">
              AI 가이드 내용이 반영됨
            </Badge>
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
                  className="opacity-50 hover:opacity-100 transition p-0.5 hover:bg-slate-200 rounded"
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
                  type="button"
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
