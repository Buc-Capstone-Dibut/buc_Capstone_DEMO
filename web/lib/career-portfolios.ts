import type { ResumePayload } from "@/app/my/[handle]/profile-types";

export type PortfolioTemplateId =
  | "developer-minimal"
  | "case-study"
  | "visual-showcase";

export type PortfolioFormat = "slide" | "document";
export type PortfolioPageSize = "16:9" | "a4";
export type PortfolioOrientation = "landscape" | "portrait";
export type PortfolioGenerationPreset =
  | "interview-pitch"
  | "project-report"
  | "resume-portfolio";

export type PortfolioSectionType =
  | "hero"
  | "about"
  | "skills"
  | "index"
  | "project"
  | "experience"
  | "quote"
  | "gallery"
  | "retrospective"
  | "contact";

export type PortfolioImageAspectRatio = "original" | "1:1" | "4:3" | "16:9" | "3:4";
export type PortfolioImageFit = "cover" | "contain";

export type PortfolioAsset = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt?: string;
};

export type PortfolioImageSlot = {
  assetId?: string;
  url?: string;
  caption?: string;
  alt?: string;
  aspectRatio: PortfolioImageAspectRatio;
  objectFit: PortfolioImageFit;
  focalPoint: {
    x: number;
    y: number;
  };
};

export type PortfolioSection = {
  id: string;
  type: PortfolioSectionType;
  title: string;
  subtitle?: string;
  body?: string;
  tags?: string[];
  image?: PortfolioImageSlot;
  images?: PortfolioImageSlot[];
  sourceId?: string;
  sourceKind?: "project" | "experience" | "coverLetter" | "manual";
  visible?: boolean;
  canvas?: PortfolioCanvasLayout;
};

export type PortfolioCanvasElementKind =
  | "text"
  | "image"
  | "tags"
  | "shape"
  | "line"
  | "metric"
  | "flow"
  | "timeline"
  | "techLogo";
export type PortfolioCanvasTextRole = "label" | "title" | "subtitle" | "body" | "tags";
export type PortfolioCanvasFontFamily = "pretendard" | "system" | "serif" | "mono";

export type PortfolioCanvasElement = {
  id: string;
  kind: PortfolioCanvasElementKind;
  role:
    | PortfolioCanvasTextRole
    | "image"
    | "decorative"
    | "metric"
    | "flow"
    | "timeline"
    | "techLogo";
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  items?: string[];
  value?: string;
  label?: string;
  image?: PortfolioImageSlot;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: PortfolioCanvasFontFamily;
  color?: string;
  fill?: string;
  stroke?: string;
  opacity?: number;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
};

export type PortfolioCanvasLayout = {
  width: number;
  height: number;
  styleVersion?: number;
  elements: PortfolioCanvasElement[];
};

export type PortfolioTheme = {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  radius: number;
};

export type PortfolioDocument = {
  version: 1;
  templateId: PortfolioTemplateId;
  format: PortfolioFormat;
  pageSize: PortfolioPageSize;
  orientation: PortfolioOrientation;
  generationPreset: PortfolioGenerationPreset;
  theme: PortfolioTheme;
  sections: PortfolioSection[];
};

export type PortfolioTemplateBlueprint = {
  layoutPreset: "minimal-recruiting" | "case-study-report" | "visual-product";
  imagePolicy: "profile-first" | "project-first" | "visual-first";
  infographicPolicy: Array<"flow" | "metric" | "timeline" | "techLogo">;
  tonePolicy: "concise-korean-hiring" | "case-study-editorial" | "visual-showcase";
  targetSlideCount: number;
};

export type PortfolioGenerationPlan = {
  position: string;
  strengths: string[];
  projectMessages: Array<{
    sourceId?: string;
    title: string;
    role?: string;
    coreMessage: string;
    problem?: string;
    solution?: string;
    result?: string;
    projectType: "web-service" | "data-ai" | "collaboration" | "backend-api" | "general";
    imageHint: "representative" | "dashboard" | "workspace" | "team" | "studio";
    infographicType: "flow" | "metric" | "timeline";
  }>;
  slidePlan: Array<{
    type: PortfolioSectionType;
    title: string;
    purpose: string;
    sourceId?: string;
    infographicType?: "flow" | "metric" | "timeline" | "techLogo";
  }>;
};

export type PortfolioSourceData = {
  personalInfo: ResumePayload["personalInfo"];
  skills: ResumePayload["skills"];
  projects: NonNullable<ResumePayload["timeline"]>;
  workExperiences: ResumePayload["experience"];
  coverLetters: NonNullable<ResumePayload["coverLetters"]>;
};

export type PortfolioSourceSelection = {
  projectKeys?: string[];
  experienceKeys?: string[];
  coverLetterKeys?: string[];
  includePersonalInfo?: boolean;
  includeSkills?: boolean;
  format?: PortfolioFormat;
  pageSize?: PortfolioPageSize;
  orientation?: PortfolioOrientation;
  generationPreset?: PortfolioGenerationPreset;
};

export type PortfolioListItem = {
  id: string;
  title: string;
  slug: string;
  templateId: PortfolioTemplateId;
  format: PortfolioFormat;
  pageSize: PortfolioPageSize;
  orientation: PortfolioOrientation;
  generationPreset?: PortfolioGenerationPreset;
  sourceProjectId?: string | null;
  sourceProjectTitle?: string | null;
  isPublic: boolean;
  publicUrl?: string | null;
  updatedAt: string;
  publishedAt?: string | null;
  generationStatus?: string;
  generatedAt?: string | null;
  publicSummary: {
    headline?: string;
    projectCount?: number;
    sectionCount?: number;
    thumbnailUrl?: string;
    sourceProjects?: Array<{
      title: string;
      tags?: string[];
    }>;
    sourceProjectTitles?: string[];
    projectTitles?: string[];
    slideTitles?: string[];
    previewPages?: Array<{
      id: string;
      type: PortfolioSectionType;
      title: string;
      subtitle?: string;
      thumbnailUrl?: string;
      canvas?: PortfolioCanvasLayout;
    }>;
  };
};

export const EMPTY_PORTFOLIO_SOURCE_DATA: PortfolioSourceData = {
  personalInfo: { name: "", email: "", phone: "", intro: "", links: {} },
  skills: [],
  projects: [],
  workExperiences: [],
  coverLetters: [],
};

export const PORTFOLIO_SAMPLE_IMAGES = {
  profilePortrait: "/portfolio-samples/profile-portrait.png",
  projectDashboard: "/portfolio-samples/analytics-dashboard.jpg",
  workspaceApp: "/portfolio-samples/code-workstation.jpg",
  productGallery: "/portfolio-samples/team-workshop.jpg",
  studioOffice: "/portfolio-samples/studio-office.jpg",
} as const;

export const PORTFOLIO_BACKGROUND_IMAGES = {
  calmGreenCover: "/portfolio-backgrounds/soft-green-01.png",
  calmGreenProfile: "/portfolio-backgrounds/soft-green-02.png",
  calmGreenCase: "/portfolio-backgrounds/soft-green-03.png",
} as const;

export const PORTFOLIO_CANVAS_STYLE_VERSION = 4;

export const PORTFOLIO_PAGE_PRESETS: Record<
  PortfolioPageSize,
  {
    format: PortfolioFormat;
    orientation: PortfolioOrientation;
    width: number;
    height: number;
    label: string;
  }
> = {
  "16:9": {
    format: "slide",
    orientation: "landscape",
    width: 960,
    height: 540,
    label: "PPT 16:9",
  },
  a4: {
    format: "document",
    orientation: "portrait",
    width: 794,
    height: 1123,
    label: "A4 보고서",
  },
};

export function getPortfolioPagePreset(pageSize: PortfolioPageSize = "16:9") {
  return PORTFOLIO_PAGE_PRESETS[pageSize] || PORTFOLIO_PAGE_PRESETS["16:9"];
}

export function getDefaultPortfolioPageSize(format: PortfolioFormat): PortfolioPageSize {
  return format === "document" ? "a4" : "16:9";
}

export function getDefaultPortfolioPreset(format: PortfolioFormat): PortfolioGenerationPreset {
  return format === "document" ? "project-report" : "interview-pitch";
}

const LEGACY_PORTFOLIO_SAMPLE_IMAGE_URLS = new Set([
  "/portfolio-samples/project-dashboard.png",
  "/portfolio-samples/workspace-app.png",
  "/portfolio-samples/product-gallery.png",
]);

export function isLegacyPortfolioSampleImageUrl(url?: string) {
  return Boolean(url && LEGACY_PORTFOLIO_SAMPLE_IMAGE_URLS.has(url));
}

export const PORTFOLIO_TEMPLATES: Array<{
  id: PortfolioTemplateId;
  name: string;
  description: string;
  imagePolicy: string;
  previewImage: string;
  theme: PortfolioTheme;
  blueprint: PortfolioTemplateBlueprint;
}> = [
  {
    id: "developer-minimal",
    name: "개발자 미니멀",
    description: "텍스트 가독성과 작은 프로필 이미지를 중심으로 정리합니다.",
    imagePolicy: "프로필 사진과 프로젝트 대표 이미지를 작게 배치",
    previewImage: PORTFOLIO_BACKGROUND_IMAGES.calmGreenCover,
    theme: {
      primary: "#1f7a4d",
      accent: "#84cc16",
      background: "#f8fafc",
      surface: "#ffffff",
      text: "#0f172a",
      muted: "#64748b",
      radius: 8,
    },
    blueprint: {
      layoutPreset: "minimal-recruiting",
      imagePolicy: "profile-first",
      infographicPolicy: ["techLogo", "flow", "metric"],
      tonePolicy: "concise-korean-hiring",
      targetSlideCount: 10,
    },
  },
  {
    id: "case-study",
    name: "프로젝트 케이스스터디",
    description: "문제, 해결, 성과 흐름과 대표 작업 이미지를 강조합니다.",
    imagePolicy: "프로젝트 스크린샷과 작업물 이미지를 큰 카드에 배치",
    previewImage: PORTFOLIO_BACKGROUND_IMAGES.calmGreenCase,
    theme: {
      primary: "#55783f",
      accent: "#9fbe83",
      background: "#f5f8f1",
      surface: "#ffffff",
      text: "#111827",
      muted: "#657566",
      radius: 6,
    },
    blueprint: {
      layoutPreset: "case-study-report",
      imagePolicy: "project-first",
      infographicPolicy: ["flow", "metric", "timeline", "techLogo"],
      tonePolicy: "case-study-editorial",
      targetSlideCount: 12,
    },
  },
  {
    id: "visual-showcase",
    name: "비주얼 포트폴리오",
    description: "큰 히어로 이미지와 작업물 갤러리로 첫인상을 만듭니다.",
    imagePolicy: "본인 얼굴, 대표 작업물, 갤러리 이미지를 전면 배치",
    previewImage: PORTFOLIO_BACKGROUND_IMAGES.calmGreenProfile,
    theme: {
      primary: "#6e8f55",
      accent: "#bfd5aa",
      background: "#f6f8f2",
      surface: "#ffffff",
      text: "#18181b",
      muted: "#6f7d66",
      radius: 4,
    },
    blueprint: {
      layoutPreset: "visual-product",
      imagePolicy: "visual-first",
      infographicPolicy: ["flow", "metric", "techLogo"],
      tonePolicy: "visual-showcase",
      targetSlideCount: 10,
    },
  },
];

const TECH_LOGO_DEFINITIONS = [
  { name: "React", slug: "react", color: "61DAFB", aliases: ["react", "react.js", "reactjs", "react native"] },
  { name: "Next.js", slug: "nextdotjs", color: "000000", aliases: ["next", "next.js", "nextjs"] },
  { name: "Vue.js", slug: "vuedotjs", color: "4FC08D", aliases: ["vue", "vue.js", "vuejs"] },
  { name: "Nuxt", slug: "nuxt", color: "00DC82", aliases: ["nuxt", "nuxt.js", "nuxtjs"] },
  { name: "Svelte", slug: "svelte", color: "FF3E00", aliases: ["svelte", "sveltekit"] },
  { name: "Angular", slug: "angular", color: "DD0031", aliases: ["angular"] },
  { name: "TypeScript", slug: "typescript", color: "3178C6", aliases: ["typescript", "ts"] },
  { name: "JavaScript", slug: "javascript", color: "F7DF1E", aliases: ["javascript", "js", "ecmascript"] },
  { name: "Node.js", slug: "nodedotjs", color: "5FA04E", aliases: ["node", "node.js", "nodejs"] },
  { name: "Express", slug: "express", color: "000000", aliases: ["express", "express.js", "expressjs"] },
  { name: "NestJS", slug: "nestjs", color: "E0234E", aliases: ["nestjs", "nest.js", "nest"] },
  { name: "Python", slug: "python", color: "3776AB", aliases: ["python", "py"] },
  { name: "Java", slug: "openjdk", color: "ED8B00", aliases: ["java", "jdk"] },
  { name: "Spring", slug: "spring", color: "6DB33F", aliases: ["spring", "spring boot"] },
  { name: "FastAPI", slug: "fastapi", color: "009688", aliases: ["fastapi", "fast api"] },
  { name: "Django", slug: "django", color: "092E20", aliases: ["django"] },
  { name: "MySQL", slug: "mysql", color: "4479A1", aliases: ["mysql"] },
  { name: "PostgreSQL", slug: "postgresql", color: "4169E1", aliases: ["postgres", "postgresql", "postgre"] },
  { name: "MongoDB", slug: "mongodb", color: "47A248", aliases: ["mongodb", "mongo"] },
  { name: "Redis", slug: "redis", color: "DC382D", aliases: ["redis"] },
  { name: "Prisma", slug: "prisma", color: "2D3748", aliases: ["prisma"] },
  { name: "GraphQL", slug: "graphql", color: "E10098", aliases: ["graphql", "graph ql"] },
  { name: "Supabase", slug: "supabase", color: "3FCF8E", aliases: ["supabase"] },
  { name: "Firebase", slug: "firebase", color: "FFCA28", aliases: ["firebase"] },
  { name: "Docker", slug: "docker", color: "2496ED", aliases: ["docker"] },
  { name: "Kubernetes", slug: "kubernetes", color: "326CE5", aliases: ["kubernetes", "k8s"] },
  {
    name: "AWS",
    slug: "amazonwebservices",
    color: "FF9900",
    aliases: ["aws", "amazon web services"],
    url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg",
  },
  { name: "Google Cloud", slug: "googlecloud", color: "4285F4", aliases: ["gcp", "google cloud", "googlecloud"] },
  {
    name: "Azure",
    slug: "microsoftazure",
    color: "0078D4",
    aliases: ["azure", "microsoft azure"],
    url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg",
  },
  { name: "Vercel", slug: "vercel", color: "000000", aliases: ["vercel"] },
  { name: "Tailwind CSS", slug: "tailwindcss", color: "06B6D4", aliases: ["tailwind", "tailwind css", "tailwindcss"] },
  { name: "Sass", slug: "sass", color: "CC6699", aliases: ["sass", "scss"] },
  { name: "Bootstrap", slug: "bootstrap", color: "7952B3", aliases: ["bootstrap"] },
  { name: "HTML5", slug: "html5", color: "E34F26", aliases: ["html", "html5"] },
  { name: "CSS3", slug: "css", color: "663399", aliases: ["css", "css3"] },
  { name: "Git", slug: "git", color: "F05032", aliases: ["git"] },
  { name: "GitHub", slug: "github", color: "181717", aliases: ["github", "git hub"] },
  { name: "Figma", slug: "figma", color: "F24E1E", aliases: ["figma"] },
  { name: "Jest", slug: "jest", color: "C21325", aliases: ["jest"] },
  { name: "Vitest", slug: "vitest", color: "6E9F18", aliases: ["vitest"] },
  {
    name: "Playwright",
    slug: "playwright",
    color: "2EAD33",
    aliases: ["playwright"],
    url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/playwright/playwright-original.svg",
  },
  { name: "Cypress", slug: "cypress", color: "69D3A7", aliases: ["cypress"] },
  { name: "Storybook", slug: "storybook", color: "FF4785", aliases: ["storybook"] },
  { name: "Three.js", slug: "threedotjs", color: "000000", aliases: ["three.js", "threejs", "three"] },
  { name: "Flutter", slug: "flutter", color: "02569B", aliases: ["flutter"] },
  { name: "Dart", slug: "dart", color: "0175C2", aliases: ["dart"] },
  { name: "Swift", slug: "swift", color: "F05138", aliases: ["swift"] },
  { name: "Kotlin", slug: "kotlin", color: "7F52FF", aliases: ["kotlin"] },
  { name: "Linux", slug: "linux", color: "FCC624", aliases: ["linux"] },
  { name: "Nginx", slug: "nginx", color: "009639", aliases: ["nginx"] },
  { name: "C++", slug: "cplusplus", color: "00599C", aliases: ["c++", "cpp"] },
  {
    name: "C#",
    slug: "csharp",
    color: "512BD4",
    aliases: ["c#", "csharp"],
    url: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg",
  },
] as const;

function sourceValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function getPortfolioSourceKey(
  item: Record<string, unknown> | undefined,
  fallback: string,
) {
  return (
    sourceValue(item?.id) ||
    sourceValue(item?.company) ||
    sourceValue(item?.title) ||
    sourceValue(item?.position) ||
    fallback
  );
}

export function filterPortfolioSourceData(
  source: PortfolioSourceData,
  selection?: PortfolioSourceSelection,
): PortfolioSourceData {
  if (!selection) return source;

  const projectKeys = new Set(selection.projectKeys || []);
  const experienceKeys = new Set(selection.experienceKeys || []);
  const coverLetterKeys = new Set(selection.coverLetterKeys || []);

  return {
    personalInfo:
      selection.includePersonalInfo === false
        ? EMPTY_PORTFOLIO_SOURCE_DATA.personalInfo
        : source.personalInfo,
    skills: selection.includeSkills === false ? [] : source.skills,
    projects:
      projectKeys.size === 0
        ? []
        : source.projects.filter((item, index) =>
            projectKeys.has(getPortfolioSourceKey(item as Record<string, unknown>, `project-${index}`)),
          ),
    workExperiences:
      experienceKeys.size === 0
        ? []
        : source.workExperiences.filter((item, index) =>
            experienceKeys.has(
              getPortfolioSourceKey(item as Record<string, unknown>, `experience-${index}`),
            ),
          ),
    coverLetters:
      coverLetterKeys.size === 0
        ? []
        : source.coverLetters.filter((item, index) =>
            coverLetterKeys.has(
              getPortfolioSourceKey(item as Record<string, unknown>, `cover-letter-${index}`),
            ),
          ),
  };
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getPortfolioTemplate(templateId?: string) {
  return (
    PORTFOLIO_TEMPLATES.find((template) => template.id === templateId) ||
    PORTFOLIO_TEMPLATES[0]
  );
}

export function createEmptyImageSlot(
  aspectRatio: PortfolioImageAspectRatio = "16:9",
): PortfolioImageSlot {
  return {
    aspectRatio,
    objectFit: "cover",
    focalPoint: { x: 50, y: 50 },
  };
}

export function createSampleImageSlot(
  url: string,
  alt: string,
  aspectRatio: PortfolioImageAspectRatio = "16:9",
  caption = "",
): PortfolioImageSlot {
  return {
    ...createEmptyImageSlot(aspectRatio),
    url,
    alt,
    caption,
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesTechAlias(text: string, alias: string) {
  const normalized = text.toLowerCase();
  const normalizedAlias = alias.toLowerCase();
  if (!normalizedAlias) return false;
  if (!/^[a-z0-9.+#\-\s]+$/i.test(normalizedAlias)) {
    return normalized.includes(normalizedAlias);
  }
  const leftBoundary = normalizedAlias.length <= 2 ? "(^|[^a-z0-9.])" : "(^|[^a-z0-9])";
  const pattern = new RegExp(
    `${leftBoundary}${escapeRegExp(normalizedAlias)}([^a-z0-9]|$)`,
    "i",
  );
  return pattern.test(normalized);
}

function findTechLogoDefinition(skillName: string) {
  const normalized = skillName.trim();
  if (!normalized) return null;
  return (
    TECH_LOGO_DEFINITIONS.find((definition) =>
      definition.aliases.some((alias) => matchesTechAlias(normalized, alias)),
    ) || null
  );
}

export function createTechLogoImageSlot(skillName: string): PortfolioImageSlot | null {
  const definition = findTechLogoDefinition(skillName);
  if (!definition) return null;

  return {
    ...createEmptyImageSlot("1:1"),
    url:
      "url" in definition && definition.url
        ? definition.url
        : `https://cdn.simpleicons.org/${definition.slug}/${definition.color}`,
    alt: `${definition.name} 로고`,
    caption: definition.name,
    objectFit: "contain",
  };
}

function collectPortfolioSkillNames(source: PortfolioSourceData) {
  const names = new Map<string, string>();

  for (const skill of source.skills) {
    const skillName = skill.name?.trim();
    if (skillName) names.set(skillName.toLowerCase(), skillName);
  }

  for (const project of source.projects) {
    for (const tech of project.techStack || []) {
      const techName = tech.trim();
      if (techName) names.set(techName.toLowerCase(), techName);
    }
  }

  const projectCorpus = source.projects
    .flatMap((project) => [
      project.position,
      project.description,
      project.situation,
      project.role,
      project.solution,
      project.difficulty,
      project.result,
      project.lesson,
      ...(project.tags || []),
      ...(project.techStack || []),
    ])
    .filter(Boolean)
    .join(" ");

  for (const definition of TECH_LOGO_DEFINITIONS) {
    if (definition.aliases.some((alias) => matchesTechAlias(projectCorpus, alias))) {
      names.set(definition.name.toLowerCase(), definition.name);
    }
  }

  return Array.from(names.values()).slice(0, 12);
}

function createTechLogoImageSlots(skillNames: string[]) {
  return skillNames
    .map((skillName) => createTechLogoImageSlot(skillName))
    .filter((image): image is PortfolioImageSlot => Boolean(image))
    .slice(0, 10);
}

function hasImageSource(image?: PortfolioImageSlot) {
  return Boolean(image?.assetId || image?.url);
}

function withSampleImageSlot(
  image: PortfolioImageSlot | undefined,
  fallback: PortfolioImageSlot,
): PortfolioImageSlot {
  if (image && hasImageSource(image) && !isLegacyPortfolioSampleImageUrl(image.url)) {
    return image;
  }
  return {
    ...fallback,
    ...(image || {}),
    url: fallback.url,
    alt: image?.alt || fallback.alt,
    caption: image?.caption || fallback.caption,
    aspectRatio: image?.aspectRatio || fallback.aspectRatio,
    objectFit: image?.objectFit || fallback.objectFit,
    focalPoint: image?.focalPoint || fallback.focalPoint,
  };
}

function getHeroSampleImage(templateId: PortfolioTemplateId) {
  if (templateId === "developer-minimal") {
    return createSampleImageSlot(
      PORTFOLIO_SAMPLE_IMAGES.profilePortrait,
      "프로필 이미지 예시",
      "1:1",
    );
  }
  if (templateId === "case-study") {
    return createSampleImageSlot(
      PORTFOLIO_SAMPLE_IMAGES.projectDashboard,
      "프로젝트 대시보드 예시",
      "16:9",
    );
  }
  return createSampleImageSlot(
    PORTFOLIO_SAMPLE_IMAGES.workspaceApp,
    "비주얼 포트폴리오 히어로 예시",
    "16:9",
  );
}

function getProjectRepresentativeImageSlot(
  project: PortfolioSourceData["projects"][number],
  aspectRatio: PortfolioImageAspectRatio = "16:9",
): PortfolioImageSlot | null {
  const image = project.representativeImage;
  if (!image?.url) return null;
  const title = project.company || "프로젝트";

  return {
    ...createEmptyImageSlot(aspectRatio),
    url: image.url,
    alt: image.alt || `${title} 대표 이미지`,
    caption: image.caption || title,
  };
}

function getFirstProjectRepresentativeImageSlot(
  source: PortfolioSourceData,
  aspectRatio: PortfolioImageAspectRatio = "16:9",
) {
  for (const project of source.projects) {
    const image = getProjectRepresentativeImageSlot(project, aspectRatio);
    if (image) return image;
  }
  return null;
}

function projectCorpus(project: PortfolioSourceData["projects"][number]) {
  return [
    project.company,
    project.position,
    project.description,
    project.situation,
    project.role,
    project.solution,
    project.difficulty,
    project.result,
    project.lesson,
    ...(project.tags || []),
    ...(project.techStack || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function classifyPortfolioProject(
  project: PortfolioSourceData["projects"][number],
): PortfolioGenerationPlan["projectMessages"][number]["projectType"] {
  const corpus = projectCorpus(project);
  if (/ai|ml|데이터|분석|리포트|차트|통계|모델|추천|예측/.test(corpus)) return "data-ai";
  if (/api|서버|백엔드|backend|spring|node|database|db|인프라|배포/.test(corpus)) return "backend-api";
  if (/협업|기획|pm|리서치|인터뷰|운영|커뮤니티|사용자/.test(corpus)) return "collaboration";
  if (/web|웹|서비스|프론트|frontend|react|next|ui|ux|페이지|앱/.test(corpus)) return "web-service";
  return "general";
}

function getProjectFallbackImageSlot(
  project: PortfolioSourceData["projects"][number],
  aspectRatio: PortfolioImageAspectRatio = "16:9",
) {
  const projectType = classifyPortfolioProject(project);
  if (projectType === "data-ai") {
    return createSampleImageSlot(
      PORTFOLIO_SAMPLE_IMAGES.projectDashboard,
      "데이터 분석 대시보드 예시",
      aspectRatio,
    );
  }
  if (projectType === "collaboration") {
    return createSampleImageSlot(
      PORTFOLIO_SAMPLE_IMAGES.productGallery,
      "팀 협업 프로젝트 예시",
      aspectRatio,
    );
  }
  if (projectType === "backend-api") {
    return createSampleImageSlot(
      PORTFOLIO_SAMPLE_IMAGES.workspaceApp,
      "개발 작업 화면 예시",
      aspectRatio,
    );
  }
  return createSampleImageSlot(
    PORTFOLIO_SAMPLE_IMAGES.workspaceApp,
    "웹 서비스 작업 화면 예시",
    aspectRatio,
  );
}

function getProjectBestImageSlot(
  project: PortfolioSourceData["projects"][number],
  aspectRatio: PortfolioImageAspectRatio = "16:9",
) {
  return getProjectRepresentativeImageSlot(project, aspectRatio) || getProjectFallbackImageSlot(project, aspectRatio);
}

function compactBody(value: string | undefined, maxLines = 5) {
  return (value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join("\n");
}

function canvasTextElement(
  id: string,
  role: PortfolioCanvasTextRole,
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  fontWeight: number,
  color: string,
): PortfolioCanvasElement {
  return {
    id,
    kind: role === "tags" ? "tags" : "text",
    role,
    content,
    x,
    y,
    width,
    height,
    fontSize,
    fontWeight,
    color,
    fontFamily: "pretendard",
    lineHeight: Math.round(fontSize * 1.34),
  };
}

function canvasImageElement(
  id: string,
  image: PortfolioImageSlot | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): PortfolioCanvasElement {
  return {
    id,
    kind: "image",
    role: "image",
    image,
    x,
    y,
    width,
    height,
  };
}

function canvasVisualElement(
  id: string,
  kind: Exclude<PortfolioCanvasElementKind, "text" | "image" | "tags">,
  x: number,
  y: number,
  width: number,
  height: number,
  patch: Partial<PortfolioCanvasElement> = {},
): PortfolioCanvasElement {
  return {
    id,
    kind,
    role:
      kind === "techLogo"
        ? "techLogo"
        : kind === "timeline"
          ? "timeline"
          : kind === "flow"
            ? "flow"
            : kind === "metric"
              ? "metric"
              : "decorative",
    x,
    y,
    width,
    height,
    ...patch,
  };
}

function createSectionCanvas(
  elements: PortfolioCanvasElement[],
  pageSize: PortfolioPageSize = "16:9",
): PortfolioCanvasLayout {
  const preset = getPortfolioPagePreset(pageSize);
  return {
    width: preset.width,
    height: preset.height,
    styleVersion: PORTFOLIO_CANVAS_STYLE_VERSION,
    elements,
  };
}

function inferPortfolioPosition(source: PortfolioSourceData) {
  return (
    source.projects.find((project) => project.position)?.position ||
    source.workExperiences.find((experience) => experience.position)?.position ||
    source.skills.slice(0, 2).map((skill) => skill.name).filter(Boolean).join(" / ") ||
    "개발자"
  );
}

function inferPortfolioStrengths(source: PortfolioSourceData) {
  const corpus = source.projects.map(projectCorpus).join(" ");
  const strengths = [
    /문제|해결|개선|최적화/.test(corpus) ? "문제 해결" : "",
    /협업|기획|pm|리서치|인터뷰/.test(corpus) ? "협업과 기획" : "",
    /데이터|분석|ai|자동화/.test(corpus) ? "데이터 기반 개선" : "",
    /frontend|프론트|react|ui|ux|웹/.test(corpus) ? "사용자 경험 구현" : "",
    /backend|api|서버|db|spring|node/.test(corpus) ? "서비스 구조화" : "",
  ].filter(Boolean);
  return Array.from(new Set(strengths)).slice(0, 3).concat(["실행력", "학습과 개선"]).slice(0, 3);
}

export function createFallbackPortfolioGenerationPlan(
  source: PortfolioSourceData,
): PortfolioGenerationPlan {
  const position = inferPortfolioPosition(source);
  const strengths = inferPortfolioStrengths(source);
  const projects = source.projects.slice(0, 4);
  const projectMessages = projects.map((project, index) => {
    const projectType = classifyPortfolioProject(project);
    return {
      sourceId: project.id,
      title: project.company || `프로젝트 ${index + 1}`,
      role: project.position || "",
      coreMessage:
        project.result ||
        project.solution ||
        project.description ||
        "프로젝트 목표를 정의하고 구현 과정을 검증했습니다.",
      problem: project.situation || project.difficulty || "해결해야 할 문제를 정의했습니다.",
      solution: project.solution || project.role || "담당 역할을 기준으로 해결 방안을 실행했습니다.",
      result: project.result || project.lesson || "구현 결과와 배운 점을 정리했습니다.",
      projectType,
      imageHint:
        projectType === "data-ai"
          ? "dashboard"
          : projectType === "collaboration"
            ? "team"
            : projectType === "backend-api"
              ? "workspace"
              : "representative",
      infographicType: index % 3 === 0 ? "flow" : index % 3 === 1 ? "metric" : "timeline",
    } satisfies PortfolioGenerationPlan["projectMessages"][number];
  });

  return {
    position,
    strengths,
    projectMessages,
    slidePlan: [
      { type: "hero", title: `${position} 포트폴리오`, purpose: "지원자의 포지션과 강점 제시" },
      { type: "about", title: "한 줄 소개", purpose: "프로필과 일하는 방식 요약" },
      { type: "skills", title: "핵심 역량", purpose: "채용 직무와 연결되는 기술 스택 제시", infographicType: "techLogo" },
      { type: "index", title: "프로젝트 인덱스", purpose: "대표 프로젝트 목록과 핵심 키워드 정리" },
      ...projectMessages.flatMap((project) => [
        { type: "project" as const, title: project.title, purpose: project.coreMessage, sourceId: project.sourceId, infographicType: project.infographicType },
      ]),
      { type: "gallery", title: "작업물 갤러리", purpose: "대표 이미지와 작업 흔적 제시" },
      { type: "retrospective", title: "성장 포인트", purpose: "경험을 통해 확장된 역량 정리" },
      { type: "contact", title: "연락처", purpose: "후속 연락 정보 제공" },
    ],
  };
}

function buildHeroCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  return createSectionCanvas([
    canvasVisualElement("cover-soft-shape", "shape", 552, 320, 428, 240, {
      fill: theme.accent,
      opacity: 0.2,
    }),
    canvasTextElement("label", "label", "Portfolio", 74, 60, 160, 28, 16, 700, theme.muted),
    canvasTextElement("title", "title", section.title, 74, 162, 610, 152, 62, 900, theme.text),
    canvasTextElement("subtitle", "subtitle", section.subtitle || "", 78, 336, 530, 68, 24, 700, theme.muted),
    canvasImageElement("image", section.image, 678, 130, 182, 182),
  ]);
}

function buildAboutCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  return createSectionCanvas([
    canvasVisualElement("profile-panel", "shape", 50, 0, 280, 540, {
      fill: theme.primary,
      opacity: 0.72,
    }),
    canvasTextElement("label", "label", "PROFILE", 382, 82, 140, 26, 14, 900, theme.primary),
    canvasTextElement("title", "title", section.title, 382, 122, 460, 52, 34, 900, theme.text),
    canvasTextElement("body", "body", compactBody(section.body, 4), 382, 202, 500, 116, 18, 500, theme.text),
    canvasImageElement("image", section.image, 98, 140, 184, 184),
    canvasTextElement("subtitle", "subtitle", section.subtitle || "프로필", 86, 370, 220, 82, 18, 800, "#ffffff"),
  ]);
}

function buildSkillsCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  const logoElements = (section.images || []).slice(0, 10).flatMap((image, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    const x = 502 + col * 78;
    const y = 138 + row * 112;
    return [
      { ...canvasImageElement(`tech-logo-${index}`, image, x, y, 56, 56), kind: "techLogo" as const, role: "techLogo" as const },
      canvasTextElement(`tech-label-${index}`, "label", image.caption || image.alt?.replace(/\s*로고$/, "") || "Stack", x - 10, y + 66, 76, 22, 11, 800, theme.muted),
    ];
  });

  return createSectionCanvas([
    canvasTextElement("label", "label", "STACK", 72, 84, 140, 26, 15, 900, theme.primary),
    canvasTextElement("title", "title", section.title, 72, 140, 330, 58, 40, 900, theme.text),
    canvasTextElement("body", "body", compactBody(section.body, 4), 74, 230, 330, 112, 17, 600, theme.muted),
    canvasVisualElement("metric-1", "metric", 74, 382, 126, 58, { label: "주요 기술", value: `${section.tags?.length || 0}`, fill: "#ffffff", stroke: theme.primary }),
    canvasVisualElement("metric-2", "metric", 216, 382, 146, 58, { label: "활용 영역", value: "서비스", fill: "#ffffff", stroke: theme.accent }),
    ...logoElements,
  ]);
}

function buildProjectCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  const flowItems = section.tags?.slice(0, 3).length
    ? section.tags.slice(0, 3)
    : ["문제 정의", "해결 구현", "결과 검증"];

  return createSectionCanvas([
    canvasVisualElement("left-panel", "shape", 0, 0, 382, 540, { fill: theme.primary, opacity: 0.78 }),
    canvasTextElement("label", "label", "PROJECT CASE", 58, 58, 170, 26, 14, 900, "#f8fafc"),
    canvasTextElement("title", "title", section.title, 58, 122, 312, 122, 34, 900, "#ffffff"),
    canvasTextElement("subtitle", "subtitle", section.subtitle || "", 60, 310, 300, 36, 16, 800, "#f8fafc"),
    canvasTextElement("tags", "tags", (section.tags || []).slice(0, 5).join("  ·  "), 60, 360, 300, 58, 14, 800, "#f8fafc"),
    canvasImageElement("image", section.image, 438, 76, 402, 170),
    canvasVisualElement("flow", "flow", 438, 278, 402, 78, { items: flowItems, fill: theme.accent, stroke: theme.primary }),
    canvasTextElement("body", "body", compactBody(section.body, 5), 440, 384, 404, 118, 15, 500, theme.text),
  ]);
}

function buildIndexCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  const items = section.tags?.length ? section.tags.slice(0, 6) : ["대표 프로젝트", "핵심 역량", "기술 스택"];
  return createSectionCanvas([
    canvasTextElement("label", "label", "INDEX", 72, 70, 140, 26, 15, 900, theme.primary),
    canvasTextElement("title", "title", section.title, 72, 126, 386, 58, 40, 900, theme.text),
    canvasVisualElement("timeline", "timeline", 118, 220, 724, 210, { items, stroke: theme.primary, fill: "#ffffff" }),
  ]);
}

function buildGalleryCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  return createSectionCanvas([
    canvasTextElement("label", "label", "VISUAL PROOF", 72, 70, 170, 26, 14, 900, theme.primary),
    canvasTextElement("title", "title", section.title, 72, 116, 380, 56, 38, 900, theme.text),
    canvasTextElement("subtitle", "subtitle", section.subtitle || "", 472, 120, 350, 54, 16, 700, theme.muted),
    canvasImageElement("image-1", section.images?.[0], 72, 220, 248, 184),
    canvasImageElement("image-2", section.images?.[1], 356, 220, 248, 184),
    canvasImageElement("image-3", section.images?.[2], 640, 220, 248, 184),
  ]);
}

function buildRetrospectiveCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  const items =
    section.tags?.length
      ? section.tags.slice(0, 4)
      : ["문제 정의", "실행", "검증", "개선"];

  return createSectionCanvas([
    canvasTextElement("label", "label", "GROWTH", 72, 70, 160, 26, 14, 900, theme.primary),
    canvasTextElement("title", "title", section.title, 72, 126, 440, 58, 40, 900, theme.text),
    canvasTextElement("body", "body", compactBody(section.body, 4), 74, 214, 370, 128, 17, 600, theme.muted),
    canvasVisualElement("timeline", "timeline", 512, 120, 330, 280, {
      items,
      fill: "#ffffff",
      stroke: theme.primary,
    }),
    canvasVisualElement("metric", "metric", 74, 386, 168, 64, {
      label: "정리된 경험",
      value: `${items.length}`,
      fill: "#ffffff",
      stroke: theme.accent,
    }),
  ]);
}

function buildContactCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  return createSectionCanvas([
    canvasTextElement("label", "label", "CONTACT", 386, 126, 188, 28, 16, 900, theme.primary),
    canvasTextElement("title", "title", section.title, 274, 198, 412, 72, 48, 900, theme.text),
    canvasTextElement("body", "body", compactBody(section.body, 5), 292, 312, 376, 92, 18, 700, theme.muted),
  ]);
}

function buildA4SectionCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  const pageSize: PortfolioPageSize = "a4";
  const label =
    section.type === "hero"
      ? "PORTFOLIO REPORT"
      : section.type === "project"
        ? "PROJECT REPORT"
        : section.type.toUpperCase();
  const title = section.title || "포트폴리오";
  const body = compactBody(section.body, section.type === "project" ? 8 : 7);
  const tags = section.tags?.slice(0, 8) || [];

  if (section.type === "hero") {
    return createSectionCanvas([
      canvasVisualElement("side-band", "shape", 0, 0, 126, 1123, { fill: theme.primary, opacity: 0.76 }),
      canvasTextElement("label", "label", label, 176, 106, 240, 28, 16, 900, theme.primary),
      canvasTextElement("title", "title", title, 176, 176, 470, 118, 44, 900, theme.text),
      canvasTextElement("subtitle", "subtitle", section.subtitle || "프로젝트와 경험을 문서형으로 정리합니다.", 178, 324, 452, 70, 20, 700, theme.muted),
      canvasImageElement("image", section.image, 466, 470, 210, 210),
      canvasTextElement("body", "body", section.body || "", 176, 760, 438, 126, 17, 600, theme.text),
      canvasTextElement("footer", "label", "Dibut Portfolio", 176, 1028, 180, 24, 12, 800, theme.muted),
    ], pageSize);
  }

  if (section.type === "about") {
    return createSectionCanvas([
      canvasTextElement("label", "label", "PROFILE", 74, 84, 180, 28, 15, 900, theme.primary),
      canvasTextElement("title", "title", title, 74, 134, 438, 62, 34, 900, theme.text),
      canvasImageElement("image", section.image, 74, 238, 164, 164),
      canvasTextElement("subtitle", "subtitle", section.subtitle || "프로필", 270, 256, 360, 38, 18, 800, theme.primary),
      canvasTextElement("body", "body", body || "소개 문장을 입력하세요.", 270, 318, 398, 140, 17, 500, theme.text),
      canvasVisualElement("timeline", "timeline", 74, 548, 610, 216, { items: tags.length ? tags : ["문제 정의", "구현", "검증", "개선"], stroke: theme.primary, fill: "#ffffff" }),
      canvasTextElement("footer", "label", "Profile Summary", 74, 1018, 180, 24, 12, 800, theme.muted),
    ], pageSize);
  }

  if (section.type === "skills") {
    const logos = (section.images || []).slice(0, 12).flatMap((image, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 116 + col * 146;
      const y = 346 + row * 136;
      return [
        { ...canvasImageElement(`tech-logo-${index}`, image, x, y, 54, 54), kind: "techLogo" as const, role: "techLogo" as const },
        canvasTextElement(`tech-label-${index}`, "label", image.caption || image.alt?.replace(/\s*로고$/, "") || "Stack", x + 64, y + 14, 78, 24, 12, 800, theme.muted),
      ];
    });

    return createSectionCanvas([
      canvasTextElement("label", "label", "CAPABILITY", 74, 84, 190, 28, 15, 900, theme.primary),
      canvasTextElement("title", "title", title, 74, 134, 480, 64, 36, 900, theme.text),
      canvasTextElement("body", "body", body || "사용 기술과 업무 강점을 정리합니다.", 76, 224, 580, 88, 17, 600, theme.muted),
      ...logos,
      canvasVisualElement("metric-1", "metric", 74, 812, 180, 74, { label: "주요 기술", value: `${section.tags?.length || 0}`, stroke: theme.primary }),
      canvasVisualElement("metric-2", "metric", 276, 812, 220, 74, { label: "포트폴리오 포맷", value: "A4", stroke: theme.accent }),
    ], pageSize);
  }

  if (section.type === "index") {
    return createSectionCanvas([
      canvasTextElement("label", "label", "CONTENTS", 74, 84, 180, 28, 15, 900, theme.primary),
      canvasTextElement("title", "title", title, 74, 134, 480, 64, 36, 900, theme.text),
      canvasVisualElement("timeline", "timeline", 74, 250, 620, 360, { items: tags.length ? tags.slice(0, 6) : ["프로필", "기술 스택", "프로젝트"], stroke: theme.primary, fill: "#ffffff" }),
      canvasTextElement("body", "body", section.subtitle || "선택한 프로젝트와 경험의 흐름입니다.", 76, 700, 520, 78, 17, 600, theme.muted),
    ], pageSize);
  }

  if (section.type === "project") {
    const flowItems = tags.length ? tags.slice(0, 3) : ["문제", "역할", "해결"];
    return createSectionCanvas([
      canvasTextElement("label", "label", "PROJECT CASE", 74, 70, 180, 28, 15, 900, theme.primary),
      canvasTextElement("title", "title", title, 74, 122, 560, 90, 32, 900, theme.text),
      canvasTextElement("subtitle", "subtitle", section.subtitle || "역할과 기간", 76, 222, 540, 34, 16, 800, theme.muted),
      canvasImageElement("image", section.image, 74, 300, 646, 300),
      canvasVisualElement("flow", "flow", 96, 646, 602, 78, { items: flowItems, fill: theme.accent, stroke: theme.primary }),
      canvasTextElement("body", "body", body || "프로젝트 내용을 입력하세요.", 96, 770, 600, 210, 16, 500, theme.text),
      canvasTextElement("footer", "label", "Project Detail", 74, 1030, 180, 24, 12, 800, theme.muted),
    ], pageSize);
  }

  if (section.type === "gallery") {
    return createSectionCanvas([
      canvasTextElement("label", "label", "VISUAL MATERIALS", 74, 84, 220, 28, 15, 900, theme.primary),
      canvasTextElement("title", "title", title, 74, 134, 480, 64, 36, 900, theme.text),
      canvasImageElement("image-1", section.images?.[0], 74, 250, 290, 214),
      canvasImageElement("image-2", section.images?.[1], 404, 250, 290, 214),
      canvasImageElement("image-3", section.images?.[2], 74, 518, 620, 300),
      canvasTextElement("subtitle", "subtitle", section.subtitle || "대표 이미지와 시각 자료", 76, 870, 560, 50, 17, 700, theme.muted),
    ], pageSize);
  }

  if (section.type === "contact") {
    return createSectionCanvas([
      canvasTextElement("label", "label", "CONTACT", 74, 132, 180, 30, 16, 900, theme.primary),
      canvasTextElement("title", "title", title, 74, 198, 480, 70, 42, 900, theme.text),
      canvasTextElement("body", "body", body || "email@example.com", 78, 326, 520, 150, 20, 700, theme.muted),
      canvasVisualElement("line", "line", 74, 536, 620, 2, { stroke: theme.primary, opacity: 0.4 }),
      canvasTextElement("footer", "label", "Thank you", 74, 620, 240, 34, 18, 900, theme.primary),
    ], pageSize);
  }

  return createSectionCanvas([
    canvasTextElement("label", "label", label, 74, 84, 180, 28, 15, 900, theme.primary),
    canvasTextElement("title", "title", title, 74, 134, 520, 70, 36, 900, theme.text),
    canvasTextElement("subtitle", "subtitle", section.subtitle || "", 76, 234, 540, 42, 17, 800, theme.muted),
    canvasTextElement("body", "body", body || "본문을 입력하세요.", 76, 326, 600, 360, 16, 500, theme.text),
  ], pageSize);
}

export function buildPortfolioSectionCanvas(
  section: PortfolioSection,
  document: Pick<PortfolioDocument, "theme" | "templateId"> & Partial<Pick<PortfolioDocument, "format" | "pageSize">>,
) {
  if (document.format === "document" || document.pageSize === "a4") {
    return buildA4SectionCanvas(section, document.theme);
  }
  if (section.type === "hero") return buildHeroCanvas(section, document.theme);
  if (section.type === "about") return buildAboutCanvas(section, document.theme);
  if (section.type === "skills") return buildSkillsCanvas(section, document.theme);
  if (section.type === "index") return buildIndexCanvas(section, document.theme);
  if (section.type === "project") return buildProjectCanvas(section, document.theme);
  if (section.type === "gallery") return buildGalleryCanvas(section, document.theme);
  if (section.type === "retrospective") return buildRetrospectiveCanvas(section, document.theme);
  if (section.type === "contact") return buildContactCanvas(section, document.theme);
  return undefined;
}

function syncCanvasWithSectionMedia(section: PortfolioSection): PortfolioSection {
  if (!section.canvas?.elements?.length) return section;

  return {
    ...section,
    canvas: {
      ...section.canvas,
      elements: section.canvas.elements.map((element) => {
        if (element.id === "image" && section.image) {
          return { ...element, image: section.image };
        }
        if (/^image-\d+$/.test(element.id)) {
          const index = Number(element.id.replace("image-", "")) - 1;
          const image = section.images?.[index];
          return image ? { ...element, image } : element;
        }
        if (/^tech-logo-\d+$/.test(element.id)) {
          const index = Number(element.id.replace("tech-logo-", ""));
          const image = section.images?.[index];
          return image ? { ...element, image } : element;
        }
        return element;
      }),
    },
  };
}

export function withPortfolioSampleImages(document: PortfolioDocument): PortfolioDocument {
  const gallerySamples = [
    createSampleImageSlot(
      PORTFOLIO_SAMPLE_IMAGES.workspaceApp,
      "웹 서비스 작업 화면 예시",
      "4:3",
    ),
    createSampleImageSlot(
      PORTFOLIO_SAMPLE_IMAGES.projectDashboard,
      "프로젝트 성과 대시보드 예시",
      "4:3",
    ),
    createSampleImageSlot(
      PORTFOLIO_SAMPLE_IMAGES.productGallery,
      "작업물 갤러리 예시",
      "4:3",
    ),
  ];

  return {
    ...document,
    sections: document.sections.map((section) => {
      if (section.type === "hero") {
        return syncCanvasWithSectionMedia({
          ...section,
          image: withSampleImageSlot(section.image, getHeroSampleImage(document.templateId)),
        });
      }
      if (section.type === "about") {
        return syncCanvasWithSectionMedia({
          ...section,
          image: withSampleImageSlot(
            section.image,
            createSampleImageSlot(
              PORTFOLIO_SAMPLE_IMAGES.profilePortrait,
              "프로필 이미지 예시",
              "1:1",
            ),
          ),
        });
      }
      if (section.type === "project") {
        return syncCanvasWithSectionMedia({
          ...section,
          image: withSampleImageSlot(
            section.image,
            createSampleImageSlot(
              PORTFOLIO_SAMPLE_IMAGES.projectDashboard,
              "프로젝트 대표 이미지 예시",
              "16:9",
            ),
          ),
        });
      }
      if (section.type === "gallery") {
        const currentImages = section.images?.length ? section.images : gallerySamples;
        return syncCanvasWithSectionMedia({
          ...section,
          images: currentImages.map((image, index) =>
            withSampleImageSlot(image, gallerySamples[index % gallerySamples.length]),
          ),
        });
      }
      return section;
    }),
  };
}

function joinText(parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join("\n\n");
}

export function createProjectSection(
  project: PortfolioSourceData["projects"][number],
): PortfolioSection {
  const representativeImage = getProjectBestImageSlot(project);

  return {
    id: makeId("project"),
    type: "project",
    title: project.company || "대표 프로젝트",
    subtitle: project.position || project.period || "",
    body: joinText([
      project.description,
      project.situation ? `문제/배경: ${project.situation}` : undefined,
      project.solution ? `해결: ${project.solution}` : undefined,
      project.result ? `성과: ${project.result}` : undefined,
      project.lesson ? `배운 점: ${project.lesson}` : undefined,
    ]),
    tags: project.tags || [],
    image: representativeImage,
    sourceId: project.id,
    sourceKind: "project",
    visible: true,
  };
}

function createProjectInsightSection(
  project: PortfolioSourceData["projects"][number],
  index: number,
): PortfolioSection {
  const projectType = classifyPortfolioProject(project);
  const image = getProjectBestImageSlot(project);
  const flowTags =
    project.tags?.slice(0, 3).length
      ? project.tags.slice(0, 3)
      : projectType === "data-ai"
        ? ["데이터 수집", "분석 자동화", "의사결정 지원"]
        : projectType === "backend-api"
          ? ["API 설계", "성능 개선", "운영 안정화"]
          : ["문제 정의", "해결 구현", "결과 검증"];

  return {
    id: makeId("project-insight"),
    type: "project",
    title: `${index + 1}. ${project.company || "프로젝트"} 문제 해결`,
    subtitle: [project.position, project.period].filter(Boolean).join(" · "),
    body: joinText([
      project.situation ? `문제: ${project.situation}` : undefined,
      project.role ? `역할: ${project.role}` : undefined,
      project.solution ? `해결: ${project.solution}` : undefined,
      project.result ? `결과: ${project.result}` : undefined,
    ]) || project.description,
    tags: flowTags,
    image,
    sourceId: project.id,
    sourceKind: "project",
    visible: true,
  };
}

function createRetrospectiveSection(plan: PortfolioGenerationPlan): PortfolioSection {
  return {
    id: makeId("retrospective"),
    type: "retrospective",
    title: "성장 포인트",
    subtitle: "프로젝트를 통해 확장한 역량",
    body:
      plan.strengths.length > 0
        ? `${plan.strengths.join(", ")}을 중심으로 문제를 정의하고 구현 결과를 검증했습니다. 다음 프로젝트에서는 데이터와 사용자 피드백을 더 빠르게 연결하는 방향으로 개선합니다.`
        : "문제 정의, 구현, 검증의 흐름을 반복하며 프로젝트 완성도를 높였습니다.",
    tags: plan.strengths.length ? plan.strengths : ["문제 정의", "구현", "검증", "개선"],
    sourceKind: "manual",
    visible: true,
  };
}

export function createExperienceSection(
  experience: PortfolioSourceData["workExperiences"][number],
): PortfolioSection {
  return {
    id: makeId("experience"),
    type: "experience",
    title: experience.company || "경력",
    subtitle: [experience.position, experience.period].filter(Boolean).join(" · "),
    body: experience.description || "",
    sourceId: experience.id,
    sourceKind: "experience",
    visible: true,
  };
}

export function createCoverLetterSection(
  coverLetter: PortfolioSourceData["coverLetters"][number],
): PortfolioSection {
  return {
    id: makeId("quote"),
    type: "quote",
    title: coverLetter.title || "자소서 문장",
    subtitle: [coverLetter.company, coverLetter.role].filter(Boolean).join(" · "),
    body:
      coverLetter.content ||
      coverLetter.questions?.map((question) => question.answer).filter(Boolean).join("\n\n") ||
      "",
    sourceId: coverLetter.id,
    sourceKind: "coverLetter",
    visible: true,
  };
}

export function createDefaultPortfolioDocument(
  templateId: PortfolioTemplateId,
  source: PortfolioSourceData,
  options: {
    format?: PortfolioFormat;
    pageSize?: PortfolioPageSize;
    orientation?: PortfolioOrientation;
    generationPreset?: PortfolioGenerationPreset;
  } = {},
): PortfolioDocument {
  const template = getPortfolioTemplate(templateId);
  const format = options.format || "slide";
  const pageSize = options.pageSize || getDefaultPortfolioPageSize(format);
  const pagePreset = getPortfolioPagePreset(pageSize);
  const orientation = options.orientation || pagePreset.orientation;
  const generationPreset = options.generationPreset || getDefaultPortfolioPreset(format);
  const personal = source.personalInfo;
  const firstProjectImage = getFirstProjectRepresentativeImageSlot(
    source,
    templateId === "developer-minimal" ? "1:1" : "16:9",
  );
  const galleryProjectImages = source.projects
    .map((project) => getProjectRepresentativeImageSlot(project, "4:3"))
    .filter((image): image is PortfolioImageSlot => Boolean(image));
  const skillNames = collectPortfolioSkillNames(source);
  const skillLogoImages = createTechLogoImageSlots(skillNames);
  const plan = createFallbackPortfolioGenerationPlan(source);
  const projectTitles = source.projects.slice(0, 6).map((project) => project.company || project.position || "프로젝트");
  const contactText = [personal.email, personal.phone, personal.links?.github, personal.links?.blog]
    .filter(Boolean)
    .join("\n");
  const sections: PortfolioSection[] = [
    {
      id: makeId("hero"),
      type: "hero",
      title: personal.name
        ? `${plan.position} ${personal.name}`
        : `${plan.position} 포트폴리오`,
      subtitle: personal.intro || plan.strengths.join(" · ") || "프로젝트와 경험을 한 곳에 정리합니다.",
      body: "",
      image: firstProjectImage || getHeroSampleImage(templateId),
      sourceKind: "manual",
      visible: true,
    },
    {
      id: makeId("about"),
      type: "about",
      title: "한 줄 소개",
      subtitle: personal.name || plan.position,
      body:
        personal.intro ||
        `${plan.strengths.join(", ")}을 중심으로 프로젝트를 설계하고 구현합니다.`,
      image: createSampleImageSlot(
        PORTFOLIO_SAMPLE_IMAGES.profilePortrait,
        "프로필 이미지 예시",
        "1:1",
      ),
      sourceKind: "manual",
      visible: true,
    },
    {
      id: makeId("skills"),
      type: "skills",
      title: "핵심 역량",
      subtitle: "기술 스택과 업무 강점",
      body: [
        plan.strengths.join(" · "),
        skillNames.slice(0, 10).join(", "),
      ].filter(Boolean).join("\n"),
      tags: skillNames,
      images: skillLogoImages,
      sourceKind: "manual",
      visible: true,
    },
    {
      id: makeId("index"),
      type: "index",
      title: "프로젝트 인덱스",
      subtitle: "대표 프로젝트와 핵심 키워드",
      tags: projectTitles.length ? projectTitles : ["대표 프로젝트", "핵심 역량", "기술 스택"],
      sourceKind: "manual",
      visible: true,
    },
  ];

  source.workExperiences.slice(0, 2).forEach((experience) => {
    sections.push(createExperienceSection(experience));
  });

  source.projects.slice(0, 4).forEach((project, index) => {
    sections.push(createProjectSection(project));
    if (sections.length < template.blueprint.targetSlideCount - 2) {
      sections.push(createProjectInsightSection(project, index));
    }
  });

  source.coverLetters.slice(0, 1).forEach((coverLetter) => {
    sections.push(createCoverLetterSection(coverLetter));
  });

  const gallerySection: PortfolioSection = {
    id: makeId("gallery"),
    type: "gallery",
    title: "작업물 갤러리",
    subtitle: "프로젝트 대표 사진과 스크린샷을 모아 보여줍니다.",
    images: [
      ...galleryProjectImages.slice(0, 3),
      createSampleImageSlot(
        PORTFOLIO_SAMPLE_IMAGES.workspaceApp,
        "웹 서비스 작업 화면 예시",
        "4:3",
      ),
      createSampleImageSlot(
        PORTFOLIO_SAMPLE_IMAGES.projectDashboard,
        "프로젝트 성과 대시보드 예시",
        "4:3",
      ),
      createSampleImageSlot(
        PORTFOLIO_SAMPLE_IMAGES.productGallery,
        "작업물 갤러리 예시",
        "4:3",
      ),
    ].slice(0, 3),
    visible: true,
  };

  const retrospectiveSection = createRetrospectiveSection(plan);
  const contactSection: PortfolioSection = {
    id: makeId("contact"),
    type: "contact",
    title: "연락처",
    body: contactText || "email@example.com",
    sourceKind: "manual",
    visible: true,
  };

  const tailSections = [gallerySection, retrospectiveSection, contactSection];
  const middleLimit = Math.max(0, template.blueprint.targetSlideCount - tailSections.length);

  const document: PortfolioDocument = {
    version: 1,
    templateId,
    format,
    pageSize,
    orientation,
    generationPreset,
    theme: template.theme,
    sections: [...sections.slice(0, middleLimit), ...tailSections].slice(
      0,
      format === "document" ? Math.min(8, template.blueprint.targetSlideCount) : template.blueprint.targetSlideCount,
    ),
  };

  return polishPortfolioDocument(withPortfolioSampleImages(document));
}

export function normalizePortfolioDocument(
  input: unknown,
  fallbackTemplateId: PortfolioTemplateId = "developer-minimal",
): PortfolioDocument {
  if (!input || typeof input !== "object") {
    return createDefaultPortfolioDocument(fallbackTemplateId, EMPTY_PORTFOLIO_SOURCE_DATA);
  }

  const raw = input as Partial<PortfolioDocument>;
  const template = getPortfolioTemplate(raw.templateId || fallbackTemplateId);
  const format = raw.format === "document" ? "document" : "slide";
  const pageSize =
    raw.pageSize === "a4" || raw.pageSize === "16:9"
      ? raw.pageSize
      : getDefaultPortfolioPageSize(format);
  const pagePreset = getPortfolioPagePreset(pageSize);
  const sections = Array.isArray(raw.sections) ? raw.sections : [];

  const document: PortfolioDocument = {
    version: 1,
    templateId: template.id,
    format,
    pageSize,
    orientation:
      raw.orientation === "portrait" || raw.orientation === "landscape"
        ? raw.orientation
        : pagePreset.orientation,
    generationPreset:
      raw.generationPreset === "project-report" ||
      raw.generationPreset === "resume-portfolio" ||
      raw.generationPreset === "interview-pitch"
        ? raw.generationPreset
        : getDefaultPortfolioPreset(format),
    theme: {
      ...template.theme,
      ...(raw.theme || {}),
    },
    sections: sections.map((section) => ({
      ...section,
      id: section.id || makeId(section.type || "section"),
      type: section.type || "about",
      title: section.title || "섹션",
      visible: section.visible !== false,
    })),
  };

  return polishPortfolioDocument(document);
}

function shrinkTextElement(element: PortfolioCanvasElement): PortfolioCanvasElement {
  if (!element.content || (element.kind !== "text" && element.kind !== "tags")) return element;
  const fontSize = element.fontSize || 16;
  const lineHeight = element.lineHeight || Math.round(fontSize * 1.34);
  const approximateCharsPerLine = Math.max(8, Math.floor(element.width / Math.max(fontSize * 0.58, 6)));
  const hardLines = element.content.split(/\n/).length;
  const softLines = Math.ceil(element.content.length / approximateCharsPerLine);
  const estimatedLines = Math.max(hardLines, softLines);
  const maxLines = Math.max(1, Math.floor(element.height / Math.max(lineHeight, 10)));

  if (estimatedLines <= maxLines) return element;
  const ratio = maxLines / estimatedLines;
  const nextFontSize = Math.max(10, Math.floor(fontSize * Math.max(0.68, ratio)));
  return {
    ...element,
    fontSize: nextFontSize,
    lineHeight: Math.round(nextFontSize * 1.32),
  };
}

function clampCanvasElement(
  element: PortfolioCanvasElement,
  canvasWidth = 960,
  canvasHeight = 540,
): PortfolioCanvasElement {
  const minWidth = element.kind === "line" ? 12 : 24;
  const minHeight = element.kind === "line" ? 2 : 18;
  const width = Math.max(minWidth, Math.min(canvasWidth, Math.round(element.width || minWidth)));
  const height = Math.max(minHeight, Math.min(canvasHeight, Math.round(element.height || minHeight)));
  const x = Math.max(0, Math.min(canvasWidth - width, Math.round(element.x || 0)));
  const y = Math.max(0, Math.min(canvasHeight - height, Math.round(element.y || 0)));
  const image = element.image
    ? {
        ...element.image,
        objectFit: element.image.objectFit || "cover",
        aspectRatio: element.image.aspectRatio || "16:9",
        focalPoint: element.image.focalPoint || { x: 50, y: 50 },
      }
    : undefined;

  return shrinkTextElement({
    ...element,
    x,
    y,
    width,
    height,
    image,
    opacity:
      typeof element.opacity === "number"
        ? Math.max(0, Math.min(1, element.opacity))
        : element.opacity,
  });
}

export function polishPortfolioDocument(document: PortfolioDocument): PortfolioDocument {
  const baseDocument = {
    ...document,
    sections: document.sections.map((section) => {
      const nextSection: PortfolioSection = {
        ...section,
        body: section.type === "project" || section.type === "quote" ? compactBody(section.body, 5) : section.body,
        visible: section.visible !== false,
      };
      const canvas =
        !nextSection.canvas || nextSection.canvas.styleVersion !== PORTFOLIO_CANVAS_STYLE_VERSION
          ? buildPortfolioSectionCanvas(nextSection, document) || nextSection.canvas
          : nextSection.canvas;
      return {
        ...nextSection,
        canvas: canvas
          ? {
              width: canvas.width,
              height: canvas.height,
              styleVersion: PORTFOLIO_CANVAS_STYLE_VERSION,
              elements: canvas.elements.map((element) =>
                clampCanvasElement(element, canvas.width, canvas.height),
              ),
            }
          : undefined,
      };
    }),
  };

  return baseDocument;
}

export function buildPortfolioPublicSummary(document: PortfolioDocument) {
  const hero = document.sections.find((section) => section.type === "hero");
  const visibleSections = document.sections.filter((section) => section.visible !== false);
  const projectSections = visibleSections.filter((section) => section.type === "project");
  const thumbnail =
    projectSections.find((section) => section.image?.url || section.image?.assetId)?.image ||
    document.sections.find((section) => section.image?.url || section.image?.assetId)?.image ||
    document.sections
      .flatMap((section) => section.images || [])
      .find((image) => image.url || image.assetId);

  return {
    headline: hero?.subtitle || hero?.title || "",
    projectCount: projectSections.length,
    sectionCount: visibleSections.length,
    thumbnailUrl: thumbnail?.url || "",
    projectTitles: projectSections
      .map((section) => section.title)
      .filter(Boolean)
      .slice(0, 3),
    slideTitles: visibleSections
      .map((section) => section.title)
      .filter(Boolean)
      .slice(0, 6),
    previewPages: visibleSections.slice(0, 12).map((section) => ({
      id: section.id,
      type: section.type,
      title: section.title || "제목 없음",
      subtitle: section.subtitle || section.body?.slice(0, 72),
      canvas: section.canvas,
      thumbnailUrl:
        section.image?.url ||
        section.images?.find((image) => image.url || image.assetId)?.url ||
        "",
    })),
  };
}
