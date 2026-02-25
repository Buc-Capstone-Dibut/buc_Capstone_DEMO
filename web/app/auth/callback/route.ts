import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    try {
      await supabase.auth.exchangeCodeForSession(code);
      console.log("Auth Callback: Session exchanged successfully");
    } catch (e) {
      console.error("Auth Callback: Exchange failed", e);
    }
  }

  // URL to redirect to after sign in process completes
  const next = requestUrl.searchParams.get("next");
  if (next && next.startsWith("/")) {
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
