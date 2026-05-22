"use client";

import { motion } from "framer-motion";

interface PointerArrowProps {
  x: number;
  y: number;
  label: string;
  color?: string;
  direction?: "down" | "up" | "left" | "right";
}

export function PointerArrow({ x, y, label, color = "hsl(var(--primary))", direction = "down" }: PointerArrowProps) {
  const rotation = { down: 0, up: 180, left: 90, right: -90 }[direction];
  return (
    <motion.g
      initial={{ y: y - 4, opacity: 0 }}
      animate={{ y, opacity: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
    >
      <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
        <path d="M 0 0 L -6 -10 L 6 -10 Z" fill={color} />
      </g>
      <text
        x={x}
        y={y - 18}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={color}
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
    </motion.g>
  );
}
