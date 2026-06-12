"use client";

/**
 * 사이트 도우미 위젯의 "작업" 탭에 들어가는 패널.
 *
 * - 진행 중 작업 리스트 (제목, stage, 시작 시각, 취소 버튼)
 * - 최근 완료/실패/취소된 작업 (✕ dismiss, 열기)
 * - 둘 다 없으면 empty state
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useBackgroundJobsStore,
  useVisibleCompletedJobs,
  type ActiveJob,
  type CompletedJob,
} from "./use-background-jobs-store";

function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  if (!t) return "";
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function BackgroundJobsPanel({ onClose }: { onClose?: () => void }) {
  const activeJobs = useBackgroundJobsStore((s) => s.activeJobs);
  const visibleCompleted = useVisibleCompletedJobs();
  const activeList = Object.values(activeJobs);

  const isEmpty = activeList.length === 0 && visibleCompleted.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="space-y-5">
            {activeList.length > 0 ? (
              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                  진행 중 ({activeList.length})
                </h3>
                <div className="space-y-2">
                  {activeList.map((job) => (
                    <ActiveJobCard key={job.portfolioId} job={job} />
                  ))}
                </div>
              </section>
            ) : null}
            {visibleCompleted.length > 0 ? (
              <section>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                  최근 완료 ({visibleCompleted.length})
                </h3>
                <div className="space-y-2">
                  {visibleCompleted.map((job) => (
                    <CompletedJobCard
                      key={`${job.portfolioId}-${job.finishedAt}`}
                      job={job}
                      onOpen={() => onClose?.()}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
        <Sparkles className="h-5 w-5 text-neutral-400" />
      </div>
      <div>
        <p className="text-[13px] font-bold text-neutral-700">백그라운드 작업이 없어요</p>
        <p className="mt-1 text-[11.5px] leading-5 text-neutral-500">
          포트폴리오 생성을 백그라운드로 보내면
          <br /> 여기서 진행 상황을 확인할 수 있어요
        </p>
      </div>
    </div>
  );
}

function ActiveJobCard({ job }: { job: ActiveJob }) {
  const removeActive = useBackgroundJobsStore((s) => s.removeActive);
  const [cancelling, setCancelling] = useState(false);

  const router = useRouter();
  const handleCancel = async () => {
    if (!confirm(`"${job.title}" 작업을 취소할까요?`)) return;
    setCancelling(true);
    try {
      const response = await fetch(`/api/career/portfolios/${job.portfolioId}/cancel`, {
        method: "POST",
      });
      if (!response.ok && response.status !== 409) {
        throw new Error("취소 실패");
      }
      removeActive(job.portfolioId);
      // 서버 데이터 refresh — 관리 페이지의 "생성 중" 배지 즉시 사라짐
      router.refresh();
      toast.success("작업이 취소됐어요");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "취소 중 오류");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex items-start gap-2.5">
        <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-bold text-neutral-900">{job.title}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-amber-700">
            {job.stage?.label || "생성 중"}
            {typeof job.stage?.progress === "number" ? ` · ${job.stage.progress}%` : ""}
          </p>
          <p className="mt-1 text-[10.5px] text-neutral-500">
            시작 {relativeTime(job.startedAt)}
          </p>
        </div>
        {/* showcase(디자인 템플릿)·면접 리포트는 취소 API 가 없음 — 버튼 숨김 */}
        {job.format !== "showcase" && job.format !== "interview-report" ? (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="flex h-6 shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2 text-[10.5px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            {cancelling ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
            취소
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CompletedJobCard({
  job,
  onOpen,
}: {
  job: CompletedJob;
  onOpen?: () => void;
}) {
  const router = useRouter();
  const dismiss = useBackgroundJobsStore((s) => s.dismissCompleted);

  const isSuccess = job.result === "success";
  const isCancelled = job.result === "cancelled";

  const handleOpen = () => {
    router.push(
      job.format === "interview-report"
        ? `/interview/result?id=${job.portfolioId}`
        : job.format === "showcase"
          ? `/career/portfolios/showcase-wizard?id=${job.portfolioId}`
          : `/career/portfolios/${job.portfolioId}/edit`,
    );
    onOpen?.();
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        isSuccess
          ? "border-emerald-200 bg-emerald-50/50"
          : isCancelled
            ? "border-neutral-200 bg-neutral-50"
            : "border-red-200 bg-red-50/50",
      )}
    >
      <div className="flex items-start gap-2.5">
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
        ) : isCancelled ? (
          <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
        ) : (
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-bold text-neutral-900">{job.title}</p>
          <p
            className={cn(
              "mt-0.5 text-[11px] font-semibold",
              isSuccess
                ? "text-emerald-700"
                : isCancelled
                  ? "text-neutral-500"
                  : "text-red-700",
            )}
          >
            {isSuccess ? "생성 완료" : isCancelled ? "취소됨" : "실패"}
            {job.reason ? ` · ${job.reason}` : ""}
          </p>
          <p className="mt-1 text-[10.5px] text-neutral-500">
            {relativeTime(job.finishedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isSuccess ? (
            <button
              type="button"
              onClick={handleOpen}
              className="h-6 rounded-md border border-emerald-300 bg-white px-2 text-[10.5px] font-bold text-emerald-700 hover:bg-emerald-100"
            >
              열기
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => dismiss(job.portfolioId)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="알림 닫기"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
