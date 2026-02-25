import { NextResponse } from "next/server";

const AI_BASE_URL = process.env.AI_INTERVIEW_BASE_URL || "http://localhost:8001";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    const response = await fetch(
      `${AI_BASE_URL}/v1/interview/sessions/${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data?.detail || "Session not found" },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch session" },
      { status: 500 },
    );
  }
}
