import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import {
  createPortfolioForUser,
  mapPortfolioRow,
  portfolioDelegate,
} from "@/lib/server/career-portfolios";
import {
  PORTFOLIO_TEMPLATES,
  getDefaultPortfolioPageSize,
  getDefaultPortfolioPreset,
  getPortfolioPagePreset,
  type PortfolioFormat,
  type PortfolioGenerationPreset,
  type PortfolioOrientation,
  type PortfolioPageSize,
  type PortfolioSourceSelection,
  type PortfolioTemplateId,
} from "@/lib/career-portfolios";
import { ensureProfileForUser, extractAuthProfileSeed } from "@/lib/my-profile";

export const dynamic = "force-dynamic";

function normalizeTemplateId(value: unknown): PortfolioTemplateId {
  return PORTFOLIO_TEMPLATES.some((template) => template.id === value)
    ? (value as PortfolioTemplateId)
    : "developer-minimal";
}

function normalizeFormat(value: unknown): PortfolioFormat {
  return value === "document" ? "document" : "slide";
}

function normalizePageSize(value: unknown, format: PortfolioFormat): PortfolioPageSize {
  if (value === "a4" || value === "16:9") return value;
  return getDefaultPortfolioPageSize(format);
}

function normalizeOrientation(value: unknown, pageSize: PortfolioPageSize): PortfolioOrientation {
  if (value === "portrait" || value === "landscape") return value;
  return getPortfolioPagePreset(pageSize).orientation;
}

function normalizeGenerationPreset(
  value: unknown,
  format: PortfolioFormat,
): PortfolioGenerationPreset {
  if (
    value === "interview-pitch" ||
    value === "project-report" ||
    value === "resume-portfolio"
  ) {
    return value;
  }
  return getDefaultPortfolioPreset(format);
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeSourceSelection(value: unknown): PortfolioSourceSelection | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;

  return {
    projectKeys: stringArray(raw.projectKeys),
    experienceKeys: stringArray(raw.experienceKeys),
    coverLetterKeys: stringArray(raw.coverLetterKeys),
    includePersonalInfo: raw.includePersonalInfo !== false,
    includeSkills: raw.includeSkills !== false,
    format: normalizeFormat(raw.format),
    pageSize: normalizePageSize(raw.pageSize, normalizeFormat(raw.format)),
    orientation: normalizeOrientation(
      raw.orientation,
      normalizePageSize(raw.pageSize, normalizeFormat(raw.format)),
    ),
    generationPreset: normalizeGenerationPreset(raw.generationPreset, normalizeFormat(raw.format)),
  };
}

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await portfolioDelegate().findMany({
    where: { user_id: user.id },
    orderBy: { updated_at: "desc" },
  });

  return NextResponse.json({
    items: rows.map(mapPortfolioRow),
  });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seed = extractAuthProfileSeed(user);
  await ensureProfileForUser({
    userId: user.id,
    nickname: seed.nickname,
    email: seed.email,
    avatarUrl: seed.avatarUrl,
  });

  const body = await request.json().catch(() => ({}));
  const templateId = normalizeTemplateId(body.templateId);
  const sourceSelection = normalizeSourceSelection(body.sourceSelection);
  const format = normalizeFormat(body.format || sourceSelection?.format);
  const pageSize = normalizePageSize(body.pageSize || sourceSelection?.pageSize, format);
  const orientation = normalizeOrientation(body.orientation || sourceSelection?.orientation, pageSize);
  const generationPreset = normalizeGenerationPreset(
    body.generationPreset || sourceSelection?.generationPreset,
    format,
  );
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "새 포트폴리오";
  const sourceProjectId =
    typeof body.sourceProjectId === "string" && body.sourceProjectId.trim()
      ? body.sourceProjectId.trim()
      : null;
  const sourceProjectTitle =
    typeof body.sourceProjectTitle === "string" && body.sourceProjectTitle.trim()
      ? body.sourceProjectTitle.trim()
      : null;

  const { row } = await createPortfolioForUser({
    userId: user.id,
    title,
    templateId,
    sourceSelection,
    format,
    pageSize,
    orientation,
    generationPreset,
    sourceProjectId,
    sourceProjectTitle,
  });

  return NextResponse.json({ item: mapPortfolioRow(row) }, { status: 201 });
}
