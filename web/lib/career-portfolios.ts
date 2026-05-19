import type { ResumePayload } from "@/app/my/[handle]/profile-types";

export type PortfolioTemplateId =
  | "developer-minimal"
  | "case-study"
  | "visual-showcase";

export type PortfolioFormat = "slide" | "document" | "site";
export type PortfolioPageSize = "16:9" | "a4";
export type PortfolioOrientation = "landscape" | "portrait";
export type PortfolioGenerationPreset =
  | "interview-pitch"
  | "project-report"
  | "resume-portfolio"
  | "web-slide";

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

export type PortfolioSitePageType =
  | "cover"
  | "profile"
  | "skills"
  | "project-index"
  | "case-study"
  | "project-detail"
  | "experience"
  | "retrospective"
  | "contact";

export type PortfolioSiteLayout =
  | "cover-focus"
  | "editorial-cover"
  | "profile-summary"
  | "profile-map"
  | "skills-grid"
  | "tech-radar"
  | "project-index"
  | "case-study"
  | "case-study-flow"
  | "project-detail"
  | "project-dashboard"
  | "evidence-board"
  | "timeline"
  | "closing"
  | "closing-impact";

export type PortfolioSiteBlockType =
  | "text"
  | "tags"
  | "metric"
  | "image"
  | "timeline"
  | "flow"
  | "matrix"
  | "contribution"
  | "callout";

export type PortfolioSiteBlockRole =
  | "headline"
  | "summary"
  | "problem"
  | "role"
  | "solution"
  | "result"
  | "lesson"
  | "impact"
  | "decision"
  | "evidence"
  | "next"
  | "body";

export type PortfolioSiteBlock = {
  id: string;
  type: PortfolioSiteBlockType;
  role?: PortfolioSiteBlockRole;
  label?: string;
  value?: string;
  caption?: string;
  content?: string;
  items?: string[];
  image?: PortfolioImageSlot;
};

export type PortfolioSiteCompositionPattern =
  | "hero-statement"
  | "split-proof"
  | "diagonal-flow"
  | "metric-spotlight"
  | "radial-map"
  | "timeline-track"
  | "evidence-wall"
  | "closing-signal";

export type PortfolioSiteComposition = {
  pattern: PortfolioSiteCompositionPattern;
  focalPoint: "left" | "right" | "center" | "top" | "bottom";
  density: "calm" | "balanced" | "rich";
  accentShape: "bar" | "diagonal" | "grid" | "ring" | "timeline";
  visualMetaphor?: string;
  primaryBlocks?: PortfolioSiteBlockRole[];
};

export type PortfolioSitePage = {
  id: string;
  type: PortfolioSitePageType;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  intent?: string;
  visualDirection?: string;
  narrative?: string;
  emphasis?: string[];
  composition?: PortfolioSiteComposition;
  layout: PortfolioSiteLayout;
  blocks: PortfolioSiteBlock[];
  image?: PortfolioImageSlot;
  sourceId?: string;
  sourceKind?: PortfolioSection["sourceKind"];
  visible?: boolean;
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
  | "techLogo"
  | "shadcnBlock";
export type PortfolioCanvasTextRole = "label" | "title" | "subtitle" | "body" | "tags";
export type PortfolioCanvasFontFamily = "pretendard" | "system" | "serif" | "mono";
export type PortfolioShadcnBlockVariant =
  | "project-index-cards"
  | "tech-logo-grid"
  | "problem-solution-result"
  | "star-method"
  | "architecture-stack"
  | "role-contribution"
  | "before-after-impact"
  | "system-architecture-map"
  | "impact-matrix"
  | "metric-trend"
  | "decision-tree"
  | "competency-radar"
  | "kpi-cards"
  | "timeline-steps"
  | "callout";

export type PortfolioShadcnBlockItem = {
  label?: string;
  title?: string;
  body?: string;
  value?: string;
  progress?: number;
  tone?: "primary" | "accent" | "muted";
  image?: PortfolioImageSlot;
};

export type PortfolioShadcnBlockProps = {
  title?: string;
  subtitle?: string;
  items?: PortfolioShadcnBlockItem[];
  badges?: string[];
};

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
    | "techLogo"
    | "component";
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
  variant?: PortfolioShadcnBlockVariant;
  props?: PortfolioShadcnBlockProps;
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
  mode?: "paged";
  pages?: PortfolioSitePage[];
  /**
   * AI 자율 슬라이드. site 포맷에서 generate 시 AI 가 매번 다른 JSON 트리로
   * 자유 디자인한 슬라이드들. 이 필드가 채워져 있으면 site renderer 는 기존
   * pages/sections 대신 이 트리를 직접 렌더한다.
   */
  freeSlides?: PortfolioFreeSlide[];
};

// ──────────────────────────────────────────────────────────────────────────────
// AI 자율 슬라이드 (옵션 A) — AI 가 직접 JSON 트리로 슬라이드를 자유 디자인한다.
// 안전을 위해 tag 화이트리스트 + className 자유 (Tailwind) + style 일부만 허용.
// ──────────────────────────────────────────────────────────────────────────────

/** 렌더러가 허용하는 HTML 태그 */
export type FreeSlideTag =
  | "div"
  | "section"
  | "header"
  | "footer"
  | "article"
  | "main"
  | "aside"
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "span"
  | "strong"
  | "em"
  | "ul"
  | "ol"
  | "li"
  | "blockquote"
  | "figure"
  | "figcaption"
  | "hr"
  | "br";

/** 허용되는 inline style 키 (CSSProperties 의 안전 subset) */
export type FreeSlideStyle = {
  color?: string;
  backgroundColor?: string;
  background?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: string;
  border?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  textTransform?: "uppercase" | "lowercase" | "capitalize" | "none";
  opacity?: number;
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
  minWidth?: string;
  minHeight?: string;
  display?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  position?: "relative" | "absolute";
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  overflow?: string;
  whiteSpace?: string;
  wordBreak?: string;
  boxShadow?: string;
};

/** AI 가 만든 슬라이드 트리의 노드 */
export type FreeSlideNode = {
  tag: FreeSlideTag;
  className?: string;
  style?: FreeSlideStyle;
  /** 평문 텍스트 (HTML 안 허용) — children 과 동시 사용 가능 */
  text?: string;
  children?: FreeSlideNode[];
};

/**
 * 안전한 슬라이드 레이아웃 12종. 슬라이드 루트의 grid 구조는 우리가 고정하고,
 * AI 는 각 슬롯 안의 콘텐츠만 자유 디자인한다 → overflow/겹침 원천 차단.
 */
export type FreeSlideLayout =
  | "split-left" // 좌(콘텐츠) / 우(보조) 1:1
  | "split-right-wide" // 좌(헤딩) / 우(콘텐츠 풍부) 1:2
  | "split-left-wide" // 좌(콘텐츠 풍부) / 우(보조) 2:1
  | "three-col" // 3등분
  | "hero-statement" // 상단(큰 헤딩) / 하단(본문 + 강조)
  | "hero-with-metric" // 좌(헤딩+요약) / 우(큰 메트릭)
  | "full-bleed-quote" // 가운데 큰 인용구 — 슬롯 1개
  | "journey-track" // 상단(헤딩) / 하단(4단 가로 흐름)
  | "grid-2x2" // 2×2 카드 4개
  | "centered-stack" // 가운데 수직 스택 1개
  | "metric-spotlight" // 좌(큰 숫자) / 우(설명·캡션)
  | "evidence-wall" // 좌(요약) / 우(2×2 증거 카드)
  | "closing-statement"; // 가운데 마감 한 줄

export type FreeSlideLayoutDefinition = {
  id: FreeSlideLayout;
  /** 루트 컨테이너 className (Tailwind) */
  rootClassName: string;
  /** 슬롯 개수 + 슬롯별 className */
  slots: Array<{ key: string; className: string; hint: string }>;
  /** AI 가 이 레이아웃을 골랐을 때 의도된 상황 */
  intentHint: string;
};

/** AI 자율 슬라이드 한 장 — 안전 슬롯 + 슬롯별 자유 콘텐츠 */
export type PortfolioFreeSlide = {
  id: string;
  /** 슬라이드 의도 한 줄 (썸네일/네비게이션 표기용) */
  intent: string;
  /** 어떤 안전 레이아웃을 사용할지 */
  layout: FreeSlideLayout;
  /** 각 슬롯 안의 콘텐츠. layout 정의의 slots 개수와 같아야 한다 */
  slots: FreeSlideNode[];
  /** 원본 데이터 추적용 */
  sourceId?: string;
  sourceKind?: "project" | "experience" | "manual";
  visible?: boolean;
};

export type PortfolioTemplateBlueprint = {
  layoutPreset: "minimal-recruiting" | "case-study-report" | "visual-product";
  imagePolicy: "profile-first" | "project-first" | "visual-first";
  infographicPolicy: Array<"flow" | "metric" | "timeline" | "techLogo" | "shadcnBlock">;
  tonePolicy: "concise-korean-hiring" | "case-study-editorial" | "visual-showcase";
  targetSlideCount: number;
  /** 같은 데이터를 다른 페이지 흐름으로 풀어내기 위한 시드 명세 */
  pageFlow?: PortfolioTemplatePageFlow;
  /** 사이트 렌더러가 슬라이드별 시각 톤을 분기하는 데 쓰는 힌트 */
  visualStyle?: PortfolioTemplateVisualStyle;
};

/**
 * 템플릿마다 어떤 페이지를 어떤 순서로 만들지 결정. createDefaultPortfolioSiteDocument
 * 가 이 값을 보고 슬라이드 시퀀스를 만든다.
 */
export type PortfolioTemplatePageFlow = {
  /** 표지 강조 방식 */
  cover: "minimal-statement" | "editorial-headline" | "bold-impact";
  /** 프로필 페이지 포함 여부 + 형태 */
  profile: "skip" | "compact-row" | "deep-manifesto";
  /** 기술 스택 페이지 형태 */
  skills: "chip-grid" | "axis-map" | "logo-wall";
  /** 인덱스 페이지(목차) 포함 여부 */
  index: boolean;
  /** 프로젝트 한 건당 몇 장으로 풀지 */
  projectSlidesEach: 1 | 2 | 3;
  /** 회고 페이지 포함 여부 */
  retrospective: boolean;
  /** 마감 페이지 형태 */
  closing: "minimal-contact" | "magazine-end" | "bold-cta";
};

/** 사이트 렌더러가 슬라이드별 톤을 분기하는 데 쓰는 힌트 */
export type PortfolioTemplateVisualStyle = {
  /** 헤딩 폰트 family (CSS font-family) */
  headingFamily: string;
  /** 본문 폰트 family (CSS font-family) */
  bodyFamily: string;
  /** 헤딩 weight */
  headingWeight: 600 | 700 | 800 | 900;
  /** 헤딩 tracking */
  headingTracking: "tight" | "normal" | "wide";
  /** 슬라이드 정렬 */
  align: "left" | "center";
  /** density (slide 안 콘텐츠 밀도) */
  density: "calm" | "balanced" | "rich";
  /** 강조 방식 — bar(좌측 막대) / underline / block(컬러 블록) / serif-emphasis */
  emphasis: "bar" | "underline" | "block" | "serif-emphasis";
  /** 호출 font 들이 외부 webfont 인지 (Google Fonts 동적 로드) */
  googleFontsHref?: string;
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
    componentPattern?: Extract<
      PortfolioShadcnBlockVariant,
      | "star-method"
      | "problem-solution-result"
      | "architecture-stack"
      | "role-contribution"
      | "before-after-impact"
      | "system-architecture-map"
      | "impact-matrix"
      | "metric-trend"
      | "decision-tree"
      | "competency-radar"
    >;
    infographicType: "flow" | "metric" | "timeline" | "shadcnBlock";
  }>;
  slidePlan: Array<{
    type: PortfolioSectionType;
    title: string;
    purpose: string;
    sourceId?: string;
    infographicType?: "flow" | "metric" | "timeline" | "techLogo" | "shadcnBlock";
  }>;
};

export type PortfolioEvidenceBrief = {
  careerThesis: string;
  strongestSignals: string[];
  weakSignals: string[];
  recommendedSlideCount: number;
  projectBriefs: Array<{
    sourceId?: string;
    title: string;
    confirmed: string[];
    inferred: string[];
    technicalDecisions: string[];
    hardParts: string[];
    proofPoints: string[];
    sellingPoints: string[];
    missingFields: string[];
    slideAngles: string[];
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
      type: PortfolioSectionType | PortfolioSitePageType;
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

export const PORTFOLIO_CANVAS_STYLE_VERSION = 8;

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
  if (format === "site") return "web-slide";
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
    // Minimal Tech — 백엔드/시스템 엔지니어용. 큰 타이포 + 넓은 여백 + 메트릭 강조.
    // 페이지 수가 짧고(8~9장) 정보 밀도가 calm. 같은 데이터를 가장 압축적으로 풀어냄.
    id: "developer-minimal",
    name: "Minimal Tech",
    description: "큰 타이포·넓은 여백·메트릭 강조. 백엔드/시스템 인상에 적합한 압축형(8~9장).",
    imagePolicy: "이미지 없이 텍스트와 메트릭 중심",
    previewImage: PORTFOLIO_BACKGROUND_IMAGES.calmGreenCover,
    theme: {
      primary: "#111827",
      accent: "#0ea5e9",
      background: "#fafafa",
      surface: "#ffffff",
      text: "#0a0a0a",
      muted: "#737373",
      radius: 2,
    },
    blueprint: {
      layoutPreset: "minimal-recruiting",
      imagePolicy: "profile-first",
      infographicPolicy: ["metric", "shadcnBlock", "techLogo"],
      tonePolicy: "concise-korean-hiring",
      targetSlideCount: 9,
      pageFlow: {
        cover: "minimal-statement",
        profile: "compact-row",
        skills: "chip-grid",
        index: false,
        projectSlidesEach: 1,
        retrospective: false,
        closing: "minimal-contact",
      },
      visualStyle: {
        headingFamily: "'Inter', Pretendard, system-ui, sans-serif",
        bodyFamily: "Pretendard, 'Inter', system-ui, sans-serif",
        headingWeight: 800,
        headingTracking: "tight",
        align: "left",
        density: "calm",
        emphasis: "bar",
        googleFontsHref:
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap",
      },
    },
  },
  {
    // Editorial Magazine — PM/디자이너/기획 성향. 깊은 about + 케이스마다 3장으로
    // 문제·과정·결과를 분리. serif 헤딩 + 가운데 정렬 + 인용구 강조. 페이지 12~14장.
    id: "case-study",
    name: "Editorial Magazine",
    description: "매거진 톤. serif 헤딩·가운데 정렬·인용구·프로젝트당 3장 분리(12~14장).",
    imagePolicy: "프로젝트 스크린샷과 작업물 이미지를 큰 카드에 배치",
    previewImage: PORTFOLIO_BACKGROUND_IMAGES.calmGreenCase,
    theme: {
      primary: "#1c1917",
      accent: "#b45309",
      background: "#fdf6e3",
      surface: "#ffffff",
      text: "#111827",
      muted: "#78716c",
      radius: 0,
    },
    blueprint: {
      layoutPreset: "case-study-report",
      imagePolicy: "project-first",
      infographicPolicy: ["shadcnBlock", "flow", "metric", "timeline", "techLogo"],
      tonePolicy: "case-study-editorial",
      targetSlideCount: 14,
      pageFlow: {
        cover: "editorial-headline",
        profile: "deep-manifesto",
        skills: "axis-map",
        index: true,
        projectSlidesEach: 3,
        retrospective: true,
        closing: "magazine-end",
      },
      visualStyle: {
        headingFamily: "'Playfair Display', Pretendard, Georgia, serif",
        bodyFamily: "Pretendard, system-ui, sans-serif",
        headingWeight: 700,
        headingTracking: "normal",
        align: "center",
        density: "rich",
        emphasis: "serif-emphasis",
        googleFontsHref:
          "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800;900&display=swap",
      },
    },
  },
  {
    // Bold Showcase — 결과 중심·시니어 발표용. 큰 BigNumber + 컬러 블록 + 대비.
    // 임팩트 cover + 프로젝트별 풀블리드 + 회고 마감. 10~11장.
    id: "visual-showcase",
    name: "Bold Showcase",
    description: "컬러 블록·큰 숫자·풀블리드 카드. 결과 임팩트·시니어 발표용(10~11장).",
    imagePolicy: "본인 얼굴, 대표 작업물, 갤러리 이미지를 전면 배치",
    previewImage: PORTFOLIO_BACKGROUND_IMAGES.calmGreenProfile,
    theme: {
      primary: "#0f172a",
      accent: "#e11d48",
      background: "#0f172a",
      surface: "#1e293b",
      text: "#f8fafc",
      muted: "#cbd5e1",
      radius: 12,
    },
    blueprint: {
      layoutPreset: "visual-product",
      imagePolicy: "visual-first",
      infographicPolicy: ["metric", "shadcnBlock", "flow", "techLogo"],
      tonePolicy: "visual-showcase",
      targetSlideCount: 11,
      pageFlow: {
        cover: "bold-impact",
        profile: "compact-row",
        skills: "logo-wall",
        index: false,
        projectSlidesEach: 2,
        retrospective: true,
        closing: "bold-cta",
      },
      visualStyle: {
        headingFamily: "'Space Grotesk', Pretendard, system-ui, sans-serif",
        bodyFamily: "Pretendard, 'Space Grotesk', system-ui, sans-serif",
        headingWeight: 900,
        headingTracking: "tight",
        align: "left",
        density: "rich",
        emphasis: "block",
        googleFontsHref:
          "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap",
      },
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

function bodyItem(label: string, body?: string): PortfolioShadcnBlockItem {
  return {
    label,
    title: label,
    body: body?.replace(/^(문제\/배경|문제|역할|해결|성과|결과|배운 점):\s*/u, "") || "",
  };
}

function extractBodyItem(body: string | undefined, label: string, fallback: string) {
  const line = (body || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${label}:`) || item.startsWith(`${label}/`));
  return line?.replace(/^[^:]+:\s*/u, "") || fallback;
}

function pickProjectBlockVariant(section: PortfolioSection): PortfolioShadcnBlockVariant {
  const text = `${section.title} ${section.subtitle || ""} ${section.body || ""} ${(section.tags || []).join(" ")}`.toLowerCase();
  if (/의사결정|선택|우선순위|trade.?off|트레이드오프|분기|조건|정책/.test(text)) {
    return "decision-tree";
  }
  if (/역량|평가|강점|skill|competency|성장|학습/.test(text)) {
    return "competency-radar";
  }
  if (/api|backend|백엔드|서버|db|database|아키텍처|architecture|infra|cloud|msa|kafka|queue/.test(text)) {
    return "system-architecture-map";
  }
  if (/데이터|분석|지표|kpi|자동화|etl|dashboard|대시보드|리포트|metric/.test(text)) {
    return "metric-trend";
  }
  if (/비교|개선|전후|before|after|impact|효과/.test(text)) {
    return "impact-matrix";
  }
  if (/infra|cloud/.test(text)) {
    return "architecture-stack";
  }
  if (/pm|협업|기획|리드|조율|우선순위|stakeholder/.test(text)) {
    return "role-contribution";
  }
  if (/상황|과제|행동|star/.test(text)) {
    return "star-method";
  }
  return "problem-solution-result";
}

function projectBlockItems(section: PortfolioSection, variant: PortfolioShadcnBlockVariant): PortfolioShadcnBlockItem[] {
  const problem = extractBodyItem(section.body, "문제", extractBodyItem(section.body, "문제/배경", "해결해야 할 문제를 정의했습니다."));
  const role = extractBodyItem(section.body, "역할", section.subtitle || "담당 역할을 기준으로 기여 범위를 정리했습니다.");
  const solution = extractBodyItem(section.body, "해결", "해결 방안을 설계하고 구현했습니다.");
  const result = extractBodyItem(section.body, "성과", extractBodyItem(section.body, "결과", "구현 결과와 배운 점을 정리했습니다."));
  const lesson = extractBodyItem(section.body, "배운 점", "다음 개선 방향을 도출했습니다.");

  if (variant === "star-method") {
    return [
      bodyItem("상황", problem),
      bodyItem("과제", role),
      bodyItem("행동", solution),
      bodyItem("결과", result),
    ];
  }

  if (variant === "architecture-stack") {
    return [
      bodyItem("요구", problem),
      bodyItem("구조", role),
      bodyItem("구현", solution),
      bodyItem("검증", result),
    ];
  }

  if (variant === "system-architecture-map") {
    return [
      { ...bodyItem("Input", problem), progress: 35, tone: "muted" },
      { ...bodyItem("Service", solution), progress: 72, tone: "primary" },
      { ...bodyItem("Data", role), progress: 58, tone: "accent" },
      { ...bodyItem("Output", result), progress: 86, tone: "primary" },
    ];
  }

  if (variant === "metric-trend") {
    return [
      { ...bodyItem("Before", problem), value: "문제", progress: 34, tone: "muted" },
      { ...bodyItem("Build", solution), value: "구현", progress: 68, tone: "accent" },
      { ...bodyItem("Impact", result), value: "성과", progress: 88, tone: "primary" },
    ];
  }

  if (variant === "decision-tree") {
    return [
      { label: "1", title: "판단 기준", body: problem, progress: 40, tone: "muted" },
      { label: "2", title: "선택지", body: role, progress: 62, tone: "accent" },
      { label: "3", title: "결정", body: solution, progress: 78, tone: "primary" },
      { label: "4", title: "검증", body: result, progress: 90, tone: "primary" },
    ];
  }

  if (variant === "competency-radar") {
    return [
      { ...bodyItem("문제정의", problem), progress: 72, tone: "primary" },
      { ...bodyItem("구현", solution), progress: 84, tone: "accent" },
      { ...bodyItem("협업", role), progress: 68, tone: "muted" },
      { ...bodyItem("성과", result), progress: 88, tone: "primary" },
    ];
  }

  if (variant === "impact-matrix") {
    return [
      { ...bodyItem("Before", problem), progress: 36, tone: "muted" },
      { ...bodyItem("Action", solution), progress: 70, tone: "accent" },
      { ...bodyItem("After", result), progress: 86, tone: "primary" },
      { ...bodyItem("Next", lesson), progress: 64, tone: "muted" },
    ];
  }

  if (variant === "role-contribution") {
    return [
      bodyItem("역할", role),
      bodyItem("협업", problem),
      bodyItem("기여", solution),
      bodyItem("성과", result),
    ];
  }

  if (variant === "before-after-impact") {
    return [
      bodyItem("Before", problem),
      bodyItem("Action", solution),
      bodyItem("Impact", result || lesson),
    ];
  }

  return [
    bodyItem("문제", problem),
    bodyItem("해결", solution),
    bodyItem("결과", result),
  ];
}

function projectBlockTitle(variant: PortfolioShadcnBlockVariant) {
  if (variant === "star-method") return "STAR 경험 정리";
  if (variant === "architecture-stack") return "기술 구조와 구현";
  if (variant === "system-architecture-map") return "시스템 구조 맵";
  if (variant === "impact-matrix") return "임팩트 매트릭스";
  if (variant === "metric-trend") return "지표 변화 흐름";
  if (variant === "decision-tree") return "의사결정 트리";
  if (variant === "competency-radar") return "역량 레이더";
  if (variant === "role-contribution") return "역할과 기여도";
  if (variant === "before-after-impact") return "개선 전후와 성과";
  return "문제 해결 흐름";
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
        : kind === "shadcnBlock"
          ? "component"
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

function canvasShadcnBlockElement(
  id: string,
  variant: PortfolioShadcnBlockVariant,
  x: number,
  y: number,
  width: number,
  height: number,
  props: PortfolioShadcnBlockProps,
  patch: Partial<PortfolioCanvasElement> = {},
): PortfolioCanvasElement {
  return canvasVisualElement(id, "shadcnBlock", x, y, width, height, {
    role: "component",
    variant,
    props,
    ...patch,
  });
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

function canvasCorporateHeaderElements(
  label: string,
  title: string,
  theme: PortfolioTheme,
): PortfolioCanvasElement[] {
  return [
    canvasVisualElement("header-step-primary", "shape", 50, 34, 122, 28, {
      fill: theme.primary,
      opacity: 0.96,
    }),
    canvasVisualElement("header-step-accent", "shape", 172, 34, 28, 28, {
      fill: theme.accent,
      opacity: 0.92,
    }),
    canvasVisualElement("header-step-rule", "line", 200, 48, 690, 1, {
      stroke: theme.primary,
      opacity: 0.34,
    }),
    canvasTextElement("header-label", "label", label, 66, 41, 96, 14, 10, 900, "#ffffff"),
    canvasTextElement("title", "title", title, 220, 30, 556, 36, 22, 900, theme.text),
  ];
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
      infographicType: "shadcnBlock",
    } satisfies PortfolioGenerationPlan["projectMessages"][number];
  });

  return {
    position,
    strengths,
    projectMessages,
    slidePlan: [
      { type: "hero", title: `${position} 포트폴리오`, purpose: "지원자의 포지션과 강점 제시" },
      { type: "about", title: "한 줄 소개", purpose: "프로필과 일하는 방식 요약" },
      { type: "skills", title: "핵심 역량", purpose: "채용 직무와 연결되는 기술 스택 제시", infographicType: "shadcnBlock" },
      { type: "index", title: "프로젝트 인덱스", purpose: "대표 프로젝트 목록과 핵심 키워드 정리", infographicType: "shadcnBlock" },
      ...projectMessages.flatMap((project) => [
        { type: "project" as const, title: project.title, purpose: project.coreMessage, sourceId: project.sourceId, infographicType: project.infographicType },
      ]),
      { type: "gallery", title: "작업물 갤러리", purpose: "대표 이미지와 작업 흔적 제시" },
      { type: "retrospective", title: "성장 포인트", purpose: "경험을 통해 확장된 역량 정리" },
      { type: "contact", title: "연락처", purpose: "후속 연락 정보 제공" },
    ],
  };
}

function cleanEvidenceItems(items: Array<string | undefined>, max = 6) {
  return Array.from(
    new Set(
      items
        .map((item) => item?.replace(/\s+/g, " ").trim())
        .filter((item): item is string => Boolean(item && item.length > 0)),
    ),
  ).slice(0, max);
}

function projectEvidenceTitle(project: PortfolioSourceData["projects"][number], index = 0) {
  return projectDisplayTitle(project, index);
}

function createFallbackProjectEvidenceBrief(
  project: PortfolioSourceData["projects"][number],
  index = 0,
): PortfolioEvidenceBrief["projectBriefs"][number] {
  const title = projectEvidenceTitle(project, index);
  const stack = cleanEvidenceItems([...(project.techStack || []), ...(project.tags || [])], 8);
  const confirmed = cleanEvidenceItems(
    [
      project.description,
      project.position ? `${project.position} 역할로 참여` : undefined,
      project.period ? `${project.period} 진행` : undefined,
      stack.length ? `${stack.slice(0, 5).join(", ")} 활용` : undefined,
      project.situation,
      project.role,
      project.solution,
      project.result,
      project.lesson,
    ],
    7,
  );
  const inferred = cleanEvidenceItems(
    [
      project.description && project.role
        ? "프로젝트 설명과 담당 역할을 연결해 실제 기여 범위를 설명할 수 있음"
        : undefined,
      stack.length
        ? "기술 스택을 단순 목록이 아니라 구현 맥락과 연결해 설명할 수 있음"
        : undefined,
      project.solution
        ? "해결 방식 중심으로 기술 선택과 구현 판단을 풀어낼 수 있음"
        : undefined,
      project.lesson
        ? "회고 내용을 다음 프로젝트에 적용 가능한 판단 기준으로 확장할 수 있음"
        : undefined,
    ],
    5,
  );
  const technicalDecisions = cleanEvidenceItems(
    [
      project.solution,
      stack.length ? `${stack.slice(0, 4).join(", ")}를 중심으로 구현 범위 구성` : undefined,
      project.role,
    ],
    4,
  );
  const hardParts = cleanEvidenceItems(
    [
      project.difficulty,
      project.situation,
      !project.difficulty && !project.situation ? "문제 상황과 제약 조건을 더 구체화하면 설득력이 커짐" : undefined,
    ],
    4,
  );
  const proofPoints = cleanEvidenceItems(
    [
      project.result,
      project.lesson,
      project.period ? `진행 기간: ${project.period}` : undefined,
      project.position ? `담당 역할: ${project.position}` : undefined,
    ],
    5,
  );
  const sellingPoints = cleanEvidenceItems(
    [
      project.result || project.solution || project.description,
      technicalDecisions[0],
      inferred[0],
    ],
    4,
  );
  const missingFields = cleanEvidenceItems(
    [
      project.result ? undefined : "결과/성과",
      project.difficulty || project.situation ? undefined : "어려웠던 문제 또는 제약",
      project.solution ? undefined : "해결 방식",
      project.role || project.position ? undefined : "구체적인 본인 역할",
      "정량 지표가 있다면 추가",
    ],
    5,
  );
  const slideAngles = cleanEvidenceItems(
    [
      `${title}가 해결한 문제`,
      "내가 실제로 맡은 역할과 바꾼 구조",
      stack.length ? `${stack.slice(0, 2).join(" / ")} 선택 이유` : "기술 선택 이유",
      "어려웠던 지점과 해결 과정",
      "결과와 다음 적용점",
    ],
    5,
  );

  return {
    sourceId: project.id,
    title,
    confirmed,
    inferred,
    technicalDecisions,
    hardParts,
    proofPoints,
    sellingPoints,
    missingFields,
    slideAngles,
  };
}

export function createFallbackPortfolioEvidenceBrief(
  source: PortfolioSourceData,
  plan: PortfolioGenerationPlan = createFallbackPortfolioGenerationPlan(source),
): PortfolioEvidenceBrief {
  const projectBriefs = source.projects
    .slice(0, 4)
    .map((project, index) => createFallbackProjectEvidenceBrief(project, index));
  const strongestSignals = cleanEvidenceItems(
    [
      ...plan.strengths,
      ...projectBriefs.flatMap((brief) => brief.sellingPoints.slice(0, 1)),
      ...source.workExperiences.map((experience) =>
        [experience.company, experience.position].filter(Boolean).join(" · "),
      ),
    ],
    6,
  );
  const weakSignals = cleanEvidenceItems(
    [
      ...projectBriefs.flatMap((brief) => brief.missingFields),
      source.projects.length ? undefined : "대표 프로젝트",
      source.skills.length ? undefined : "기술 스택",
    ],
    6,
  );
  const averageSignalCount = projectBriefs.length
    ? projectBriefs.reduce(
        (sum, brief) =>
          sum +
          brief.confirmed.length +
          brief.inferred.length +
          brief.technicalDecisions.length +
          brief.hardParts.filter((item) => !item.includes("구체화")).length +
          brief.proofPoints.length +
          brief.sellingPoints.length -
          Math.min(3, brief.missingFields.length),
        0,
      ) / projectBriefs.length
    : 0;
  const recommendedSlideCount =
    source.projects.length === 0
      ? 6
      : averageSignalCount < 8
        ? 8
        : averageSignalCount < 13
          ? 11
          : Math.min(16, 7 + source.projects.length * 3 + source.workExperiences.length);

  return {
    careerThesis:
      strongestSignals[0] ||
      `${plan.position}로서 프로젝트 경험을 근거 중심으로 설명합니다.`,
    strongestSignals,
    weakSignals,
    recommendedSlideCount,
    projectBriefs,
  };
}

export function normalizePortfolioEvidenceBrief(
  value: unknown,
  fallback: PortfolioEvidenceBrief,
): PortfolioEvidenceBrief {
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<PortfolioEvidenceBrief>;
  const projectBriefs = Array.isArray(raw.projectBriefs)
    ? raw.projectBriefs.map((brief, index) => {
        const fallbackBrief = fallback.projectBriefs[index];
        const rawBrief = brief && typeof brief === "object"
          ? (brief as Partial<PortfolioEvidenceBrief["projectBriefs"][number]>)
          : {};
        return {
          sourceId: rawBrief.sourceId || fallbackBrief?.sourceId,
          title: rawBrief.title || fallbackBrief?.title || `프로젝트 ${index + 1}`,
          confirmed: cleanEvidenceItems(rawBrief.confirmed || fallbackBrief?.confirmed || [], 8),
          inferred: cleanEvidenceItems(rawBrief.inferred || fallbackBrief?.inferred || [], 8),
          technicalDecisions: cleanEvidenceItems(
            rawBrief.technicalDecisions || fallbackBrief?.technicalDecisions || [],
            6,
          ),
          hardParts: cleanEvidenceItems(rawBrief.hardParts || fallbackBrief?.hardParts || [], 6),
          proofPoints: cleanEvidenceItems(rawBrief.proofPoints || fallbackBrief?.proofPoints || [], 6),
          sellingPoints: cleanEvidenceItems(
            rawBrief.sellingPoints || fallbackBrief?.sellingPoints || [],
            6,
          ),
          missingFields: cleanEvidenceItems(
            rawBrief.missingFields || fallbackBrief?.missingFields || [],
            8,
          ),
          slideAngles: cleanEvidenceItems(rawBrief.slideAngles || fallbackBrief?.slideAngles || [], 6),
        };
      })
    : fallback.projectBriefs;

  return {
    careerThesis:
      typeof raw.careerThesis === "string" && raw.careerThesis.trim()
        ? raw.careerThesis.trim()
        : fallback.careerThesis,
    strongestSignals: cleanEvidenceItems(raw.strongestSignals || fallback.strongestSignals, 8),
    weakSignals: cleanEvidenceItems(raw.weakSignals || fallback.weakSignals, 8),
    recommendedSlideCount:
      typeof raw.recommendedSlideCount === "number"
        ? Math.max(5, Math.min(16, Math.round(raw.recommendedSlideCount)))
        : fallback.recommendedSlideCount,
    projectBriefs: projectBriefs.length ? projectBriefs.slice(0, 4) : fallback.projectBriefs,
  };
}

function buildHeroCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  return createSectionCanvas([
    ...canvasCorporateHeaderElements("PORTFOLIO", section.title, theme),
    canvasVisualElement("cover-soft-shape", "shape", 552, 320, 428, 240, {
      fill: theme.accent,
      opacity: 0.2,
    }),
    canvasTextElement("hero-display", "subtitle", section.subtitle || section.title, 74, 168, 610, 128, 50, 900, theme.text),
    canvasTextElement("subtitle", "subtitle", section.body || "", 78, 326, 530, 68, 22, 700, theme.muted),
    canvasImageElement("image", section.image, 678, 130, 182, 182),
  ]);
}

function buildAboutCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  return createSectionCanvas([
    ...canvasCorporateHeaderElements("PROFILE", section.title, theme),
    canvasVisualElement("profile-panel", "shape", 50, 100, 280, 384, {
      fill: theme.primary,
      opacity: 0.72,
    }),
    canvasTextElement("body", "body", compactBody(section.body, 4), 382, 158, 500, 132, 18, 500, theme.text),
    canvasImageElement("image", section.image, 98, 156, 184, 184),
    canvasTextElement("subtitle", "subtitle", section.subtitle || "프로필", 86, 376, 220, 64, 17, 800, "#ffffff"),
  ]);
}

function buildSkillsCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  const techItems = (section.images || []).slice(0, 12).map((image) => ({
    title: image.caption || image.alt?.replace(/\s*로고$/, "") || "Stack",
    image,
  }));

  return createSectionCanvas([
    ...canvasCorporateHeaderElements("STACK", section.title, theme),
    canvasTextElement("body", "body", compactBody(section.body, 4), 74, 132, 330, 128, 17, 600, theme.muted),
    canvasShadcnBlockElement("skill-summary", "kpi-cards", 74, 320, 292, 82, {
      items: [
        { label: "주요 기술", value: `${section.tags?.length || 0}`, body: "자동 추출" },
        { label: "활용 영역", value: "서비스", body: "프로젝트 기반" },
      ],
    }, { stroke: theme.primary, fill: "#ffffff" }),
    canvasShadcnBlockElement("tech-stack-grid", "tech-logo-grid", 462, 112, 392, 322, {
      title: "기술 스택",
      items: techItems.length
        ? techItems
        : (section.tags || []).slice(0, 10).map((title) => ({ title })),
    }, { stroke: theme.primary, fill: "#ffffff" }),
  ]);
}

function buildProjectCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  const flowItems = section.tags?.slice(0, 3).length
    ? section.tags.slice(0, 3)
    : ["문제 정의", "해결 구현", "결과 검증"];
  const blockVariant = pickProjectBlockVariant(section);

  return createSectionCanvas([
    ...canvasCorporateHeaderElements("PROJECT CASE", section.title, theme),
    canvasVisualElement("left-panel", "shape", 50, 106, 248, 150, { fill: theme.primary, opacity: 0.74 }),
    canvasTextElement("subtitle", "subtitle", section.subtitle || "역할과 기간", 72, 132, 202, 24, 13, 900, "#f8fafc"),
    canvasTextElement("tags", "tags", (section.tags || []).slice(0, 4).join("  ·  "), 72, 166, 204, 46, 11, 800, "#f8fafc"),
    canvasTextElement("body", "body", compactBody(section.body, 1), 72, 286, 230, 46, 12, 700, theme.muted),
    canvasImageElement("image", section.image, 342, 92, 544, 148),
    canvasShadcnBlockElement("case-flow", blockVariant, 342, 270, 544, 212, {
      title: projectBlockTitle(blockVariant),
      items: projectBlockItems(section, blockVariant),
      badges: flowItems,
    }, { stroke: theme.primary, fill: "#ffffff" }),
  ]);
}

function buildIndexCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  const items = section.tags?.length ? section.tags.slice(0, 6) : ["대표 프로젝트", "핵심 역량", "기술 스택"];
  return createSectionCanvas([
    ...canvasCorporateHeaderElements("INDEX", section.title, theme),
    canvasTextElement("subtitle", "subtitle", section.subtitle || "대표 프로젝트와 핵심 키워드", 74, 120, 420, 38, 18, 800, theme.muted),
    canvasShadcnBlockElement("project-index", "project-index-cards", 104, 196, 752, 250, {
      title: section.subtitle || "선택한 프로젝트",
      items: items.map((title, index) => ({
        label: `0${index + 1}`,
        title,
        body: index === 0 ? "대표 케이스스터디" : "연결 프로젝트",
      })),
    }, { stroke: theme.primary, fill: "#ffffff" }),
  ]);
}

function buildGalleryCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  return createSectionCanvas([
    ...canvasCorporateHeaderElements("VISUAL PROOF", section.title, theme),
    canvasTextElement("subtitle", "subtitle", section.subtitle || "", 72, 116, 760, 42, 16, 700, theme.muted),
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
    ...canvasCorporateHeaderElements("GROWTH", section.title, theme),
    canvasTextElement("body", "body", compactBody(section.body, 4), 74, 136, 370, 128, 17, 600, theme.muted),
    canvasShadcnBlockElement("growth-steps", "timeline-steps", 500, 112, 348, 286, {
      title: "성장 흐름",
      items: items.map((title, index) => ({
        label: `${index + 1}`,
        title,
        body: index === 0 ? "문제 인식" : index === items.length - 1 ? "다음 개선점" : "실행 경험",
      })),
    }, { stroke: theme.primary, fill: "#ffffff" }),
    canvasShadcnBlockElement("growth-metric", "kpi-cards", 74, 386, 230, 64, {
      items: [{ label: "정리된 경험", value: `${items.length}`, body: "성장 키워드" }],
    }, { stroke: theme.primary, fill: "#ffffff" }),
  ]);
}

function buildContactCanvas(section: PortfolioSection, theme: PortfolioTheme) {
  return createSectionCanvas([
    ...canvasCorporateHeaderElements("CONTACT", section.title, theme),
    canvasTextElement("body", "body", compactBody(section.body, 5), 270, 210, 420, 116, 20, 800, theme.muted),
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
      canvasShadcnBlockElement("profile-growth", "timeline-steps", 74, 548, 610, 216, {
        title: "핵심 경험 흐름",
        items: (tags.length ? tags : ["문제 정의", "구현", "검증", "개선"]).map((item, index) => ({
          label: `${index + 1}`,
          title: item,
          body: index === 0 ? "강점 키워드" : "경험 기반",
        })),
      }, { stroke: theme.primary, fill: "#ffffff" }),
      canvasTextElement("footer", "label", "Profile Summary", 74, 1018, 180, 24, 12, 800, theme.muted),
    ], pageSize);
  }

  if (section.type === "skills") {
    const techItems = (section.images || []).slice(0, 12).map((image) => ({
      title: image.caption || image.alt?.replace(/\s*로고$/, "") || "Stack",
      image,
    }));

    return createSectionCanvas([
      canvasTextElement("label", "label", "CAPABILITY", 74, 84, 190, 28, 15, 900, theme.primary),
      canvasTextElement("title", "title", title, 74, 134, 480, 64, 36, 900, theme.text),
      canvasTextElement("body", "body", body || "사용 기술과 업무 강점을 정리합니다.", 76, 224, 580, 88, 17, 600, theme.muted),
      canvasShadcnBlockElement("tech-stack-grid", "tech-logo-grid", 74, 346, 620, 360, {
        title: "기술 로고",
        items: techItems.length
          ? techItems
          : tags.slice(0, 12).map((tag) => ({ title: tag })),
      }, { stroke: theme.primary, fill: "#ffffff" }),
      canvasShadcnBlockElement("skill-summary", "kpi-cards", 74, 812, 422, 74, {
        items: [
          { label: "주요 기술", value: `${section.tags?.length || 0}`, body: "프로젝트 기반" },
          { label: "포트폴리오 포맷", value: "A4", body: "보고서형" },
        ],
      }, { stroke: theme.primary, fill: "#ffffff" }),
    ], pageSize);
  }

  if (section.type === "index") {
    return createSectionCanvas([
      canvasTextElement("label", "label", "CONTENTS", 74, 84, 180, 28, 15, 900, theme.primary),
      canvasTextElement("title", "title", title, 74, 134, 480, 64, 36, 900, theme.text),
      canvasShadcnBlockElement("project-index", "project-index-cards", 74, 250, 620, 360, {
        title: "구성 목차",
        items: (tags.length ? tags.slice(0, 6) : ["프로필", "기술 스택", "프로젝트"]).map((item, index) => ({
          label: String(index + 1).padStart(2, "0"),
          title: item,
          body: index === 0 ? "대표 흐름" : "포트폴리오 섹션",
        })),
      }, { stroke: theme.primary, fill: "#ffffff" }),
      canvasTextElement("body", "body", section.subtitle || "선택한 프로젝트와 경험의 흐름입니다.", 76, 700, 520, 78, 17, 600, theme.muted),
    ], pageSize);
  }

  if (section.type === "project") {
    const flowItems = tags.length ? tags.slice(0, 3) : ["문제", "역할", "해결"];
    const blockVariant = pickProjectBlockVariant(section);
    return createSectionCanvas([
      canvasTextElement("label", "label", "PROJECT CASE", 74, 70, 180, 28, 15, 900, theme.primary),
      canvasTextElement("title", "title", title, 74, 122, 560, 90, 32, 900, theme.text),
      canvasTextElement("subtitle", "subtitle", section.subtitle || "역할과 기간", 76, 222, 540, 34, 16, 800, theme.muted),
      canvasImageElement("image", section.image, 74, 292, 646, 280),
      canvasShadcnBlockElement("case-flow", blockVariant, 96, 618, 602, 200, {
        title: projectBlockTitle(blockVariant),
        items: projectBlockItems(section, blockVariant),
        badges: flowItems,
      }, { stroke: theme.primary, fill: "#ffffff" }),
      canvasTextElement("body", "body", compactBody(section.body, 3) || "프로젝트 내용을 입력하세요.", 96, 852, 600, 126, 15, 500, theme.text),
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

  if (document.format === "site") {
    const pages = (document.pages || []).map((page) => ({
      ...page,
      image: undefined,
      blocks: page.blocks.filter((block) => block.type !== "image"),
    }));

    return {
      ...document,
      pages,
      sections: sitePagesToSections(pages),
    };
  }

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

function createSiteBlock(
  type: PortfolioSiteBlockType,
  block: Omit<PortfolioSiteBlock, "id" | "type"> & { id?: string },
): PortfolioSiteBlock {
  return {
    ...block,
    id: block.id || makeId(`site-${type}`),
    type,
  };
}

function createSiteTextBlock(
  role: PortfolioSiteBlockRole,
  content: string,
  label?: string,
) {
  return createSiteBlock("text", { role, label, content });
}

function createSiteTagsBlock(items: string[], label = "핵심 키워드") {
  return createSiteBlock("tags", {
    label,
    items: Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, 12),
  });
}

function createSiteMetricBlock(label: string, value: string, caption?: string) {
  return createSiteBlock("metric", { label, value, caption });
}

function createSiteTimelineBlock(items: string[], label = "흐름") {
  return createSiteBlock("timeline", {
    label,
    items: items.map((item) => item.trim()).filter(Boolean).slice(0, 8),
  });
}

function createSiteFlowBlock(items: string[], label = "핵심 흐름") {
  return createSiteBlock("flow", {
    label,
    items: items.map((item) => item.trim()).filter(Boolean).slice(0, 5),
  });
}

function createSiteMatrixBlock(items: string[], label = "구성 요소") {
  return createSiteBlock("matrix", {
    label,
    items: Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, 10),
  });
}

function createSiteContributionBlock(label: string, value: string, caption?: string) {
  return createSiteBlock("contribution", { label, value, caption });
}

function createSiteCalloutBlock(content: string, label = "핵심 포인트") {
  return createSiteBlock("callout", { label, content });
}

function getDefaultSiteComposition(
  type: PortfolioSitePageType,
  layout?: PortfolioSiteLayout,
): PortfolioSiteComposition {
  if (type === "cover") {
    return {
      pattern: "hero-statement",
      focalPoint: "left",
      density: "calm",
      accentShape: "bar",
      primaryBlocks: ["headline", "summary"],
    };
  }
  if (type === "profile") {
    return {
      pattern: "split-proof",
      focalPoint: "left",
      density: "balanced",
      accentShape: "bar",
      primaryBlocks: ["summary", "evidence"],
    };
  }
  if (type === "skills") {
    return {
      pattern: "radial-map",
      focalPoint: "center",
      density: "rich",
      accentShape: "ring",
      primaryBlocks: ["summary", "evidence"],
    };
  }
  if (type === "project-index") {
    return {
      pattern: "timeline-track",
      focalPoint: "top",
      density: "balanced",
      accentShape: "timeline",
      primaryBlocks: ["summary", "next"],
    };
  }
  if (type === "project-detail" || layout === "project-dashboard") {
    return {
      pattern: "evidence-wall",
      focalPoint: "right",
      density: "rich",
      accentShape: "grid",
      primaryBlocks: ["decision", "evidence", "lesson"],
    };
  }
  if (type === "experience" || type === "retrospective" || layout === "evidence-board") {
    return {
      pattern: "metric-spotlight",
      focalPoint: "center",
      density: "balanced",
      accentShape: "grid",
      primaryBlocks: ["summary", "impact", "lesson"],
    };
  }
  if (type === "contact") {
    return {
      pattern: "closing-signal",
      focalPoint: "left",
      density: "calm",
      accentShape: "bar",
      primaryBlocks: ["summary", "next"],
    };
  }
  return {
    pattern: "diagonal-flow",
    focalPoint: "left",
    density: "rich",
    accentShape: "diagonal",
    primaryBlocks: ["problem", "role", "solution", "result"],
  };
}

function createSitePage(
  page: Omit<PortfolioSitePage, "id" | "visible"> &
    Partial<Pick<PortfolioSitePage, "id" | "visible">>,
): PortfolioSitePage {
  return {
    ...page,
    id: page.id || makeId("site-page"),
    composition:
      page.composition || getDefaultSiteComposition(page.type, page.layout),
    visible: page.visible !== false,
  };
}

function projectDisplayTitle(project: PortfolioSourceData["projects"][number], index = 0) {
  return project.company || project.position || `프로젝트 ${index + 1}`;
}

function projectDisplaySubtitle(project: PortfolioSourceData["projects"][number]) {
  return [project.position, project.period].filter(Boolean).join(" · ");
}

function siteText(parts: Array<string | undefined>, fallback: string) {
  const text = parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n");
  return text || fallback;
}

function projectStackText(project: PortfolioSourceData["projects"][number]) {
  const stack = [
    ...(project.techStack || []),
    ...(project.tags || []),
  ]
    .map((item) => item.trim())
    .filter(Boolean);
  return Array.from(new Set(stack)).slice(0, 8).join(", ");
}

function projectStackItems(project: PortfolioSourceData["projects"][number]) {
  return [
    ...(project.techStack || []),
    ...(project.tags || []),
  ]
    .map((item) => item.trim())
    .filter(Boolean);
}

function findProjectEvidenceBrief(
  evidenceBrief: PortfolioEvidenceBrief | undefined,
  project: PortfolioSourceData["projects"][number],
  title: string,
) {
  return evidenceBrief?.projectBriefs.find((brief) =>
    (project.id && brief.sourceId === project.id) || brief.title === title,
  );
}

function briefText(
  items: string[] | undefined,
  fallback: string,
  max = 3,
) {
  return siteText((items || []).slice(0, max), fallback);
}

function mergedBriefItems(...groups: Array<string[] | undefined>) {
  return Array.from(new Set(groups.flatMap((items) => items || []))).filter(Boolean);
}

function selectPortfolioSitePagesForLimit(
  pages: PortfolioSitePage[],
  limit: number,
) {
  if (pages.length <= limit) return pages;
  const boundedLimit = Math.max(5, Math.min(limit, pages.length));
  const selected = new Set<string>();
  const add = (page: PortfolioSitePage | undefined) => {
    if (page && selected.size < boundedLimit) selected.add(page.id);
  };

  add(pages.find((page) => page.type === "cover"));
  add(pages.find((page) => page.type === "profile"));
  add(pages.find((page) => page.type === "skills"));
  add(pages.find((page) => page.type === "project-index"));

  const contact = pages.find((page) => page.type === "contact");
  const retrospective = pages.find((page) => page.type === "retrospective");
  const reservedSlots = [retrospective, contact].filter(Boolean).length;
  const primaryCandidates = pages.filter(
    (page) =>
      !selected.has(page.id) &&
      page.type !== "contact" &&
      page.type !== "retrospective" &&
      (boundedLimit >= 9 || page.type !== "project-detail"),
  );

  for (const page of primaryCandidates) {
    if (selected.size >= boundedLimit - reservedSlots) break;
    selected.add(page.id);
  }
  if (retrospective && selected.size < boundedLimit - (contact ? 1 : 0)) selected.add(retrospective.id);
  if (contact && selected.size < boundedLimit) selected.add(contact.id);

  for (const page of pages) {
    if (selected.size >= boundedLimit) break;
    selected.add(page.id);
  }

  return pages.filter((page) => selected.has(page.id));
}

function sitePageTypeToSectionType(type: PortfolioSitePageType): PortfolioSectionType {
  if (type === "cover") return "hero";
  if (type === "profile") return "about";
  if (type === "skills") return "skills";
  if (type === "project-index") return "index";
  if (type === "experience") return "experience";
  if (type === "retrospective") return "retrospective";
  if (type === "contact") return "contact";
  return "project";
}

function sectionTypeToSitePageType(type: PortfolioSectionType): PortfolioSitePageType {
  if (type === "hero") return "cover";
  if (type === "about") return "profile";
  if (type === "skills") return "skills";
  if (type === "index") return "project-index";
  if (type === "experience") return "experience";
  if (type === "retrospective") return "retrospective";
  if (type === "contact") return "contact";
  return "case-study";
}

function getSitePageImage(page: PortfolioSitePage) {
  return (
    page.image ||
    page.blocks.find((block) => block.type === "image" && (block.image?.url || block.image?.assetId))
      ?.image
  );
}

function getSitePageTags(page: PortfolioSitePage) {
  return (
    page.blocks.find((block) => block.type === "tags" && block.items?.length)?.items ||
    page.blocks.find((block) => block.type === "matrix" && block.items?.length)?.items ||
    page.blocks
      .filter((block) => block.type === "metric" || block.type === "contribution")
      .map((block) => block.label || "")
      .filter(Boolean)
  );
}

function getSitePageBody(page: PortfolioSitePage) {
  return page.blocks
    .flatMap((block) => {
      if (block.type === "text") return block.content || "";
      if (block.type === "timeline") return block.items?.join("\n") || "";
      if (block.type === "flow" || block.type === "matrix") return block.items?.join("\n") || "";
      if (block.type === "callout") return block.content || "";
      if (block.type === "metric" || block.type === "contribution") {
        return [block.label, block.value, block.caption].filter(Boolean).join(": ");
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function sitePagesToSections(pages: PortfolioSitePage[]): PortfolioSection[] {
  return pages.map((page) => ({
    id: page.id,
    type: sitePageTypeToSectionType(page.type),
    title: page.title || "웹 슬라이드",
    subtitle: page.subtitle,
    body: compactBody(getSitePageBody(page), 6),
    tags: getSitePageTags(page),
    image: getSitePageImage(page),
    sourceId: page.sourceId,
    sourceKind: page.sourceKind,
    visible: page.visible !== false,
  }));
}

function sectionsToSitePages(sections: PortfolioSection[]): PortfolioSitePage[] {
  return sections.map((section) =>
    createSitePage({
      type: sectionTypeToSitePageType(section.type),
      title: section.title || "웹 슬라이드",
      subtitle: section.subtitle,
      eyebrow: section.type.toUpperCase(),
      intent: section.type === "project" ? "대표 프로젝트 설득" : "핵심 메시지 전달",
      visualDirection:
        section.type === "hero"
          ? "large-title-with-vertical-rule"
          : section.type === "project"
            ? "diagonal-problem-to-result-flow"
            : "editorial-typography-and-lines",
      narrative: section.body || section.subtitle || section.title,
      emphasis: section.tags?.slice(0, 4) || [],
      layout:
        section.type === "hero"
          ? "editorial-cover"
          : section.type === "about"
            ? "profile-map"
            : section.type === "skills"
              ? "tech-radar"
              : section.type === "index"
                ? "project-index"
                : section.type === "contact"
                  ? "closing-impact"
                  : section.type === "experience" || section.type === "retrospective"
                    ? "evidence-board"
                    : "case-study-flow",
      blocks: [
        createSiteTextBlock("summary", section.body || section.subtitle || section.title),
        ...(section.tags?.length ? [createSiteTagsBlock(section.tags)] : []),
        ...(section.tags?.length ? [createSiteMatrixBlock(section.tags, "키워드 맵")] : []),
      ],
      sourceId: section.sourceId,
      sourceKind: section.sourceKind,
      visible: section.visible,
    }),
  );
}

function normalizeStringItems(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeSiteImageSlot(value: unknown): PortfolioImageSlot | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<PortfolioImageSlot>;
  return {
    ...raw,
    aspectRatio: raw.aspectRatio || "16:9",
    objectFit: raw.objectFit || "cover",
    focalPoint: raw.focalPoint || { x: 50, y: 50 },
  };
}

function normalizePortfolioSiteComposition(
  value: unknown,
  fallback: PortfolioSiteComposition,
): PortfolioSiteComposition {
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<PortfolioSiteComposition>;
  const pattern: PortfolioSiteCompositionPattern =
    raw.pattern === "hero-statement" ||
    raw.pattern === "split-proof" ||
    raw.pattern === "diagonal-flow" ||
    raw.pattern === "metric-spotlight" ||
    raw.pattern === "radial-map" ||
    raw.pattern === "timeline-track" ||
    raw.pattern === "evidence-wall" ||
    raw.pattern === "closing-signal"
      ? raw.pattern
      : fallback.pattern;
  const focalPoint: PortfolioSiteComposition["focalPoint"] =
    raw.focalPoint === "left" ||
    raw.focalPoint === "right" ||
    raw.focalPoint === "center" ||
    raw.focalPoint === "top" ||
    raw.focalPoint === "bottom"
      ? raw.focalPoint
      : fallback.focalPoint;
  const density: PortfolioSiteComposition["density"] =
    raw.density === "calm" || raw.density === "balanced" || raw.density === "rich"
      ? raw.density
      : fallback.density;
  const accentShape: PortfolioSiteComposition["accentShape"] =
    raw.accentShape === "bar" ||
    raw.accentShape === "diagonal" ||
    raw.accentShape === "grid" ||
    raw.accentShape === "ring" ||
    raw.accentShape === "timeline"
      ? raw.accentShape
      : fallback.accentShape;
  const primaryBlocks = normalizeStringItems(raw.primaryBlocks).filter(
    (role): role is PortfolioSiteBlockRole =>
      role === "headline" ||
      role === "summary" ||
      role === "problem" ||
      role === "role" ||
      role === "solution" ||
      role === "result" ||
      role === "lesson" ||
      role === "impact" ||
      role === "decision" ||
      role === "evidence" ||
      role === "next" ||
      role === "body",
  );

  return {
    pattern,
    focalPoint,
    density,
    accentShape,
    visualMetaphor:
      typeof raw.visualMetaphor === "string" ? raw.visualMetaphor.slice(0, 80) : fallback.visualMetaphor,
    primaryBlocks: primaryBlocks.length ? primaryBlocks : fallback.primaryBlocks,
  };
}

function normalizePortfolioSiteBlock(value: unknown): PortfolioSiteBlock {
  if (!value || typeof value !== "object") {
    return createSiteTextBlock("body", "");
  }
  const raw = value as Partial<PortfolioSiteBlock>;
  const type: PortfolioSiteBlockType =
    raw.type === "tags" ||
    raw.type === "metric" ||
    raw.type === "image" ||
    raw.type === "timeline" ||
    raw.type === "flow" ||
    raw.type === "matrix" ||
    raw.type === "contribution" ||
    raw.type === "callout" ||
    raw.type === "text"
      ? raw.type
      : "text";
  const role: PortfolioSiteBlockRole | undefined =
    raw.role === "headline" ||
    raw.role === "summary" ||
    raw.role === "problem" ||
    raw.role === "role" ||
    raw.role === "solution" ||
    raw.role === "result" ||
    raw.role === "lesson" ||
    raw.role === "impact" ||
    raw.role === "decision" ||
    raw.role === "evidence" ||
    raw.role === "next" ||
    raw.role === "body"
      ? raw.role
      : type === "text"
        ? "body"
        : undefined;

  return {
    id: raw.id || makeId(`site-${type}`),
    type,
    role,
    label: raw.label || "",
    value: raw.value || "",
    caption: raw.caption || "",
    content: typeof raw.content === "string" ? raw.content : "",
    items: normalizeStringItems(raw.items),
    image: normalizeSiteImageSlot(raw.image),
  };
}

function normalizePortfolioSitePages(value: unknown): PortfolioSitePage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<PortfolioSitePage> => Boolean(item && typeof item === "object"))
    .map((raw) => {
      const type: PortfolioSitePageType =
        raw.type === "cover" ||
        raw.type === "profile" ||
        raw.type === "skills" ||
        raw.type === "project-index" ||
        raw.type === "case-study" ||
        raw.type === "project-detail" ||
        raw.type === "experience" ||
        raw.type === "retrospective" ||
        raw.type === "contact"
          ? raw.type
          : "case-study";
      const layout: PortfolioSiteLayout =
        raw.layout === "cover-focus" ||
        raw.layout === "editorial-cover" ||
        raw.layout === "profile-summary" ||
        raw.layout === "profile-map" ||
        raw.layout === "skills-grid" ||
        raw.layout === "tech-radar" ||
        raw.layout === "project-index" ||
        raw.layout === "case-study" ||
        raw.layout === "case-study-flow" ||
        raw.layout === "project-detail" ||
        raw.layout === "project-dashboard" ||
        raw.layout === "evidence-board" ||
        raw.layout === "timeline" ||
        raw.layout === "closing" ||
        raw.layout === "closing-impact"
          ? raw.layout
          : type === "cover"
            ? "editorial-cover"
            : type === "profile"
              ? "profile-map"
              : type === "skills"
                ? "tech-radar"
                : type === "project-index"
                  ? "project-index"
                  : type === "contact"
                    ? "closing-impact"
                    : type === "experience" || type === "retrospective"
                      ? "evidence-board"
                      : type === "project-detail"
                        ? "project-dashboard"
                        : "case-study-flow";
      return {
        id: raw.id || makeId("site-page"),
        type,
        title: raw.title || "웹 슬라이드",
        subtitle: raw.subtitle || "",
        eyebrow: raw.eyebrow || "",
        intent: typeof raw.intent === "string" ? raw.intent : "",
        visualDirection: typeof raw.visualDirection === "string" ? raw.visualDirection : "",
        narrative: typeof raw.narrative === "string" ? raw.narrative : "",
        emphasis: normalizeStringItems(raw.emphasis),
        composition: normalizePortfolioSiteComposition(
          raw.composition,
          getDefaultSiteComposition(type, layout),
        ),
        layout,
        blocks: Array.isArray(raw.blocks) ? raw.blocks.map(normalizePortfolioSiteBlock) : [],
        image: normalizeSiteImageSlot(raw.image),
        sourceId: raw.sourceId,
        sourceKind: raw.sourceKind,
        visible: raw.visible !== false,
      };
    });
}

const DEFAULT_TEMPLATE_PAGE_FLOW: PortfolioTemplatePageFlow = {
  cover: "minimal-statement",
  profile: "compact-row",
  skills: "chip-grid",
  index: true,
  projectSlidesEach: 3,
  retrospective: true,
  closing: "minimal-contact",
};

export function createDefaultPortfolioSiteDocument(
  templateId: PortfolioTemplateId,
  source: PortfolioSourceData,
  options: {
    pageSize?: PortfolioPageSize;
    orientation?: PortfolioOrientation;
    generationPreset?: PortfolioGenerationPreset;
    evidenceBrief?: PortfolioEvidenceBrief;
  } = {},
): PortfolioDocument {
  const template = getPortfolioTemplate(templateId);
  const flow: PortfolioTemplatePageFlow = template.blueprint.pageFlow || DEFAULT_TEMPLATE_PAGE_FLOW;
  const personal = source.personalInfo;
  const skillNames = collectPortfolioSkillNames(source);
  const plan = createFallbackPortfolioGenerationPlan(source);
  const evidenceBrief = options.evidenceBrief || createFallbackPortfolioEvidenceBrief(source, plan);
  const projectTitles = source.projects
    .slice(0, 6)
    .map((project, index) => projectDisplayTitle(project, index));
  const contactText = [personal.email, personal.phone, personal.links?.github, personal.links?.blog]
    .filter(Boolean)
    .join("\n");
  const pages: PortfolioSitePage[] = [
    createSitePage({
      type: "cover",
      title: personal.name ? `${plan.position} ${personal.name}` : `${plan.position} 포트폴리오`,
      subtitle: personal.intro || plan.strengths.join(" · ") || "프로젝트와 경험을 웹 슬라이드로 정리합니다.",
      eyebrow: "Portfolio",
      intent: "첫 장에서 포지션과 차별점을 각인",
      visualDirection: "large-title-with-vertical-rule and editorial whitespace",
      narrative: evidenceBrief.careerThesis || personal.intro || plan.strengths.join(" · "),
      emphasis: evidenceBrief.strongestSignals.slice(0, 4).length
        ? evidenceBrief.strongestSignals.slice(0, 4)
        : plan.strengths.slice(0, 4),
      layout: "editorial-cover",
      blocks: [
        createSiteTextBlock(
          "headline",
          siteText(
            [
              personal.intro,
              evidenceBrief.careerThesis,
              plan.strengths.length
                ? `${plan.strengths.join(", ")}을 중심으로 프로젝트 문제를 정의하고 구현 결과를 검증합니다.`
                : undefined,
              source.projects.length
                ? `대표 프로젝트 ${projectTitles.slice(0, 3).join(", ")}에서 맡은 역할과 결과를 페이지별로 정리했습니다.`
                : undefined,
              skillNames.length
                ? `주요 기술: ${skillNames.slice(0, 6).join(", ")}`
                : undefined,
            ],
            personal.name
              ? `${personal.name}님의 작업과 경험을 정리한 웹 슬라이드 포트폴리오입니다.`
              : "내 프로젝트와 경험을 한 곳에서 보여줍니다.",
          ),
        ),
        createSiteTagsBlock(
          evidenceBrief.strongestSignals.length
            ? evidenceBrief.strongestSignals
            : plan.strengths.length
              ? plan.strengths
              : ["문제 정의", "구현", "검증"],
        ),
        createSiteMetricBlock("프로젝트", `${source.projects.length}`, "선택한 대표 프로젝트"),
        createSiteMetricBlock("기술 스택", `${skillNames.length}`, "프로젝트에서 사용한 기술"),
        createSiteFlowBlock(
          ["문제 정의", "역할과 의사결정", "해결 구현", "결과 검증"],
          "포트폴리오 서사",
        ),
        createSiteCalloutBlock(
          evidenceBrief.strongestSignals[0] ||
          (projectTitles.length
            ? `대표 프로젝트 ${projectTitles.slice(0, 2).join(", ")}를 중심으로 실제 기여와 결과를 보여줍니다.`
            : "프로젝트가 등록되면 이 자리에 대표 케이스가 자동으로 표시됩니다."),
          "읽는 방식",
        ),
      ],
      sourceKind: "manual",
    }),
    createSitePage({
      type: "profile",
      title: "프로필 요약",
      subtitle: personal.name || plan.position,
      eyebrow: "Profile",
      intent: "일하는 방식과 강점 증명",
      visualDirection: "profile manifesto with contribution bars",
      narrative: personal.intro || evidenceBrief.careerThesis || plan.strengths.join(" · "),
      emphasis: evidenceBrief.strongestSignals.slice(0, 4).length
        ? evidenceBrief.strongestSignals.slice(0, 4)
        : plan.strengths.slice(0, 4),
      layout: "profile-map",
      blocks: [
        createSiteTextBlock(
          "summary",
          siteText(
            [
              personal.intro,
              evidenceBrief.careerThesis,
              plan.strengths.length
                ? `${plan.strengths.join(", ")}을 기준으로 문제를 작은 단위로 나누고, 구현 후 결과를 다시 검증하는 방식으로 일합니다.`
                : undefined,
              projectTitles.length
                ? `대표 프로젝트는 ${projectTitles.slice(0, 3).join(", ")}이며, 각 페이지에서 맡은 역할과 의사결정을 분리해 보여줍니다.`
                : undefined,
            ],
            "문제를 정의하고 구현하며 결과를 검증하는 과정을 포트폴리오의 주요 근거로 정리합니다.",
          ),
        ),
        createSiteTimelineBlock(
          plan.strengths.length ? plan.strengths : ["문제 정의", "구현", "검증", "개선"],
          "일하는 방식",
        ),
        createSiteContributionBlock(
          plan.strengths[0] || "문제 정의",
          plan.strengths.includes("문제 해결") ? "90%" : "78%",
          "요구사항과 제약을 구조화하고 우선순위 정의",
        ),
        createSiteContributionBlock(
          plan.strengths[1] || "구현 실행",
          "85%",
          source.projects.length
            ? `${source.projects.length}개 프로젝트에서 구현 책임`
            : "선택한 기술로 기능 완성",
        ),
        createSiteContributionBlock(
          plan.strengths[2] || "검증/개선",
          "80%",
          "결과를 검증하고 회고로 다음 작업에 반영",
        ),
      ],
      sourceKind: "manual",
    }),
    createSitePage({
      type: "skills",
      title: "핵심 역량과 기술",
      subtitle: skillNames.slice(0, 5).join(" · ") || "프로젝트 기반 기술 스택",
      eyebrow: "Stack",
      intent: "기술 목록이 아니라 활용 맥락 전달",
      visualDirection: "technical cluster map with axis lines",
      narrative: skillNames.slice(0, 8).join(", "),
      emphasis: skillNames.slice(0, 6),
      layout: "tech-radar",
      blocks: [
        createSiteTextBlock(
          "summary",
          [
            plan.strengths.join(" · "),
            skillNames.length
              ? `${skillNames.slice(0, 10).join(", ")}를 실제 프로젝트에서 어떻게 사용했는지 프로젝트 페이지와 연결해 보여줍니다.`
              : "",
            source.projects.length
              ? "기술 목록만 나열하지 않고, 문제 해결 과정에서 어떤 역할로 쓰였는지 함께 정리합니다."
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
        createSiteTagsBlock(skillNames.length ? skillNames : plan.strengths, "기술 스택"),
        createSiteMatrixBlock(skillNames.length ? skillNames : plan.strengths, "기술 맵"),
        createSiteMetricBlock("핵심 기술", `${skillNames.length || plan.strengths.length}`, "선택 데이터 기준"),
        createSiteCalloutBlock(
          source.projects.length
            ? `${skillNames.slice(0, 5).join(", ") || "주요 기술"}을 프로젝트 문제 해결 과정과 연결해 보여줍니다.`
            : "프로젝트를 등록하면 기술별 활용 맥락이 함께 표시됩니다.",
          "역량 해석",
        ),
      ],
      sourceKind: "manual",
    }),
    createSitePage({
      type: "project-index",
      title: "프로젝트 흐름",
      subtitle: "대표 프로젝트와 증명할 역량",
      eyebrow: "Contents",
      intent: "포트폴리오를 읽는 순서 제시",
      visualDirection: "horizontal journey line with numbered stops",
      narrative: projectTitles.join(" → "),
      emphasis: projectTitles.slice(0, 4),
      layout: "project-index",
      blocks: [
        createSiteTimelineBlock(
          projectTitles.length ? projectTitles : ["대표 프로젝트", "핵심 역량", "연락처"],
          "웹 슬라이드 구성",
        ),
        createSiteFlowBlock(
          ["프로필", "기술 역량", "대표 프로젝트", "상세 근거", "성장 포인트"],
          "발표 흐름",
        ),
        createSiteTagsBlock(plan.strengths, "강점"),
        createSiteMetricBlock("구성 페이지", `${Math.max(8, source.projects.length * 2 + 5)}`, "자동 생성 기준"),
      ],
      sourceKind: "manual",
    }),
  ];

  source.workExperiences.slice(0, 2).forEach((experience) => {
    pages.push(
      createSitePage({
        type: "experience",
        title: experience.company || "경력",
        subtitle: [experience.position, experience.period].filter(Boolean).join(" · "),
        eyebrow: "Experience",
        intent: "경력 경험을 프로젝트 증거로 연결",
        visualDirection: "evidence board with one dominant quote",
        narrative: experience.description || "",
        emphasis: [experience.position, experience.period].filter(Boolean).slice(0, 4),
        layout: "evidence-board",
        blocks: [
          createSiteTextBlock("summary", experience.description || "담당 업무와 성과를 정리합니다."),
          createSiteTimelineBlock(
            compactBody(experience.description, 5).split("\n").filter(Boolean),
            "주요 업무",
          ),
          createSiteContributionBlock("경험 밀도", experience.period ? experience.period : "경험", experience.position || "담당 역할"),
          createSiteCalloutBlock(
            experience.description || "경력 경험에서 맡은 역할과 실행 내용을 포트폴리오 흐름에 연결합니다.",
            "경력 근거",
          ),
        ],
        sourceId: experience.id,
        sourceKind: "experience",
      }),
    );
  });

  source.projects.slice(0, 4).forEach((project, index) => {
    const title = projectDisplayTitle(project, index);
    const subtitle = projectDisplaySubtitle(project);
    const tags = project.tags?.length ? project.tags : project.techStack || [];
    const stackText = projectStackText(project);
    const techStackItems = (project.techStack || []).filter(Boolean);
    const brief = findProjectEvidenceBrief(evidenceBrief, project, title);
    const confirmed = brief?.confirmed || [];
    const inferred = brief?.inferred || [];
    const technicalDecisions = brief?.technicalDecisions || [];
    const hardParts = brief?.hardParts || [];
    const proofPoints = brief?.proofPoints || [];
    const sellingPoints = brief?.sellingPoints || [];
    const slideAngles = brief?.slideAngles || [];
    const briefKeywords = mergedBriefItems(sellingPoints, technicalDecisions, proofPoints, tags).slice(0, 6);
    const projectSummaryLines = [
      project.description,
      project.situation ? `문제 상황: ${project.situation}` : undefined,
      project.role ? `담당 역할: ${project.role}` : project.position ? `담당 역할: ${project.position}` : undefined,
      project.solution ? `해결 방식: ${project.solution}` : undefined,
      project.result ? `결과/성과: ${project.result}` : undefined,
      project.lesson ? `배운 점: ${project.lesson}` : undefined,
    ].filter(Boolean) as string[];
    const summaryText = projectSummaryLines.length
      ? projectSummaryLines.join("\n")
      : siteText(
          [briefText(confirmed, "", 3), inferred[0], project.description],
          "프로젝트 데이터를 추가하면 이 자리에 자동으로 요약이 표시됩니다.",
        );
    pages.push(
      createSitePage({
        type: "case-study",
        title: slideAngles[0] || `${title} 문제와 역할`,
        subtitle,
        eyebrow: `Case ${index + 1}`,
        intent: hardParts[0] || sellingPoints[0] || "대표 프로젝트의 문제와 본인 역할 설명",
        visualDirection: slideAngles[0] || "diagonal problem to result flow with bold project title",
        narrative: summaryText,
        emphasis: briefKeywords.length
          ? briefKeywords.slice(0, 5)
          : [project.position, ...(tags || [])].filter(Boolean).slice(0, 5),
        layout: "case-study-flow",
        blocks: [
          createSiteTextBlock("summary", summaryText),
          createSiteTextBlock(
            "problem",
            project.situation
              ? `${project.situation}${project.difficulty ? `\n어려웠던 점: ${project.difficulty}` : ""}`
              : briefText(
                  hardParts.length
                    ? hardParts
                    : ([project.difficulty].filter(Boolean) as string[]),
                  "해결해야 할 문제와 제약 조건을 먼저 정의했습니다.",
                  4,
                ),
            "문제",
          ),
          createSiteTextBlock(
            "role",
            project.role ||
              project.position ||
              confirmed.find((item) => item.includes("역할") || item.includes("참여")) ||
              "담당 역할을 기준으로 구현 범위와 우선순위를 정했습니다.",
            "역할",
          ),
          createSiteFlowBlock(
            [
              project.situation || hardParts[0] || "문제 정의",
              project.role || project.position || "담당 역할",
              project.solution || technicalDecisions[0] || "해결 구현",
              project.result || proofPoints[0] || project.lesson || "결과 검증",
            ],
            "문제 → 역할 → 해결 → 결과",
          ),
          createSiteContributionBlock(
            "담당 역할",
            project.position || project.role || "구현",
            project.period || "프로젝트 기간",
          ),
          ...(techStackItems.length
            ? [createSiteTagsBlock(techStackItems.slice(0, 10), "사용한 기술")]
            : []),
          createSiteCalloutBlock(
            project.result ||
              project.solution ||
              sellingPoints[0] ||
              hardParts[0] ||
              "프로젝트에서 드러나는 핵심 역량을 요약합니다.",
            "면접에서 강조할 포인트",
          ),
          createSiteTagsBlock(
            mergedBriefItems(tags, sellingPoints, techStackItems.slice(0, 4)).slice(0, 6),
            "핵심 키워드",
          ),
        ],
        sourceId: project.id,
        sourceKind: "project",
      }),
    );

    const decisionText =
      project.solution ||
      technicalDecisions[0] ||
      "담당 역할을 중심으로 해결 방안을 설계하고 구현했습니다.";
    pages.push(
      createSitePage({
        type: "project-detail",
        title: slideAngles[2] || `${title} 기술 판단`,
        subtitle,
        eyebrow: "Decision",
        intent: technicalDecisions[0] || project.solution || "구현 과정과 판단 기준 증명",
        visualDirection: slideAngles[1] || "process ribbon and evidence matrix",
        narrative: [
          decisionText,
          stackText ? `사용 기술: ${stackText}` : undefined,
          project.role ? `담당 역할: ${project.role}` : undefined,
        ]
          .filter(Boolean)
          .join("\n"),
        emphasis: mergedBriefItems(technicalDecisions, projectStackItems(project)).slice(0, 6),
        layout: "project-dashboard",
        composition: {
          pattern: "evidence-wall",
          focalPoint: "right",
          density: "balanced",
          accentShape: "grid",
          visualMetaphor: "기술 선택과 구현 판단을 증거 벽처럼 분리",
          primaryBlocks: ["decision", "evidence", "solution"],
        },
        blocks: [
          createSiteTextBlock(
            "decision",
            [
              decisionText,
              project.role ? `담당 역할: ${project.role}` : undefined,
              stackText ? `사용 기술: ${stackText}` : undefined,
            ]
              .filter(Boolean)
              .join("\n"),
            "기술 판단",
          ),
          ...(techStackItems.length
            ? [
                createSiteMetricBlock(
                  "기술 스택",
                  String(techStackItems.length),
                  techStackItems.slice(0, 6).join(", "),
                ),
              ]
            : []),
          ...(project.period
            ? [createSiteMetricBlock("진행 기간", project.period, project.position || "담당 영역")]
            : []),
          createSiteFlowBlock(
            [
              project.situation || hardParts[0] || "상황 파악",
              project.role || project.position || "역할 분담",
              project.solution || technicalDecisions[0] || "구현과 검증",
              project.result || proofPoints[0] || "결과 확인",
            ],
            "실행 단계",
          ),
          createSiteMatrixBlock(
            mergedBriefItems(
              techStackItems.slice(0, 8),
              technicalDecisions,
              [project.position || project.role || ""],
            ),
            "판단 요소",
          ),
          createSiteCalloutBlock(
            project.solution ||
              technicalDecisions[0] ||
              "기술 선택 이유와 구현 범위를 분리해 설명합니다.",
            "핵심 판단",
          ),
        ],
        sourceId: project.id,
        sourceKind: "project",
      }),
    );

    const resultText =
      project.result ||
      proofPoints[0] ||
      sellingPoints[0] ||
      "구현 결과와 검증 과정에서 얻은 배운 점을 정리했습니다.";
    const lessonText =
      project.lesson ||
      sellingPoints[0] ||
      "프로젝트를 통해 다음 작업에 재사용할 수 있는 판단 기준과 구현 방식을 정리했습니다.";
    pages.push(
      createSitePage({
        type: "project-detail",
        title: slideAngles[4] || `${title} 결과와 회고`,
        subtitle,
        eyebrow: "Proof",
        intent: project.result || proofPoints[0] || sellingPoints[0] || "결과와 검증 근거 정리",
        visualDirection: slideAngles[4] || "metric spotlight with proof points",
        narrative: [resultText, project.lesson ? `배운 점: ${project.lesson}` : undefined]
          .filter(Boolean)
          .join("\n"),
        emphasis: mergedBriefItems(proofPoints, sellingPoints, projectStackItems(project)).slice(0, 6),
        layout: "evidence-board",
        composition: {
          pattern: "metric-spotlight",
          focalPoint: "center",
          density: "balanced",
          accentShape: "grid",
          visualMetaphor: "결과와 회고를 큰 근거로 강조",
          primaryBlocks: ["result", "lesson", "impact"],
        },
        blocks: [
          createSiteTextBlock("result", resultText, "결과/근거"),
          createSiteTextBlock("lesson", lessonText, "배운 점"),
          createSiteTimelineBlock(
            mergedBriefItems(
              [project.result, project.lesson, project.solution].filter(Boolean) as string[],
              proofPoints,
              sellingPoints,
              slideAngles,
            ).slice(0, 5),
            "증거 흐름",
          ),
          createSiteMatrixBlock(
            mergedBriefItems(
              [
                project.result ? "결과 검증" : "",
                project.lesson ? "회고" : "",
                project.solution ? "해결 접근" : "",
              ].filter(Boolean) as string[],
              proofPoints,
              sellingPoints,
            ),
            "증거 요소",
          ),
          createSiteCalloutBlock(
            project.lesson ||
              sellingPoints[0] ||
              proofPoints[0] ||
              "면접에서 결과와 배운 점을 함께 설명할 수 있습니다.",
            "면접 포인트",
          ),
        ],
        sourceId: project.id,
        sourceKind: "project",
      }),
    );
  });

  pages.push(
    createSitePage({
      type: "retrospective",
      title: "성장 포인트",
      subtitle: "프로젝트를 통해 확장한 역량",
      eyebrow: "Growth",
      intent: "성장과 다음 적용점 정리",
      visualDirection: "before after growth loop",
      narrative: plan.strengths.join(" · "),
      emphasis: plan.strengths.slice(0, 4),
      layout: "evidence-board",
      blocks: [
        createSiteTextBlock(
          "summary",
          plan.strengths.length
            ? `${plan.strengths.join(", ")}을 중심으로 문제를 정의하고 구현 결과를 검증했습니다.`
            : "문제 정의, 구현, 검증의 흐름을 반복하며 프로젝트 완성도를 높였습니다.",
        ),
        createSiteTimelineBlock(plan.strengths.length ? plan.strengths : ["문제 정의", "구현", "검증", "개선"]),
        createSiteFlowBlock(["반복된 문제", "선택한 해결 방식", "검증한 결과", "다음 적용점"], "성장 루프"),
        createSiteCalloutBlock(
          "각 프로젝트에서 얻은 판단 기준을 다음 작업에 재사용할 수 있도록 회고와 개선 포인트를 분리했습니다.",
          "다음 적용점",
        ),
      ],
      sourceKind: "manual",
    }),
    createSitePage({
      type: "contact",
      title: "연락처",
      subtitle: personal.name || plan.position,
      eyebrow: "Contact",
      intent: "짧고 명확한 마무리",
      visualDirection: "minimal closing with strong final line",
      narrative: contactText || "",
      emphasis: [personal.email, personal.links?.github, personal.links?.blog].filter(Boolean).slice(0, 4),
      layout: "closing-impact",
      blocks: [
        createSiteTextBlock("summary", contactText || "email@example.com"),
        createSiteTagsBlock([personal.links?.github || "", personal.links?.blog || ""].filter(Boolean), "링크"),
        createSiteCalloutBlock("프로젝트 상세와 구현 판단 기준이 필요하다면 포트폴리오의 케이스 페이지를 기준으로 이야기할 수 있습니다.", "마무리"),
      ],
      sourceKind: "manual",
    }),
  );

  // ── 템플릿의 pageFlow 에 맞춰 페이지 시퀀스 재편 ──
  //   - profile: skip 이면 프로필 페이지 제외
  //   - index: false 이면 project-index 페이지 제외
  //   - retrospective: false 이면 retrospective 페이지 제외
  //   - projectSlidesEach: 1 → 프로젝트당 case-study 1장만, 2 → case-study + detail 1장,
  //     3 → 현재(case-study + detail 2장) 전부.
  const sourceIdSeen: Record<string, number> = {};
  const filteredByFlow = pages.filter((page) => {
    if (page.type === "profile" && flow.profile === "skip") return false;
    if (page.type === "project-index" && !flow.index) return false;
    if (page.type === "retrospective" && !flow.retrospective) return false;
    if ((page.type === "case-study" || page.type === "project-detail") && page.sourceId) {
      const seen = sourceIdSeen[page.sourceId] || 0;
      sourceIdSeen[page.sourceId] = seen + 1;
      if (seen >= flow.projectSlidesEach) return false;
    }
    return true;
  });

  const visiblePages = selectPortfolioSitePagesForLimit(
    filteredByFlow,
    Math.max(
      5,
      Math.min(
        16,
        template.blueprint.targetSlideCount ||
          evidenceBrief.recommendedSlideCount ||
          filteredByFlow.length,
      ),
    ),
  );

  const document: PortfolioDocument = {
    version: 1,
    templateId,
    format: "site",
    pageSize: options.pageSize || "16:9",
    orientation: options.orientation || "landscape",
    generationPreset: options.generationPreset || "web-slide",
    theme: template.theme,
    mode: "paged",
    pages: visiblePages,
    sections: sitePagesToSections(visiblePages),
  };

  return polishPortfolioDocument(withPortfolioSampleImages(document));
}

export function createDefaultPortfolioDocument(
  templateId: PortfolioTemplateId,
  source: PortfolioSourceData,
  options: {
    format?: PortfolioFormat;
    pageSize?: PortfolioPageSize;
    orientation?: PortfolioOrientation;
    generationPreset?: PortfolioGenerationPreset;
    evidenceBrief?: PortfolioEvidenceBrief;
  } = {},
): PortfolioDocument {
  if (options.format === "site") {
    return createDefaultPortfolioSiteDocument(templateId, source, {
      pageSize: options.pageSize,
      orientation: options.orientation,
      generationPreset: options.generationPreset,
      evidenceBrief: options.evidenceBrief,
    });
  }

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
  const format =
    raw.format === "document" || raw.format === "site" ? raw.format : "slide";
  const pageSize =
    raw.pageSize === "a4" || raw.pageSize === "16:9"
      ? raw.pageSize
      : getDefaultPortfolioPageSize(format);
  const pagePreset = getPortfolioPagePreset(pageSize);
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  const pages = normalizePortfolioSitePages(raw.pages);
  const sitePages =
    format === "site" ? (pages.length ? pages : sectionsToSitePages(sections)) : [];

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
      raw.generationPreset === "interview-pitch" ||
      raw.generationPreset === "web-slide"
        ? raw.generationPreset
        : getDefaultPortfolioPreset(format),
    theme: { ...template.theme, ...(raw.theme || {}) },
    mode: format === "site" ? "paged" : undefined,
    pages: format === "site" ? sitePages : undefined,
    sections:
      format === "site"
        ? sitePagesToSections(sitePages)
        : sections.map((section) => ({
            ...section,
            id: section.id || makeId(section.type || "section"),
            type: section.type || "about",
            title: section.title || "섹션",
            visible: section.visible !== false,
          })),
    freeSlides: format === "site" ? normalizePortfolioFreeSlides(raw.freeSlides) : undefined,
  };

  return polishPortfolioDocument(document);
}

// ──────────────────────────────────────────────────────────────────────────────
// FreeSlide normalize / validate — AI 가 만든 JSON 트리를 안전한 형태로 정리.
// 알려진 tag/style 외엔 모두 제거. 너무 깊거나 노드가 너무 많으면 가지치기.
// ──────────────────────────────────────────────────────────────────────────────

const FREE_SLIDE_ALLOWED_TAGS: ReadonlySet<FreeSlideTag> = new Set([
  "div",
  "section",
  "header",
  "footer",
  "article",
  "main",
  "aside",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "blockquote",
  "figure",
  "figcaption",
  "hr",
  "br",
]);

const FREE_SLIDE_ALLOWED_STYLE_KEYS: ReadonlySet<keyof FreeSlideStyle> = new Set([
  "color",
  "backgroundColor",
  "background",
  "padding",
  "margin",
  "borderRadius",
  "borderColor",
  "borderWidth",
  "borderStyle",
  "border",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "textTransform",
  "opacity",
  "width",
  "height",
  "maxWidth",
  "maxHeight",
  "minWidth",
  "minHeight",
  "display",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gridColumn",
  "gridRow",
  "gap",
  "rowGap",
  "columnGap",
  "position",
  "top",
  "bottom",
  "left",
  "right",
  "overflow",
  "whiteSpace",
  "wordBreak",
  "boxShadow",
]);

const MAX_FREE_SLIDE_DEPTH = 8;
const MAX_FREE_SLIDE_NODE_COUNT = 200;
const MAX_FREE_SLIDE_CLASSNAME_LENGTH = 600;
const MAX_FREE_SLIDE_TEXT_LENGTH = 1200;

function normalizeFreeSlideStyle(value: unknown): FreeSlideStyle | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const result: FreeSlideStyle = {};
  let touched = false;
  for (const key of FREE_SLIDE_ALLOWED_STYLE_KEYS) {
    const candidate = raw[key as string];
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate !== "string" && typeof candidate !== "number") continue;
    // url() 같은 식별자는 제거 (안전상). 단순한 색·길이·키워드만 허용.
    if (typeof candidate === "string" && /url\s*\(|expression\s*\(|javascript:/i.test(candidate)) {
      continue;
    }
    (result as Record<string, unknown>)[key as string] = candidate;
    touched = true;
  }
  return touched ? result : undefined;
}

// ──────────────────────────────────────────────────────────────────────────────
// 12 안전 레이아웃 정의 — 슬라이드 루트의 grid 는 우리가 고정하고, AI 는 슬롯
// 안의 콘텐츠만 자유 디자인. 모든 슬롯에 overflow-hidden + min-w-0 + min-h-0
// 강제로 자식이 슬롯 밖으로 못 나가게 한다.
// ──────────────────────────────────────────────────────────────────────────────

const SLOT_BASE = "min-w-0 min-h-0 overflow-hidden";

export const FREE_SLIDE_LAYOUTS: Record<FreeSlideLayout, FreeSlideLayoutDefinition> = {
  "split-left": {
    id: "split-left",
    intentHint: "좌측 메시지 + 우측 보조 (가장 무난한 2단)",
    rootClassName: "grid h-full w-full grid-cols-2 gap-10 px-16 py-14",
    slots: [
      { key: "primary", className: `${SLOT_BASE} flex flex-col justify-center`, hint: "주 메시지·헤딩·요약" },
      { key: "secondary", className: `${SLOT_BASE} flex flex-col justify-center`, hint: "보조 정보·메트릭·키워드" },
    ],
  },
  "split-right-wide": {
    id: "split-right-wide",
    intentHint: "좌 헤딩 작게 / 우 콘텐츠 풍부 (1:2)",
    rootClassName: "grid h-full w-full grid-cols-[1fr_2fr] gap-10 px-16 py-14",
    slots: [
      { key: "headline", className: `${SLOT_BASE} flex flex-col justify-center`, hint: "헤딩과 핵심 라벨" },
      { key: "content", className: `${SLOT_BASE} flex flex-col justify-center gap-6`, hint: "본문·리스트·디테일" },
    ],
  },
  "split-left-wide": {
    id: "split-left-wide",
    intentHint: "좌 본문 풍부 / 우 강조 메트릭 (2:1)",
    rootClassName: "grid h-full w-full grid-cols-[2fr_1fr] gap-10 px-16 py-14",
    slots: [
      { key: "content", className: `${SLOT_BASE} flex flex-col justify-center gap-6`, hint: "본문 흐름" },
      { key: "accent", className: `${SLOT_BASE} flex flex-col justify-center border-l border-current/15 pl-8`, hint: "큰 숫자·인용" },
    ],
  },
  "three-col": {
    id: "three-col",
    intentHint: "3등분 카드 (역할/기술/결과 같은 3축)",
    rootClassName: "grid h-full w-full grid-cols-3 gap-8 px-14 py-12",
    slots: [
      { key: "col-1", className: `${SLOT_BASE} flex flex-col gap-3`, hint: "첫 번째 축" },
      { key: "col-2", className: `${SLOT_BASE} flex flex-col gap-3`, hint: "두 번째 축" },
      { key: "col-3", className: `${SLOT_BASE} flex flex-col gap-3`, hint: "세 번째 축" },
    ],
  },
  "hero-statement": {
    id: "hero-statement",
    intentHint: "상단 큰 헤딩 / 하단 본문 (표지·강한 한 문장)",
    rootClassName: "grid h-full w-full grid-rows-[1.4fr_1fr] gap-10 px-20 py-16",
    slots: [
      { key: "headline", className: `${SLOT_BASE} flex flex-col justify-end`, hint: "큰 헤딩 (h1)" },
      { key: "support", className: `${SLOT_BASE} flex flex-col gap-4`, hint: "본문 + 강조 키워드" },
    ],
  },
  "hero-with-metric": {
    id: "hero-with-metric",
    intentHint: "좌 헤딩+요약 / 우 큰 메트릭 (임팩트 표지)",
    rootClassName: "grid h-full w-full grid-cols-[1.2fr_1fr] gap-12 px-20 py-16",
    slots: [
      { key: "headline", className: `${SLOT_BASE} flex flex-col justify-center gap-4`, hint: "헤딩 + 요약 한 줄" },
      { key: "metric", className: `${SLOT_BASE} flex flex-col justify-center gap-3 border-l-[6px] border-current/30 pl-10`, hint: "큰 숫자 한 개 + 캡션" },
    ],
  },
  "full-bleed-quote": {
    id: "full-bleed-quote",
    intentHint: "가운데 큰 인용구 한 개 (회고·강조)",
    rootClassName: "flex h-full w-full items-center justify-center px-24 py-20",
    slots: [
      { key: "quote", className: `${SLOT_BASE} flex max-w-[900px] flex-col items-start gap-6`, hint: "큰 인용 + 출처" },
    ],
  },
  "journey-track": {
    id: "journey-track",
    intentHint: "상단 헤딩 / 하단 4단 가로 흐름 (문제→해결→결과)",
    rootClassName: "grid h-full w-full grid-rows-[auto_1fr] gap-8 px-16 py-12",
    slots: [
      { key: "headline", className: `${SLOT_BASE} flex flex-col gap-3`, hint: "헤딩 + 부제" },
      { key: "step-1", className: `${SLOT_BASE} flex flex-col gap-2`, hint: "1단계 (예: 문제)" },
      { key: "step-2", className: `${SLOT_BASE} flex flex-col gap-2`, hint: "2단계 (예: 역할)" },
      { key: "step-3", className: `${SLOT_BASE} flex flex-col gap-2`, hint: "3단계 (예: 해결)" },
      { key: "step-4", className: `${SLOT_BASE} flex flex-col gap-2`, hint: "4단계 (예: 결과)" },
    ],
  },
  "grid-2x2": {
    id: "grid-2x2",
    intentHint: "2×2 카드 4개 (역할/기술/팀/성과 등)",
    rootClassName: "grid h-full w-full grid-cols-2 grid-rows-2 gap-6 px-14 py-12",
    slots: [
      { key: "tl", className: `${SLOT_BASE} flex flex-col gap-2`, hint: "좌상" },
      { key: "tr", className: `${SLOT_BASE} flex flex-col gap-2`, hint: "우상" },
      { key: "bl", className: `${SLOT_BASE} flex flex-col gap-2`, hint: "좌하" },
      { key: "br", className: `${SLOT_BASE} flex flex-col gap-2`, hint: "우하" },
    ],
  },
  "centered-stack": {
    id: "centered-stack",
    intentHint: "가운데 수직 스택 (단일 메시지 강조)",
    rootClassName: "flex h-full w-full items-center justify-center px-24 py-20",
    slots: [
      { key: "stack", className: `${SLOT_BASE} flex max-w-[820px] flex-col items-start gap-6`, hint: "헤딩 + 본문 + 키워드" },
    ],
  },
  "metric-spotlight": {
    id: "metric-spotlight",
    intentHint: "좌 거대한 숫자 / 우 설명 + 캡션",
    rootClassName: "grid h-full w-full grid-cols-[1.1fr_1fr] gap-12 px-20 py-16",
    slots: [
      { key: "metric", className: `${SLOT_BASE} flex flex-col justify-center gap-4`, hint: "거대한 숫자 (text-7xl 이상)" },
      { key: "explain", className: `${SLOT_BASE} flex flex-col justify-center gap-4`, hint: "설명 본문 + 보조 메트릭" },
    ],
  },
  "evidence-wall": {
    id: "evidence-wall",
    intentHint: "좌 요약 / 우 2×2 증거 카드",
    rootClassName: "grid h-full w-full grid-cols-[0.85fr_1.15fr] gap-10 px-16 py-14",
    slots: [
      { key: "summary", className: `${SLOT_BASE} flex flex-col justify-center gap-4`, hint: "요약 헤딩 + 본문" },
      { key: "evidence-tl", className: `${SLOT_BASE} flex flex-col gap-1 border-t-[3px] border-current/40 pt-3`, hint: "증거 1" },
      { key: "evidence-tr", className: `${SLOT_BASE} flex flex-col gap-1 border-t-[3px] border-current/40 pt-3`, hint: "증거 2" },
      { key: "evidence-bl", className: `${SLOT_BASE} flex flex-col gap-1 border-t-[3px] border-current/40 pt-3`, hint: "증거 3" },
      { key: "evidence-br", className: `${SLOT_BASE} flex flex-col gap-1 border-t-[3px] border-current/40 pt-3`, hint: "증거 4" },
    ],
  },
  "closing-statement": {
    id: "closing-statement",
    intentHint: "마감 — 가운데 한 줄",
    rootClassName: "flex h-full w-full items-center justify-center px-24 py-20",
    slots: [
      { key: "message", className: `${SLOT_BASE} flex max-w-[760px] flex-col items-start gap-5`, hint: "마감 한 줄 + 연락처/링크" },
    ],
  },
};

export function getFreeSlideLayout(id?: string): FreeSlideLayoutDefinition {
  if (id && id in FREE_SLIDE_LAYOUTS) {
    return FREE_SLIDE_LAYOUTS[id as FreeSlideLayout];
  }
  return FREE_SLIDE_LAYOUTS["split-left"];
}

// ──────────────────────────────────────────────────────────────────────────────
// className sanitize — token-level 위험 클래스 제거
// ──────────────────────────────────────────────────────────────────────────────

/** 토큰 자체가 위험한 경우 (정확 매치) */
const DANGEROUS_EXACT_TOKENS = new Set([
  "absolute",
  "fixed",
  "sticky",
]);

/** 토큰 prefix 가 위험한 경우 */
const DANGEROUS_PREFIXES = [
  "inset-", "z-",
  "-m-", "-mt-", "-mb-", "-ml-", "-mr-", "-mx-", "-my-",
  "-p-", "-pt-", "-pb-", "-pl-", "-pr-", "-px-", "-py-",
  "-top-", "-left-", "-right-", "-bottom-",
  "translate-x-[-", "translate-y-[-",
];

/** 큰 고정 사이즈 차단 (4자리 px 이상 또는 절대 큰 vh/vw) */
const DANGEROUS_BIG_SIZE_REGEX = /^(?:w|h|min-w|min-h|max-w|max-h)-\[\s*(?:[1-9]\d{3,}px|[3-9]\d+vh|[3-9]\d+vw|1\d{2,}vh|1\d{2,}vw)/;

/** position: 으로 시작하지만 absolute/fixed 인 경우 차단 (top-0/bottom-0 같은 0 값은 허용) */
function isDangerousPositionToken(token: string): boolean {
  // top-4 left-12 right-0 bottom-2 같은 토큰. 모두 absolute 와 같이 쓰일 때 위험.
  // 단, 0 또는 px=0 만 허용 — 일반적으로 0 으로 정렬용으로 자주 씀.
  if (/^(?:top|left|right|bottom)-/.test(token)) {
    return !/-0(?:\.\d+)?$|-\[0(?:px)?\]$/.test(token);
  }
  return false;
}

function isDangerousToken(token: string): boolean {
  if (!token) return true;
  if (DANGEROUS_EXACT_TOKENS.has(token)) return true;
  if (DANGEROUS_PREFIXES.some((prefix) => token.startsWith(prefix))) return true;
  if (DANGEROUS_BIG_SIZE_REGEX.test(token)) return true;
  if (isDangerousPositionToken(token)) return true;
  // Tailwind variant 들 (md:, hover:, lg:)도 안쪽 토큰을 검사
  const colonIdx = token.lastIndexOf(":");
  if (colonIdx >= 0 && colonIdx < token.length - 1) {
    return isDangerousToken(token.slice(colonIdx + 1));
  }
  return false;
}

function sanitizeClassName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // Tailwind class 안전 문자만 통과
  const cleaned = trimmed.replace(/[^a-zA-Z0-9_:\-./\[\]()%@&,#?+ ]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  // 토큰 단위 위험 검사
  const tokens = cleaned.split(/\s+/).filter((token) => !isDangerousToken(token));
  if (!tokens.length) return undefined;
  return tokens.join(" ").slice(0, MAX_FREE_SLIDE_CLASSNAME_LENGTH);
}

function normalizeFreeSlideNode(
  value: unknown,
  depth = 0,
  counter: { count: number } = { count: 0 },
): FreeSlideNode | null {
  if (!value || typeof value !== "object") return null;
  if (depth > MAX_FREE_SLIDE_DEPTH) return null;
  if (counter.count >= MAX_FREE_SLIDE_NODE_COUNT) return null;
  counter.count += 1;

  const raw = value as { tag?: unknown; className?: unknown; style?: unknown; text?: unknown; children?: unknown };
  const tagCandidate = typeof raw.tag === "string" ? (raw.tag.toLowerCase() as FreeSlideTag) : "div";
  const tag: FreeSlideTag = FREE_SLIDE_ALLOWED_TAGS.has(tagCandidate) ? tagCandidate : "div";

  const className = sanitizeClassName(raw.className);
  const style = normalizeFreeSlideStyle(raw.style);
  const text =
    typeof raw.text === "string" && raw.text.trim()
      ? raw.text.slice(0, MAX_FREE_SLIDE_TEXT_LENGTH)
      : undefined;

  let children: FreeSlideNode[] | undefined;
  if (Array.isArray(raw.children)) {
    const normalized = raw.children
      .map((child) => normalizeFreeSlideNode(child, depth + 1, counter))
      .filter((child): child is FreeSlideNode => Boolean(child));
    if (normalized.length) children = normalized;
  }

  return { tag, className, style, text, children };
}

export function normalizePortfolioFreeSlides(value: unknown): PortfolioFreeSlide[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: PortfolioFreeSlide[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<PortfolioFreeSlide> & { layout?: unknown; slots?: unknown; root?: unknown };

    // layout 정규화 — 알려진 layout 만 통과
    const layoutId =
      typeof item.layout === "string" && item.layout in FREE_SLIDE_LAYOUTS
        ? (item.layout as FreeSlideLayout)
        : "split-left";
    const layoutDef = FREE_SLIDE_LAYOUTS[layoutId];

    // slots 정규화 — 슬롯 개수에 맞춰 잘라내고 부족하면 빈 div 채움
    const slotsRaw = Array.isArray(item.slots) ? item.slots : Array.isArray(item.root) ? item.root : [];
    const slots: FreeSlideNode[] = layoutDef.slots.map((_, index) => {
      const node = normalizeFreeSlideNode(slotsRaw[index]);
      return node || { tag: "div" };
    });

    result.push({
      id: typeof item.id === "string" && item.id ? item.id : makeId("free-slide"),
      intent: typeof item.intent === "string" ? item.intent.slice(0, 240) : "",
      layout: layoutId,
      slots,
      sourceId: typeof item.sourceId === "string" ? item.sourceId : undefined,
      sourceKind:
        item.sourceKind === "project" || item.sourceKind === "experience" || item.sourceKind === "manual"
          ? item.sourceKind
          : undefined,
      visible: item.visible !== false,
    });
  }
  return result.length ? result : undefined;
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
  if (document.format === "site") {
    const pages = normalizePortfolioSitePages(document.pages).length
      ? normalizePortfolioSitePages(document.pages)
      : sectionsToSitePages(document.sections);

    return {
      ...document,
      format: "site",
      pageSize: "16:9",
      orientation: "landscape",
      generationPreset:
        document.generationPreset === "web-slide" ? document.generationPreset : "web-slide",
      mode: "paged",
      pages,
      sections: sitePagesToSections(pages),
    };
  }

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
  if (document.format === "site") {
    const pages = (document.pages || []).filter((page) => page.visible !== false);
    const cover = pages.find((page) => page.type === "cover") || pages[0];
    const projectPages = pages.filter(
      (page) => page.type === "case-study" || page.type === "project-detail",
    );
    const thumbnail =
      projectPages.map(getSitePageImage).find((image) => image?.url || image?.assetId) ||
      pages.map(getSitePageImage).find((image) => image?.url || image?.assetId);
    const uniqueProjectTitles = Array.from(
      new Map(
        projectPages
          .map((page) => [page.sourceId || page.title, page.title] as const)
          .filter(([, title]) => Boolean(title)),
      ).values(),
    );

    return {
      headline: cover?.subtitle || cover?.title || "",
      projectCount: uniqueProjectTitles.length || projectPages.length,
      sectionCount: pages.length,
      thumbnailUrl: thumbnail?.url || "",
      projectTitles: uniqueProjectTitles.slice(0, 3),
      slideTitles: pages
        .map((page) => page.title)
        .filter(Boolean)
        .slice(0, 6),
      previewPages: pages.slice(0, 12).map((page) => ({
        id: page.id,
        type: page.type,
        title: page.title || "제목 없음",
        subtitle:
          page.subtitle ||
          page.blocks.find((block) => block.type === "text" && block.content)?.content?.slice(0, 72),
        thumbnailUrl: getSitePageImage(page)?.url || "",
      })),
    };
  }

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
