"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { ReportAxisEvidence } from "@/lib/interview/report/report-types";

export function AxisEvidencePanel({ items, embedded = false }: { items: ReportAxisEvidence[]; embedded?: boolean }) {
  const content = (
    <>
      <CardHeader className={embedded ? "px-0 pb-3 pt-0" : "pb-3"}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          판정 근거
        </CardTitle>
        <CardDescription>이번 세션에서 디벗 유형이 이렇게 해석된 이유입니다.</CardDescription>
      </CardHeader>
      <CardContent className={`grid gap-0 overflow-hidden rounded-[20px] border border-[#edf1f5] bg-[#fbfcfe] md:grid-cols-2 ${embedded ? "px-0 pb-0" : ""}`}>
        {items.map((item) => (
          <div
            key={item.axisKey}
            className="border-b border-r border-[#edf1f5] px-4 py-4 last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0 md:[&:nth-child(2n)]:border-r-0"
          >
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </CardContent>
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <Card className="rounded-[28px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      {content}
    </Card>
  );
}
