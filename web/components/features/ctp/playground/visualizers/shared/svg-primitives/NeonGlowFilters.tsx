"use client";

const GLOW_COLORS = ["primary", "warning", "success", "danger", "accent"] as const;

export function NeonGlowFilters() {
  return (
    <defs>
      {GLOW_COLORS.map((color) => (
        <filter id={`neon-glow-${color}`} key={color} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      ))}
    </defs>
  );
}
