interface EvaluationAxis {
  label: string;
  score: number;
  hint?: string;
}

interface EvaluationRingsProps {
  items: EvaluationAxis[];
  showHint?: boolean;
}

const SEGMENT_COLORS = [
  "hsl(var(--primary) / 0.96)",
  "hsl(var(--primary) / 0.66)",
  "hsl(var(--primary) / 0.36)",
  "hsl(var(--primary) / 0.22)",
];

export function EvaluationRings({ items, showHint = false }: EvaluationRingsProps) {
  const normalized = items.map((item) => ({
    ...item,
    score: Math.max(0, Math.min(100, Number(item.score) || 0)),
  }));

  let cursor = 0;
  const stops: string[] = [];

  normalized.forEach((item, idx) => {
    const next = Math.min(100, cursor + item.score);
    if (next > cursor) {
      const color = SEGMENT_COLORS[idx % SEGMENT_COLORS.length];
      stops.push(`${color} ${cursor}% ${next}%`);
      cursor = next;
    }
  });

  if (cursor < 100) {
    stops.push(`hsl(var(--muted)) ${cursor}% 100%`);
  }

  const ringBackground = `conic-gradient(${stops.join(", ")})`;

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <div className="relative h-36 w-36">
          <div
            className="absolute inset-0 rounded-full border border-primary/15"
            style={{ background: ringBackground }}
          />
          <div className="absolute inset-[16px] rounded-full border bg-background flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-black text-foreground">100</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Weight
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {normalized.map((item, idx) => (
          <div key={item.label} className="rounded-lg border bg-muted/10 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }}
                />
                {item.label}
              </span>
              <span className="font-bold text-primary">{item.score}%</span>
            </div>
          </div>
        ))}
      </div>

      {showHint ? (
        <div className="space-y-1.5">
          {normalized.map((item) =>
            item.hint ? (
              <p key={item.label} className="text-[11px] leading-relaxed text-muted-foreground">
                {item.label}: {item.hint}
              </p>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}

export type { EvaluationAxis };
