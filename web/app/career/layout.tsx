"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, FileText, FileBadge } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CareerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: "내 경험 타임라인", href: "/career/experiences", icon: FolderKanban },
    { name: "내 자소서 관리", href: "/career/cover-letters", icon: FileText },
    { name: "내 이력서 모아보기", href: "/career/resumes", icon: FileBadge },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-950/50 w-full overflow-x-hidden">
      <div className="w-full flex justify-center max-w-[1920px] mx-auto">
        
        {/* 1. Left Vertical Menu (Desktop Only) */}
        <div className="w-56 shrink-0 hidden lg:block pt-12 xl:pt-20 px-2 lg:px-4 z-40">
          <div className="sticky top-24 flex flex-col gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-[14px] transition-all duration-300",
                    isActive
                      ? "bg-white dark:bg-slate-950 text-primary shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/80"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-slate-400")} />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 2. Main Content Area (Perfectly Centered Mathematically) */}
        <div className="flex-1 max-w-7xl w-full bg-transparent relative">
          
          {/* Mobile Fallback Navigation (Top Horizontal Tabs for small screens) */}
          <div className="lg:hidden w-full pt-8 pb-4 px-4 sm:px-8">
            <div className="flex items-center gap-1 p-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700/50 shadow-sm overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[14px] transition-all duration-300 whitespace-nowrap",
                      isActive
                        ? "bg-white dark:bg-slate-950 text-primary shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800"
                        : "text-slate-500"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-slate-400")} />
                    {tab.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="w-full">
            {children}
          </div>
        </div>

        {/* 3. Right Spacer: This invisible column forces the Main Content to be mathematically DEAD CENTER on the screen by balancing the weight of the Left Vertical Menu. */}
        <div className="w-56 shrink-0 hidden lg:block px-2 lg:px-4 pointer-events-none"></div>

      </div>
    </div>
  );
}
