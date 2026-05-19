"use client";

import { useRouter } from "next/navigation";
import { ShowcaseEditorOverlay } from "@/components/features/career/portfolio-showcase/editor/showcase-editor-overlay";

type Props = React.ComponentProps<typeof ShowcaseEditorOverlay>;

export function ShowcaseWizardClient(props: Omit<Props, "onExit">) {
  const router = useRouter();
  return (
    <ShowcaseEditorOverlay
      {...props}
      onExit={() => router.push("/career/portfolios")}
    />
  );
}
