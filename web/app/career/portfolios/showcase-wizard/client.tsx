"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, Loader2, RotateCcw } from "lucide-react";
import { ShowcaseEditorOverlay } from "@/components/features/career/portfolio-showcase/editor/showcase-editor-overlay";
import { useBackgroundJobsStore } from "@/components/features/career/background-jobs/use-background-jobs-store";
import type { ShowcaseGenerationStatus } from "@/components/features/career/portfolio-showcase/shared/generation-marker";

type OverlayProps = React.ComponentProps<typeof ShowcaseEditorOverlay>;

type Props = Omit<OverlayProps, "onExit"> & {
  generationStatus: ShowcaseGenerationStatus | null;
  generationError: string | null;
};

export function ShowcaseWizardClient({ generationStatus, generationError, ...props }: Props) {
  const router = useRouter();

  if (generationStatus === "pending" || generationStatus === "running" || generationStatus === "failed") {
    return (
      <ShowcaseGenerationGate
        portfolio={props.portfolio}
        initialFailed={generationStatus === "failed"}
        initialError={generationError}
      />
    );
  }

  return (
    <ShowcaseEditorOverlay
      {...props}
      onExit={() => router.push("/career/portfolios")}
    />
  );
}

/**
 * AI 채움 진행 화면 — 웹 슬라이드 편집기의 생성 화면과 같은 역할.
 * /generate 요청을 열어 둔 채 진행하고, "백그라운드에서 계속하기"로 떠나면
 * 서버가 작업을 마저 끝내고 BackgroundJobsRunner 가 완료를 알린다.
 */
function ShowcaseGenerationGate({
  portfolio,
  initialFailed,
  initialError,
}: {
  portfolio: Props["portfolio"];
  initialFailed: boolean;
  initialError: string | null;
}) {
  const router = useRouter();
  const startJob = useBackgroundJobsStore((s) => s.startJob);
  const canStartMore = useBackgroundJobsStore((s) => s.canStartMore);

  const [failed, setFailed] = useState(initialFailed);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const didStartRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);

  const runGenerate = async () => {
    try {
      const response = await fetch(`/api/career/portfolios/showcase/${portfolio.id}/generate`, {
        method: "POST",
      });
      if (response.status === 202) {
        // 이미 진행 중(중복 호출) — polling 으로 완료를 기다린다
        pollUntilDone();
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!response.ok || payload.status === "failed") {
        throw new Error(payload.error || "AI 채움에 실패했습니다.");
      }
      // 완료 — 서버 페이지를 다시 읽어 에디터로 진입
      router.refresh();
    } catch (error) {
      setFailed(true);
      setErrorMessage(error instanceof Error ? error.message : "AI 채움에 실패했습니다.");
    }
  };

  const pollUntilDone = () => {
    if (pollTimerRef.current != null) return;
    pollTimerRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/career/portfolios/showcase/${portfolio.id}/status`);
        if (!res.ok) return;
        const payload = (await res.json()) as { status?: string };
        if (payload.status === "completed") {
          stopPolling();
          router.refresh();
        } else if (payload.status === "failed") {
          stopPolling();
          setFailed(true);
          setErrorMessage("AI 채움에 실패했습니다.");
        }
      } catch {
        // 다음 tick 에 재시도
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollTimerRef.current != null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (didStartRef.current || initialFailed) return;
    didStartRef.current = true;
    void runGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 언마운트(백그라운드 이동 등) 시 polling 정리
  useEffect(() => {
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackground = () => {
    if (!canStartMore()) {
      toast.warning("동시 백그라운드 작업은 3개까지만 가능해요", {
        description: "진행 중인 작업이 끝나면 다시 시도해 주세요",
      });
      return;
    }
    startJob({
      portfolioId: portfolio.id,
      title: portfolio.title,
      format: "showcase",
      startedAt: new Date().toISOString(),
      stage: { label: "AI가 포트폴리오 내용을 채우는 중" },
    });
    toast.success("백그라운드에서 계속 생성합니다", {
      description: "완료되면 알림으로 알려드릴게요",
    });
    router.push("/career/portfolios");
  };

  const handleRetry = () => {
    setFailed(false);
    setErrorMessage(null);
    void runGenerate();
  };

  if (failed) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#fbfcf8] text-[#1a2b18]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-200 bg-red-50">
          <Layers className="h-6 w-6 text-red-500" />
        </div>
        <h2 className="mt-6 text-xl font-black tracking-tight">AI 채움에 실패했어요</h2>
        <p className="mt-2 max-w-sm text-center text-sm text-[#5c6b58]">
          {errorMessage || "일시적인 오류일 수 있어요. 다시 시도해 주세요."}
        </p>
        <div className="mt-8 flex items-center gap-2">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#82B84C] px-4 text-sm font-bold text-white hover:bg-[#74a843]"
          >
            <RotateCcw className="h-4 w-4" />
            다시 시도
          </button>
          <button
            type="button"
            onClick={() => router.push("/career/portfolios")}
            className="inline-flex h-10 items-center rounded-lg border border-[#dde7d2] bg-white px-4 text-sm font-bold text-[#1a2b18] hover:bg-[#f1f6ea]"
          >
            관리 페이지로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#fbfcf8] text-[#1a2b18]">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-2 border-[#dde7d2]" />
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#82B84C] animate-spin"
          style={{ animationDuration: "1s" }}
        />
      </div>

      <h2 className="mt-8 text-2xl font-black tracking-tight">
        디자인 포트폴리오를 만들고 있어요
      </h2>
      <p className="mt-3 text-sm text-[#5c6b58]">
        AI가 선택하신 프로젝트로 내용을 채우고 있습니다 · 보통 10~30초 걸려요
      </p>

      {/* 백그라운드 모드 진입 — 웹 슬라이드와 동일한 UX */}
      <button
        type="button"
        onClick={handleBackground}
        className="mt-10 inline-flex h-10 items-center gap-2 rounded-lg border border-[#dde7d2] bg-white px-4 text-sm font-bold text-[#1a2b18] transition-colors hover:bg-[#f1f6ea]"
      >
        <Loader2 className="h-4 w-4 animate-spin text-[#82B84C]" />
        백그라운드에서 계속하기
      </button>
      <p className="mt-3 text-xs text-[#8a9684]">
        다른 작업을 하셔도 돼요 — 완료되면 알림으로 알려드릴게요
      </p>
    </div>
  );
}
