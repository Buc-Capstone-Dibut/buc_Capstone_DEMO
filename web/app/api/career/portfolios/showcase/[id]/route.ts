import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import {
  showcasePortfolioDelegate,
} from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import {
  getShowcaseTemplate,
  isShowcaseTemplateId,
} from "@/components/features/career/portfolio-showcase/templates/registry";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await showcasePortfolioDelegate().findFirst({ where: { id: params.id, user_id: user.id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: row });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const current = await showcasePortfolioDelegate().findFirst({ where: { id: params.id, user_id: user.id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const templateKey = isShowcaseTemplateId(body.templateId) ? body.templateId : current.template_id;
  const template = getShowcaseTemplate(templateKey);

  // Validate content/tokens if provided.
  let nextContent = current.content_payload;
  let nextTokens = current.tokens_payload;
  if (body.content !== undefined) {
    const parsed = template.contentSchema.safeParse(body.content);
    if (!parsed.success) return NextResponse.json({ error: "Invalid content", details: parsed.error.format() }, { status: 400 });
    nextContent = parsed.data;
  }
  if (body.tokens !== undefined) {
    const parsed = template.tokensSchema.safeParse(body.tokens);
    if (!parsed.success) return NextResponse.json({ error: "Invalid tokens", details: parsed.error.format() }, { status: 400 });
    nextTokens = parsed.data;
  }
  const nextTitle = typeof body.title === "string" && body.title.trim() ? body.title.trim() : current.title;

  const row = await showcasePortfolioDelegate().update({
    where: { id: current.id },
    data: {
      title: nextTitle,
      template_id: templateKey,
      content_payload: nextContent,
      tokens_payload: nextTokens,
      updated_at: new Date(),
    },
  });
  return NextResponse.json({ item: row });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const current = await showcasePortfolioDelegate().findFirst({ where: { id: params.id, user_id: user.id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await showcasePortfolioDelegate().delete({ where: { id: current.id } });
  return NextResponse.json({ success: true });
}
