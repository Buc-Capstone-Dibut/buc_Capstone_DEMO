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
import { Check, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAllTechLabels, getTechLogo } from "@/lib/interview/tech-logos";

export interface TechStackComboboxProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  /** 모달 내부 리스트 최대 노출 갯수 */
  maxOptions?: number;
}

const DEFAULT_MAX_OPTIONS = 200;

function normalize(s: string) {
  return s.trim().toLowerCase();
}

/**
 * 사전(`TECH_LOGO_BY_KEY`) 기반 검색형 multi-select.
 *
 * 트리거: 선택된 칩 + "기술 추가하기" 버튼.
 * 모달: 검색창 + 클릭으로 추가/제거 가능한 그리드. 검색어가 사전에 없으면 "직접 추가" 옵션이 나타난다.
 */
export function TechStackCombobox({
  value,
  onChange,
  placeholder = "기술을 검색하거나 직접 입력 후 Enter",
  className,
  maxOptions = DEFAULT_MAX_OPTIONS,
}: TechStackComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const reactId = useId();
  const listboxId = `tech-combobox-${reactId}`;

  // 사전 라벨 (마운트 시 1회)
  const allLabels = useMemo(() => getAllTechLabels().map((m) => m.label), []);

  const selectedLower = useMemo(
    () => new Set(value.map((v) => normalize(v))),
    [value],
  );

  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();

  // 검색 결과: 사전 라벨 전체를 대상으로 prefix → substring 매칭.
  // (모달이므로 이미 선택된 항목도 노출하여 토글 가능하게 한다.)
  const filtered = useMemo(() => {
    if (!lowerQuery) return allLabels.slice(0, maxOptions);
    const prefix: string[] = [];
    const contains: string[] = [];
    for (const label of allLabels) {
      const lower = label.toLowerCase();
      if (lower.startsWith(lowerQuery)) prefix.push(label);
      else if (lower.includes(lowerQuery)) contains.push(label);
    }
    return [...prefix, ...contains].slice(0, maxOptions);
  }, [allLabels, lowerQuery, maxOptions]);

  const canAddCustom = useMemo(() => {
    if (!trimmedQuery) return false;
    if (selectedLower.has(lowerQuery)) return false;
    return !allLabels.some((l) => l.toLowerCase() === lowerQuery);
  }, [trimmedQuery, lowerQuery, allLabels, selectedLower]);

  const totalOptions = filtered.length + (canAddCustom ? 1 : 0);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );
    if (node) {
      node.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
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

  const removeByLabel = useCallback(
    (label: string) => {
      const lower = normalize(label);
      onChange(value.filter((v) => normalize(v) !== lower));
    },
    [onChange, value],
  );

  const toggleLabel = useCallback(
    (label: string) => {
      if (selectedLower.has(normalize(label))) {
        removeByLabel(label);
      } else {
        addValue(label);
      }
    },
    [addValue, removeByLabel, selectedLower],
  );

  const selectAt = useCallback(
    (index: number) => {
      if (index < 0) return;
      if (index < filtered.length) {
        toggleLabel(filtered[index]);
      } else if (canAddCustom) {
        addValue(trimmedQuery);
      }
    },
    [addValue, canAddCustom, filtered, toggleLabel, trimmedQuery],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (totalOptions > 0) {
        setActiveIndex((i) => (i + 1) % totalOptions);
      }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowUp") {
      if (totalOptions > 0) {
        setActiveIndex((i) => (i - 1 + totalOptions) % totalOptions);
      }
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      if (totalOptions === 0 && trimmedQuery) {
        addValue(trimmedQuery);
      } else {
        selectAt(activeIndex);
      }
      e.preventDefault();
      return;
    }
    if (e.key === ",") {
      if (trimmedQuery) {
        addValue(trimmedQuery);
        e.preventDefault();
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-left text-sm shadow-sm transition-colors hover:border-ring/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring",
          className,
        )}
      >
        {value.length === 0 ? (
          <span className="px-1.5 py-1 text-sm text-muted-foreground">
            {placeholder}
          </span>
        ) : (
          value.map((label, idx) => {
            const logo = getTechLogo(label);
            return (
              <span
                key={`${label}-${idx}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted/40 pl-1.5 pr-1 text-xs font-medium text-foreground"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background"
                  style={
                    logo
                      ? {
                          backgroundImage: `url(${logo.src})`,
                          backgroundSize: "contain",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }
                      : undefined
                  }
                >
                  {logo ? null : (
                    <span className="text-[9px] font-bold text-muted-foreground">
                      {label.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
                <span>{label}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeByLabel(label);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      removeByLabel(label);
                    }
                  }}
                  className="ml-0.5 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`${label} 제거`}
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            );
          })
        )}
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
          <Plus className="h-3 w-3" />
          기술 추가
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[560px] p-0 overflow-hidden gap-0"
          onOpenAutoFocus={(e) => {
            // 기본 autofocus 대신 search input 에 포커스
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="text-base font-semibold">
              기술 스택 선택
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              검색해서 클릭하면 추가됩니다. 사전에 없는 기술은 직접 입력해
              엔터로 추가할 수 있어요.
            </p>
          </DialogHeader>

          <div className="px-5 pt-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  totalOptions > 0
                    ? `${listboxId}-opt-${activeIndex}`
                    : undefined
                }
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                value={query}
                placeholder={placeholder}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {value.length > 0 ? (
            <div className="border-b px-5 pb-3 pt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                선택됨 · {value.length}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {value.map((label, idx) => {
                  const logo = getTechLogo(label);
                  return (
                    <span
                      key={`sel-${label}-${idx}`}
                      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-muted/40 pl-1.5 pr-1 text-xs font-medium text-foreground"
                    >
                      <span
                        aria-hidden="true"
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background"
                        style={
                          logo
                            ? {
                                backgroundImage: `url(${logo.src})`,
                                backgroundSize: "contain",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                              }
                            : undefined
                        }
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
                        onClick={() => removeByLabel(label)}
                        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`${label} 제거`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-multiselectable
            className="max-h-[360px] min-h-[200px] overflow-y-auto px-3 py-2"
          >
            {filtered.length === 0 && !canAddCustom ? (
              <div className="flex h-full min-h-[180px] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
                일치하는 기술이 없습니다
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {filtered.map((label, idx) => {
                    const logo = getTechLogo(label);
                    const isActive = idx === activeIndex;
                    const isSelected = selectedLower.has(normalize(label));
                    return (
                      <button
                        type="button"
                        key={label}
                        id={`${listboxId}-opt-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        data-option-index={idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => toggleLabel(label)}
                        className={cn(
                          "flex items-center gap-2 rounded-md border border-transparent px-2 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/60",
                          isSelected
                            ? "border-primary/30 bg-primary/5"
                            : "",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
                          style={
                            logo
                              ? {
                                  backgroundImage: `url(${logo.src})`,
                                  backgroundSize: "contain",
                                  backgroundPosition: "center",
                                  backgroundRepeat: "no-repeat",
                                }
                              : undefined
                          }
                        >
                          {logo ? null : (
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {label.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="flex-1 truncate">{label}</span>
                        {isSelected ? (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {canAddCustom ? (
                  <button
                    type="button"
                    id={`${listboxId}-opt-${filtered.length}`}
                    role="option"
                    aria-selected={activeIndex === filtered.length}
                    data-option-index={filtered.length}
                    onMouseEnter={() => setActiveIndex(filtered.length)}
                    onClick={() => addValue(trimmedQuery)}
                    className={cn(
                      "mt-2 flex w-full items-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-left text-sm",
                      activeIndex === filtered.length
                        ? "ring-1 ring-primary/40"
                        : "hover:bg-primary/10",
                    )}
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                      <Plus className="h-3 w-3" />
                    </span>
                    <span className="truncate">
                      <span className="text-muted-foreground">직접 추가:</span>{" "}
                      <span className="font-medium text-foreground">
                        {trimmedQuery}
                      </span>
                    </span>
                  </button>
                ) : null}
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
            <span>
              <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-semibold">
                ↑↓
              </kbd>{" "}
              탐색{" · "}
              <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-semibold">
                Enter
              </kbd>{" "}
              추가{" · "}
              <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-semibold">
                Esc
              </kbd>{" "}
              닫기
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              완료
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
