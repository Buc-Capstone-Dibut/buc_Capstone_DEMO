"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { JobData } from "@/store/interview-setup-store";

interface JdCheckFormProps {
    jobData: JobData;
    updateJobData: (data: Partial<JobData>) => void;
}

export function JdCheckForm({ jobData, updateJobData }: JdCheckFormProps) {
    const [newTech, setNewTech] = useState("");
    const [newReq, setNewReq] = useState("");
    const [newResp, setNewResp] = useState("");

    const handleAddItem = (
        value: string,
        field: 'techStack' | 'requirements' | 'responsibilities',
        setter: (v: string) => void
    ) => {
        if (!value.trim()) return;
        updateJobData({ [field]: [...jobData[field], value.trim()] });
        setter("");
    };

    const handleRemoveItem = (index: number, field: 'techStack' | 'requirements' | 'responsibilities') => {
        const newList = [...jobData[field]];
        newList.splice(index, 1);
        updateJobData({ [field]: newList });
    };

    const handleUpdateItem = (index: number, value: string, field: 'requirements' | 'responsibilities') => {
        const newList = [...jobData[field]];
        newList[index] = value;
        updateJobData({ [field]: newList });
    };

    return (
        <div className="grid gap-6">
            {/* 1. Basic Info & Company Description */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">기본 정보 및 기업 소개</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>포지션 (직무)</Label>
                            <Input
                                value={jobData.role}
                                onChange={(e) => updateJobData({ role: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>기업명</Label>
                            <Input
                                value={jobData.company}
                                onChange={(e) => updateJobData({ company: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>기업/서비스 소개</Label>
                        <Textarea
                            placeholder="이 기업은 어떤 서비스를 만들고 있나요? (정보가 없다면 비워두셔도 좋습니다)"
                            className="min-h-[100px] resize-none"
                            value={jobData.companyDescription || ""}
                            onChange={(e) => updateJobData({ companyDescription: e.target.value })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 2. Team Culture & Talent Fit (NEW) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">인재상 및 조직문화</CardTitle>
                    <CardDescription>기업이 추구하는 가치나 일하는 방식입니다 — 면접 질문 생성에 중요한 참고 자료가 됩니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {(jobData.teamCulture || []).map((culture, i) => (
                        <div key={i} className="flex gap-2 group">
                            <Input
                                value={culture}
                                onChange={(e) => {
                                    const newList = [...(jobData.teamCulture || [])];
                                    newList[i] = e.target.value;
                                    updateJobData({ teamCulture: newList });
                                }}
                                className="flex-1 px-4"
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                    const newList = [...(jobData.teamCulture || [])];
                                    newList.splice(i, 1);
                                    updateJobData({ teamCulture: newList });
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <div className="flex gap-2 pt-1 border-t border-dashed mt-2">
                        <Input
                            placeholder="예: 사용자 가치를 최우선으로 생각하는 분 (정보가 없다면 비워두세요)"
                            className="flex-1 border-none shadow-none focus-visible:ring-0 px-4"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = (e.currentTarget as HTMLInputElement).value;
                                    if (val.trim()) {
                                        updateJobData({ teamCulture: [...(jobData.teamCulture || []), val.trim()] });
                                        (e.currentTarget as HTMLInputElement).value = "";
                                    }
                                }
                            }}
                        />
                        <Button size="sm" variant="ghost" className="text-muted-foreground">
                            엔터로 추가
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 4. Tech Stack */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">기술 스택</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <AnimatePresence>
                            {jobData.techStack.map((tech, i) => (
                                <motion.div
                                    key={`${tech}-${i}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                >
                                    <Badge variant="secondary" className="px-3 py-1.5 text-sm gap-2">
                                        {tech}
                                        <button
                                            onClick={() => handleRemoveItem(i, 'techStack')}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                    <div className="flex gap-2 max-w-sm">
                        <Input
                            placeholder="기술 스택 추가 (예: Next.js)"
                            value={newTech}
                            onChange={(e) => setNewTech(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem(newTech, 'techStack', setNewTech)}
                            className="px-4"
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleAddItem(newTech, 'techStack', setNewTech)}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 5. Key Responsibilities */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">주요 업무</CardTitle>
                    <CardDescription>지원하는 포지션에서 수행하게 될 업무입니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {jobData.responsibilities.map((resp, i) => (
                        <div key={i} className="flex gap-2 group">
                            <Input
                                value={resp}
                                onChange={(e) => handleUpdateItem(i, e.target.value, 'responsibilities')}
                                className="flex-1 px-4"
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveItem(i, 'responsibilities')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <div className="flex gap-2 pt-1 border-t border-dashed mt-2">
                        <Input
                            placeholder="새로운 주요 업무 추가..."
                            className="flex-1 border-none shadow-none focus-visible:ring-0 px-4"
                            value={newResp}
                            onChange={(e) => setNewResp(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem(newResp, 'responsibilities', setNewResp)}
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleAddItem(newResp, 'responsibilities', setNewResp)}>
                            추가
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 6. Requirements */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">자격 요건</CardTitle>
                    <CardDescription>필수적으로 요구되는 경험이나 역량입니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {jobData.requirements.map((req, i) => (
                        <div key={i} className="flex gap-2 group">
                            <Input
                                value={req}
                                onChange={(e) => handleUpdateItem(i, e.target.value, 'requirements')}
                                className="flex-1 px-4"
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveItem(i, 'requirements')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <div className="flex gap-2 pt-1 border-t border-dashed mt-2">
                        <Input
                            placeholder="새로운 자격 요건 추가..."
                            className="flex-1 border-none shadow-none focus-visible:ring-0 px-4"
                            value={newReq}
                            onChange={(e) => setNewReq(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem(newReq, 'requirements', setNewReq)}
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleAddItem(newReq, 'requirements', setNewReq)}>
                            추가
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
