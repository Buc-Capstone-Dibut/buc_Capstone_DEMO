"use client";

interface LogPanelProps {
  logs: string[];
  maxLines?: number;
}

export function LogPanel({ logs, maxLines = 6 }: LogPanelProps) {
  const visible = logs.slice(-maxLines);
  return (
    <div className="bg-muted/40 rounded-md p-3 text-xs font-mono space-y-1 h-32 overflow-y-auto">
      {visible.length === 0 ? (
        <div className="text-muted-foreground italic">실행 로그가 여기 표시됩니다.</div>
      ) : (
        visible.map((log, i) => (
          <div key={i} className="text-foreground/80">
            <span className="text-muted-foreground mr-2">{logs.length - visible.length + i + 1}.</span>
            {log}
          </div>
        ))
      )}
    </div>
  );
}
