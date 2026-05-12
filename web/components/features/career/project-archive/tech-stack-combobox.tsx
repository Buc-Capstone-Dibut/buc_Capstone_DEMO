"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { createTechLogoImageSlot } from "@/lib/career-portfolios";
import { cn } from "@/lib/utils";

type TechStackOption = {
  label: string;
  aliases?: string[];
};

interface TechStackComboboxProps {
  value?: string[];
  onChange: (nextValue: string[]) => void;
  placeholder?: string;
  helperText?: string;
  className?: string;
}

const TECH_STACK_OPTIONS: TechStackOption[] = [
  { label: "React", aliases: ["react.js", "reactjs"] },
  { label: "Next.js", aliases: ["next", "nextjs"] },
  { label: "Vue.js", aliases: ["vue", "vuejs"] },
  { label: "Nuxt", aliases: ["nuxt.js"] },
  { label: "Svelte", aliases: ["sveltekit"] },
  { label: "Angular" },
  { label: "TypeScript", aliases: ["ts"] },
  { label: "JavaScript", aliases: ["js"] },
  { label: "Node.js", aliases: ["node", "nodejs"] },
  { label: "Express", aliases: ["express.js"] },
  { label: "NestJS", aliases: ["nest", "nest.js"] },
  { label: "Python", aliases: ["py"] },
  { label: "Java", aliases: ["jdk"] },
  { label: "Spring", aliases: ["spring boot"] },
  { label: "FastAPI", aliases: ["fast api"] },
  { label: "Django" },
  { label: "MySQL" },
  { label: "PostgreSQL", aliases: ["postgres"] },
  { label: "MongoDB", aliases: ["mongo"] },
  { label: "Redis" },
  { label: "Prisma" },
  { label: "GraphQL" },
  { label: "Supabase" },
  { label: "Firebase" },
  { label: "Docker" },
  { label: "Kubernetes", aliases: ["k8s"] },
  { label: "AWS", aliases: ["amazon web services"] },
  { label: "Google Cloud", aliases: ["gcp"] },
  { label: "Azure", aliases: ["microsoft azure"] },
  { label: "Vercel" },
  { label: "Tailwind CSS", aliases: ["tailwind", "tailwindcss"] },
  { label: "Sass", aliases: ["scss"] },
  { label: "Bootstrap" },
  { label: "HTML5", aliases: ["html"] },
  { label: "CSS3", aliases: ["css"] },
  { label: "Git" },
  { label: "GitHub" },
  { label: "GitHub Actions", aliases: ["ci/cd", "github action"] },
  { label: "Figma" },
  { label: "Jest" },
  { label: "Vitest" },
  { label: "Playwright" },
  { label: "Cypress" },
  { label: "Storybook" },
  { label: "Three.js", aliases: ["three", "threejs"] },
  { label: "React Native" },
  { label: "Flutter" },
  { label: "Dart" },
  { label: "Swift" },
  { label: "SwiftUI" },
  { label: "Kotlin" },
  { label: "Android" },
  { label: "iOS" },
  { label: "Linux" },
  { label: "Nginx" },
  { label: "Kafka", aliases: ["apache kafka"] },
  { label: "Airflow", aliases: ["apache airflow"] },
  { label: "Spark", aliases: ["apache spark"] },
  { label: "Terraform" },
  { label: "Grafana" },
  { label: "Prometheus" },
  { label: "C++", aliases: ["cpp"] },
  { label: "C#", aliases: ["csharp"] },
];

const MAX_VISIBLE_COUNT = 8;
const EMPTY_TECH_STACK: string[] = [];

function normalizeTech(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getOptionSearchText(option: TechStackOption) {
  return [option.label, ...(option.aliases || [])].map(normalizeTech).join(" ");
}

function getCanonicalLabel(input: string) {
  const normalizedInput = normalizeTech(input);
  const matchedOption = TECH_STACK_OPTIONS.find((option) =>
    [option.label, ...(option.aliases || [])].some(
      (candidate) => normalizeTech(candidate) === normalizedInput,
    ),
  );
  return matchedOption?.label || input.trim();
}

function TechLogo({ label }: { label: string }) {
  const logo = createTechLogoImageSlot(label);
  const fallback = label.trim().slice(0, 1).toUpperCase() || "#";

  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950">
      {logo?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo.url}
          alt={logo.alt || `${label} 로고`}
          className="h-3.5 w-3.5 object-contain"
        />
      ) : (
        fallback
      )}
    </span>
  );
}

export function TechStackCombobox({
  value,
  onChange,
  placeholder = "기술명 검색 또는 직접 입력",
  helperText,
  className,
}: TechStackComboboxProps) {
  const selectedTechStack = value ?? EMPTY_TECH_STACK;
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedKeys = useMemo(
    () => new Set(selectedTechStack.map(normalizeTech)),
    [selectedTechStack],
  );

  const suggestions = useMemo(() => {
    const normalizedQuery = normalizeTech(query);
    if (!normalizedQuery) {
      return [];
    }

    const options = TECH_STACK_OPTIONS.filter(
      (option) => !selectedKeys.has(normalizeTech(option.label)),
    );

    return options
      .filter((option) => getOptionSearchText(option).includes(normalizedQuery))
      .sort((a, b) => {
        const aStarts = normalizeTech(a.label).startsWith(normalizedQuery);
        const bStarts = normalizeTech(b.label).startsWith(normalizedQuery);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.label.localeCompare(b.label);
      })
      .slice(0, MAX_VISIBLE_COUNT);
  }, [query, selectedKeys]);

  const directAddLabel = useMemo(() => {
    const cleaned = query.trim();
    if (!cleaned) return null;
    const canonical = getCanonicalLabel(cleaned);
    if (selectedKeys.has(normalizeTech(canonical))) return null;
    if (suggestions.some((suggestion) => normalizeTech(suggestion.label) === normalizeTech(canonical))) {
      return null;
    }
    return canonical;
  }, [query, selectedKeys, suggestions]);

  const updateTechStack = (nextValue: string[]) => {
    const deduped: string[] = [];
    const seen = new Set<string>();

    for (const item of nextValue) {
      const cleaned = getCanonicalLabel(item);
      const key = normalizeTech(cleaned);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(cleaned);
    }

    onChange(deduped);
  };

  const addTech = (rawValue: string) => {
    const label = getCanonicalLabel(rawValue);
    if (!label) return;
    updateTechStack([...selectedTechStack, label]);
    setQuery("");
    setIsOpen(false);
  };

  const addMultipleTech = (rawValue: string) => {
    const nextItems = rawValue
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (nextItems.length === 0) return;
    updateTechStack([...selectedTechStack, ...nextItems]);
    setQuery("");
    setIsOpen(false);
  };

  const removeTech = (target: string) => {
    const targetKey = normalizeTech(target);
    updateTechStack(
      selectedTechStack.filter((item) => normalizeTech(item) !== targetKey),
    );
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary dark:border-slate-800 dark:bg-slate-950",
          className,
        )}
      >
        <div className="flex min-h-11 flex-wrap items-center gap-2 px-3 py-2">
          {selectedTechStack.map((tech) => (
            <span
              key={tech}
              className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/5 px-2.5 text-xs font-bold text-slate-700 dark:bg-primary/10 dark:text-slate-200"
            >
              <TechLogo label={tech} />
              <span className="max-w-[160px] truncate">{tech}</span>
              <button
                type="button"
                onClick={() => removeTech(tech)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-red-500 dark:hover:bg-slate-900"
                aria-label={`${tech} 제거`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}

          <div className="flex min-w-[160px] flex-1 items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-slate-300" />
            <input
              value={query}
              onFocus={() => setIsOpen(Boolean(query.trim()))}
              onBlur={() => setIsOpen(false)}
              onChange={(event) => {
                const nextQuery = event.target.value;
                if (/[,\n]/.test(nextQuery)) {
                  addMultipleTech(nextQuery);
                  return;
                }
                setQuery(nextQuery);
                setIsOpen(Boolean(nextQuery.trim()));
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (!query.trim()) return;
                  const firstSuggestion = suggestions[0]?.label;
                  addTech(firstSuggestion || query);
                  return;
                }
                if (event.key === "Backspace" && !query && selectedTechStack.length > 0) {
                  removeTech(selectedTechStack[selectedTechStack.length - 1]);
                }
              }}
              className="h-7 w-full min-w-0 bg-transparent text-[14px] font-medium outline-none placeholder:text-slate-300"
              placeholder={selectedTechStack.length ? "추가 검색" : placeholder}
            />
          </div>
        </div>

        {isOpen && (suggestions.length > 0 || directAddLabel) ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950">
            {suggestions.map((option) => (
              <button
                key={option.label}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTech(option.label)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-primary/5 hover:text-primary dark:text-slate-200 dark:hover:bg-primary/10"
              >
                <TechLogo label={option.label} />
                <span>{option.label}</span>
              </button>
            ))}

            {directAddLabel ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTech(directAddLabel)}
                className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-slate-700 dark:text-slate-300 dark:hover:bg-primary/10"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                <span>{directAddLabel} 직접 추가</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {helperText ? (
        <p className="ml-1 text-[11px] font-medium text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
