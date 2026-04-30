"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Pickaxe, Briefcase } from "lucide-react";
import { getAllProjectsAction } from "@/app/career/projects/actions";
import type { ProjectInput } from "@/app/career/projects/types";
import { cn } from "@/lib/utils";

interface ExperienceImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (selected: ProjectInput[]) => void;
}

export function ExperienceImportModal({ open, onOpenChange, onImport }: ExperienceImportModalProps) {
    const [projects, setProjects] = useState<ProjectInput[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        if (open) {
            fetchProjects();
        } else {
            // Reset state when closed
            setSelectedIds([]);
        }
    }, [open]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const nextProjects = await getAllProjectsAction();
            // Sort by period descending ideally, but rely on DB order for now
            setProjects(nextProjects);
        } catch (error) {
            console.error("프로젝트 목록을 불러오지 못했습니다.", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleImport = () => {
        if (selectedIds.length === 0) return;
        setImporting(true);
        const selected = projects.filter((project) => selectedIds.includes(project.id!));
        
        // Pass to parent
        onImport(selected);
        
        setImporting(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-slate-50">
                <DialogHeader className="px-6 py-5 bg-white border-b border-slate-100 shrink-0">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <Briefcase className="w-5 h-5 text-primary" />
                        프로젝트 보관함에서 불러오기
                    </DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        이력서의 프로젝트 영역에 추가할 프로젝트를 선택해주세요.
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary/50 mb-4" />
                            <p className="text-sm text-slate-500 font-medium">프로젝트 데이터를 불러오고 있어요...</p>
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Pickaxe className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-600 font-bold text-lg mb-2">아직 보관함에 작성된 프로젝트가 없습니다.</p>
                            <p className="text-slate-400 text-sm">먼저 프로젝트 보관함에서 프로젝트를 기록해주세요.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {projects.map((project) => {
                                const isSelected = selectedIds.includes(project.id!);
                                return (
                                    <div
                                        key={project.id}
                                        onClick={() => toggleSelection(project.id!)}
                                        className={cn(
                                            "relative p-5 rounded-2xl border-2 transition-all cursor-pointer group hover:scale-[1.01]",
                                            isSelected 
                                                ? "bg-primary/5 border-primary shadow-sm" 
                                                : "bg-white border-slate-200 hover:border-primary/40 shadow-sm"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Checkbox circle */}
                                            <div className={cn(
                                                "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                                                isSelected ? "bg-primary border-primary text-white" : "border-slate-300 bg-white group-hover:border-primary/40"
                                            )}>
                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-4 mb-2">
                                                    <h3 className={cn("font-bold text-base truncate transition-colors", isSelected ? "text-primary" : "text-slate-800")}>
                                                        {project.company || "(프로젝트명 없음)"}
                                                    </h3>
                                                    <span className="text-xs font-bold text-slate-400 shrink-0 bg-slate-100 px-2.5 py-1 rounded-md">
                                                        {project.period || "기간 미상"}
                                                    </span>
                                                </div>
                                                
                                                <p className="text-sm text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                                                    {project.description || "요약 내용이 작성되지 않았습니다."}
                                                </p>

                                                {(project.tags?.length ?? 0) > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {project.tags!.map(tag => (
                                                            <span key={tag} className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="px-6 py-5 bg-white border-t border-slate-100 shrink-0 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">
                        <strong className="text-primary">{selectedIds.length}개</strong>의 프로젝트 선택됨
                    </p>
                    <div className="flex gap-3">
                        <Button variant="ghost" className="font-bold text-slate-500 hover:bg-slate-100" onClick={() => onOpenChange(false)}>
                            취소
                        </Button>
                        <Button 
                            className="font-bold px-8 shadow-md" 
                            disabled={selectedIds.length === 0 || importing}
                            onClick={handleImport}
                        >
                            {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            선택한 항목 불러오기
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
