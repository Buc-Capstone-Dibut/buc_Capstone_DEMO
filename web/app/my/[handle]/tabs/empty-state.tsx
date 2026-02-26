"use client";

import type { ElementType } from "react";

interface ProfileEmptyStateProps {
  icon: ElementType;
  message: string;
}

export function ProfileEmptyState({
  icon: Icon,
  message,
}: ProfileEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground select-none">
      <Icon className="w-10 h-10 opacity-20" strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
