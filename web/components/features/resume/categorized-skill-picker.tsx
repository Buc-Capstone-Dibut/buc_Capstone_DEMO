"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getTechLogo } from "@/lib/interview/tech-logos";
import {
  TECH_CATEGORIES,
  TECH_CATEGORY_LIST,
  getTechCategory,
  groupSkillsByCategory,
  type TechCategoryKey,
} from "@/lib/interview/tech-categories";
import { TechStackCombobox } from "@/components/features/job-postings/tech-stack-combobox";

export interface SkillItem {
  name: string;
  level: string;
  category?: string;
}

export interface CategorizedSkillPickerProps {
  value: SkillItem[];
  onChange: (next: SkillItem[]) => void;
}

/**
 * 기술 스택 편집기 — 모달 기반 추가 + 한국식 입력 폼 레이아웃.
 *
 * - 상단: "기술 추가" 버튼을 누르면 사전 검색 모달(`TechStackCombobox`) 이 열린다.
 * - 본문: 카테고리(프론트엔드/백엔드/모바일/...) 별로 좌측 라벨 + 우측 칩 영역으로
 *   한국식 이력서 표(라벨-내용 행) 양식 그대로 표시. 화려한 카드 디자인 없음.
 * - 칩의 ↔ 버튼으로 다른 카테고리로 이동, X 로 삭제.
 */
export function CategorizedSkillPicker({ value, onChange }: CategorizedSkillPickerProps) {
  const names = useMemo(() => value.map((s) => s.name), [value]);

  // 모든 카테고리 행을 항상 표시한다 (값이 비어있어도) — 한국식 이력서 폼처럼 행이
  // 비어 있어도 카테고리 라벨이 보여서 어디에 어떤 직무 기술을 넣을지 즉시 보임.
  const grouped = useMemo(() => {
    const map = new Map<TechCategoryKey, SkillItem[]>();
    for (const skill of value) {
      const key: TechCategoryKey =
        (skill.category as TechCategoryKey | undefined) &&
        TECH_CATEGORIES[skill.category as TechCategoryKey]
          ? (skill.category as TechCategoryKey)
          : getTechCategory(skill.name);
      const list = map.get(key) ?? [];
      list.push(skill);
      map.set(key, list);
    }
    return TECH_CATEGORY_LIST.map((meta) => ({
      category: meta,
      items: map.get(meta.key) ?? [],
    }));
  }, [value]);

  // 비어있는 행은 기본적으로 숨기고, 사용자가 "빈 카테고리 보기" 를 눌렀을 때만 노출.
  const [showEmpty, setShowEmpty] = useState(false);
  const visibleRows = showEmpty ? grouped : grouped.filter((row) => row.items.length > 0);

  const updateCategory = (
    skillName: string,
    category: TechCategoryKey | undefined,
  ) => {
    const next = value.map((skill) => {
      if (skill.name !== skillName) return skill;
      if (!category) {
        const { category: _omit, ...rest } = skill;
        return rest;
      }
      return { ...skill, category };
    });
    onChange(next);
  };

  const removeSkill = (skillName: string) => {
    onChange(value.filter((s) => s.name !== skillName));
  };

  return (
    <div className="space-y-2.5">
      {/* === 추가 버튼 — 모달 검색 === */}
      <TechStackCombobox
        value={names}
        onChange={(nextNames) => {
          const prevByName = new Map(value.map((s) => [s.name, s]));
          const nextSkills: SkillItem[] = nextNames.map(
            (name) => prevByName.get(name) ?? { name, level: "Intermediate" },
          );
          onChange(nextSkills);
        }}
        placeholder="기술 추가하기 (검색 모달이 열립니다)"
      />

      {/* === 한국식 입력 폼 — 카테고리 행 === */}
      {value.length === 0 && !showEmpty ? null : (
        <div className="overflow-hidden rounded-md border border-input bg-background">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[112px] md:w-[128px]" />
              <col />
            </colgroup>
            <tbody>
              {visibleRows.map((row, rowIndex) => (
                <tr
                  key={row.category.key}
                  className={cn(
                    rowIndex > 0 && "border-t border-input",
                    row.items.length === 0 && "bg-muted/10",
                  )}
                >
                  <th
                    scope="row"
                    className="border-r border-input bg-muted/30 px-3 py-2 text-left align-top text-[12px] font-bold text-foreground"
                  >
                    <div>{row.category.label}</div>
                    <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                      {row.items.length}개
                    </div>
                  </th>
                  <td className="px-3 py-2 align-top">
                    {row.items.length === 0 ? (
                      <span className="text-[11.5px] text-muted-foreground/60">
                        — 해당 카테고리에 추가된 기술이 없습니다.
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {row.items.map((skill) => (
                          <SkillChip
                            key={skill.name}
                            skill={skill}
                            currentCategory={row.category.key}
                            onChangeCategory={(cat) =>
                              updateCategory(skill.name, cat)
                            }
                            onRemove={() => removeSkill(skill.name)}
                          />
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          총 <strong className="text-foreground">{value.length}</strong>개의 기술이 추가됨
        </span>
        <button
          type="button"
          onClick={() => setShowEmpty((v) => !v)}
          className="rounded-md px-2 py-1 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {showEmpty ? "빈 카테고리 숨기기" : "빈 카테고리 모두 보기"}
        </button>
      </div>
    </div>
  );
}

/**
 * 단일 기술 칩. 라벨/로고 + 카테고리 이동 버튼(↔) + 삭제 버튼(×).
 * 디자인은 한국식 폼에 어울리도록 평범한 outline 칩.
 */
function SkillChip({
  skill,
  currentCategory,
  onChangeCategory,
  onRemove,
}: {
  skill: SkillItem;
  currentCategory: TechCategoryKey;
  onChangeCategory: (next: TechCategoryKey | undefined) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const logo = getTechLogo(skill.name);
  const explicitCategory = (skill.category as TechCategoryKey | undefined) ?? undefined;

  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-sm border border-input bg-background pl-1.5 pr-0.5 text-[11.5px] font-medium text-foreground">
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted"
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
          <span className="text-[8.5px] font-bold text-muted-foreground">
            {skill.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <span>{skill.name}</span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              explicitCategory && "text-primary",
            )}
            aria-label="카테고리 변경"
            title={`카테고리 변경 (현재: ${TECH_CATEGORIES[currentCategory].label}${
              explicitCategory ? " · 지정됨" : " · 자동"
            })`}
          >
            <ArrowRightLeft className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            카테고리로 이동
          </p>
          <div className="grid grid-cols-1 gap-0.5">
            {TECH_CATEGORY_LIST.map((meta) => (
              <button
                key={meta.key}
                type="button"
                onClick={() => {
                  onChangeCategory(meta.key);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between rounded-sm px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent",
                  currentCategory === meta.key && "bg-accent/60 font-semibold",
                )}
              >
                <span>{meta.label}</span>
                {currentCategory === meta.key ? (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {explicitCategory ? "지정됨" : "자동"}
                  </span>
                ) : null}
              </button>
            ))}
            {explicitCategory ? (
              <button
                type="button"
                onClick={() => {
                  onChangeCategory(undefined);
                  setOpen(false);
                }}
                className="mt-1 rounded-sm border-t border-border px-2 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:bg-accent"
              >
                자동 분류로 되돌리기
              </button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label={`${skill.name} 제거`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
