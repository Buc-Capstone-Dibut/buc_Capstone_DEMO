import { NextResponse } from "next/server";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await fetch(`${AI_BASE_URL}/v1/interview/portfolio/analyze-public-repo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data?.detail || data?.error || "Repo analysis failed" },
        { status: response.status },
      );
    }

    // PUBLIC_REPO_ONLY 에러는 200 응답으로 내려오는 경우
    if (data?.error === "PUBLIC_REPO_ONLY") {
      return NextResponse.json({ success: false, error: "PUBLIC_REPO_ONLY" });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Repo analysis failed" },
      { status: 500 },
    );
  }
}
