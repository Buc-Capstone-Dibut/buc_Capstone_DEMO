"use client";

import { cn } from "@/lib/utils";

const SECTION_DEFS: { title: string; keys: string[] }[] = [
  { title: "활성", keys: ["active_node", "current_node", "active_index", "active_range", "k_index", "active_prefix"] },
  { title: "비교", keys: ["compare_nodes", "compare_indices", "highlight_indices", "swap_indices", "found_index", "target_index"] },
  { title: "방문 순서", keys: ["order", "visited_nodes"] },
  { title: "선택 간선", keys: ["mst_edges", "mst", "selected_edges"] },
  { title: "총 비용", keys: ["total_weight", "total_cost"] },
  { title: "스택", keys: ["stack", "call_stack"] },
  { title: "큐", keys: ["queue", "queue_view"] },
  { title: "거리", keys: ["dist"] },
  { title: "부모", keys: ["parent"] },
  { title: "경로", keys: ["path"] },
  { title: "프론티어", keys: ["frontier_cells"] },
  { title: "활성 셀", keys: ["active_cell"] },
  { title: "방문", keys: ["visited"] },
  { title: "결과", keys: ["result", "answer", "output"] },
];

const resolveValue = (vars: Record<string, any> | undefined | null, keys: string[]) => {
  if (!vars) return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key];
    }
  }
  return undefined;
};

const formatValue = (value: any) => {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (Array.isArray(value[0])) {
      return value.map((row) => row.join(" ")).join("\n");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

interface CTPStatePanelProps {
  variables?: Record<string, any> | null;
  events?: any[];
  mode?: "summary" | "full";
}

const formatEvent = (event: any) => {
  if (!event || typeof event !== "object") return "";
  const type = event.type ?? "event";
  const parts: string[] = [];
  if (event.id !== undefined) parts.push(`id=${event.id}`);
  if (Array.isArray(event.ids)) parts.push(`ids=${event.ids.join(",")}`);
  if (event.u !== undefined || event.v !== undefined) {
    parts.push(`edge=${event.u ?? "?"}->${event.v ?? "?"}`);
  }
  if (event.dist !== undefined) parts.push(`dist=${event.dist}`);
  if (event.w !== undefined) parts.push(`w=${event.w}`);
  if (event.scope) parts.push(`scope=${event.scope}`);
  return `${type}${parts.length ? " (" + parts.join(" ") + ")" : ""}`;
};

const SUMMARY_ALLOW = new Set([
  "활성",
  "비교",
  "방문 순서",
  "선택 간선",
  "총 비용",
  "스택",
  "큐",
  "거리",
  "부모",
  "경로",
  "결과",
]);

export function CTPStatePanel({ variables, events, mode = "full" }: CTPStatePanelProps) {
  const activeNode = variables?.active_node ?? variables?.current_node;
  const activeCell = variables?.active_cell;
  const hasContent = SECTION_DEFS.some(({ keys }) => resolveValue(variables, keys) !== undefined);
  const eventLimit = mode === "summary" ? 10 : 20;
  const recentEvents = Array.isArray(events) ? events.slice(-eventLimit) : [];

  if (!hasContent && activeNode === undefined && activeCell === undefined && recentEvents.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
        시뮬레이션을 실행하면 상태 패널이 표시됩니다.
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col gap-3 p-3">
      <div className="flex items-center gap-3">
        <h4 className="text-xs font-semibold text-muted-foreground">상태 패널</h4>
        {activeNode !== undefined && (
          <span className="text-xs font-mono text-primary">active: {String(activeNode)}</span>
        )}
        {activeCell !== undefined && (
          <span className="text-xs font-mono text-primary">cell: {JSON.stringify(activeCell)}</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-auto">
        {SECTION_DEFS.map(({ title, keys }) => {
          const value = resolveValue(variables, keys);
          if (mode === "summary" && !SUMMARY_ALLOW.has(title)) return null;
          if (value === undefined) return null;
          return (
            <div key={title} className="rounded-md border border-border bg-muted/20 p-2">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1">{title}</div>
              <pre className={cn("text-[11px] font-mono whitespace-pre-wrap break-words text-foreground")}>
                {formatValue(value)}
              </pre>
            </div>
          );
        })}

        {recentEvents.length > 0 && (
          <div className="rounded-md border border-border bg-muted/20 p-2 md:col-span-2">
            <div className="text-[11px] font-semibold text-muted-foreground mb-1">이벤트 로그</div>
            <div className="text-[11px] font-mono whitespace-pre-wrap text-foreground space-y-1">
              {recentEvents.map((event, idx) => (
                <div key={`${event?.type ?? "event"}-${idx}`}>{formatEvent(event)}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
