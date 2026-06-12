import "server-only";

import { generateText, streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getVertex, isVertexEnabled } from "./vertex";

/**
 * Gemini 텍스트 생성 공용 어댑터.
 *
 * 구 @google/generative-ai (getGenerativeModel().generateContent()) 를 대체한다.
 * Vertex(GCP 크레딧) 우선 → AI Studio API key 폴백. 한 곳에서 provider 를 고른다.
 *
 * 호출부는 모델 id + 프롬프트 문자열만 넘기면 된다(기존 패턴과 1:1 대응).
 */

function aiStudioKey(): string {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    ""
  );
}

/** Vertex 가능하면 vertex provider, 아니면 AI Studio provider 의 모델을 반환. null 이면 둘 다 불가. */
function resolveModel(modelId: string) {
  if (isVertexEnabled()) {
    return getVertex()(modelId);
  }
  const key = aiStudioKey();
  if (!key) return null;
  return createGoogleGenerativeAI({ apiKey: key })(modelId);
}

/** 사용 가능한 Gemini 백엔드(Vertex 또는 AI Studio key)가 있는지. */
export function hasGeminiTextBackend(): boolean {
  return isVertexEnabled() || Boolean(aiStudioKey());
}

export class GeminiTextUnavailableError extends Error {
  constructor() {
    super("Gemini 텍스트 백엔드가 설정되지 않았습니다 (Vertex 또는 GEMINI_API_KEY).");
    this.name = "GeminiTextUnavailableError";
  }
}

export async function generateGeminiText({
  model,
  prompt,
  temperature,
  topP,
  maxRetries = 1,
}: {
  model: string;
  prompt: string;
  temperature?: number;
  topP?: number;
  maxRetries?: number;
}): Promise<string> {
  const resolved = resolveModel(model);
  if (!resolved) throw new GeminiTextUnavailableError();
  const { text } = await generateText({
    model: resolved,
    prompt,
    ...(temperature !== undefined ? { temperature } : {}),
    ...(topP !== undefined ? { topP } : {}),
    maxRetries,
  });
  return text;
}

/** 텍스트 청크 async iterable. 구 generateContentStream().stream(=chunk.text()) 대체. */
export async function* streamGeminiText({
  model,
  prompt,
  temperature,
}: {
  model: string;
  prompt: string;
  temperature?: number;
}): AsyncIterable<string> {
  const resolved = resolveModel(model);
  if (!resolved) throw new GeminiTextUnavailableError();
  const result = streamText({
    model: resolved,
    prompt,
    ...(temperature !== undefined ? { temperature } : {}),
    maxRetries: 1,
  });
  for await (const delta of result.textStream) {
    yield delta;
  }
}
