"use client";

import { useMemo } from "react";
import { format, parse, setHours, setMinutes } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";
const DISPLAY_FORMAT = "yyyy.MM.dd (E) a h:mm";

function tryParse(value: string): Date | null {
  if (!value) return null;
  try {
    const d = parse(value, INPUT_FORMAT, new Date());
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export interface DateTimePickerProps {
  /** `YYYY-MM-DDTHH:mm` (datetime-local 호환). 빈 문자열이면 미선택. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** 시간 입력을 숨기고 날짜만 받음 (기본값 false) */
  dateOnly?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "날짜 선택",
  className,
  disabled,
  dateOnly = false,
}: DateTimePickerProps) {
  const date = useMemo(() => tryParse(value), [value]);
  const timeStr = useMemo(
    () => (date ? format(date, "HH:mm") : "09:00"),
    [date],
  );

  const emit = (next: Date) => {
    onChange(format(next, INPUT_FORMAT));
  };

  const handleSelectDate = (selected: Date | undefined) => {
    if (!selected) return;
    const [h, m] = timeStr.split(":").map(Number);
    emit(setMinutes(setHours(selected, h), m));
  };

  const handleTimeChange = (next: string) => {
    if (!/^\d{2}:\d{2}$/.test(next)) return;
    const [h, m] = next.split(":").map(Number);
    const base = date ?? new Date();
    emit(setMinutes(setHours(base, h), m));
  };

  const display = date
    ? format(date, dateOnly ? "yyyy.MM.dd (E)" : DISPLAY_FORMAT, {
        locale: ko,
      })
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start gap-2 px-3 font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date ?? undefined}
          onSelect={handleSelectDate}
          locale={ko}
          initialFocus
          weekStartsOn={0}
        />
        {!dateOnly && (
          <div className="flex items-center gap-2 border-t px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              시간
            </span>
            <Input
              type="time"
              value={timeStr}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="h-8 w-32"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
