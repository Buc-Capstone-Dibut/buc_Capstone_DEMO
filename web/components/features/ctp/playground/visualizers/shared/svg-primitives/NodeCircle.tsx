"use client";

import { motion } from "framer-motion";
import { colorTokens, type ColorToken } from "./colorTokens";

interface NodeCircleProps {
  cx: number;
  cy: number;
  r: number;
  value: string | number;
  status?: ColorToken;
  showGlow?: boolean;
}

export function NodeCircle({ cx, cy, r, value, status = "default", showGlow = false }: NodeCircleProps) {
  const fill = colorTokens[status];
  return (
    <motion.g
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
      filter={showGlow ? `url(#neon-glow-${status === "default" ? "primary" : status})` : undefined}
    >
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="hsl(var(--border))" strokeWidth={1.5} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={r * 0.7}
        fill="hsl(var(--background))"
        fontWeight={600}
      >
        {value}
      </text>
    </motion.g>
  );
}
