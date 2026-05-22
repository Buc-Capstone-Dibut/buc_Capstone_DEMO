// CTP 시각화 공통 색상 토큰. Tailwind semantic token과 매칭.
export const colorTokens = {
  default: "hsl(var(--muted))",
  active: "hsl(var(--primary))",
  comparing: "hsl(var(--warning, 38 92% 50%))",
  found: "hsl(var(--success, 142 71% 45%))",
  muted: "hsl(var(--muted-foreground))",
  pointer: "hsl(var(--accent))",
  text: "hsl(var(--foreground))",
  background: "hsl(var(--background))",
  border: "hsl(var(--border))",
} as const;

export type ColorToken = keyof typeof colorTokens;
