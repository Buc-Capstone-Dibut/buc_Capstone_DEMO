import type { ReactNode } from "react";
import { Footer } from "@/components/layout/footer";

export default function InsightsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
