import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

async function getUserIdFromSession(): Promise<string | null> {
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "";
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const userId = await getUserIdFromSession();

    let response: Response;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      response = await fetch(`${AI_BASE_URL}/v1/interview/parse-resume`, {
        method: "POST",
        headers: {
          ...(userId ? { "x-user-id": userId } : {}),
        },
        body: formData,
        cache: "no-store",
      });
    } else {
      const body = await req.json();
      response = await fetch(`${AI_BASE_URL}/v1/interview/parse-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "x-user-id": userId } : {}),
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (data && typeof data.detail === "string" && data.detail) ||
        (data && typeof data.error === "string" && data.error) ||
        "Resume parse failed";

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const isUpstreamConnectionError =
      error instanceof TypeError &&
      message.toLowerCase().includes("fetch failed");

    const fallbackMessage = isUpstreamConnectionError
      ? `Resume parser server is unreachable. Check AI_INTERVIEW_BASE_URL (${AI_BASE_URL}) and ensure the AI server is running.`
      : "Resume parse failed";

    return NextResponse.json(
      {
        success: false,
        error: isUpstreamConnectionError
          ? fallbackMessage
          : message || fallbackMessage,
      },
      { status: isUpstreamConnectionError ? 503 : 500 },
    );
  }
}
