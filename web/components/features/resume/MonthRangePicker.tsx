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

export function MonthRangePicker({ value, onChange, className }: MonthRangePickerProps) {
  // Parse initial value
  const [startStr, endStr] = value.split(" ~ ");
  const [startYear, startMonth] = (startStr || "").split(".");
  const [endYear, endMonth] = (endStr || "").split(".");

  const isPresent = endStr === "현재";

  const years = Array.from({ length: 30 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));

  const updateValue = (sY: string, sM: string, eY: string, eM: string, present: boolean) => {
    const start = `${sY || "2024"}.${sM || "01"}`;
    const end = present ? "현재" : `${eY || "2024"}.${eM || "01"}`;
    onChange(`${start} ~ ${end}`);
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
            <Select value={startYear} onValueChange={(v) => updateValue(v, startMonth, endYear, endMonth, isPresent)}>
              <SelectTrigger className="h-8 text-[12px] bg-background border-input">
                <SelectValue placeholder="연도" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={startMonth} onValueChange={(v) => updateValue(startYear, v, endYear, endMonth, isPresent)}>
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
            <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => updateValue(startYear, startMonth, endYear, endMonth, !isPresent)}>
              <Checkbox
                checked={isPresent}
                onCheckedChange={(checked) => updateValue(startYear, startMonth, endYear, endMonth, !!checked)}
                id="present-checkbox"
                className="h-3.5 w-3.5"
              />
              <label htmlFor="present-checkbox" className="text-[11px] font-semibold text-slate-500 cursor-pointer">현재</label>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Select disabled={isPresent} value={endYear} onValueChange={(v) => updateValue(startYear, startMonth, v, endMonth, isPresent)}>
              <SelectTrigger className="h-8 text-[12px] bg-background border-input">
                <SelectValue placeholder="연도" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}년</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select disabled={isPresent} value={endMonth} onValueChange={(v) => updateValue(startYear, startMonth, endYear, v, isPresent)}>
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
