"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

export function AppSWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 15_000,
        focusThrottleInterval: 60_000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
