"use client";

import { cn } from "@/lib/utils";

export interface ComplexityData {
  access: string;
  search: string;
  insertion: string;
  deletion: string;
}

interface CTPComplexityProps {
  data: ComplexityData;
  names?: {
    access?: string;
    search?: string;
    insertion?: string;
    deletion?: string;
  };
}

export function CTPComplexity({ data, names }: CTPComplexityProps) {
  const getColor = (val: string) => {
    if (val.includes("1") || val.includes("logN")) return "text-green-500";
    if (val.includes("N^2") || val.includes("!")) return "text-red-500";
    return "text-yellow-500"; // O(N) etc
  };

  const DEFAULT_LABELS = {
    access: '인덱스 접근',
    search: '값 탐색',
    insertion: '중간 삽입',
    deletion: '중간 삭제'
  };

  const ITEMS = [
    { key: 'access', label: 'Access' },
    { key: 'search', label: 'Search' },
    { key: 'insertion', label: 'Insertion' },
    { key: 'deletion', label: 'Deletion' },
  ] as const;

  return (
    <section id="complexity">
      <h2 className="text-2xl font-bold tracking-tight mb-6">시간 복잡도</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ITEMS.map((item) => {
          const value = data[item.key];
          const subLabel = names?.[item.key] || DEFAULT_LABELS[item.key];

          return (
            <div key={item.key} className="p-5 rounded-xl border border-border bg-card text-center hover:border-primary/50 transition-colors">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">{item.label}</div>
              <div className={cn("text-2xl font-mono font-black", getColor(value))}>{value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{subLabel}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
