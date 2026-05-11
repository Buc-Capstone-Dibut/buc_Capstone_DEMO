import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PortfolioAnalysisResult, PortfolioSetupStep } from "@/lib/interview/portfolio-defense";

interface PortfolioDefenseSetupState {
  currentStep: PortfolioSetupStep;
  repoUrl: string;
  analysis: PortfolioAnalysisResult | null;
  sessionId: string | null;
  setStep: (step: PortfolioSetupStep) => void;
  setRepoUrl: (repoUrl: string) => void;
  setAnalysis: (analysis: PortfolioAnalysisResult | null) => void;
  setSessionId: (sessionId: string | null) => void;
  reset: () => void;
}

export const usePortfolioDefenseSetupStore = create<PortfolioDefenseSetupState>()(
  persist(
    (set) => ({
      currentStep: "repo",
      repoUrl: "",
      analysis: null,
      sessionId: null,
      setStep: (currentStep) => set({ currentStep }),
      setRepoUrl: (repoUrl) => set({ repoUrl }),
      setAnalysis: (analysis) => set({ analysis }),
      setSessionId: (sessionId) => set({ sessionId }),
      reset: () =>
        set({
          currentStep: "repo",
          repoUrl: "",
          analysis: null,
          sessionId: null,
        }),
    }),
    {
      name: "portfolio-defense-setup-storage",
    },
  ),
);
