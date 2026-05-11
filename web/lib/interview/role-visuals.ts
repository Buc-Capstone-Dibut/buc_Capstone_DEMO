export const ROLE_CATEGORY_VISUALS: Record<string, { icon: string; glow: string }> = {
  backend: {
    icon: "/images/interview/setup/role-categories/role-category-backend.png",
    glow: "bg-[#dceecf]",
  },
  frontend: {
    icon: "/images/interview/setup/role-categories/role-category-frontend.png",
    glow: "bg-[#d8edf6]",
  },
  mobile: {
    icon: "/images/interview/setup/role-categories/role-category-mobile.png",
    glow: "bg-[#e4edf8]",
  },
  devops: {
    icon: "/images/interview/setup/role-categories/role-category-devops.png",
    glow: "bg-[#dcf0ec]",
  },
  data: {
    icon: "/images/interview/setup/role-categories/role-category-data.png",
    glow: "bg-[#dceaf5]",
  },
  ai: {
    icon: "/images/interview/setup/role-categories/role-category-ai-ml.png",
    glow: "bg-[#e2f2d5]",
  },
  security: {
    icon: "/images/interview/setup/role-categories/role-category-security.png",
    glow: "bg-[#dce7f2]",
  },
  qa: {
    icon: "/images/interview/setup/role-categories/role-category-qa-automation.png",
    glow: "bg-[#e7f0dc]",
  },
};

export const ROLE_DETAIL_ICONS = {
  common: "/images/interview/setup/role-details/role-detail-common.png",
  service: "/images/interview/setup/role-details/role-detail-service.png",
  platform: "/images/interview/setup/role-details/role-detail-platform.png",
  dataApi: "/images/interview/setup/role-details/role-detail-data-api.png",
  ops: "/images/interview/setup/role-details/role-detail-operations.png",
  quality: "/images/interview/setup/role-details/role-detail-quality.png",
} as const;

export function getRoleCategoryVisual(categoryId: string) {
  return ROLE_CATEGORY_VISUALS[categoryId] ?? ROLE_CATEGORY_VISUALS.backend;
}

export function getRoleDetailIcon(roleId?: string | null) {
  if (!roleId) return ROLE_DETAIL_ICONS.common;
  if (/(platform|infra|cloud|sre|devops|mlops|mobile-platform)/.test(roleId)) return ROLE_DETAIL_ICONS.platform;
  if (/(data|api|analytics|bi)/.test(roleId)) return ROLE_DETAIL_ICONS.dataApi;
  if (/(security|qa|test|appsec|automation)/.test(roleId)) return ROLE_DETAIL_ICONS.quality;
  if (/(ops|reliability|transaction)/.test(roleId)) return ROLE_DETAIL_ICONS.ops;
  return ROLE_DETAIL_ICONS.service;
}
