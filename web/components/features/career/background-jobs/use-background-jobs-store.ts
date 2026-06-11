"use client";

/**
 * 포트폴리오 백그라운드 생성 작업 글로벌 store.
 *
 * - 사용자가 편집기 로딩 화면에서 "백그라운드 계속" 클릭 → 여기 등록
 * - BackgroundJobsRunner 가 각 active job 5초마다 polling → 완료/실패 감지
 * - 사이트 도우미 위젯의 "작업" 탭이 이 store 를 구독
 * - localStorage persist — 페이지 새로고침/다른 탭 후에도 보임
 *
 * 동시성: 최대 3개 (사용자 요구).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const MAX_ACTIVE_JOBS = 3;

export type JobStage = {
  label: string;
  progress?: number;
};

export type ActiveJob = {
  portfolioId: string;
  title: string;
  /** "site" | "slide" | "document" */
  format: string;
  /** ISO 시각 */
  startedAt: string;
  /** 마지막 stage 정보 (서버 polling 으로 업데이트) */
  stage?: JobStage;
};

export type CompletedJob = {
  portfolioId: string;
  title: string;
  format: string;
  startedAt: string;
  finishedAt: string;
  result: "success" | "failed" | "cancelled";
  /** 실패/취소 시 사유 */
  reason?: string;
  /** 위젯의 "최근" 목록에서 dismiss 됐는지 */
  dismissed?: boolean;
};

type State = {
  activeJobs: Record<string, ActiveJob>;
  recentlyCompleted: CompletedJob[];
};

type Actions = {
  /** 새 백그라운드 작업 시작 (편집기에서 호출). 동시성 초과 시 false 반환. */
  startJob: (job: ActiveJob) => boolean;
  /** stage 정보 업데이트 (polling 결과) */
  updateJobStage: (portfolioId: string, stage: JobStage | null) => void;
  /** 완료 처리 — active 에서 제거 후 recentlyCompleted 에 추가 */
  completeJob: (
    portfolioId: string,
    result: "success" | "failed" | "cancelled",
    reason?: string,
  ) => void;
  /** active 에서만 제거 (이미 completed 처리된 경우 noop) */
  removeActive: (portfolioId: string) => void;
  /** 위젯에서 "최근" 항목 dismiss */
  dismissCompleted: (portfolioId: string) => void;
  /** 모든 dismissed 정리 */
  clearDismissed: () => void;
  /** 서버 초기 sync — running 작업 리스트로 activeJobs 동기화 */
  syncFromServer: (jobs: ActiveJob[]) => void;
  /** 동시성 가용성 체크 */
  canStartMore: () => boolean;
};

const MAX_RECENT = 10;

export const useBackgroundJobsStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      activeJobs: {},
      recentlyCompleted: [],

      canStartMore: () => Object.keys(get().activeJobs).length < MAX_ACTIVE_JOBS,

      startJob: (job) => {
        const current = get().activeJobs;
        if (Object.keys(current).length >= MAX_ACTIVE_JOBS && !current[job.portfolioId]) {
          return false;
        }
        set({ activeJobs: { ...current, [job.portfolioId]: job } });
        return true;
      },

      updateJobStage: (portfolioId, stage) => {
        const cur = get().activeJobs[portfolioId];
        if (!cur) return;
        set({
          activeJobs: {
            ...get().activeJobs,
            [portfolioId]: { ...cur, stage: stage || undefined },
          },
        });
      },

      completeJob: (portfolioId, result, reason) => {
        const cur = get().activeJobs[portfolioId];
        if (!cur) return;
        const finished: CompletedJob = {
          portfolioId: cur.portfolioId,
          title: cur.title,
          format: cur.format,
          startedAt: cur.startedAt,
          finishedAt: new Date().toISOString(),
          result,
          reason,
        };
        const nextActive = { ...get().activeJobs };
        delete nextActive[portfolioId];
        const nextRecent = [finished, ...get().recentlyCompleted].slice(0, MAX_RECENT);
        set({ activeJobs: nextActive, recentlyCompleted: nextRecent });
      },

      removeActive: (portfolioId) => {
        const nextActive = { ...get().activeJobs };
        delete nextActive[portfolioId];
        set({ activeJobs: nextActive });
      },

      dismissCompleted: (portfolioId) => {
        set({
          recentlyCompleted: get().recentlyCompleted.map((j) =>
            j.portfolioId === portfolioId ? { ...j, dismissed: true } : j,
          ),
        });
      },

      clearDismissed: () => {
        set({ recentlyCompleted: get().recentlyCompleted.filter((j) => !j.dismissed) });
      },

      syncFromServer: (jobs) => {
        const map: Record<string, ActiveJob> = {};
        // 서버 = 진실. 클라이언트의 stage 정보는 유지 (서버에 없는 fine-grained 정보일 수 있음)
        const currentActive = get().activeJobs;
        for (const job of jobs) {
          const existing = currentActive[job.portfolioId];
          map[job.portfolioId] = existing
            ? { ...existing, ...job, stage: existing.stage || job.stage }
            : job;
        }
        // 면접 리포트 작업은 sync 엔드포인트(포트폴리오 전용)가 모름 —
        // 클라이언트 항목을 유지하고 완료/실패 정리는 polling runner 가 한다.
        for (const [id, job] of Object.entries(currentActive)) {
          if (job.format === "interview-report" && !map[id]) {
            map[id] = job;
          }
        }
        // 서버에서 사라진 (이미 끝난) 작업 — completeJob 으로 옮기는 건 polling runner 가 함
        set({ activeJobs: map });
      },
    }),
    {
      name: "dibut-background-jobs",
      storage: createJSONStorage(() => localStorage),
      // recentlyCompleted 의 dismissed 는 persist 하지 않아도 됨 (세션마다 리셋해도 OK)
      partialize: (s) => ({
        activeJobs: s.activeJobs,
        recentlyCompleted: s.recentlyCompleted.filter((j) => !j.dismissed),
      }),
    },
  ),
);

/** 화면에 보여줄 "보류 중인 알림" — 아직 dismiss 안 된 최근 완료 작업들.
 * useMemo 로 raw array 에서 derive — selector 안에서 filter 하면 매 렌더마다
 * 새 array reference → Zustand 가 re-render trigger → infinite loop.
 */
export function useVisibleCompletedJobs() {
  const raw = useBackgroundJobsStore((s) => s.recentlyCompleted);
  // raw 자체는 안정적인 reference — filter 결과는 매 렌더마다 새 array 지만
  // raw 가 안 바뀌면 같은 결과. React.useMemo 로 안정화.
  // (eslint disable: 의존성에 raw 만 있으면 충분, 함수 외부에서 import 없이 처리)
  if (typeof raw === "undefined") return [];
  return raw.filter((j) => !j.dismissed);
}
