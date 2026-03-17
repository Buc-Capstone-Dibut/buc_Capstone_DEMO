"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DIBEOT_AXES, getAxisLabel } from "@/lib/interview/report/dibeot-axis";
import { DibeotAxisScores } from "@/lib/interview/report/report-types";

export function AxisProfileBoard({ axes, embedded = false }: { axes: DibeotAxisScores; embedded?: boolean }) {
  const content = (
    <>
      <CardHeader className={embedded ? "px-0 pb-3 pt-0" : "pb-3"}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          4축 프로필
        </CardTitle>
        <CardDescription>이번 세션에서 더 강하게 드러난 성향만 간결하게 봅니다.</CardDescription>
      </CardHeader>
      <CardContent className={`grid gap-3 md:grid-cols-2 ${embedded ? "px-0 pb-0" : ""}`}>
        {DIBEOT_AXES.map((axis) => {
          const value = axes[axis.key];
          const dominant = getAxisLabel(axis.key, value);
          const opposite = value >= 50 ? axis.right : axis.left;
          const dominantValue = value >= 50 ? value : 100 - value;
          const oppositeValue = 100 - dominantValue;

          return (
            <div key={axis.key} className="rounded-[20px] border border-[#e7ebf1] bg-[#fbfcfe] px-4 py-3.5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{axis.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{axis.description}</p>
                </div>
                <div className="min-w-[76px] shrink-0 rounded-full bg-primary/10 px-3 py-1 text-center text-[11px] font-semibold text-primary">
                  {dominant}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-primary">{dominant}</span>
                  <span className="text-muted-foreground">{dominantValue}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${dominantValue}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{opposite} {oppositeValue}%</span>
                  <span>이번 세션</span>
                </div>
              </div>
            </div>
          );
        })}
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
