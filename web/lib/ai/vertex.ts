import "server-only";

import { createVertex } from "@ai-sdk/google-vertex";
import type { GoogleAuthOptions } from "google-auth-library";

/**
 * Vercel AI SDK 의 Vertex AI provider.
 *
 * ai-interview(FastAPI) 와 동일한 서비스 계정 규칙을 따른다:
 *   1) GEMINI_SERVICE_ACCOUNT_JSON_BASE64 / GOOGLE_SERVICE_ACCOUNT_JSON_B64 (base64)
 *   2) GOOGLE_APPLICATION_CREDENTIALS (JSON 파일 경로 — 로컬에선 ai-interview 가 쓰는 파일 재사용)
 *   3) ADC (환경에 이미 잡혀 있으면)
 *
 * GCP 크레딧으로 과금되며 AI Studio prepayment 와 무관하다.
 *
 * GOOGLE_GENAI_USE_VERTEXAI=false 면 isVertexEnabled()=false → 호출 측이 AI Studio key 로 폴백.
 */

function readVertexProject(): string {
  return (
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_VERTEX_PROJECT?.trim() ||
    ""
  );
}

function readVertexLocation(): string {
  return (
    process.env.GOOGLE_CLOUD_LOCATION?.trim() ||
    process.env.GOOGLE_VERTEX_LOCATION?.trim() ||
    "us-central1"
  );
}

function readGoogleAuthOptions(): GoogleAuthOptions | undefined {
  const base64 =
    process.env.GEMINI_SERVICE_ACCOUNT_JSON_BASE64?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64?.trim() ||
    "";
  if (base64) {
    try {
      const credentials = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
      return { credentials };
    } catch {
      // base64 파싱 실패 시 아래 파일 경로로 폴백
    }
  }

  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (keyFile) {
    return { keyFile };
  }

  // 자격증명 정보가 없으면 undefined → ADC 로 시도 (환경에 잡혀 있으면 동작)
  return undefined;
}

/** Vertex 를 켤지 여부. false 면 각 호출부가 AI Studio API key 로 폴백한다. */
export function isVertexEnabled(): boolean {
  if ((process.env.GOOGLE_GENAI_USE_VERTEXAI || "").trim().toLowerCase() === "false") {
    return false;
  }
  // project + (자격증명 또는 ADC) 가 있어야 Vertex 사용 가능.
  if (!readVertexProject()) return false;
  const hasCredential = Boolean(
    process.env.GEMINI_SERVICE_ACCOUNT_JSON_BASE64?.trim() ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
      process.env.GOOGLE_GENAI_USE_VERTEXAI?.trim(), // 명시적으로 켰으면 ADC 시도 허용
  );
  return hasCredential;
}

let cachedVertex: ReturnType<typeof createVertex> | null = null;

/** 공유 Vertex provider. 자격증명 규칙은 위 주석 참조. */
export function getVertex() {
  if (cachedVertex) return cachedVertex;
  cachedVertex = createVertex({
    project: readVertexProject() || undefined,
    location: readVertexLocation(),
    googleAuthOptions: readGoogleAuthOptions(),
  });
  return cachedVertex;
}
