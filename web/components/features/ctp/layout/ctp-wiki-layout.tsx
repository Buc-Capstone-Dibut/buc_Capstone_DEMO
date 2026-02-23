"use client";

import { CTPRightSidebar } from "./ctp-right-sidebar";
import { CTPSidebar } from "./ctp-sidebar";
import { CTPSubSidebar } from "./ctp-sub-sidebar";
import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface CTPWikiLayoutProps {
  children: React.ReactNode;
}

const MAIN_SIDEBAR_STORAGE_KEY = "ctp-main-sidebar-open";

export function CTPWikiLayout({ children }: CTPWikiLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const segments = pathname.split("/");
  const conceptId = segments[4];
  const isProblemBankConcept = [
    "foundation-integration",
    "stack-recursion-integration",
    "sorting-string-integration",
    "list-tree-integration",
  ].includes(conceptId);

  // Scroll to top on route change (simulates page refresh behavior)
  // This now covers both Path changes (/a -> /b) and Query changes (/a?view=1 -> /a?view=2)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(MAIN_SIDEBAR_STORAGE_KEY);
    if (saved === null) return;
    setIsSidebarOpen(saved === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(MAIN_SIDEBAR_STORAGE_KEY, String(isSidebarOpen));
  }, [isSidebarOpen]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* 1. Global Navigation (Curriculum Tree) */}
      <CTPSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* 2. Local Navigation (Concept Sub-topics) */}
      <CTPSubSidebar
        isMainSidebarOpen={isSidebarOpen}
        onOpenMainSidebar={() => setIsSidebarOpen(true)}
      />

      {/* 3. Main Content Area */}
      <div className="flex-1 min-w-0 relative">
        <main className="w-full max-w-7xl mx-auto px-4 py-8 md:px-8 md:py-10">
          {children}
        </main>
      </div>

      {/* 4. On This Page (TOC) */}
      {!isProblemBankConcept && <CTPRightSidebar />}
    </div>
  );
}
