"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  CheckCircle2,
  FileText,
  FolderKanban,
  Layers,
  Loader2,
  PenLine,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StepState = "pending" | "active" | "done" | "error";

interface Step {
  label: string;
  icon: React.ReactNode;
  state: StepState;
}

interface InterviewLaunchOverlayProps {
  postingId: string;
  companyName?: string;
  roleTitle?: string;
  open: boolean;
  onClose: () => void;
}

export function InterviewLaunchOverlay({
  postingId,
  companyName,
  roleTitle,
  open,
  onClose,
}: InterviewLaunchOverlayProps) {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const [steps, setSteps] = useState<Step[]>([
    { label: "공고 정보 불러오기", icon: <Briefcase className="h-5 w-5" />, state: "pending" },
    { label: "첨부 자료 매칭 중", icon: <FileText className="h-5 w-5" />, state: "pending" },
    { label: "면접 시나리오 준비", icon: <Sparkles className="h-5 w-5" />, state: "pending" },
    { label: "면접실로 이동", icon: <CheckCircle2 className="h-5 w-5" />, state: "pending" },
  ]);

  const [attachIcons, setAttachIcons] = useState({
    resume: false,
    coverLetter: false,
    portfolio: false,
    project: false,
  });

  const updateStep = useCallback(
    (index: number, state: StepState) =>
      setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, state } : s))),
    [],
  );

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setSteps((prev) => prev.map((s) => ({ ...s, state: "pending" as StepState })));
    setAttachIcons({ resume: false, coverLetter: false, portfolio: false, project: false });

    // Step 1: 공고 정보
    updateStep(0, "active");
    await delay(400);
    if (ctrl.signal.aborted) return;

    let prefillData: any = null;
    try {
      const res = await fetch(
        `/api/my/job-postings/${postingId}/interview-prefill`,
        { cache: "no-store", signal: ctrl.signal },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      prefillData = json.data;
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      updateStep(0, "error");
      return;
    }
    updateStep(0, "done");
    if (ctrl.signal.aborted) return;

    // Step 2: 첨부 자료 매칭 — 아이콘 순차 점등
    updateStep(1, "active");
    if (prefillData?.resumeData) {
      await delay(250);
      setAttachIcons((p) => ({ ...p, resume: true }));
    }
    if (prefillData?.suggestedCoverLetter) {
      await delay(250);
      setAttachIcons((p) => ({ ...p, coverLetter: true }));
    }
    if (prefillData?.attachedPortfolios?.length) {
      await delay(250);
      setAttachIcons((p) => ({ ...p, portfolio: true }));
    }
    if (prefillData?.attachedProjects?.length) {
      await delay(250);
      setAttachIcons((p) => ({ ...p, project: true }));
    }
    await delay(300);
    if (ctrl.signal.aborted) return;
    updateStep(1, "done");

    // Step 3: 시나리오 준비
    updateStep(2, "active");
    await delay(600);
    if (ctrl.signal.aborted) return;
    updateStep(2, "done");

    // Step 4: 이동
    updateStep(3, "active");
    await delay(500);
    if (ctrl.signal.aborted) return;
    updateStep(3, "done");

    await delay(300);
    if (ctrl.signal.aborted) return;
    router.push(
      `/interview/posting/setup?import=job_posting&postingId=${postingId}`,
    );
  }, [postingId, router, updateStep]);

  useEffect(() => {
    if (open) void run();
    return () => abortRef.current?.abort();
  }, [open, run]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="mx-4 w-full max-w-sm rounded-xl border border-border/50 bg-background p-8 shadow-2xl"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* 제목 */}
            <div className="mb-6 text-center">
              <h2 className="text-lg font-bold tracking-tight">모의면접 준비 중</h2>
              {(companyName || roleTitle) && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {companyName && <span>{companyName}</span>}
                  {companyName && roleTitle && <span> · </span>}
                  {roleTitle && <span>{roleTitle}</span>}
                </p>
              )}
            </div>

            {/* 4-step 진행 */}
            <ol className="space-y-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                      step.state === "done" && "bg-emerald-100 text-emerald-600",
                      step.state === "active" && "bg-primary/10 text-primary",
                      step.state === "pending" && "bg-muted text-muted-foreground/40",
                      step.state === "error" && "bg-red-100 text-red-600",
                    )}
                  >
                    {step.state === "active" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : step.state === "done" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      step.icon
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm transition-colors duration-300",
                      step.state === "done" && "font-medium text-foreground",
                      step.state === "active" && "font-semibold text-foreground",
                      step.state === "pending" && "text-muted-foreground/50",
                      step.state === "error" && "font-medium text-red-600",
                    )}
                  >
                    {step.label}
                    {step.state === "done" && (
                      <span className="ml-1.5 text-emerald-600">✓</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>

            {/* 첨부 자료 아이콘 점등 */}
            <div className="mt-5 flex items-center justify-center gap-4 rounded-lg bg-muted/30 px-4 py-3">
              <AttachDot lit={attachIcons.resume} icon={<FileText className="h-4 w-4" />} label="이력서" />
              <AttachDot lit={attachIcons.coverLetter} icon={<PenLine className="h-4 w-4" />} label="자소서" />
              <AttachDot lit={attachIcons.portfolio} icon={<Layers className="h-4 w-4" />} label="포트폴리오" />
              <AttachDot lit={attachIcons.project} icon={<FolderKanban className="h-4 w-4" />} label="프로젝트" />
            </div>

            {/* 취소 */}
            <button
              type="button"
              onClick={() => {
                abortRef.current?.abort();
                onClose();
              }}
              className="mt-5 w-full rounded-md border py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              취소
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AttachDot({
  lit,
  icon,
  label,
}: {
  lit: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1" title={label}>
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500",
          lit
            ? "bg-primary/15 text-primary scale-110"
            : "bg-muted text-muted-foreground/30 scale-100",
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "text-[10px] transition-colors duration-500",
          lit ? "font-medium text-foreground/80" : "text-muted-foreground/40",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
