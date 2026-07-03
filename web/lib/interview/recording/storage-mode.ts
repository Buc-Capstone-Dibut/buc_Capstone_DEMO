import "server-only";
import path from "node:path";

export type RecordingStorageMode = "local" | "supabase";

/**
 * 녹화 저장 위치 결정:
 * - RECORDING_STORAGE=local|supabase 명시가 최우선.
 * - 미설정 시 로컬 개발(next dev)=local(폴더 저장), 배포=supabase(Storage).
 *   (Vercel 등 배포 런타임은 파일시스템이 read-only라 local 금지.)
 */
export function getRecordingStorageMode(): RecordingStorageMode {
  const env = (process.env.RECORDING_STORAGE || "").trim().toLowerCase();
  if (env === "local" || env === "supabase") return env;
  return process.env.NODE_ENV === "development" ? "local" : "supabase";
}

/** 로컬 모드 저장 루트 — next dev의 정적 서빙(public) 아래라 업로드 즉시 /local-recordings/** 로 재생(Range 지원). */
export const LOCAL_RECORDING_DIR = path.join(process.cwd(), "public", "local-recordings");

/** DB bucket 컬럼에 저장하는 로컬 모드 표식 */
export const LOCAL_BUCKET = "local";
