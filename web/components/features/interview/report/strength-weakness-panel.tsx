"use client";

import { Card, CardContent } from "@/components/ui/card";

export function StrengthWeaknessPanel({
  strengths,
  weaknesses,
  focusPoint,
}: {
  strengths: string[];
  weaknesses: string[];
  focusPoint: string;
}) {
  const columns = [
    { title: "강점", items: strengths, tone: "bg-primary/5 border-primary/15" },
    { title: "아쉬움", items: weaknesses, tone: "bg-[#fbfcfe] border-[#e7ebf1]" },
  ];

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_1fr_0.9fr]">
      {columns.map((column) => (
        <Card key={column.title} className={`rounded-[30px] border shadow-[0_12px_30px_rgba(15,23,42,0.04)] ${column.tone}`}>
          <CardContent className="space-y-4 p-5">
            <p className="text-base font-semibold">{column.title}</p>
            <div className="space-y-3">
              {column.items.map((item, index) => (
                <div key={`${column.title}-${index}`} className="rounded-[18px] bg-white/80 px-4 py-3 text-sm leading-6 text-foreground">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="rounded-[30px] border border-[#e7ebf1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <CardContent className="space-y-4 p-5">
          <p className="text-base font-semibold">바로 보완할 점</p>
          <div className="rounded-[22px] border border-primary/15 bg-primary/5 px-4 py-4 text-sm leading-6 text-foreground">
            {focusPoint}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
