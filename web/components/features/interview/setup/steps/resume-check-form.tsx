"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, User, Building2, Calendar, FolderGit2, X } from "lucide-react";
import { ResumeData } from "@/store/interview-setup-store";

interface ResumeCheckFormProps {
    resumeData: ResumeData;
    updateResumeData: (data: Partial<ResumeData>) => void;
}

export function ResumeCheckForm({ resumeData, updateResumeData }: ResumeCheckFormProps) {
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

    const addSkill = () => {
        if (!newSkill.trim()) return;
        updateResumeData({
            parsedContent: {
                ...parsedContent,
                skills: [
                    ...parsedContent.skills,
                    { name: newSkill.trim(), level: 'Intermediate' }
                ]
            }
        });
        setNewSkill("");
    };

    const removeSkill = (index: number) => {
        const newSkills = [...parsedContent.skills];
        newSkills.splice(index, 1);
        updateResumeData({
            parsedContent: {
                ...parsedContent,
                skills: newSkills
            }
        });
    };

    return (
        <div className="grid gap-6">
            {/* Personal Info Check */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-muted-foreground" /> 기본 정보 & 한 줄 소개
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">이름</span>
                            <Input
                                value={safePersonalInfo.name}
                                onChange={(e) => updateResumeData({
                                    parsedContent: {
                                        ...parsedContent,
                                        personalInfo: { ...(parsedContent.personalInfo || {}), name: e.target.value }
                                    }
                                })}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">이메일</span>
                            <Input
                                value={safePersonalInfo.email}
                                onChange={(e) => updateResumeData({
                                    parsedContent: {
                                        ...parsedContent,
                                        personalInfo: { ...(parsedContent.personalInfo || {}), email: e.target.value }
                                    }
                                })}
                            />
                        </div>
                    </div>

                    {/* Elevator Pitch */}
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">한 줄 소개 (Elevator Pitch)</span>
                        <Input
                            placeholder="예: 사용자 경험을 최우선으로 생각하는 3년차 프론트엔드 개발자"
                            value={safePersonalInfo.intro || ""}
                            onChange={(e) => updateResumeData({
                                parsedContent: {
                                    ...parsedContent,
                                    personalInfo: { ...(parsedContent.personalInfo || {}), intro: e.target.value }
                                }
                            })}
                        />
                    </div>

                    {/* Portfolio Links */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><FolderGit2 className="w-3 h-3" /> GitHub</span>
                            <Input
                                placeholder="https://github.com/..."
                                value={safePersonalInfo.links?.github || ""}
                                onChange={(e) => updateResumeData({
                                    parsedContent: {
                                        ...parsedContent,
                                        personalInfo: {
                                            ...(parsedContent.personalInfo || {}),
                                            links: { ...(safePersonalInfo.links || {}), github: e.target.value }
                                        }
                                    }
                                })}
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> 블로그/노션</span>
                            <Input
                                placeholder="https://..."
                                value={safePersonalInfo.links?.blog || ""}
                                onChange={(e) => updateResumeData({
                                    parsedContent: {
                                        ...parsedContent,
                                        personalInfo: {
                                            ...(parsedContent.personalInfo || {}),
                                            links: { ...(safePersonalInfo.links || {}), blog: e.target.value }
                                        }
                                    }
                                })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Skills (Chips) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">보유 스킬</CardTitle>
                    <CardDescription>면접관이 주목할 기술 역량입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-6">
                        {parsedContent.skills.map((skill, i) => {
                            const skillName = typeof skill === 'string' ? skill : skill.name;
                            const skillLevel = typeof skill === 'string' ? 'Intermediate' : skill.level;

                            return (
                                <Badge key={`${skillName}-${i}`} variant="secondary" className="pl-3 pr-1 py-1.5 text-sm gap-2 flex items-center">
                                    <span>{skillName}</span>
                                    <span className="text-[10px] bg-background/50 px-1.5 py-0.5 rounded text-muted-foreground">
                                        {skillLevel}
                                    </span>
                                    <button
                                        onClick={() => removeSkill(i)}
                                        className="text-muted-foreground hover:text-destructive transition-colors ml-1 p-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            );
                        })}
                    </div>
                    <div className="flex gap-2 max-w-sm">
                        <Input
                            placeholder="스킬 추가..."
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                        />
                        <Button size="icon" variant="ghost" onClick={addSkill}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Experience */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-muted-foreground" /> 주요 경력
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {parsedContent.experience.map((exp, i) => (
                        <div key={i} className="relative pl-6 border-l-2 border-muted hover:border-primary transition-colors pb-8 last:pb-2">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-muted group-hover:border-primary" />
                            <div className="grid gap-2">
                                <div className="flex gap-2">
                                    <div className="grid sm:grid-cols-2 gap-2 flex-1">
                                        <Input
                                            className="font-bold"
                                            value={exp.company}
                                            placeholder="회사명"
                                            onChange={(e) => {
                                                const newExp = [...parsedContent.experience];
                                                newExp[i] = { ...exp, company: e.target.value };
                                                updateResumeData({ parsedContent: { ...parsedContent, experience: newExp } });
                                            }}
                                        />
                                        <Input
                                            value={exp.position}
                                            placeholder="직무/직책"
                                            onChange={(e) => {
                                                const newExp = [...parsedContent.experience];
                                                newExp[i] = { ...exp, position: e.target.value };
                                                updateResumeData({ parsedContent: { ...parsedContent, experience: newExp } });
                                            }}
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                            const newExp = [...parsedContent.experience];
                                            newExp.splice(i, 1);
                                            updateResumeData({ parsedContent: { ...parsedContent, experience: newExp } });
                                        }}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    <Input
                                        className="h-8 w-40 text-xs"
                                        value={exp.period}
                                        placeholder="기간 (예: 2023.01 - 재직중)"
                                        onChange={(e) => {
                                            const newExp = [...parsedContent.experience];
                                            newExp[i] = { ...exp, period: e.target.value };
                                            updateResumeData({ parsedContent: { ...parsedContent, experience: newExp } });
                                        }}
                                    />
                                </div>
                                <Textarea
                                    value={exp.description}
                                    placeholder="주요 업무 및 성과 서술"
                                    className="resize-none"
                                    onChange={(e) => {
                                        const newExp = [...parsedContent.experience];
                                        newExp[i] = { ...exp, description: e.target.value };
                                        updateResumeData({ parsedContent: { ...parsedContent, experience: newExp } });
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    <Button
                        variant="outline"
                        className="w-full mt-4 border-dashed py-6"
                        onClick={() => {
                            const newExp = [...parsedContent.experience, {
                                company: "새 경력",
                                position: "",
                                period: "",
                                description: ""
                            }];
                            updateResumeData({ parsedContent: { ...parsedContent, experience: newExp } });
                        }}
                    >
                        <Plus className="mr-2 w-5 h-5" /> 경력 추가하기
                    </Button>
                </CardContent>
            </Card>

            {/* Projects (STAR Method) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FolderGit2 className="w-5 h-5 text-muted-foreground" /> 프로젝트 경험 (STAR)
                    </CardTitle>
                    <CardDescription>
                        문제(Situation)와 해결(Action), 그리고 수치화된 성과(Result)를 강조하세요.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {parsedContent.projects.map((project, i) => (
                        <div key={i} className="relative pl-6 border-l-2 border-muted hover:border-primary transition-colors pb-2">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-muted group-hover:border-primary" />
                            <div className="grid gap-4">
                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-1">
                                        <span className="text-xs text-muted-foreground">프로젝트명</span>
                                        <Input
                                            className="font-bold"
                                            value={project.name}
                                            onChange={(e) => {
                                                const newPrj = [...parsedContent.projects];
                                                newPrj[i] = { ...project, name: e.target.value };
                                                updateResumeData({ parsedContent: { ...parsedContent, projects: newPrj } });
                                            }}
                                        />
                                    </div>
                                    <div className="w-40 space-y-1">
                                        <span className="text-xs text-muted-foreground">기간</span>
                                        <Input
                                            value={project.period}
                                            onChange={(e) => {
                                                const newPrj = [...parsedContent.projects];
                                                newPrj[i] = { ...project, period: e.target.value };
                                                updateResumeData({ parsedContent: { ...parsedContent, projects: newPrj } });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">상황 및 해결 (Situation & Action)</span>
                                    <Textarea
                                        value={project.description}
                                        className="resize-none min-h-[80px]"
                                        onChange={(e) => {
                                            const newPrj = [...parsedContent.projects];
                                            newPrj[i] = { ...project, description: e.target.value };
                                            updateResumeData({ parsedContent: { ...parsedContent, projects: newPrj } });
                                        }}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <span className="text-xs text-primary font-medium">✨ 핵심 성과 (Result - 수치화 권장)</span>
                                    {(project.achievements || []).map((achievement, ai) => (
                                        <div key={ai} className="flex gap-2 mb-2">
                                            <Input
                                                value={achievement}
                                                onChange={(e) => {
                                                    const newPrj = [...parsedContent.projects];
                                                    const newAch = [...(newPrj[i].achievements || [])];
                                                    newAch[ai] = e.target.value;
                                                    newPrj[i] = { ...newPrj[i], achievements: newAch };
                                                    updateResumeData({ parsedContent: { ...parsedContent, projects: newPrj } });
                                                }}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    const newPrj = [...parsedContent.projects];
                                                    const newAch = [...(newPrj[i].achievements || [])];
                                                    newAch.splice(ai, 1);
                                                    newPrj[i] = { ...newPrj[i], achievements: newAch };
                                                    updateResumeData({ parsedContent: { ...parsedContent, projects: newPrj } });
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-dashed"
                                        onClick={() => {
                                            const newPrj = [...parsedContent.projects];
                                            const newAch = [...(newPrj[i].achievements || []), ""];
                                            newPrj[i] = { ...newPrj[i], achievements: newAch };
                                            updateResumeData({ parsedContent: { ...parsedContent, projects: newPrj } });
                                        }}
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> 성과 추가하기
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <Button
                        variant="outline"
                        className="w-full mt-4 border-dashed py-6"
                        onClick={() => {
                            const newPrj = [...parsedContent.projects, {
                                name: "새 프로젝트",
                                period: "",
                                description: "",
                                techStack: [],
                                achievements: []
                            }];
                            updateResumeData({ parsedContent: { ...parsedContent, projects: newPrj } });
                        }}
                    >
                        <Plus className="mr-2 w-5 h-5" /> 새 프로젝트 추가하기
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
