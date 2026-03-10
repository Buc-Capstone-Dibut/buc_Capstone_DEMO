"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

export function FinalCoachingPanel({
  title = "다음 세션 코칭",
  description,
  actions,
}: {
  title?: string;
  description: string;
  actions: string[];
}) {
  return (
    <Card className="rounded-[30px] border border-primary/15 bg-primary/5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => (
          <div key={`${action}-${index}`} className="rounded-[22px] bg-white px-4 py-4 text-sm font-medium text-foreground">
            {index + 1}. {action}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
