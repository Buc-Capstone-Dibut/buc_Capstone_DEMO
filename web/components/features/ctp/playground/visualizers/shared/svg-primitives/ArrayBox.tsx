"use client";

import { motion } from "framer-motion";
import { colorTokens, type ColorToken } from "./colorTokens";

interface ArrayBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string | number;
  status?: ColorToken;
  showGlow?: boolean;
}

export function ArrayBox({
  x, y, width, height, value,
  status = "default",
  showGlow = false,
}: ArrayBoxProps) {
  const fill = colorTokens[status];
  return (
    <motion.g
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      filter={showGlow ? `url(#neon-glow-${status === "default" ? "primary" : status})` : undefined}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="hsl(var(--border))"
        strokeWidth={1.5}
        rx={4}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(width, height) * 0.4}
        fill="hsl(var(--background))"
        fontWeight={600}
      >
        {value}
      </text>
    </motion.g>
  );
}
