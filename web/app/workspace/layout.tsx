import type { ReactNode } from "react";
import { PresenceProvider } from "@/components/providers/presence-provider";
import { VoiceManager } from "@/components/features/workspace/voice/voice-manager";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <PresenceProvider>
      <VoiceManager>{children}</VoiceManager>
    </PresenceProvider>
  );
}
