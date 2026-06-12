"use client";

/**
 * 글로벌 백그라운드 작업 polling runner.
 *
 * - 마운트 시: 서버에서 진행 중 작업 리스트 1회 fetch → store sync (다른 디바이스/탭/새로고침 케이스)
 * - 그 후: 각 active job 마다 5초마다 portfolio status 확인 → 완료/실패 감지 → toast 알림
 *
 * 한 번만 마운트되도록 root layout 에 추가.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { useBackgroundJobsStore, type ActiveJob } from "./use-background-jobs-store";

const POLL_INTERVAL_MS = 5000;

type StatusResponse = {
  status: string;
  stage: { label: string | null; progress: number | null } | null;
  cancelReason: string | null;
};

type BackgroundJobsResponse = {
  jobs: ActiveJob[];
};

export function BackgroundJobsRunner() {
  const router = useRouter();
  const activeJobs = useBackgroundJobsStore((s) => s.activeJobs);
  const syncFromServer = useBackgroundJobsStore((s) => s.syncFromServer);
  const completeJob = useBackgroundJobsStore((s) => s.completeJob);
  const updateJobStage = useBackgroundJobsStore((s) => s.updateJobStage);

  // 마운트 1회 — 서버 진실로 sync
  const didInitialSync = useRef(false);
  useEffect(() => {
    if (didInitialSync.current) return;
    didInitialSync.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/career/portfolios/background-jobs");
        if (!response.ok) return; // 401 등 — 비로그인 사용자
        const payload = (await response.json()) as BackgroundJobsResponse;
        if (Array.isArray(payload.jobs)) syncFromServer(payload.jobs);
      } catch {
        // 무시
      }
    })();
  }, [syncFromServer]);

  // active jobs 변경마다 polling 재설정
  const pollersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const pollers = pollersRef.current;
    const activeIds = Object.keys(activeJobs);

    // 이미 polling 중인데 active 에서 사라진 작업 → 정리
    for (const [id, timerId] of pollers.entries()) {
      if (!activeIds.includes(id)) {
        window.clearInterval(timerId);
        pollers.delete(id);
      }
    }

    // 새로 추가된 active 작업 → polling 시작
    for (const id of activeIds) {
      if (pollers.has(id)) continue;
      const pollOnce = async () => {
        try {
          const jobFormat = useBackgroundJobsStore.getState().activeJobs[id]?.format;
          // 경량 /status endpoint — status + stage 만 반환 (전체 document 안 가져옴)
          // 디자인 템플릿(showcase)·면접 리포트는 각자의 엔드포인트를 쓴다.
          const statusUrl =
            jobFormat === "showcase"
              ? `/api/career/portfolios/showcase/${id}/status`
              : jobFormat === "interview-report"
                ? `/api/interview/sessions/${id}/report-status`
                : `/api/career/portfolios/${id}/status`;
          const response = await fetch(statusUrl);
          if (!response.ok) return;
          const payload = (await response.json()) as StatusResponse;
          const status = payload.status;

          if (status === "completed") {
            const job = useBackgroundJobsStore.getState().activeJobs[id];
            const isInterviewReport = job?.format === "interview-report";
            completeJob(id, "success");
            toast.success(
              isInterviewReport
                ? `"${job?.title || "AI 면접"}" 리포트 완성`
                : `"${job?.title || "포트폴리오"}" 생성 완료`,
              {
                description: isInterviewReport
                  ? "지금 바로 리포트를 확인할 수 있어요"
                  : "관리 페이지에서 확인할 수 있어요",
                icon: <CheckCircle2 className="h-4 w-4" />,
                action: {
                  label: "열기",
                  onClick: () => {
                    window.location.href = isInterviewReport
                      ? `/interview/result?id=${id}`
                      : job?.format === "showcase"
                        ? `/career/portfolios/showcase-wizard?id=${id}`
                        : `/career/portfolios/${id}/edit`;
                  },
                },
              },
            );
            // 서버 컴포넌트 데이터 (포트폴리오 리스트의 generationStatus 등) refresh
            // — "생성 중" 배지가 자동으로 사라짐
            router.refresh();
          } else if (status === "failed") {
            const job = useBackgroundJobsStore.getState().activeJobs[id];
            const isCancelled = payload.cancelReason === "user_cancelled";
            const isInterviewReport = job?.format === "interview-report";
            completeJob(id, isCancelled ? "cancelled" : "failed", payload.cancelReason || undefined);
            if (!isCancelled) {
              toast.error(
                isInterviewReport
                  ? `"${job?.title || "AI 면접"}" 리포트 생성 실패`
                  : `"${job?.title || "포트폴리오"}" 생성 실패`,
                {
                  description: isInterviewReport
                    ? "결과 페이지에서 리포트를 다시 생성할 수 있어요"
                    : "다시 시도하거나 관리 페이지에서 확인하세요",
                  icon: <XCircle className="h-4 w-4" />,
                },
              );
            }
            router.refresh();
          } else if (status === "running" && payload.stage) {
            // stage 진행률 store 에 반영
            updateJobStage(id, {
              label: payload.stage.label || "생성 중",
              progress: payload.stage.progress ?? undefined,
            });
          }
        } catch {
          // network 에러 — 다음 poll 까지 무시
        }
      };
      // 즉시 1회 + interval
      void pollOnce();
      const timerId = window.setInterval(pollOnce, POLL_INTERVAL_MS);
      pollers.set(id, timerId);
    }
  }, [activeJobs, completeJob, updateJobStage, router]);

  // unmount 시 모든 timer 정리
  useEffect(() => {
    return () => {
      for (const timerId of pollersRef.current.values()) {
        window.clearInterval(timerId);
      }
      pollersRef.current.clear();
    };
  }, []);

  return null;
}
