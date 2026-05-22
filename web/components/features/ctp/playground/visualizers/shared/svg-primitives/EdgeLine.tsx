"use client";

import { colorTokens, type ColorToken } from "./colorTokens";

interface EdgeLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  status?: ColorToken;
  arrow?: boolean;
  label?: string;
}

export function EdgeLine({ x1, y1, x2, y2, status = "default", arrow = false, label }: EdgeLineProps) {
  const stroke = colorTokens[status === "default" ? "muted" : status];
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={stroke}
        strokeWidth={2}
        markerEnd={arrow ? "url(#edge-arrow)" : undefined}
      />
      {arrow && (
        <defs>
          <marker id="edge-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
          </marker>
        </defs>
      )}
      {label && (
        <text x={midX} y={midY - 6} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
          {label}
        </text>
      )}
    </g>
  );
}
