"use client";

import { Activity, Loader2 } from "lucide-react";
import type { ActivityHeatmapPoint } from "../profile-types";
import { LEVEL_CLASS } from "../profile-utils";
import { ProfileEmptyState } from "./empty-state";

interface ActivityTabProps {
  loading?: boolean;
  error?: string;
  heatmap: ActivityHeatmapPoint[];
  activityTotal: number;
}

export function ActivityTab({
  loading,
  error,
  heatmap,
  activityTotal,
}: ActivityTabProps) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold">활동 기록</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            최근 1년 · 총 {activityTotal}회
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>적음</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <div
              key={level}
              className={`w-3 h-3 rounded-[2px] ${LEVEL_CLASS[level]}`}
            />
          ))}
          <span>많음</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          활동 기록을 불러오는 중...
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 py-10 text-center">{error}</p>
      ) : heatmap.length === 0 ? (
        <ProfileEmptyState
          icon={Activity}
          message="최근 1년간 활동 기록이 없습니다."
        />
      ) : (
        <div className="overflow-x-auto">
          <div
            className="grid gap-[3px]"
            style={{
              gridTemplateColumns: "repeat(53, minmax(0, 1fr))",
              minWidth: "530px",
            }}
          >
            {heatmap.map((point) => (
              <div
                key={point.date}
                className={`h-3.5 rounded-[2px] ${LEVEL_CLASS[point.level] ?? LEVEL_CLASS[0]}`}
                title={`${point.date}: ${point.count}회`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
