// CTP 시각화 공통 색상 토큰. Tailwind semantic token과 매칭.
//
// 사용 원칙
//   1. SVG `fill` / `stroke` 등 raw 속성은 반드시 이 객체를 통해서만 색을 받는다.
//   2. 라이트/다크 모드 자동 적정은 Tailwind 변수(`hsl(var(--token))`)에 의존하고,
//      Tailwind에 없는 카테고리(info/warning/success/primaryHighlight 등)는
//      여기서 한 번 픽스된 HSL을 두고 한 곳에서만 관리한다.
//   3. `*Soft` / `*Edge` / `*Trace` / `*Ghost` 는 동일 의미의 알파 단계:
//        Soft   : 0.20  (메인 fill — 활성 셀)
//        Edge   : 0.30~0.40 (stroke / 강조 테두리)
//        Trace  : 0.10  (보조 fill / 칩 배경)
//        Ghost  : 0.02~0.05 (거의 안 보이는 baseline overlay)
export const colorTokens = {
  // ── Tailwind semantic 매핑 (자동 다크/라이트 적정) ─────────────────
  default: "hsl(var(--muted))",
  active: "hsl(var(--primary))",
  // Legacy aliases (back-compat for module-01 search visualizers)
  comparing: "hsl(var(--warning, 38 92% 50%))",
  found: "hsl(var(--success, 142 71% 45%))",
  muted: "hsl(var(--muted-foreground))",
  pointer: "hsl(var(--accent))",
  text: "hsl(var(--foreground))",
  background: "hsl(var(--background))",
  card: "hsl(var(--card))",
  border: "hsl(var(--border))",

  // ── 의미 컬러 (정해진 HSL — Tailwind 토큰 부족분) ──────────────────
  // 진행/현재 마커 (cyan)
  info: "hsl(189 94% 43%)",
  infoSoft: "hsla(189, 94%, 43%, 0.2)",
  infoEdge: "hsla(189, 94%, 43%, 0.3)",
  infoTrace: "hsla(189, 94%, 43%, 0.15)",
  infoDim: "hsla(189, 94%, 43%, 0.1)",
  infoGhost: "hsla(189, 94%, 43%, 0.05)",
  infoFaint: "hsla(189, 94%, 43%, 0.02)",

  // 성공/확정 (emerald)
  success: "hsl(160 84% 39%)",
  successSoft: "hsla(160, 84%, 39%, 0.2)",
  successEdge: "hsla(160, 84%, 39%, 0.3)",
  successTrace: "hsla(160, 84%, 39%, 0.15)",
  successDim: "hsla(160, 84%, 39%, 0.1)",
  successGhost: "hsla(160, 84%, 39%, 0.05)",
  successFaint: "hsla(160, 84%, 39%, 0.02)",

  // 경고/주목 (orange)
  warning: "hsl(24 95% 53%)",
  warningSoft: "hsla(24, 95%, 53%, 0.2)",
  warningEdge: "hsla(24, 95%, 53%, 0.4)",
  warningEdgeSubtle: "hsla(24, 95%, 53%, 0.3)",
  warningTrace: "hsla(24, 95%, 53%, 0.15)",
  warningDim: "hsla(24, 95%, 53%, 0.1)",

  // 위험/스왑/충돌 (rose)
  destructive: "hsl(347 89% 60%)",
  destructiveSoft: "hsla(347, 89%, 60%, 0.2)",
  destructiveEdge: "hsla(347, 89%, 60%, 0.3)",
  destructiveTrace: "hsla(347, 89%, 60%, 0.1)",
  destructiveGhost: "hsla(347, 89%, 60%, 0.05)",

  // 별도 톤(차분한 빨강) — error / collision / dequeue 강조용
  errorRed: "hsl(0 84% 60%)",
  errorSoft: "hsla(239, 68%, 68%, 0.2)",
  errorGhost: "hsla(239, 68%, 68%, 0.05)",

  // primary highlight (purple) — pivot, currentRow 등
  primaryHighlight: "hsl(271 91% 65%)",
  primaryHighlightSoft: "hsla(271, 91%, 65%, 0.2)",
  primaryHighlightEdge: "hsla(271, 91%, 65%, 0.3)",
  primaryHighlightTrace: "hsla(271, 91%, 65%, 0.15)",
  primaryHighlightDim: "hsla(271, 91%, 65%, 0.1)",
  primaryHighlightGhost: "hsla(271, 91%, 65%, 0.05)",

  // ── 중립 오버레이 (모드 무관 — 보통 다크 캔버스 위) ────────────────
  gridLine: "hsla(0, 0%, 100%, 0.05)",        // 격자/보조선
  gridMid: "hsla(0, 0%, 100%, 0.1)",          // 패널 분할 라인
  coordinateLabel: "hsla(0, 0%, 100%, 0.15)", // 좌표 / 보조 텍스트
  faintFill: "hsla(0, 0%, 100%, 0.02)",       // 거의 안 보이는 chip 배경
  faintEdge: "hsla(0, 0%, 100%, 0.1)",        // 거의 안 보이는 chip 테두리
  wastedSlot: "hsla(0, 0%, 12%, 0.4)",        // 낭비된 슬롯 (어두운 placeholder)

  // ── 의미 컬러 (덜 쓰이는 부속) ─────────────────────────────────────
  // blue (정렬 모듈에서 단순 element)
  primaryBlue: "hsl(217 91% 60%)",
  primaryBlueSoft: "hsla(217, 91%, 60%, 0.2)",
  primaryBlueEdge: "hsla(217, 91%, 60%, 0.3)",
  primaryBlueTrace: "hsla(217, 91%, 60%, 0.15)",
  primaryBlueDim: "hsla(217, 91%, 60%, 0.1)",
  primaryBlueGhost: "hsla(217, 91%, 60%, 0.05)",
} as const;

export type ColorToken = keyof typeof colorTokens;
