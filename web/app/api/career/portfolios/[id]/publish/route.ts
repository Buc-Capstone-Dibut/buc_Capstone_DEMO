import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { mapPortfolioRow, portfolioDelegate } from "@/lib/server/career-portfolios";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const current = await portfolioDelegate().findFirst({
    where: { id: params.id, user_id: session.user.id },
  });

  if (!current) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const isPublic = Boolean(body.isPublic);
  const row = await portfolioDelegate().update({
    where: { id: current.id },
    data: {
      is_public: isPublic,
      published_at: isPublic ? current.published_at || new Date() : null,
      updated_at: new Date(),
    },
  });

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id },
    select: { handle: true },
  });

  return NextResponse.json({
    item: mapPortfolioRow(row),
    publicUrl:
      isPublic && profile?.handle
        ? `/my/${encodeURIComponent(profile.handle)}/portfolio/${encodeURIComponent(row.slug)}`
        : null,
  });
}
