import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import {
  showcasePortfolioDelegate,
} from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const current = await showcasePortfolioDelegate().findFirst({
    where: { id: params.id, user_id: session.user.id },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const isPublic = Boolean(body.isPublic);

  const row = await showcasePortfolioDelegate().update({
    where: { id: current.id },
    data: {
      is_public: isPublic,
      published_at: isPublic ? (current.published_at || new Date()) : null,
      updated_at: new Date(),
    },
  });

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id },
    select: { handle: true },
  });

  return NextResponse.json({
    item: row,
    publicUrl: isPublic && profile?.handle
      ? `/p/${encodeURIComponent(profile.handle.toLowerCase())}/${encodeURIComponent(row.slug)}`
      : null,
  });
}
