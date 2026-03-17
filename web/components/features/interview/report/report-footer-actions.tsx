"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FooterAction } from "@/lib/interview/report/report-types";

export function ReportFooterActions({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: FooterAction[];
}) {
  const router = useRouter();

  return (
    <footer className="rounded-[24px] border border-[#e7ebf1] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-base font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "default"}
              className="rounded-full px-5"
              onClick={() => action.href && router.push(action.href)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </footer>
  );
}
