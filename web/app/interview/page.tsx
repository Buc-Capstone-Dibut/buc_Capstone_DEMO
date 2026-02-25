"use client";

import { useRouter } from "next/navigation";
import { InterviewDashboard } from "@/components/features/interview/interview-dashboard";
import { GlobalHeader } from "@/components/layout/global-header";

export default function InterviewPage() {
  const router = useRouter();

  const handleStartNew = () => {
    router.push('/interview/setup');
  };

  const handleOpenTraining = () => {
    router.push('/interview/training');
  };

  const handleImportFromMyPage = () => {
    router.push("/interview/setup?import=active_resume");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
       <GlobalHeader />
       <main className="flex-1">
          <InterviewDashboard
            onStartNew={handleStartNew}
            onOpenTraining={handleOpenTraining}
            onImportFromMyPage={handleImportFromMyPage}
          />
       </main>
    </div>
  );
}
