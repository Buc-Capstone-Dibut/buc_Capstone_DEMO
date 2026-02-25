"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type VisualItem } from "@/components/features/ctp/common/types";

interface GridVisualizerProps {
  data: VisualItem[][]; // Matrix of items
  emptyMessage?: string;
  className?: string;
}

export function GridVisualizer({ data, emptyMessage, className }: GridVisualizerProps) {
  // Guard against undefined, empty, or 1D data (stale store state)
  if (!data || data.length === 0 || !Array.isArray(data[0])) {
    return (
      <div className={cn("flex items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/20 text-muted-foreground", className)}>
        {emptyMessage || "No data to visualize"}
      </div>
    );
  }

  const rows = data.length;
  const cols = data[0].length;

  return (
    <div className={cn("p-8 overflow-auto flex justify-center", className)}>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(3rem, 1fr))`,
        }}
      >
        {data.map((row, rIdx) => (
           row.map((item, cIdx) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                backgroundColor: item.isHighlighted ? "rgb(239 68 68 / 0.2)" : "transparent",
                borderColor: item.isHighlighted ? "rgb(239 68 68)" : "hsl(var(--border))"
              }}
              className={cn(
                "w-12 h-12 flex items-center justify-center border rounded-lg font-mono text-sm relative",
                "bg-card shadow-sm transition-colors duration-300"
              )}
            >
              <span className={cn(
                "font-bold",
                item.isHighlighted ? "text-red-600 dark:text-red-400" : "text-foreground"
              )}>
                {item.value}
              </span>

              {/* Grid Indices */}
              <span className="absolute -top-2 -left-2 text-[8px] text-muted-foreground bg-background px-0.5 opacity-50">
                {rIdx},{cIdx}
              </span>
            </motion.div>
           ))
        ))}
      </div>
    </div>
  );
}
