"use client";

import { CTP_DATA } from "@/lib/ctp-curriculum";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen } from "lucide-react";

interface CTPSubSidebarProps {
  isMainSidebarOpen?: boolean;
  onOpenMainSidebar?: () => void;
}

export function CTPSubSidebar({ isMainSidebarOpen, onOpenMainSidebar }: CTPSubSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // ... existing logic ...
  const segments = pathname.split("/");
  const categoryId = segments[3];
  const conceptId = segments[4];

  if (!categoryId || !conceptId) return null;

  const category = CTP_DATA.find((c) => c.id === categoryId);
  const concept = category?.concepts.find((c) => c.id === conceptId);

  // If no sub-concepts, return null or empty
  if (!concept?.subConcepts || concept.subConcepts.length === 0) {
     return (
        <aside className="w-56 h-[calc(100vh-4rem)] sticky top-16 hidden lg:block border-r border-border/30 bg-background/30 p-6 scrollbar-hide">
             {!isMainSidebarOpen && onOpenMainSidebar && (
                <div className="mb-4">
                    <Button variant="ghost" size="icon" onClick={onOpenMainSidebar} className="-ml-2 text-muted-foreground">
                        <PanelLeftOpen className="w-4 h-4" />
                    </Button>
                </div>
             )}
           <p className="text-xs text-muted-foreground">No sub-topics</p>
        </aside>
     );
  }

  return (
    <aside className="w-56 h-[calc(100vh-4rem)] sticky top-16 hidden lg:block border-r border-border/30 bg-muted/5 p-4 py-8 overflow-y-auto scrollbar-hide">
      {!isMainSidebarOpen && onOpenMainSidebar && (
        <div className="mb-6">
            <Button variant="ghost" size="icon" onClick={onOpenMainSidebar} className="-ml-2 text-muted-foreground hover:bg-background">
                <PanelLeftOpen className="w-4 h-4" />
            </Button>
        </div>
      )}

      <div className="space-y-6">
        <div>
           <h3 className="text-sm font-bold text-foreground mb-1 line-clamp-1" title={concept.title}>
              {concept.title.split(" (")[0]}
           </h3>
           <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Chapter Topics
           </p>
        </div>

        <nav className="space-y-0.5">
          {concept.subConcepts.map((sub, idx) => {
            const isActive = searchParams.get("view") === sub.id || (!searchParams.get("view") && idx === 0);
            return (
              <Link
                key={sub.id}
                href={`?view=${sub.id}`}
                replace={true}
                scroll={false}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                   isActive ? "bg-primary" : "bg-current opacity-40"
                )} />
                <span className="truncate">{sub.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
