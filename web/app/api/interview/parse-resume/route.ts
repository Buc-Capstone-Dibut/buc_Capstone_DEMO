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
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Resume parse failed",
      },
      { status: 500 },
    );
  }
}
