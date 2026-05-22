"use client";

interface IndexLabelProps {
  x: number;
  y: number;
  index: number;
  size?: number;
}

export function IndexLabel({ x, y, index, size = 12 }: IndexLabelProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={size}
      fill="hsl(var(--muted-foreground))"
      fontFamily="ui-monospace, monospace"
    >
      {index}
    </text>
  );
}
