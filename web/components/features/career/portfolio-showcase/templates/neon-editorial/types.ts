import { z } from "zod";
import type { ProjectSnapshot } from "../../shared/project-snapshot-types";

// Tokens — design-system knobs the user can change in the "디자인" tab.
export const NeonEditorialTokensSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),  // hex color
  bg: z.enum(["dark"]),                              // dark-only in v1
  fontPair: z.enum(["pretendard"]),                  // 1 option in v1
  density: z.enum(["spacious", "balanced", "compact"]),
});
export type NeonEditorialTokens = z.infer<typeof NeonEditorialTokensSchema>;

// Hero
const HeroSchema = z.object({
  jobTitle: z.string().default("PRODUCT ENGINEER"),
  year: z.string().default("© 2026"),
  headlineLines: z.array(z.string()).min(1).max(4),
  bio: z.string().default(""),
});

// About
const StrengthSchema = z.object({
  num: z.string(),
  title: z.string(),
  body: z.string(),
});
const AboutSchema = z.object({
  quote: z.string().default(""),
  paragraphs: z.array(z.string()).default([]),
  strengths: z.array(StrengthSchema).max(4).default([]),
});

// KPI
const KpiSchema = z.object({
  num: z.number(),
  suffix: z.string().default(""),
  label: z.string(),
});

// Project snapshot type — treated as opaque JSON by zod (validated upstream by timeline)
const ProjectSnapshotSchema = z.record(z.string(), z.any());

// Timeline rows for Experience/Education
const TimelineRowSchema = z.object({
  date: z.string(),
  title: z.string(),
  org: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

// Contact
const ContactSchema = z.object({
  email: z.string().default(""),
  socials: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
});

// Top-level content
export const NeonEditorialContentSchema = z.object({
  hero: HeroSchema,
  marqueeKeywords: z.array(z.string()).default([]),
  about: AboutSchema,
  projects: z.array(ProjectSnapshotSchema).default([]),
  kpis: z.array(KpiSchema).default([]),
  experience: z.array(TimelineRowSchema).default([]),
  education: z.array(TimelineRowSchema).default([]),
  contact: ContactSchema,
});
export type NeonEditorialContent = z.infer<typeof NeonEditorialContentSchema>;

// Defaults — used when creating a new portfolio before user edits.
export function createDefaultNeonEditorialTokens(): NeonEditorialTokens {
  return {
    accent: "#39FF14",
    bg: "dark",
    fontPair: "pretendard",
    density: "spacious",
  };
}

export function createDefaultNeonEditorialContent(seed: {
  name: string;
  projects?: ProjectSnapshot[];
}): NeonEditorialContent {
  const parts = (seed.name || "PORTFOLIO").trim().split(/\s+/).slice(0, 2);
  const headlineLines = parts.length > 1 ? [...parts, "PORTFOLIO."] : [parts[0] || "PORTFOLIO", "PORTFOLIO."];

  return {
    hero: {
      jobTitle: "PRODUCT ENGINEER",
      year: "© 2026",
      headlineLines,
      bio: "한 줄 소개를 입력하세요.",
    },
    marqueeKeywords: ["TYPESCRIPT", "NEXT.JS", "POSTGRESQL", "AWS", "DESIGN SYSTEMS"],
    about: {
      quote: "기술은 도구일 뿐, 만드는 사람의 의도가 곧 프로덕트의 품질이다.",
      paragraphs: ["소개 문단을 입력하세요."],
      strengths: [],
    },
    projects: (seed.projects ?? []) as Record<string, unknown>[],
    kpis: [],
    experience: [],
    education: [],
    contact: { email: "", socials: [] },
  };
}
