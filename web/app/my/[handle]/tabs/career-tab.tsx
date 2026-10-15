"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  FilePenLine,
  Files,
  FolderKanban,
  RefreshCw,
  ScrollText,
  UserRoundSearch,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CareerOverviewData,
  CareerOverviewSection,
  CareerOverviewSectionKey,
} from "@/lib/career-overview";

interface SectionConfig {
  key: CareerOverviewSectionKey;
  title: string;
  href: string;
  emptyMessage: string;
  icon: LucideIcon;
  tone: string;
}

const SECTIONS: SectionConfig[] = [
  {
    key: "projects",
    title: "프로젝트",
    href: "/career/projects",
    emptyMessage: "아직 정리한 프로젝트가 없습니다.",
    icon: FolderKanban,
    tone: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
  },
  {
    key: "workExperiences",
    title: "경력",
    href: "/career/work-experience",
    emptyMessage: "아직 등록한 경력이 없습니다.",
    icon: BriefcaseBusiness,
    tone: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
  },
  {
    key: "resumes",
    title: "이력서",
    href: "/career/resumes",
    emptyMessage: "아직 작성한 이력서가 없습니다.",
    icon: ScrollText,
    tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  {
    key: "coverLetters",
    title: "자기소개서",
    href: "/career/cover-letters",
    emptyMessage: "아직 작성한 자기소개서가 없습니다.",
    icon: FilePenLine,
    tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
  },
  {
    key: "portfolios",
    title: "포트폴리오",
    href: "/career/portfolios",
    emptyMessage: "아직 만든 포트폴리오가 없습니다.",
    icon: Files,
    tone: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",
  },
  {
    key: "jobPostings",
    title: "채용공고",
    href: "/career/job-postings",
    emptyMessage: "아직 저장한 채용공고가 없습니다.",
    icon: UserRoundSearch,
    tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
];

function CareerSection({
  config,
  section,
}: {
  config: SectionConfig;
  section: CareerOverviewSection;
}) {
  const Icon = config.icon;

  return (
    <section className="overflow-hidden rounded-2xl border bg-background/40">
      <div className="flex items-center gap-3 border-b bg-muted/20 px-4 py-3.5">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${config.tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">{config.title}</h3>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {section.total}
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">최근 등록·수정 항목</p>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
          <Link href={config.href}>
            전체 보기
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {section.items.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center px-5 py-6 text-center">
          <p className="text-sm text-muted-foreground">{config.emptyMessage}</p>
          <Link href={config.href} className="mt-2 text-xs font-bold text-primary hover:underline">
            첫 항목 만들기
          </Link>
        </div>
      ) : (
        <div className="divide-y">
          {section.items.map((item) => (
            <Link
              key={`${config.key}-${item.id}`}
              href={item.href}
              className="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{item.title}</p>
                {item.subtitle && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                )}
              </div>
              {item.meta && (
                <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">
                  {item.meta}
                </span>
              )}
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          ))}
          {section.total > section.items.length && (
            <Link
              href={config.href}
              className="block px-4 py-2.5 text-center text-xs font-bold text-primary hover:bg-muted/30"
            >
              나머지 {section.total - section.items.length}개 더 보기
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function CareerLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {SECTIONS.map((section) => (
        <div key={section.key} className="h-64 animate-pulse rounded-2xl border bg-muted/30" />
      ))}
    </div>
  );
}

export function CareerTab() {
  const [data, setData] = useState<CareerOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCareer = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/my/career-overview", { cache: "no-store" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success || !json.data?.sections) {
        throw new Error(json?.error || "커리어 목록을 불러오지 못했습니다.");
      }
      setData(json.data as CareerOverviewData);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "커리어 목록을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCareer();
  }, [loadCareer]);

  if (loading) return <CareerLoading />;

  if (error || !data) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 px-6 text-center">
        <p className="text-sm text-destructive">{error || "커리어 목록을 불러오지 못했습니다."}</p>
        <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={loadCareer}>
          <RefreshCw className="h-3.5 w-3.5" />
          다시 불러오기
        </Button>
      </div>
    );
  }

  const total = Object.values(data.sections).reduce(
    (sum, section) => sum + section.total,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-primary/5 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          지금까지 만든 커리어 자료 <strong className="text-foreground">총 {total}개</strong>
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((config) => (
          <CareerSection
            key={config.key}
            config={config}
            section={data.sections[config.key]}
          />
        ))}
      </div>
    </div>
  );
}
