"use client";

import { ComponentType } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export interface ChapterOverviewItem {
  id: string;
  title: string;
  description: string;
  previewVisualizers?: ComponentType<any>[];
  previewLabels?: string[];
}

interface ChapterOverviewProps {
  moduleLabel: string;
  chapterTitle: string;
  chapterDescription: string;
  guideItems?: string[];
  whyLearn?: string;
  quickFlow?: string[];
  items: ChapterOverviewItem[];
}

export function ChapterOverview({
  moduleLabel,
  chapterTitle,
  chapterDescription,
  guideItems,
  whyLearn,
  quickFlow,
  items,
}: ChapterOverviewProps) {
  const previewSlotCount = 4;
  const resolvedWhyLearn = whyLearn ?? guideItems?.[0] ?? chapterDescription;
  const resolvedQuickFlow = (quickFlow && quickFlow.length > 0)
    ? quickFlow.slice(0, 3)
    : (guideItems?.slice(1, 4) ?? []);

  const buildPreviewSlots = (item: ChapterOverviewItem) => {
    const realPreviews = (item.previewVisualizers ?? []).slice(0, previewSlotCount);
    return Array.from({ length: previewSlotCount }, (_, index) => realPreviews[index] ?? null);
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      <section className="text-center space-y-4 pt-6">
        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
          {moduleLabel}
        </Badge>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">{chapterTitle}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">{chapterDescription}</p>
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-xl border border-border/40 bg-muted/30 p-4 md:grid-cols-2">
        <div className="rounded-lg border border-border/50 bg-background/60 p-4">
          <h2 className="mb-2 text-base font-bold">왜 배우나요?</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{resolvedWhyLearn}</p>
        </div>

        <div className="rounded-lg border border-border/50 bg-background/60 p-4">
          <h2 className="mb-2 text-base font-bold">빠른 학습 흐름</h2>
          {resolvedQuickFlow.length > 0 ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {resolvedQuickFlow.map((step, index) => (
                <li key={`${step}-${index}`} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">핵심 개념 확인 → 인터랙티브 실습 → 요약 정리</p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const previewSlots = buildPreviewSlots(item);

          return (
            <Link
              key={item.id}
              href={`?view=${item.id}`}
              replace
              scroll={false}
              className="group"
            >
              <Card className="h-full overflow-hidden border-border/50 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                {item.previewVisualizers && item.previewVisualizers.length > 0 && (
                  <div className="p-4 pb-0">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Interactive Preview Gallery (4) · Auto Play
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {previewSlots.map((Preview, idx) => (
                        <div
                          key={`${item.id}-preview-${idx}`}
                          className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br from-muted/40 via-background to-muted/30"
                        >
                          {Preview ? (
                            <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full">
                              <Preview />
                            </div>
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
                                Preview {idx + 1}
                              </span>
                              <span className="line-clamp-2 text-[10px] text-muted-foreground">
                                {item.previewLabels?.[idx] ?? "No preview"}
                              </span>
                            </div>
                          )}
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-1.5">
                            <div className="truncate text-[10px] font-semibold text-foreground/90">
                              {item.previewLabels?.[idx] ?? `Preview ${idx + 1}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  <div className="flex items-center justify-end mt-3 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    시작하기 <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
