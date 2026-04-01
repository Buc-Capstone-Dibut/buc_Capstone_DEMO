"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Briefcase, Loader2, Search } from "lucide-react";
import { getAllWorkExperiencesAction } from "@/app/career/work-experience/actions";
import type { WorkExperienceInput } from "@/app/career/work-experience/actions";

interface WorkExperienceImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (selected: WorkExperienceInput[]) => void;
  existingIds: string[]; // To prevent duplicates visually if needed
}

export function WorkExperienceImportModal({ open, onOpenChange, onImport, existingIds }: WorkExperienceImportModalProps) {
  const [experiences, setExperiences] = useState<WorkExperienceInput[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      loadExperiences();
      setSelectedIds([]);
      setSearchQuery("");
    }
  }, [open]);

  const loadExperiences = async () => {
    setIsLoading(true);
    try {
      const data = await getAllWorkExperiencesAction();
      setExperiences(data || []);
    } catch (error) {
      console.error("Failed to load work experiences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExps = experiences.filter(exp => 
    (exp.company || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (exp.position || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleImport = () => {
    const selectedExps = experiences.filter(e => selectedIds.includes(e.id!));
    onImport(selectedExps);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 p-0 overflow-hidden border-slate-200 dark:border-slate-800 rounded-3xl shrink-0">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              내 경력 보관함에서 불러오기
            </DialogTitle>
            <DialogDescription className="text-[14px] text-slate-500 mt-2">
              커리어 허브에 등록해둔 직장 재직 기록을 선택하여 이력서 경력란에 바로 가져옵니다.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="회사명 또는 직무 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[14px]"
            />
          </div>
        </div>

        <div className="p-8 pb-4 max-h-[400px] overflow-y-auto no-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary/50 mb-4" />
              <p className="text-[14px] text-slate-500 font-medium">경력을 불러오는 중입니다...</p>
            </div>
          ) : filteredExps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">표시할 경력이 없습니다.</p>
              <p className="text-[13px] text-slate-500 mt-1">커리어 허브의 '나의 경력 보관함' 메뉴에서 먼저 경력을 등록해주세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExps.map((exp) => {
                const isSelected = selectedIds.includes(exp.id!);
                const isAlreadyAdded = existingIds.includes(exp.id!); // If same ID already in resume

                return (
                  <label 
                    key={exp.id} 
                    className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/5 dark:bg-primary/10" 
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300"
                    } ${isAlreadyAdded && !isSelected ? "opacity-75" : ""}`}
                  >
                    <div className="mt-1">
                      <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={() => toggleSelect(exp.id!)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-[15px] text-slate-900 dark:text-white truncate pr-4">
                          {exp.company}
                        </h4>
                        <span className="shrink-0 text-[12px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                          {exp.period || "---"}
                        </span>
                      </div>
                      <p className="text-[14px] font-medium text-slate-600 dark:text-slate-400">
                        {exp.position}
                      </p>
                      
                      {isAlreadyAdded && !isSelected && (
                        <p className="text-[11px] font-bold text-amber-500 mt-2 bg-amber-50 w-fit px-2 py-0.5 rounded-md">
                          이미 이력서에 추가됨
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex justify-between items-center">
          <div className="text-[14px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="text-primary font-bold">{selectedIds.length}</span>개 선택됨
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold h-11 px-6">
              취소
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={selectedIds.length === 0}
              className="rounded-xl font-bold h-11 px-8 shadow-sm"
            >
              선택 항목 추가하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
