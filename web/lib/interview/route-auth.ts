import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import {
  isLocalInterviewBaseUrl,
  LOCAL_INTERVIEW_FALLBACK_USER_ID,
} from "@/lib/interview/dev-auth";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";
const SESSION_LOOKUP_TIMEOUT_MS = 1500;

export async function getInterviewRouteUserId(): Promise<string | null> {
  const allowLocalFallback = isLocalInterviewBaseUrl(AI_BASE_URL);

  try {
    const supabase = createRouteHandlerClient({ cookies });
    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), SESSION_LOOKUP_TIMEOUT_MS);
      }),
    ]);

    const userId = sessionResult?.data?.session?.user?.id ?? null;
    if (userId) return userId;
  } catch {
    // fall through to local fallback if enabled
  }

  return allowLocalFallback ? LOCAL_INTERVIEW_FALLBACK_USER_ID : null;
}

export function unauthorizedInterviewResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "로그인이 필요합니다.",
    },
    { status: 401 },
  );
}
