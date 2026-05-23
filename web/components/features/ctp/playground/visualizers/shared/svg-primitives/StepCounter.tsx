"use client";

interface StepCounterProps {
  current: number;
  total: number;
  className?: string;
}

export function StepCounter({ current, total, className }: StepCounterProps) {
  return (
    <div className={`text-xs font-mono text-muted-foreground ${className ?? ""}`}>
      Step <span className="text-foreground font-semibold">{current}</span> / {total}
    </div>
  );
}
