"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface ResumeListItem {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

interface ResumeListProps {
    items: ResumeListItem[];
    onSelectItem: (id: string) => void;
    onDeleteItem: (id: string) => void;
    onToggleActive: (id: string, currentStatus: boolean) => void; // Added for public/private toggle
    onCreateNew: () => void;
}

export function ResumeList({ items, onSelectItem, onDeleteItem, onToggleActive, onCreateNew }: ResumeListProps) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">내 이력서 목록</h3>
                <Button onClick={onCreateNew} variant="outline" size="sm" className="px-4">
                    새 이력서 작성
                </Button>
            </div>

            {items.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                        <p className="text-muted-foreground mb-4">저장된 이력서가 없습니다.</p>
                        <Button onClick={onCreateNew} variant="ghost" className="text-primary hover:underline">
                            첫 이력서를 만들어보세요
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {items.map((item) => (
                        <Card key={item.id} className="hover:border-primary/30 transition-colors group">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectItem(item.id)}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium truncate">{item.title}</span>
                                        {item.is_active && (
                                            <Badge variant="outline" className="text-[10px] h-4 bg-primary/5 text-primary border-primary/20">
                                                대표
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        최근 수정: {format(new Date(item.updated_at), "yyyy년 MM월 dd일", { locale: ko })}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={[
                                            "text-[10px] h-7 gap-1 px-2 transition-all",
                                            item.is_active
                                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                                                : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                                        ].join(" ")}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleActive(item.id, item.is_active);
                                        }}
                                    >
                                        {item.is_active ? "공개됨" : "비공개"}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteItem(item.id);
                                        }}
                                    >
                                        삭제
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
