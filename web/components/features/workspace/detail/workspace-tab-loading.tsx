"use client";

import { useEffect, useState } from "react";

import { DebutLoading } from "@/components/shared/dibut-loading";
import { Skeleton } from "@/components/ui/skeleton";

type WorkspaceTabLoadingProps = {
  title: string;
  description: string;
};

/**
 * Keep fast tab transitions quiet with a skeleton, then expose the branded
 * waiting state only when the bundle takes long enough to be noticeable.
 */
export function WorkspaceTabLoading({
  title,
  description,
}: WorkspaceTabLoadingProps) {
  const [showBrandLoading, setShowBrandLoading] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowBrandLoading(true), 450);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!showBrandLoading) {
    return <Skeleton className="h-full w-full rounded-lg" />;
  }

  return (
    <div className="flex h-full min-h-[20rem] flex-col items-center justify-center px-6 text-center">
      <DebutLoading className="w-24" />
      <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
