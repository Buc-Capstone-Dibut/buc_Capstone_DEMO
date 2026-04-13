"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CoverLetterWizardOverlay } from "@/components/features/career/cover-letter-wizard-overlay";

export default function CoverLetterWizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const experienceIds =
    searchParams.get("experienceIds")?.split(",").filter(Boolean) || [];
  const initialCoverLetterId = searchParams.get("coverLetterId") || undefined;
  const entrySource =
    searchParams.get("source") === "career" ? "career" : "cover-letters";

  return (
    <CoverLetterWizardOverlay
      experienceIds={experienceIds}
      initialCoverLetterId={initialCoverLetterId}
      entrySource={entrySource}
      persistState={true}
      onCancel={() => router.back()}
      onExit={() => router.push("/career/cover-letters")}
    />
  );
}
