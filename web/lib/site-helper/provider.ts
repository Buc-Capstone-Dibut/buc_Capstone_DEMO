import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const DEFAULT_GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL_ID =
  process.env.SITE_HELPER_GEMINI_MODEL?.trim() ||
  process.env.GEMINI_MODEL?.trim() ||
  "gemini-2.5-flash";
const DEFAULT_API_KEY =
  process.env.SITE_HELPER_GEMINI_API_KEY?.trim() ||
  process.env.GEMINI_PRIMARY_API_KEY?.trim() ||
  process.env.GEMINI_API_KEY?.trim() ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
  "";
const DEFAULT_BASE_URL =
  process.env.SITE_HELPER_GEMINI_BASE_URL?.trim() ||
  process.env.GEMINI_BASE_URL?.trim() ||
  DEFAULT_GOOGLE_BASE_URL;

function createPlainTextStream(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let index = 0; index < text.length; index += 24) {
        controller.enqueue(encoder.encode(text.slice(index, index + 24)));
      }
      controller.close();
    },
  });
}

export async function createSiteHelperStreamResponse({
  system,
  messages,
  fallbackText,
}: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  fallbackText: string;
}) {
  if (!DEFAULT_API_KEY) {
    return new Response(createPlainTextStream(fallbackText), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Dibut-AI-Provider": "static-fallback",
      },
    });
  }

  const google = createGoogleGenerativeAI({
    apiKey: DEFAULT_API_KEY,
    baseURL: DEFAULT_BASE_URL,
  });

  const result = await streamText({
    model: google(DEFAULT_MODEL_ID),
    system,
    messages: messages as never,
    temperature: 0.25,
    maxRetries: 1,
  });

  return result.toTextStreamResponse({
    headers: {
      "Cache-Control": "no-store",
      "X-Dibut-AI-Provider": "gemini",
    },
  });
}
