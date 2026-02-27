import type { ReactNode } from "react";
import { PresenceProvider } from "@/components/providers/presence-provider";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <PresenceProvider>{children}</PresenceProvider>;
}
