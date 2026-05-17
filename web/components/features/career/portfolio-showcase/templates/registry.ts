import { NeonEditorialTemplate } from "./neon-editorial";
import {
  NeonEditorialContentSchema,
  NeonEditorialTokensSchema,
  createDefaultNeonEditorialContent,
  createDefaultNeonEditorialTokens,
} from "./neon-editorial/types";

export const SHOWCASE_TEMPLATES = {
  "neon-editorial": {
    label: "Neon Editorial",
    description: "거대 디스플레이 타이포 + 네온 어센트 + GSAP 인터랙션",
    Component: NeonEditorialTemplate,
    contentSchema: NeonEditorialContentSchema,
    tokensSchema: NeonEditorialTokensSchema,
    createDefaultContent: createDefaultNeonEditorialContent,
    createDefaultTokens: createDefaultNeonEditorialTokens,
    previewImage: "/portfolio-template-previews/neon-editorial.png",
  },
} as const;

export type ShowcaseTemplateId = keyof typeof SHOWCASE_TEMPLATES;

const DEFAULT_TEMPLATE_ID: ShowcaseTemplateId = "neon-editorial";

export function isShowcaseTemplateId(value: unknown): value is ShowcaseTemplateId {
  return typeof value === "string" && value in SHOWCASE_TEMPLATES;
}

export function getShowcaseTemplate(id: unknown) {
  return SHOWCASE_TEMPLATES[isShowcaseTemplateId(id) ? id : DEFAULT_TEMPLATE_ID];
}
