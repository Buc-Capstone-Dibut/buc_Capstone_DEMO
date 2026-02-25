import { Badge } from "@/components/ui/badge";

interface RubricHelpItem {
  label: string;
  weight: number;
  hint: string;
  sampleQuestion: string;
}

interface RubricHelpGuideProps {
  items: RubricHelpItem[];
  compact?: boolean;
}

export function RubricHelpGuide({ items, compact = false }: RubricHelpGuideProps) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-muted/10 px-3 py-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{item.label}</p>
            <Badge variant="outline" className="border-primary/20 text-primary">
              {item.weight}%
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{item.hint}</p>

          <div className="rounded-lg bg-background/80 border px-2.5 py-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              Example Question
            </p>
            <p className={`text-sm leading-relaxed ${compact ? "line-clamp-2" : ""}`}>
              “{item.sampleQuestion}”
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export type { RubricHelpItem };
