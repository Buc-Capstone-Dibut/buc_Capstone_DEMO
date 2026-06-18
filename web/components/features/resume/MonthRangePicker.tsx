"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface MonthRangePickerProps {
  value: string; // Format: "YYYY.MM ~ YYYY.MM" or "YYYY.MM ~ 현재"
  onChange: (value: string) => void;
  className?: string;
}

// "현재 진행 중"을 뜻하는 토큰들 (저장 포맷이 제각각이라 모두 허용)
const PRESENT_TOKENS = ["현재", "진행", "진행중", "present", "Present", "now"];

interface RangeParts {
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isPresent: boolean;
}

/**
 * 저장된 기간 문자열을 관대하게 파싱한다.
 * "YYYY.MM ~ YYYY.MM" 뿐 아니라 "YYYY.MM.DD ~ ...", "YYYY.MM ~ 현재",
 * 공백 없는 "~", 빈 값 등도 깨지지 않게 처리한다.
 */
function parseValue(value: string): RangeParts {
  const [rawStart = "", rawEnd = ""] = (value || "").split("~");
  const startParts = rawStart.trim().split(".");
  const endTrim = rawEnd.trim();
  const present = PRESENT_TOKENS.includes(endTrim);
  const endParts = endTrim.split(".");
  return {
    startYear: startParts[0]?.trim() || "",
    startMonth: startParts[1]?.trim() || "",
    endYear: present ? "" : endParts[0]?.trim() || "",
    endMonth: present ? "" : endParts[1]?.trim() || "",
    isPresent: present,
  };
}

function buildValue(parts: RangeParts): string {
  const start =
    parts.startYear && parts.startMonth
      ? `${parts.startYear}.${parts.startMonth}`
      : "";
  const end = parts.isPresent
    ? "현재"
    : parts.endYear && parts.endMonth
      ? `${parts.endYear}.${parts.endMonth}`
      : "";
  return `${start} ~ ${end}`;
}

export function MonthRangePicker({ value, onChange, className }: MonthRangePickerProps) {
  // 로컬 상태로 각 필드를 독립 관리한다. (예전엔 매 렌더마다 value를 다시 쪼개
  // 한쪽을 바꾸면 다른 쪽이 "2024.01" 기본값으로 덮어써지는 버그가 있었다.)
  const [parts, setParts] = React.useState<RangeParts>(() => parseValue(value));

  // 외부에서 value가 바뀌면(다른 항목 편집 등) 로컬 상태를 동기화한다.
  React.useEffect(() => {
    setParts(parseValue(value));
  }, [value]);

  const years = Array.from({ length: 30 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));

  const update = (patch: Partial<RangeParts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    onChange(buildValue(next));
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-1.5">
          <div className="h-5 flex items-center">
            <Label className="text-[11px] text-muted-foreground">시작일</Label>
          </div>
          <div className="flex gap-1.5">
            <Select value={parts.startYear} onValueChange={(v) => update({ startYear: v })}>
              <SelectTrigger className="h-8 text-[12px] bg-background border-input">
                <SelectValue placeholder="연도" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={parts.startMonth} onValueChange={(v) => update({ startMonth: v })}>
              <SelectTrigger className="h-8 text-[12px] bg-background border-input">
                <SelectValue placeholder="월" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>{m}월</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <div className="h-5 flex items-center justify-between">
            <Label className="text-[11px] text-muted-foreground">종료일</Label>
            <div className="flex items-center gap-1.5">
              <Checkbox
                checked={parts.isPresent}
                onCheckedChange={(checked) => update({ isPresent: !!checked })}
                id="present-checkbox"
                className="h-3.5 w-3.5"
              />
              <label htmlFor="present-checkbox" className="text-[11px] font-semibold text-slate-500 cursor-pointer">현재</label>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Select disabled={parts.isPresent} value={parts.endYear} onValueChange={(v) => update({ endYear: v })}>
              <SelectTrigger className="h-8 text-[12px] bg-background border-input">
                <SelectValue placeholder="연도" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select disabled={parts.isPresent} value={parts.endMonth} onValueChange={(v) => update({ endMonth: v })}>
              <SelectTrigger className="h-8 text-[12px] bg-background border-input">
                <SelectValue placeholder="월" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>{m}월</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
