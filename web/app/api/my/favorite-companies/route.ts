import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import prisma from "@/lib/prisma";
import {
  normalizeFavoriteCompanies,
  readFavoriteCompanies,
} from "@/lib/favorite-companies";
import { ensureProfileForUser, extractAuthProfileSeed } from "@/lib/my-profile";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function getSession() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.user_workspace_settings.findUnique({
      where: { user_id: session.user.id },
      select: { settings_payload: true },
    });

    return NextResponse.json({
      success: true,
      data: { companies: readFavoriteCompanies(settings?.settings_payload) },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "관심 기업을 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const requestedCompanies = normalizeFavoriteCompanies((await req.json())?.companies);
    const availableRows = requestedCompanies.length > 0
      ? await prisma.blogs.findMany({
          where: { author: { in: requestedCompanies }, blog_type: "company" },
          distinct: ["author"],
          select: { author: true },
        })
      : [];
    const canonicalByKey = new Map(
      availableRows.map((row) => [row.author.toLocaleLowerCase("ko-KR"), row.author]),
    );
    const companies = requestedCompanies
      .map((company) => canonicalByKey.get(company.toLocaleLowerCase("ko-KR")))
      .filter((company): company is string => Boolean(company));

    const seed = extractAuthProfileSeed(session.user);
    await ensureProfileForUser({
      userId: session.user.id,
      nickname: seed.nickname,
      email: seed.email,
      avatarUrl: seed.avatarUrl,
    });

    const current = await prisma.user_workspace_settings.findUnique({
      where: { user_id: session.user.id },
      select: { settings_payload: true },
    });
    const settingsPayload = {
      ...asRecord(current?.settings_payload),
      favoriteCompanies: companies,
    };

    await prisma.user_workspace_settings.upsert({
      where: { user_id: session.user.id },
      update: { settings_payload: settingsPayload },
      create: {
        user_id: session.user.id,
        settings_payload: settingsPayload,
        public_summary: {},
      },
    });

    return NextResponse.json({ success: true, data: { companies } });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "관심 기업을 저장하지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
