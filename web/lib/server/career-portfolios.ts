import "server-only";

import prisma from "@/lib/prisma";
import {
  EMPTY_PORTFOLIO_SOURCE_DATA,
  buildPortfolioPublicSummary,
  createDefaultPortfolioDocument,
  createFallbackPortfolioGenerationPlan,
  filterPortfolioSourceData,
  getPortfolioTemplate,
  getDefaultPortfolioPageSize,
  getDefaultPortfolioPreset,
  getPortfolioPagePreset,
  normalizePortfolioDocument,
  polishPortfolioDocument,
  withPortfolioSampleImages,
  PORTFOLIO_CANVAS_STYLE_VERSION,
  type PortfolioAsset,
  type PortfolioDocument,
  type PortfolioFormat,
  type PortfolioGenerationPreset,
  type PortfolioListItem,
  type PortfolioOrientation,
  type PortfolioPageSize,
  type PortfolioSourceSelection,
  type PortfolioSourceData,
  type PortfolioTemplateId,
} from "@/lib/career-portfolios";
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

export type PortfolioRow = {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  template_id: string;
  is_public: boolean;
  document_payload: unknown;
  source_snapshot: unknown;
  public_summary: unknown;
  generation_plan?: unknown;
  generation_status?: string;
  generation_quality?: unknown;
  template_blueprint?: unknown;
  thumbnail_url?: string | null;
  generated_at?: Date | null;
  canvas_version?: number;
  format?: string;
  page_size?: string;
  orientation?: string;
  generation_preset?: string;
  source_project_id?: string | null;
  source_project_title?: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type PortfolioAssetRow = {
  id: string;
  portfolio_id: string;
  user_id: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
  created_at: Date;
};

type PortfolioDelegate = {
  findMany(args: unknown): Promise<PortfolioRow[]>;
  findFirst(args: unknown): Promise<PortfolioRow | null>;
  create(args: unknown): Promise<PortfolioRow>;
  update(args: unknown): Promise<PortfolioRow>;
  delete(args: unknown): Promise<PortfolioRow>;
};

type PortfolioAssetDelegate = {
  findMany(args: unknown): Promise<PortfolioAssetRow[]>;
  findFirst(args: unknown): Promise<PortfolioAssetRow | null>;
  create(args: unknown): Promise<PortfolioAssetRow>;
  delete(args: unknown): Promise<PortfolioAssetRow>;
  count(args: unknown): Promise<number>;
};

export function portfolioDelegate() {
  return (prisma as unknown as { user_portfolios: PortfolioDelegate }).user_portfolios;
}

export function portfolioAssetDelegate() {
  return (prisma as unknown as { user_portfolio_assets: PortfolioAssetDelegate })
    .user_portfolio_assets;
}

function asResumePayload(value: unknown): Partial<ResumePayload> {
  if (!value || typeof value !== "object") return {};
  return value as Partial<ResumePayload>;
}

function getSourceProjectTitles(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const source = value as Partial<PortfolioSourceData>;
  return Array.isArray(source.projects)
    ? source.projects
        .map((project) => project.company || project.position || "프로젝트")
        .filter(Boolean)
        .slice(0, 12)
    : [];
}

function getSourceProjectSummaries(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const source = value as Partial<PortfolioSourceData>;
  if (!Array.isArray(source.projects)) return [];

  return source.projects
    .map((project) => ({
      title: project.company || project.position || "프로젝트",
      tags: Array.isArray(project.tags) ? project.tags.filter(Boolean).slice(0, 5) : [],
    }))
    .filter((project) => Boolean(project.title))
    .slice(0, 12);
}

function toTemplateId(value: unknown): PortfolioTemplateId {
  if (
    value === "developer-minimal" ||
    value === "case-study" ||
    value === "visual-showcase"
  ) {
    return value;
  }
  return "developer-minimal";
}

export function toPortfolioFormat(value: unknown): PortfolioFormat {
  return value === "document" ? "document" : "slide";
}

export function toPortfolioPageSize(value: unknown, format: PortfolioFormat): PortfolioPageSize {
  if (value === "a4" || value === "16:9") return value;
  return getDefaultPortfolioPageSize(format);
}

export function toPortfolioOrientation(
  value: unknown,
  pageSize: PortfolioPageSize,
): PortfolioOrientation {
  if (value === "portrait" || value === "landscape") return value;
  return getPortfolioPagePreset(pageSize).orientation;
}

export function toPortfolioGenerationPreset(
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

export function normalizePortfolioSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || `portfolio-${Date.now().toString(36)}`;
}

export async function createUniquePortfolioSlug(userId: string, title: string) {
  const base = normalizePortfolioSlug(title || "portfolio");
  const delegate = portfolioDelegate();
  let candidate = base;
  let index = 2;

  while (await delegate.findFirst({ where: { user_id: userId, slug: candidate } })) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

export async function getPortfolioSourceData(userId: string): Promise<PortfolioSourceData> {
  const profile = await prisma.user_resume_profiles.findUnique({
    where: { user_id: userId },
  });

  let payload = asResumePayload(profile?.resume_payload);

  if (!profile?.resume_payload) {
    const activeResume =
      (await prisma.user_resumes.findFirst({
        where: { user_id: userId, is_active: true },
      })) ||
      (await prisma.user_resumes.findFirst({
        where: { user_id: userId },
        orderBy: { updated_at: "desc" },
      }));
    payload = asResumePayload(activeResume?.resume_payload);
  }

  return {
    personalInfo: {
      ...EMPTY_PORTFOLIO_SOURCE_DATA.personalInfo,
      ...(payload.personalInfo || {}),
      links: {
        ...EMPTY_PORTFOLIO_SOURCE_DATA.personalInfo.links,
        ...(payload.personalInfo?.links || {}),
      },
    },
    skills: Array.isArray(payload.skills) ? payload.skills : [],
    projects: Array.isArray(payload.timeline) ? payload.timeline : [],
    workExperiences: Array.isArray(payload.experience) ? payload.experience : [],
    coverLetters: Array.isArray(payload.coverLetters) ? payload.coverLetters : [],
  };
}

export function mapPortfolioRow(row: PortfolioRow): PortfolioListItem {
  const templateId = toTemplateId(row.template_id);
  const document = withPortfolioSampleImages(normalizePortfolioDocument(row.document_payload, templateId));
  const format = toPortfolioFormat(row.format || document.format);
  const pageSize = toPortfolioPageSize(row.page_size || document.pageSize, format);
  const orientation = toPortfolioOrientation(row.orientation || document.orientation, pageSize);
  const generationPreset = toPortfolioGenerationPreset(
    row.generation_preset || document.generationPreset,
    format,
  );
  const documentSummary = buildPortfolioPublicSummary(document);
  const savedSummary =
    row.public_summary && typeof row.public_summary === "object"
      ? (row.public_summary as PortfolioListItem["publicSummary"])
      : {};

  return {
    id: row.id,
    title: row.title || "새 포트폴리오",
    slug: row.slug || "",
    templateId,
    format,
    pageSize,
    orientation,
    generationPreset,
    sourceProjectId: row.source_project_id || null,
    sourceProjectTitle: row.source_project_title || null,
    isPublic: Boolean(row.is_public),
    updatedAt: row.updated_at?.toISOString?.() || new Date().toISOString(),
    publishedAt: row.published_at?.toISOString?.() || null,
    generationStatus: row.generation_status || "idle",
    generatedAt: row.generated_at?.toISOString?.() || null,
    publicSummary: {
      ...savedSummary,
      ...documentSummary,
      headline: documentSummary.headline || savedSummary.headline,
      thumbnailUrl: row.thumbnail_url || documentSummary.thumbnailUrl || savedSummary.thumbnailUrl,
      sourceProjects: getSourceProjectSummaries(row.source_snapshot),
      sourceProjectTitles: getSourceProjectTitles(row.source_snapshot),
    },
  };
}

export function mapPortfolioAsset(row: PortfolioAssetRow, portfolioId: string): PortfolioAsset {
  return {
    id: row.id,
    filename: row.filename || "image",
    mimeType: row.mime_type || "image/jpeg",
    sizeBytes: Number(row.size_bytes || 0),
    url: `/api/career/portfolios/${portfolioId}/assets/${row.id}`,
    createdAt: row.created_at?.toISOString?.(),
  };
}

export async function createPortfolioForUser(input: {
  userId: string;
  title: string;
  templateId: PortfolioTemplateId;
  sourceSelection?: PortfolioSourceSelection;
  format?: PortfolioFormat;
  pageSize?: PortfolioPageSize;
  orientation?: PortfolioOrientation;
  generationPreset?: PortfolioGenerationPreset;
  sourceProjectId?: string | null;
  sourceProjectTitle?: string | null;
}) {
  const format = input.format || input.sourceSelection?.format || "slide";
  const pageSize = input.pageSize || input.sourceSelection?.pageSize || getDefaultPortfolioPageSize(format);
  const orientation =
    input.orientation ||
    input.sourceSelection?.orientation ||
    getPortfolioPagePreset(pageSize).orientation;
  const generationPreset =
    input.generationPreset ||
    input.sourceSelection?.generationPreset ||
    getDefaultPortfolioPreset(format);
  const source = filterPortfolioSourceData(
    await getPortfolioSourceData(input.userId),
    input.sourceSelection,
  );
  const document = createDefaultPortfolioDocument(input.templateId, source, {
    format,
    pageSize,
    orientation,
    generationPreset,
  });
  const template = getPortfolioTemplate(input.templateId);
  const generationPlan = createFallbackPortfolioGenerationPlan(source);
  const title = input.title.trim() || "새 포트폴리오";
  const slug = await createUniquePortfolioSlug(input.userId, title);
  const publicSummary = {
    ...buildPortfolioPublicSummary(document),
    sourceProjects: source.projects
      .map((project) => ({
        title: project.company || project.position || "프로젝트",
        tags: Array.isArray(project.tags) ? project.tags.filter(Boolean).slice(0, 5) : [],
      }))
      .filter((project) => Boolean(project.title))
      .slice(0, 12),
    sourceProjectTitles: source.projects
      .map((project) => project.company || project.position || "프로젝트")
      .filter(Boolean)
      .slice(0, 12),
  };
  const sourceProjectId =
    input.sourceProjectId ||
    input.sourceSelection?.projectKeys?.[0] ||
    source.projects[0]?.id ||
    null;
  const sourceProjectTitle =
    input.sourceProjectTitle ||
    source.projects[0]?.company ||
    source.projects[0]?.position ||
    null;

  const row = await portfolioDelegate().create({
    data: {
      user_id: input.userId,
      title,
      slug,
      template_id: input.templateId,
      format,
      page_size: pageSize,
      orientation,
      generation_preset: generationPreset,
      source_project_id: sourceProjectId,
      source_project_title: sourceProjectTitle,
      is_public: false,
      document_payload: document,
      source_snapshot: source,
      public_summary: publicSummary,
      generation_plan: generationPlan,
      generation_status: "draft",
      generation_quality: {
        stage: "created",
        pageCount: document.sections.length,
        format,
        pageSize,
        projectCount: source.projects.length,
      },
      template_blueprint: template.blueprint,
      thumbnail_url: publicSummary.thumbnailUrl || template.previewImage,
      canvas_version: PORTFOLIO_CANVAS_STYLE_VERSION,
    },
  });

  return {
    row,
    document,
    source,
  };
}

export function normalizePortfolioRowDocument(row: PortfolioRow | null): PortfolioDocument {
  return withPortfolioSampleImages(
    normalizePortfolioDocument(row?.document_payload, toTemplateId(row?.template_id)),
  );
}

export function buildNextPortfolioUpdate(input: {
  title?: unknown;
  templateId?: unknown;
  document?: unknown;
  format?: unknown;
  pageSize?: unknown;
  orientation?: unknown;
  generationPreset?: unknown;
}) {
  const templateId = input.templateId ? toTemplateId(input.templateId) : undefined;
  const document = input.document
    ? polishPortfolioDocument(withPortfolioSampleImages(normalizePortfolioDocument(input.document, templateId)))
    : undefined;
  const format = toPortfolioFormat(input.format || document?.format);
  const pageSize = toPortfolioPageSize(input.pageSize || document?.pageSize, format);
  const orientation = toPortfolioOrientation(input.orientation || document?.orientation, pageSize);
  const generationPreset = toPortfolioGenerationPreset(
    input.generationPreset || document?.generationPreset,
    format,
  );
  const publicSummary = document ? buildPortfolioPublicSummary(document) : undefined;

  return {
    title: typeof input.title === "string" ? input.title.trim() || "새 포트폴리오" : undefined,
    templateId,
    document,
    format,
    pageSize,
    orientation,
    generationPreset,
    publicSummary,
    thumbnailUrl: publicSummary?.thumbnailUrl,
  };
}
