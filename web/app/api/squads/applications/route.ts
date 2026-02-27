import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";

// Helper to serialize BigInt or strict Date handling if needed (Prisma dates are fine for JSON mostly)
// But we need to map 'profiles' to 'user' to match frontend expectation.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const squad_id = searchParams.get("squad_id");

  if (!squad_id) {
    return NextResponse.json({ error: "Missing squad_id" }, { status: 400 });
  }

  try {
    const rawApps = await prisma.squad_applications.findMany({
      where: {
        squad_id: squad_id,
        status: "pending",
      },
      include: {
        profiles: {
          select: {
            id: true,
            nickname: true,
            avatar_url: true,
            tier: true,
            handle: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const applications = rawApps.map((app) => ({
      ...app,
      user: app.profiles, // Map profiles -> user for frontend compatibility
      profiles: undefined,
    }));

    // JSON.parse(JSON.stringify) to handle any complex objects if needed (like Dates to strings)
    // Next.js NextResponse.json handles Dates automatically as ISO strings.
    return NextResponse.json({ applications });
  } catch (error: unknown) {
    console.error("API: App Fetch Exception", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
