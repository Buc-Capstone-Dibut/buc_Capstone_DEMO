/**
 * 진행 중인 포트폴리오 생성 작업의 in-memory registry.
 *
 * 사용 패턴:
 *   const handle = registerJob(userId, portfolioId);
 *   try {
 *     // 각 stage 전후로 handle.shouldAbort() 검사 → true 면 throw new Error("CANCELLED")
 *   } finally {
 *     unregisterJob(handle);
 *   }
 *
 *   // 다른 곳 (cancel route) 에서:
 *   const ok = requestCancel(userId, portfolioId);
 *
 * 한계:
 *  - 메모리 기반이므로 server 가 여러 인스턴스로 떠 있으면 인스턴스 간 공유 안 됨
 *  - Next.js dev/standalone 단일 프로세스 환경에서는 문제 없음
 *  - Vercel 등 serverless 라면 같은 함수 호출 내에서만 유효 (cancel 은 다른 함수 호출 →
 *    registry miss → fallback 으로 DB status 업데이트만 함)
 *  - 졸업작품 규모/배포 환경에선 충분
 */

type JobKey = string; // `${userId}:${portfolioId}`

type JobHandle = {
  key: JobKey;
  userId: string;
  portfolioId: string;
  shouldAbort: () => boolean;
};

type JobEntry = {
  cancelRequested: boolean;
  cancelledAt?: Date;
  startedAt: Date;
};

const registry = new Map<JobKey, JobEntry>();

function makeKey(userId: string, portfolioId: string): JobKey {
  return `${userId}:${portfolioId}`;
}

export function registerJob(userId: string, portfolioId: string): JobHandle {
  const key = makeKey(userId, portfolioId);
  // 같은 키로 이미 등록되어 있으면 이전 작업은 cancel 처리 (중복 시작 방지)
  const existing = registry.get(key);
  if (existing) existing.cancelRequested = true;
  const entry: JobEntry = {
    cancelRequested: false,
    startedAt: new Date(),
  };
  registry.set(key, entry);
  return {
    key,
    userId,
    portfolioId,
    shouldAbort: () => entry.cancelRequested,
  };
}

export function unregisterJob(handle: JobHandle): void {
  const current = registry.get(handle.key);
  if (current && current.startedAt === current.startedAt) {
    registry.delete(handle.key);
  }
}

/**
 * 외부에서 작업 취소 요청. registry 에 있으면 cancelRequested 플래그를 켜고 true 반환.
 * 없으면 false — 작업이 이미 끝났거나 다른 서버 인스턴스에서 실행 중일 수 있음.
 * (이 경우 호출자는 DB status 만 업데이트하는 fallback 처리)
 */
export function requestCancel(userId: string, portfolioId: string): boolean {
  const key = makeKey(userId, portfolioId);
  const entry = registry.get(key);
  if (!entry) return false;
  entry.cancelRequested = true;
  entry.cancelledAt = new Date();
  return true;
}

/** 디버깅 / 관찰용 */
export function getRegistrySnapshot() {
  return Array.from(registry.entries()).map(([key, entry]) => ({
    key,
    cancelRequested: entry.cancelRequested,
    startedAt: entry.startedAt,
    cancelledAt: entry.cancelledAt,
  }));
}
