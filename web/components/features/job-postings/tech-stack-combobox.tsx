"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllTechLabels, getTechLogo } from "@/lib/interview/tech-logos";

export interface TechStackComboboxProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  /** dropdown 최대 노출 갯수 */
  maxOptions?: number;
}

const DEFAULT_MAX_OPTIONS = 80;

function normalize(s: string) {
  return s.trim().toLowerCase();
}

/**
 * 사전(`TECH_LOGO_BY_KEY`) 기반 검색형 multi-select.
 *
 * - 칩 표시 + 키보드 탐색(↑↓), Enter 선택, Backspace로 마지막 칩 제거, Esc로 드롭다운 닫기
 * - 사전에 없는 자유 입력도 "직접 추가"로 허용
 */
export function TechStackCombobox({
  value,
  onChange,
  placeholder = "기술을 검색하거나 입력 후 Enter",
  className,
  maxOptions = DEFAULT_MAX_OPTIONS,
}: TechStackComboboxProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const reactId = useId();
  const listboxId = `tech-combobox-${reactId}`;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // 사전 라벨 (마운트 시 1회)
  const allLabels = useMemo(() => getAllTechLabels().map((m) => m.label), []);

  // 이미 선택된 값(대소문자 무시) 차집합 + 검색 필터링
  const selectedLower = useMemo(
    () => new Set(value.map((v) => normalize(v))),
    [value],
  );

  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();

  const filtered = useMemo(() => {
    const pool = allLabels.filter((label) => !selectedLower.has(normalize(label)));
    if (!lowerQuery) return pool.slice(0, maxOptions);
    // 1순위: prefix 매칭 → 2순위: substring 매칭
    const prefix: string[] = [];
    const contains: string[] = [];
    for (const label of pool) {
      const lower = label.toLowerCase();
      if (lower.startsWith(lowerQuery)) prefix.push(label);
      else if (lower.includes(lowerQuery)) contains.push(label);
    }
    return [...prefix, ...contains].slice(0, maxOptions);
  }, [allLabels, selectedLower, lowerQuery, maxOptions]);

  // 자유 입력 옵션: 검색어가 사전/이미 선택된 값에 없을 때 노출
  const canAddCustom = useMemo(() => {
    if (!trimmedQuery) return false;
    if (selectedLower.has(lowerQuery)) return false;
    return !allLabels.some((l) => l.toLowerCase() === lowerQuery);
  }, [trimmedQuery, lowerQuery, allLabels, selectedLower]);

  // 옵션 총 갯수 (커스텀 옵션은 항상 맨 끝)
  const totalOptions = filtered.length + (canAddCustom ? 1 : 0);

  // query 변경 시 active index 리셋
  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  // active 항목 스크롤
  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );
    if (node) {
      node.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  // 외부 클릭 감지
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (wrapperRef.current && target && !wrapperRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const addValue = useCallback(
    (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const lower = normalize(trimmed);
      if (value.some((v) => normalize(v) === lower)) return;
      onChange([...value, trimmed]);
      setQuery("");
      setActiveIndex(0);
    },
    [onChange, value],
  );

  const removeAt = useCallback(
    (index: number) => {
      const next = value.filter((_, i) => i !== index);
      onChange(next);
    },
    [onChange, value],
  );

  const removeByLabel = useCallback(
    (label: string) => {
      const lower = normalize(label);
      onChange(value.filter((v) => normalize(v) !== lower));
    },
    [onChange, value],
  );

  const selectAt = useCallback(
    (index: number) => {
      if (index < 0) return;
      if (index < filtered.length) {
        addValue(filtered[index]);
      } else if (canAddCustom) {
        addValue(trimmedQuery);
      }
    },
    [addValue, canAddCustom, filtered, trimmedQuery],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
      } else if (totalOptions > 0) {
        setActiveIndex((i) => (i + 1) % totalOptions);
      }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowUp") {
      if (!open) {
        setOpen(true);
        setActiveIndex(totalOptions - 1);
      } else if (totalOptions > 0) {
        setActiveIndex((i) => (i - 1 + totalOptions) % totalOptions);
      }
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      if (totalOptions === 0) {
        // 옵션이 없고 자유 입력도 불가 → 무시
        if (trimmedQuery) {
          // selectedLower 중복일 수 있음. 안전하게 addValue 호출
          addValue(trimmedQuery);
        }
        e.preventDefault();
        return;
      }
      selectAt(activeIndex);
      e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      if (open) {
        setOpen(false);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "Backspace" && query === "" && value.length > 0) {
      removeAt(value.length - 1);
      e.preventDefault();
      return;
    }
    if (e.key === ",") {
      // 쉼표 입력 시 즉시 추가 (백워드 호환)
      if (trimmedQuery) {
        addValue(trimmedQuery);
        e.preventDefault();
      }
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn("relative", className)}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-sm transition-colors",
          "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
        )}
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {value.map((label, idx) => {
          const logo = getTechLogo(label);
          return (
            <span
              key={`${label}-${idx}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted/40 pl-1.5 pr-1 text-xs font-medium text-foreground"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background"
                style={logo ? { backgroundImage: `url(${logo.src})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" } : undefined}
              >
                {logo ? null : (
                  <span className="text-[9px] font-bold text-muted-foreground">
                    {label.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <span>{label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeByLabel(label);
                }}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`${label} 제거`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && totalOptions > 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          className="min-w-[120px] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
          value={query}
          placeholder={value.length === 0 ? placeholder : ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {filtered.length === 0 && !canAddCustom ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              {value.length > 0 && !trimmedQuery
                ? "모든 기술이 추가되었습니다"
                : "일치하는 기술이 없습니다"}
            </div>
          ) : (
            <>
              {filtered.map((label, idx) => {
                const logo = getTechLogo(label);
                const isActive = idx === activeIndex;
                return (
                  <button
                    type="button"
                    key={label}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    data-option-index={idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onPointerDown={(e) => {
                      // input blur 방지
                      e.preventDefault();
                    }}
                    onClick={() => {
                      addValue(label);
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                      isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted"
                      style={logo ? { backgroundImage: `url(${logo.src})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" } : undefined}
                    >
                      {logo ? null : (
                        <span className="text-[9px] font-bold text-muted-foreground">
                          {label.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
              {canAddCustom && (
                <button
                  type="button"
                  id={`${listboxId}-opt-${filtered.length}`}
                  role="option"
                  aria-selected={activeIndex === filtered.length}
                  data-option-index={filtered.length}
                  onMouseEnter={() => setActiveIndex(filtered.length)}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    addValue(trimmedQuery);
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm border-t border-border/60 px-2 py-1.5 text-left text-sm",
                    activeIndex === filtered.length
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/60",
                  )}
                >
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-[10px] font-bold text-primary">
                    +
                  </span>
                  <span className="truncate">
                    <span className="text-muted-foreground">직접 추가:</span>{" "}
                    <span className="font-medium">{trimmedQuery}</span>
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
