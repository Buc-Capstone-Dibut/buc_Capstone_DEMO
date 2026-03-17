"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DibeotCharacter } from "@/components/features/interview/report/dibeot-character";
import { ReportMetaItem, ReportMetric } from "@/lib/interview/report/report-types";

export function SessionReportHero({
  badgeLabel,
  typeName,
  typeLabels,
  summary,
  fitSummary,
  metrics,
  metaItems,
  embedded = false,
}: {
  badgeLabel: string;
  typeName: string;
  typeLabels: string[];
  summary: string;
  fitSummary?: string;
  metrics: ReportMetric[];
  metaItems: ReportMetaItem[];
  embedded?: boolean;
}) {
  const metricGridClass =
    metrics.length === 1 ? "sm:grid-cols-1" : metrics.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";

  const content = (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-8 lg:items-stretch">
        <div className="rounded-[24px] border border-[#edf1f5] bg-[#fbfcfe] px-5 py-6 lg:col-span-3">
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <DibeotCharacter typeName={typeName} />
            <Badge className="rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10">
              {badgeLabel}
            </Badge>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <div className="space-y-2">
            <Badge className="rounded-full border border-primary/10 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10">
              {badgeLabel}
            </Badge>
            <h1 className="text-3xl font-black tracking-tight md:text-[2.6rem]">{typeName}</h1>
            <p className="text-[15px] font-medium text-foreground">{typeLabels.join(" · ")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#edf1f5] pb-3 text-sm">
            {metaItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold text-foreground">{item.value}</span>
                {item.href ? (
                  <Link
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-primary underline underline-offset-4"
                  >
                    {item.hrefLabel || "원본 링크"}
                  </Link>
                ) : null}
              </div>
            ))}
          </div>

          {fitSummary ? (
            <div className="rounded-[20px] border border-primary/15 bg-primary/5 px-4 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">총평</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground">{fitSummary}</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{summary}</p>
            </div>
          ) : (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{summary}</p>
          )}

          {metrics.length > 0 ? (
            <div className={`grid gap-2.5 ${metricGridClass}`}>
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-[18px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">{metric.value}</p>
                </div>
              ))}
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <Card className="overflow-hidden rounded-[28px] border border-[#e7ebf1] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.045)]">
      <CardContent className="p-5 md:p-6">{content}</CardContent>
    </Card>
  );
}
