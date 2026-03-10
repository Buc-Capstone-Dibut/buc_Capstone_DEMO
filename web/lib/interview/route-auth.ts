import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function getInterviewRouteUserId(): Promise<string | null> {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
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
