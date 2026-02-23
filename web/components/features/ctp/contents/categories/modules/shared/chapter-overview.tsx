"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export interface ChapterOverviewItem {
  id: string;
  title: string;
  description: string;
}

interface ChapterOverviewProps {
  moduleLabel: string;
  chapterTitle: string;
  chapterDescription: string;
  guideItems: string[];
  items: ChapterOverviewItem[];
}

export function ChapterOverview({
  moduleLabel,
  chapterTitle,
  chapterDescription,
  guideItems,
  items,
}: ChapterOverviewProps) {
  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      <section className="text-center space-y-4 pt-6">
        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
          {moduleLabel}
        </Badge>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">{chapterTitle}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">{chapterDescription}</p>
      </section>

      <section className="bg-muted/30 border border-border/40 rounded-xl p-5">
        <h2 className="text-lg font-bold mb-3">학습 가이드</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {guideItems.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold mt-0.5">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <Link key={item.id} href={`?view=${item.id}`} replace scroll={false} className="group">
            <Card className="h-full border-border/50 hover:border-primary/40 transition-colors">
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
        ))}
      </section>
    </div>
  );
}
