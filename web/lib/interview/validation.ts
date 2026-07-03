import { RECORDING_BUCKET } from "@/lib/interview/recording/recording-metadata";

// 로컬 개발 저장분 표식(storage-mode.ts LOCAL_BUCKET 과 동일 값).
// 순수함수 유틸이라 server-only 모듈을 끌어오지 않으려고 리터럴을 재선언한다.
const LOCAL_BUCKET = "local";

/**
 * 녹화 메타 POST 에서 허용하는 bucket 화이트리스트.
 * 서명 URL 생성 대상이 되므로, 정규 버킷과 로컬 저장 표식만 허용해
 * 임의 버킷에 대한 서명 URL 발급을 차단한다.
 */
export function isAllowedRecordingBucket(bucket: unknown): bucket is string {
  return bucket === RECORDING_BUCKET || bucket === LOCAL_BUCKET;
}

/**
 * 세션 ID 형식 검증.
 * DB 에는 UUID 외에도 `obs-e2e-*` 같은 비UUID 시드 세션이 실존하므로 UUID 강제는 금물.
 * 대신 안전한 문자(영숫자·`-`·`_`)만 허용해 DB 로 넘어가기 전 명백한 malformed 를 걸러낸다.
 * (실제 소유권/존재 여부는 DB 조회로 판정)
 */
export function isValidSessionId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 128 && /^[\w-]+$/.test(id);
}

export interface ParseJobResult {
  title?: string;
  company?: string;
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  preferred?: string[];
  techStack?: string[];
  culture?: string[];
  url?: string;
  [key: string]: unknown;
}

export interface ParseJobResponse {
  success?: boolean;
  error?: string;
  data?: ParseJobResult | null;
}

export interface ParseJobInterpretation {
  /** 폼에 채울 파싱 데이터(실패 시에도 fallback 이 있으면 담긴다). null 이면 채울 것이 없음. */
  data: ParseJobResult | null;
  /** true 면 분석이 실패했음 — 사용자에게 배너로 표면화해야 한다. */
  failed: boolean;
  /** 실패 시 사용자에게 보여줄 안내 문구. 성공 시 null. */
  message: string | null;
}

// FastAPI 가 AI 분석 실패 시 success:true 로 내려보내는 fallback 마커(하위호환).
const FALLBACK_TITLE_MARKER = "채용 공고 (AI 분석 불가)";
const FALLBACK_RESPONSIBILITY_MARKER = "AI 분석 실패";
const FAILURE_MESSAGE =
  "공고 분석에 실패했어요 — 아래에서 직접 입력하거나 다시 시도해 주세요.";

/**
 * parse-job 응답 해석(프론트 컴포넌트에서 추출한 순수 로직).
 *
 * 두 계약을 모두 표면화한다:
 *  1) 미래 계약: { success: false, error, data: fallback } → failed=true, data=fallback
 *  2) 현재 계약(하위호환): { success: true, data } 이지만 data 가 fallback 마커를 담은 경우 → failed=true
 *  3) 정상: { success: true, data } → failed=false
 */
export function interpretParseJobResponse(response: ParseJobResponse | null | undefined): ParseJobInterpretation {
  const data = response?.data ?? null;

  if (response?.success === false) {
    return { data, failed: true, message: FAILURE_MESSAGE };
  }

  if (data && isFallbackJobData(data)) {
    return { data, failed: true, message: FAILURE_MESSAGE };
  }

  return { data, failed: false, message: null };
}

function isFallbackJobData(data: ParseJobResult): boolean {
  if (typeof data.title === "string" && data.title.includes(FALLBACK_TITLE_MARKER)) {
    return true;
  }
  const firstResponsibility = Array.isArray(data.responsibilities) ? data.responsibilities[0] : undefined;
  return typeof firstResponsibility === "string" && firstResponsibility.includes(FALLBACK_RESPONSIBILITY_MARKER);
}
