"use client";

import { CTP_DATA } from "@/lib/ctp-curriculum";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Zap, Code, BookOpen, PanelLeftClose } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface CTPSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CTPSidebar({ isOpen, onClose }: CTPSidebarProps) {
  const pathname = usePathname();

  const getIcon = (idx: number) => {
    switch (idx) {
      case 0: return Layers;
      case 1: return Zap;
      case 2: return Code;
      case 3: return BookOpen;
      default: return Layers;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.nav
          className="h-[calc(100vh-4rem)] sticky top-16 border-r border-border/40 bg-background/50 backdrop-blur hidden lg:flex flex-col py-4 z-20 pl-6 pr-4 overflow-hidden min-w-[256px]"
        >
          {/* Header & Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="px-2">
              <h2 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">
                Curriculum
              </h2>
              <p className="text-sm font-semibold text-foreground truncate">
                Coding Test Prep
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-muted"
              onClick={onClose}
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-6 overflow-y-auto scrollbar-hide flex-1">
            {CTP_DATA.map((category, idx) => {
              const Icon = getIcon(idx);
              const isActiveCategory = pathname.includes(category.id);

              return (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center gap-2 px-2 text-primary/80">
                    <Icon className="w-4 h-4" />
                    <h3 className="text-sm font-bold tracking-tight">
                      {category.title.split(" (")[0]}
                    </h3>
                  </div>

                  <div className="relative pl-3 ml-2 border-l border-border/40 space-y-0.5">
                    {category.concepts.map((concept) => {
                      const href = `/insights/ctp/${category.id}/${concept.id}`;
                      const isActive = pathname.split('/').slice(0, 5).join('/') === href;

                      return (
                        <Link
                          key={concept.id}
                          href={href}
                          className={cn(
                            "group flex items-center justify-between py-1.5 px-3 rounded-md text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <span className="truncate">{concept.title.split(" (")[0]}</span>
                          {isActive && (
                            <div
                              className="w-1.5 h-1.5 rounded-full bg-primary"
                            />
                          )}
                        </Link>
                      );
                    })
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
