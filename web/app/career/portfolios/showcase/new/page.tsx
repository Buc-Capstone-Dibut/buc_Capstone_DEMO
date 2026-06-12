import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser, extractAuthProfileSeed } from "@/lib/my-profile";
import { getPortfolioSourceData } from "@/lib/server/career-portfolios";
import {
  showcasePortfolioDelegate,
  pickProjectSnapshotsByIds,
  createUniqueShowcaseSlug,
} from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import { getShowcaseTemplate } from "@/components/features/career/portfolio-showcase/templates/registry";

export const dynamic = "force-dynamic";

/**
 * 디자인 템플릿(showcase) 포트폴리오 생성 진입점.
 *
 * 웹 슬라이드와 같은 백그라운드 패턴을 위해 여기서는 AI 채움을 하지 않는다:
 * 1) 기본 콘텐츠 + _generation(pending) 마커로 행을 즉시 생성
 * 2) 곧바로 위저드로 redirect
 * 3) 위저드가 /generate 를 호출해 AI 채움 (사용자는 그동안 백그라운드로 보낼 수 있음)
 */
export default async function NewShowcasePage({
  searchParams,
}: {
  searchParams: { projectIds?: string | string[]; templateId?: string; title?: string };
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const back = `/career/portfolios/showcase/new`;
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  const seed = extractAuthProfileSeed(session.user);
  await ensureProfileForUser({
    userId: session.user.id,
    nickname: seed.nickname,
    email: seed.email,
    avatarUrl: seed.avatarUrl,
  });

  const raw = searchParams.projectIds;
  const projectIds = (Array.isArray(raw) ? raw : raw ? raw.split(",") : [])
    .map((s) => s.trim())
    .filter(Boolean);

  const templateKey = "neon-editorial";
  const template = getShowcaseTemplate(templateKey);
  const title = searchParams.title?.trim() || `Portfolio ${new Date().toISOString().slice(0, 10)}`;

  const source = await getPortfolioSourceData(session.user.id);
  const snapshots = pickProjectSnapshotsByIds(source.projects, projectIds);
  const displayName = source.personalInfo?.name?.trim() || seed.nickname || "PORTFOLIO";

  const content = template.createDefaultContent({ name: displayName, projects: snapshots });
  content.contact.email = source.personalInfo?.email ?? "";

  const slug = await createUniqueShowcaseSlug(session.user.id, title);
  const row = await showcasePortfolioDelegate().create({
    data: {
      user_id: session.user.id,
      slug,
      title,
      template_id: templateKey,
      // _generation 마커는 위저드/상태 API 가 읽는다. (콘텐츠 zod 파싱 시 자동 제거되는 메타 필드)
      content_payload: {
        ...content,
        _generation: {
          status: "pending",
          projectIds,
          startedAt: new Date().toISOString(),
        },
      },
      tokens_payload: template.createDefaultTokens(),
      is_public: false,
    },
  });

  redirect(`/career/portfolios/showcase-wizard?id=${row.id}`);
}
