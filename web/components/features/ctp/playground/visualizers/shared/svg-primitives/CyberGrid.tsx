"use client";

interface CyberGridProps {
  width?: number;
  height?: number;
  gridSize?: number;
  opacity?: number;
}

export function CyberGrid({
  width = 800,
  height = 500,
  gridSize = 40,
  opacity = 0.15,
}: CyberGridProps) {
  return (
    <g aria-hidden opacity={opacity}>
      <defs>
        <pattern id="cyber-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={0.5}
          />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#cyber-grid)" />
    </g>
  );
}
