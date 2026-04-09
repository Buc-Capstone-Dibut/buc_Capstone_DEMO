"use client";

import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface InterviewReportScreenTab {
  value: string;
  label: string;
  content: ReactNode;
  contentClassName?: string;
}

export function InterviewReportScreen({
  leading,
  banner,
  hero,
  tabs,
  footer,
  defaultTab = "summary",
}: {
  leading?: ReactNode;
  banner?: ReactNode;
  hero: ReactNode;
  tabs: InterviewReportScreenTab[];
  footer?: ReactNode;
  defaultTab?: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-6 md:px-10">
      {leading ? <section className="flex items-center gap-3">{leading}</section> : null}
      {banner}
      {hero}

      <Tabs defaultValue={defaultTab} className="space-y-5">
        <TabsList className="h-auto rounded-full bg-transparent p-0 text-foreground">
          {tabs.map((tab, index) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={`rounded-none border-b-2 border-transparent px-1 pb-3 pt-0 text-lg font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none ${index > 0 ? "ml-8" : ""}`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={tab.contentClassName ?? "space-y-6"}
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>

      {footer}
    </main>
  );
}
