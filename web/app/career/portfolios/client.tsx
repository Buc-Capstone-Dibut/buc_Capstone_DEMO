"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileImage,
  HelpCircle,
  Layers3,
  Lock,
  LockOpen,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PORTFOLIO_BACKGROUND_IMAGES,
  type PortfolioListItem,
} from "@/lib/career-portfolios";
import { cn } from "@/lib/utils";
import { seedCareerSampleDataAction } from "../sample-data/actions";
import type { UnifiedPortfolioItem } from "./types";
import { PortfolioPdfPrinter } from "@/components/features/career/portfolio-editor/portfolio-pdf-printer";
import { PortfolioLivePreview } from "@/components/features/career/portfolio-editor/portfolio-live-preview";
import { useBackgroundJobsStore } from "@/components/features/career/background-jobs/use-background-jobs-store";
import { toast } from "sonner";
import {
  CareerFilterChip,
  CareerFilterSection,
  CareerListToolbar,
} from "@/components/features/career/career-list-toolbar";
import { useCareerFilterUrl } from "@/hooks/use-career-filter-url";

type PortfoliosClientProps = {
  initialPortfolios: UnifiedPortfolioItem[];
  sourceStats: {
    projects: number;
    workExperiences: number;
    coverLetters: number;
    skills: number;
  };
};

type TypeFilter = "all" | "slides" | "showcase";
type VisibilityFilter = "all" | "public" | "private";
type GenerationFilter = "all" | "ready" | "generating";
type PortfolioSort = "recent" | "title";

function matchesTypeFilter(item: UnifiedPortfolioItem, filter: TypeFilter) {
  if (filter === "all") return true;
  if (filter === "showcase") return item.kind === "showcase";
  return item.kind === "legacy";
}

function getUnifiedTypeLabel(item: UnifiedPortfolioItem) {
  if (item.kind === "showcase") return "웹사이트형";
  if (item.legacy?.format === "site") return "슬라이드형";
  if (item.legacy?.format === "document") return "A4 보고서";
  return "PPT 16:9";
}

function PortfolioTypeBadge({ item }: { item: UnifiedPortfolioItem }) {
  if (item.kind === "showcase") {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        웹사이트형
      </span>
    );
  }
  if (item.legacy?.format === "site") {
    return (
      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
        슬라이드형
      </span>
    );
  }
  if (item.legacy?.format === "document") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        A4 보고서
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
      PPT 16:9
    </span>
  );
}

function PortfolioVisibilityBadge({ isPublic }: { isPublic: boolean }) {
  const Icon = isPublic ? LockOpen : Lock;
  const label = isPublic ? "공개" : "비공개";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center",
        isPublic ? "text-primary" : "text-slate-500",
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      response.ok
        ? "서버 응답을 읽지 못했습니다. 잠시 후 다시 시도하세요."
        : `서버 오류가 발생했습니다. (${response.status})`,
    );
  }
}

function formatDateLabel(value?: string | null) {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getFormatLabel(portfolio: PortfolioListItem) {
  if (portfolio.format === "site") return "슬라이드형";
  return portfolio.format === "document" ? "A4 보고서" : "PPT 16:9";
}

function getPageUnit(portfolio: PortfolioListItem) {
  if (portfolio.format === "site") return "page";
  return portfolio.format === "document" ? "page" : "slide";
}

function getProjectTitles(portfolio: PortfolioListItem) {
  const sourceTitles = portfolio.publicSummary.sourceProjectTitles?.filter(Boolean) || [];
  if (sourceTitles.length > 0) return sourceTitles;
  const titles = portfolio.publicSummary.projectTitles?.filter(Boolean) || [];
  if (titles.length > 0) return titles;
  return portfolio.sourceProjectTitle ? [portfolio.sourceProjectTitle] : [];
}

function getProjectSummaries(portfolio: PortfolioListItem) {
  const sourceProjects =
    portfolio.publicSummary.sourceProjects
      ?.filter((project) => project.title)
      .map((project) => ({
        title: project.title,
        tags: project.tags?.filter(Boolean) || [],
      })) || [];

  if (sourceProjects.length > 0) return sourceProjects;

  return getProjectTitles(portfolio).map((title) => ({
    title,
    tags: [] as string[],
  }));
}

function getShareUrl(portfolio: PortfolioListItem) {
  if (!portfolio.publicUrl) return "";
  if (portfolio.publicUrl.startsWith("http")) return portfolio.publicUrl;
  if (typeof window === "undefined") return portfolio.publicUrl;
  return `${window.location.origin}${portfolio.publicUrl}`;
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea-based fallback below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

export default function PortfoliosClient({
  initialPortfolios,
  sourceStats,
}: PortfoliosClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [portfolios, setPortfolios] = useState(initialPortfolios);
  // router.refresh() 후 서버에서 새 props 가 흘러오면 client state 동기화 — 안 그러면
  // useState 가 초기값에 갇혀서 "생성 중" 배지가 계속 보임.
  useEffect(() => {
    setPortfolios(initialPortfolios);
  }, [initialPortfolios]);
  const [selectedId, setSelectedId] = useState(initialPortfolios[0]?.id || "");
  const initialType = searchParams.get("type");
  const initialVisibility = searchParams.get("visibility");
  const initialGeneration = searchParams.get("generation");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [sortOrder, setSortOrder] = useState<PortfolioSort>(
    searchParams.get("sort") === "title" ? "title" : "recent",
  );
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    initialType === "showcase"
      ? "showcase"
      : initialType === "slides" ||
          initialType === "site" ||
          initialType === "slide" ||
          initialType === "document"
        ? "slides"
        : "all",
  );
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>(
    initialVisibility === "public" || initialVisibility === "private" ? initialVisibility : "all",
  );
  const [generationFilter, setGenerationFilter] = useState<GenerationFilter>(
    initialGeneration === "ready" || initialGeneration === "generating" ? initialGeneration : "all",
  );
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [busyExportId, setBusyExportId] = useState<string | null>(null);
  const [busyPublishId, setBusyPublishId] = useState<string | null>(null);
  const [copiedPortfolioId, setCopiedPortfolioId] = useState<string | null>(null);
  // 백그라운드 작업 활성 portfolio id 집합 — 리스트 카드에 "생성 중" 배지 표시용.
  // selector 에서 Object.keys() 하면 매 렌더마다 새 array → Zustand re-render 무한루프.
  // raw 객체를 받아 컴포넌트에서 keys 계산.
  const activeJobsMap = useBackgroundJobsStore((s) => s.activeJobs);
  const activeJobIds = useMemo(() => Object.keys(activeJobsMap), [activeJobsMap]);
  const [isSeedingSample, setIsSeedingSample] = useState(false);
  const hasSourceData =
    sourceStats.projects + sourceStats.workExperiences + sourceStats.skills > 0;

  const filteredPortfolios = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const next = portfolios.filter((portfolio) => {
      if (!matchesTypeFilter(portfolio, typeFilter)) return false;
      if (visibilityFilter === "public" && !portfolio.isPublic) return false;
      if (visibilityFilter === "private" && portfolio.isPublic) return false;
      const generating =
        portfolio.legacy?.generationStatus === "running" || activeJobIds.includes(portfolio.id);
      if (generationFilter === "generating" && !generating) return false;
      if (generationFilter === "ready" && generating) return false;
      if (!query) return true;
      if (portfolio.kind === "showcase") {
        return `${portfolio.title} ${portfolio.showcase?.templateLabel || ""}`
          .toLowerCase()
          .includes(query);
      }
      const legacy = portfolio.legacy;
      if (!legacy) return false;
      const sourceText = getProjectTitles(legacy).join(" ");
      return `${legacy.title} ${legacy.publicSummary.headline || ""} ${sourceText}`
        .toLowerCase()
        .includes(query);
    });

    return next.sort((a, b) => {
      if (sortOrder === "title") return a.title.localeCompare(b.title, "ko");
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [activeJobIds, generationFilter, portfolios, searchQuery, sortOrder, typeFilter, visibilityFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setVisibilityFilter("all");
    setGenerationFilter("all");
    setSortOrder("recent");
  };

  const advancedFilterCount =
    (typeFilter === "all" ? 0 : 1) +
    (visibilityFilter === "all" ? 0 : 1) +
    (generationFilter === "all" ? 0 : 1);

  useCareerFilterUrl({
    q: searchQuery || null,
    type: typeFilter === "all" ? null : typeFilter,
    visibility: visibilityFilter === "all" ? null : visibilityFilter,
    generation: generationFilter === "all" ? null : generationFilter,
    sort: sortOrder === "recent" ? null : sortOrder,
  });

  const selectedPortfolio =
    filteredPortfolios.find((portfolio) => portfolio.id === selectedId) ||
    filteredPortfolios[0] ||
    null;

  useEffect(() => {
    if (filteredPortfolios.some((portfolio) => portfolio.id === selectedId)) return;
    setSelectedId(filteredPortfolios[0]?.id || "");
  }, [filteredPortfolios, selectedId]);

  const handleStartCreate = () => {
    router.push("/career/projects?portfolioMode=1");
  };

  const handleLoadSampleData = async () => {
    if (isSeedingSample) return;
    const confirmed = confirm(
      "현재 계정에 샘플 프로젝트와 경력 데이터를 추가하고 포트폴리오 생성 모드로 이동할까요?",
    );
    if (!confirmed) return;

    setIsSeedingSample(true);
    try {
      const result = await seedCareerSampleDataAction();
      alert(
        result.added.projects > 0 || result.added.workExperiences > 0
          ? "샘플 데이터가 추가되었습니다. 프로젝트를 선택해 포트폴리오를 생성하세요."
          : "이미 샘플 데이터가 추가되어 있습니다.",
      );
      router.push("/career/projects?portfolioMode=1");
    } catch (error) {
      console.error(error);
      alert("샘플 데이터를 추가하지 못했습니다.");
    } finally {
      setIsSeedingSample(false);
    }
  };

  const handleOpenWorkspace = (portfolio: PortfolioListItem) => {
    router.push(`/career/portfolios/${portfolio.id}/edit`);
  };

  /**
   * PDF 다운로드 — 현재 페이지에서 인쇄 대화상자 직접 띄움.
   * 새 탭 안 열고 PortfolioPdfPrinter 가 화면 밖에 마운트되어 native print 트리거.
   * 사용자는 그 대화상자에서 "PDF로 저장" 선택.
   * (이전 PPTX 다운로드는 실용성 부족으로 PDF 로 교체)
   */
  const [pdfPortfolioId, setPdfPortfolioId] = useState<string | null>(null);
  const handleExportPdf = (portfolio: PortfolioListItem) => {
    setBusyExportId(portfolio.id);
    setPdfPortfolioId(portfolio.id);
  };
  const handlePdfDone = () => {
    setPdfPortfolioId(null);
    setBusyExportId(null);
  };

  const handleDelete = async (portfolio: PortfolioListItem) => {
    if (!confirm(`"${portfolio.title}" 포트폴리오를 삭제할까요?`)) return;
    setBusyDeleteId(portfolio.id);
    try {
      const response = await fetch(`/api/career/portfolios/${portfolio.id}`, {
        method: "DELETE",
      });
      const payload = (await readJsonResponse(response).catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "삭제 실패");
      }
      setPortfolios((prev) => {
        const next = prev.filter((item) => item.id !== portfolio.id);
        if (selectedId === portfolio.id) setSelectedId(next[0]?.id || "");
        return next;
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setBusyDeleteId(null);
    }
  };

  const handleDeleteShowcase = async (item: UnifiedPortfolioItem) => {
    if (!confirm(`"${item.title || "(제목 없음)"}" 포트폴리오를 삭제할까요?`)) return;
    setBusyDeleteId(item.id);
    try {
      const response = await fetch(`/api/career/portfolios/showcase/${item.id}`, {
        method: "DELETE",
      });
      const payload = (await readJsonResponse(response).catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "삭제 실패");
      }
      setPortfolios((prev) => {
        const next = prev.filter((entry) => entry.id !== item.id);
        if (selectedId === item.id) setSelectedId(next[0]?.id || "");
        return next;
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setBusyDeleteId(null);
    }
  };

  const handleTogglePublish = async (portfolio: PortfolioListItem) => {
    const nextIsPublic = !portfolio.isPublic;
    setBusyPublishId(portfolio.id);
    try {
      const response = await fetch(`/api/career/portfolios/${portfolio.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextIsPublic }),
      });
      const payload = (await readJsonResponse(response).catch(() => ({}))) as {
        item?: PortfolioListItem;
        error?: string;
        publicUrl?: string | null;
      };
      if (!response.ok || !payload.item) {
        throw new Error(payload.error || "공개 상태 변경에 실패했습니다.");
      }
      const nextLegacy: PortfolioListItem = {
        ...payload.item,
        publicUrl: payload.publicUrl || null,
      };
      setPortfolios((prev) =>
        prev.map((item) =>
          item.id === portfolio.id && item.kind === "legacy"
            ? {
                ...item,
                title: nextLegacy.title,
                slug: nextLegacy.slug,
                updatedAt: nextLegacy.updatedAt,
                publishedAt: nextLegacy.publishedAt ?? null,
                isPublic: nextLegacy.isPublic,
                publicUrl: nextLegacy.publicUrl ?? null,
                legacy: nextLegacy,
              }
            : item,
        ),
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "공개 상태 변경에 실패했습니다.");
    } finally {
      setBusyPublishId(null);
    }
  };

  const handleToggleShowcasePublish = async (portfolio: UnifiedPortfolioItem) => {
    const nextIsPublic = !portfolio.isPublic;
    setBusyPublishId(portfolio.id);
    try {
      const response = await fetch(
        `/api/career/portfolios/showcase/${portfolio.id}/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublic: nextIsPublic }),
        },
      );
      const payload = (await readJsonResponse(response).catch(() => ({}))) as {
        item?: {
          published_at?: string | null;
          updated_at?: string;
        };
        error?: string;
        publicUrl?: string | null;
      };
      if (!response.ok || !payload.item) {
        throw new Error(payload.error || "공개 상태 변경에 실패했습니다.");
      }

      setPortfolios((prev) =>
        prev.map((item) =>
          item.id === portfolio.id && item.kind === "showcase"
            ? {
                ...item,
                isPublic: nextIsPublic,
                publishedAt: payload.item?.published_at ?? null,
                updatedAt: payload.item?.updated_at ?? item.updatedAt,
                publicUrl: payload.publicUrl ?? null,
              }
            : item,
        ),
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "공개 상태 변경에 실패했습니다.");
    } finally {
      setBusyPublishId(null);
    }
  };

  const handleCopyPublicUrl = async (portfolio: PortfolioListItem) => {
    const url = getShareUrl(portfolio);
    if (!url) return;

    try {
      const copied = await copyTextToClipboard(url);
      if (!copied) throw new Error("copy failed");
      setCopiedPortfolioId(portfolio.id);
      window.setTimeout(() => {
        setCopiedPortfolioId((current) => (current === portfolio.id ? null : current));
      }, 1500);
    } catch {
      alert("공개 링크 복사에 실패했습니다.");
    }
  };

  const handleCopyShowcaseUrl = async (item: UnifiedPortfolioItem) => {
    if (!item.publicUrl) return;
    const url = item.publicUrl.startsWith("http")
      ? item.publicUrl
      : typeof window === "undefined"
        ? item.publicUrl
        : `${window.location.origin}${item.publicUrl}`;
    try {
      const copied = await copyTextToClipboard(url);
      if (!copied) throw new Error("copy failed");
      setCopiedPortfolioId(item.id);
      window.setTimeout(() => {
        setCopiedPortfolioId((current) => (current === item.id ? null : current));
      }, 1500);
    } catch {
      alert("공개 링크 복사에 실패했습니다.");
    }
  };

  const handleOpenShowcaseEditor = (item: UnifiedPortfolioItem) => {
    router.push(`/career/portfolios/showcase-wizard?id=${encodeURIComponent(item.id)}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-8 md:pt-16">
      {/* PDF 출력 — 클릭 시 마운트되어 native print 대화상자 띄움. 끝나면 unmount */}
      {pdfPortfolioId ? (
        <PortfolioPdfPrinter portfolioId={pdfPortfolioId} onDone={handlePdfDone} />
      ) : null}
      <div className="mb-8 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            포트폴리오 관리
          </h1>
          <p className="mt-1.5 text-[14px] text-slate-500">
            왼쪽 목록에서 포트폴리오를 고르고, 오른쪽에서 슬라이스와 기반 프로젝트를 확인하세요.
          </p>
        </div>
        <Button
          onClick={handleStartCreate}
          className="h-10 w-fit shrink-0 gap-2 rounded-xl bg-slate-900 px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          새 포트폴리오 만들기
        </Button>
      </div>

      {portfolios.length > 0 ? (
        <CareerListToolbar
          ariaLabel="포트폴리오 필터"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="포트폴리오·기반 프로젝트 검색"
          sortValue={sortOrder}
          onSortChange={(value) => setSortOrder(value as PortfolioSort)}
          sortOptions={[
            { value: "recent", label: "최근 수정순" },
            { value: "title", label: "제목순" },
          ]}
          advancedFilterCount={advancedFilterCount}
          advancedFilters={
            <>
              <CareerFilterSection label="포트폴리오 형식">
                {([
                  ["all", "전체"],
                  ["slides", "슬라이드형"],
                  ["showcase", "웹사이트형"],
                ] as const).map(([value, label]) => (
                  <CareerFilterChip key={value} active={typeFilter === value} onClick={() => setTypeFilter(value)}>
                    {label}
                  </CareerFilterChip>
                ))}
              </CareerFilterSection>
              <CareerFilterSection label="공개 상태">
                {([
                  ["all", "전체"],
                  ["public", "공개"],
                  ["private", "비공개"],
                ] as const).map(([value, label]) => (
                  <CareerFilterChip key={value} active={visibilityFilter === value} onClick={() => setVisibilityFilter(value)}>
                    {label}
                  </CareerFilterChip>
                ))}
              </CareerFilterSection>
              <CareerFilterSection label="생성 상태">
                {([
                  ["all", "전체"],
                  ["ready", "생성 완료"],
                  ["generating", "생성 중"],
                ] as const).map(([value, label]) => (
                  <CareerFilterChip key={value} active={generationFilter === value} onClick={() => setGenerationFilter(value)}>
                    {label}
                  </CareerFilterChip>
                ))}
              </CareerFilterSection>
            </>
          }
          activeFilters={[
            ...(typeFilter !== "all" ? [{
              id: "type",
              label: typeFilter === "slides" ? "슬라이드형" : "웹사이트형",
              onRemove: () => setTypeFilter("all"),
            }] : []),
            ...(visibilityFilter !== "all" ? [{
              id: "visibility",
              label: visibilityFilter === "public" ? "공개" : "비공개",
              onRemove: () => setVisibilityFilter("all"),
            }] : []),
            ...(generationFilter !== "all" ? [{
              id: "generation",
              label: generationFilter === "ready" ? "생성 완료" : "생성 중",
              onRemove: () => setGenerationFilter("all"),
            }] : []),
          ]}
          onReset={resetFilters}
        />
      ) : null}

      <div className="flex min-h-[640px] min-w-0 flex-col gap-6 lg:h-[calc(100vh-20rem)] lg:flex-row">
        <aside className="flex max-h-[420px] w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 shadow-sm lg:max-h-none lg:w-[360px]">
          <div className="flex-1 space-y-2 overflow-y-auto p-3 no-scrollbar">
            {filteredPortfolios.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                <p>조건에 맞는 포트폴리오가 없습니다.</p>
                <button type="button" onClick={resetFilters} className="mt-2 font-bold text-primary hover:underline">
                  필터 초기화
                </button>
              </div>
            ) : (
              filteredPortfolios.map((portfolio) => {
                const isActive = selectedPortfolio?.id === portfolio.id;
                const isGenerating =
                  portfolio.legacy?.generationStatus === "running" ||
                  activeJobIds.includes(portfolio.id);
                const subtitleText =
                  portfolio.kind === "showcase"
                    ? portfolio.showcase?.templateLabel || "웹사이트형"
                    : (() => {
                        const titles = portfolio.legacy ? getProjectTitles(portfolio.legacy) : [];
                        return titles.length > 0
                          ? titles.slice(0, 2).join(" · ")
                          : "기반 프로젝트 미지정";
                      })();
                return (
                  <div
                    key={portfolio.id}
                    className={cn(
                      "relative w-full rounded-xl border transition-all",
                      isActive
                        ? "border-primary/30 bg-white shadow-sm ring-1 ring-primary/20"
                        : "border-transparent bg-transparent hover:bg-slate-100",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(portfolio.id)}
                      className="w-full p-4 pr-20 text-left"
                    >
                      <h3
                        className={cn(
                          "line-clamp-2 text-[14px] font-semibold",
                          isActive ? "text-primary" : "text-slate-700",
                        )}
                      >
                        {portfolio.title || "(제목 없음)"}
                      </h3>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <PortfolioTypeBadge item={portfolio} />
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-[11px] text-slate-500">
                        {subtitleText}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-500">
                        <span>{getUnifiedTypeLabel(portfolio)}</span>
                        <span className="shrink-0">{formatDateLabel(portfolio.updatedAt)}</span>
                      </div>
                    </button>
                    <div className="absolute right-3 top-3 flex items-center gap-1">
                      {isGenerating ? (
                        <Badge className="rounded-full border-amber-200 bg-amber-50 text-[10px] font-bold text-amber-700">
                          <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
                          생성 중
                        </Badge>
                      ) : null}
                      <button
                        type="button"
                        disabled={busyPublishId === portfolio.id || isGenerating}
                        aria-label={portfolio.isPublic ? "비공개로 전환" : "공개로 전환"}
                        title={portfolio.isPublic ? "비공개로 전환" : "공개로 전환"}
                        className="rounded-md transition-colors hover:bg-slate-200/70 disabled:cursor-wait disabled:opacity-60"
                        onClick={() => {
                          if (portfolio.kind === "legacy" && portfolio.legacy) {
                            void handleTogglePublish(portfolio.legacy);
                            return;
                          }
                          void handleToggleShowcasePublish(portfolio);
                        }}
                      >
                        {busyPublishId === portfolio.id ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </span>
                        ) : (
                          <PortfolioVisibilityBadge isPublic={portfolio.isPublic} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {selectedPortfolio ? (
            selectedPortfolio.kind === "showcase" ? (
              <ShowcaseDetail
                item={selectedPortfolio}
                copiedPortfolioId={copiedPortfolioId}
                busyDeleteId={busyDeleteId}
                onOpenEditor={handleOpenShowcaseEditor}
                onCopyPublicUrl={handleCopyShowcaseUrl}
                onDelete={handleDeleteShowcase}
              />
            ) : selectedPortfolio.legacy ? (
              <PortfolioDetail
                portfolio={selectedPortfolio.legacy}
                busyDeleteId={busyDeleteId}
                busyExportId={busyExportId}
                busyPublishId={busyPublishId}
                onExportPdf={handleExportPdf}
                onOpenWorkspace={handleOpenWorkspace}
                onDelete={handleDelete}
                onTogglePublish={handleTogglePublish}
                onCopyPublicUrl={handleCopyPublicUrl}
                copiedPortfolioId={copiedPortfolioId}
              />
            ) : null
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400">
              <FileImage className="mb-4 h-12 w-12 opacity-30" />
              <h3 className="mb-2 text-lg font-semibold text-slate-500">
                선택된 포트폴리오가 없습니다.
              </h3>
              <p className="max-w-md text-[13px] text-slate-500">
                프로젝트 보관함에서 포트폴리오 작성 모드를 켜고 프로젝트를 선택해 생성하세요.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Button
                  onClick={handleStartCreate}
                  variant="outline"
                  className="h-10 rounded-lg px-4 text-[13px] font-semibold"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  프로젝트 선택
                </Button>
                {!hasSourceData && (
                  <Button
                    onClick={handleLoadSampleData}
                    disabled={isSeedingSample}
                    className="h-10 gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isSeedingSample ? "추가 중" : "샘플 데이터 불러오기"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ShowcaseDetail({
  item,
  copiedPortfolioId,
  busyDeleteId,
  onOpenEditor,
  onCopyPublicUrl,
  onDelete,
}: {
  item: UnifiedPortfolioItem;
  copiedPortfolioId: string | null;
  busyDeleteId: string | null;
  onOpenEditor: (item: UnifiedPortfolioItem) => void;
  onCopyPublicUrl: (item: UnifiedPortfolioItem) => void;
  onDelete: (item: UnifiedPortfolioItem) => void;
}) {
  const isUrlCopied = copiedPortfolioId === item.id;
  const publicHref = item.publicUrl || "";
  return (
    <div className="flex h-full flex-col animate-in fade-in">
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-100 px-6 py-3">
        <button
          type="button"
          onClick={() => onOpenEditor(item)}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[12px] font-semibold text-white hover:bg-slate-800"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          에디터 열기
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          disabled={busyDeleteId === item.id}
          title="포트폴리오 삭제"
          aria-label="포트폴리오 삭제"
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 text-[12px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
        >
          {busyDeleteId === item.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          <span className="hidden xl:inline">삭제</span>
        </button>
      </div>

      <div className="border-b border-slate-100 px-8 pb-6 pt-6">
        <div className="flex max-w-3xl flex-wrap items-center gap-2">
          <PortfolioVisibilityBadge isPublic={item.isPublic} />
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            웹사이트형
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            {item.showcase?.templateLabel || "템플릿"}
          </span>
        </div>
        <h2 className="mt-4 max-w-3xl text-xl font-bold leading-tight text-slate-900">
          {item.title || "(제목 없음)"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          웹사이트형 기반 포트폴리오는 에디터에서 자유롭게 텍스트를 편집하고 공개할 수 있습니다.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            수정일: {formatDateLabel(item.updatedAt)}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Layers3 className="h-3.5 w-3.5" />
            템플릿: {item.showcase?.templateLabel || item.showcase?.templateId || "---"}
          </span>
        </div>
        {item.isPublic && publicHref ? (
          <div className="mt-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">공개 링크</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                읽기 전용 포트폴리오를 바로 열거나 링크를 복사할 수 있습니다.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={publicHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/20 bg-white px-3 text-[12px] font-semibold text-primary hover:bg-primary/5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                바로가기
              </a>
              <button
                type="button"
                onClick={() => onCopyPublicUrl(item)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90"
              >
                {isUrlCopied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {isUrlCopied ? "복사됨" : "복사"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
        <section className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h4 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              안내
            </h4>
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-800">웹사이트형 포트폴리오</p>
            <p className="mt-2 text-slate-500">
              상단의 “에디터 열기”를 눌러 텍스트와 공개 상태를 편집할 수 있습니다.
              템플릿 미리보기는 에디터 안에서 실시간으로 확인됩니다.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function PortfolioDetail({
  portfolio,
  busyDeleteId,
  busyExportId,
  busyPublishId,
  onExportPdf,
  onOpenWorkspace,
  onDelete,
  onTogglePublish,
  onCopyPublicUrl,
  copiedPortfolioId,
}: {
  portfolio: PortfolioListItem;
  busyDeleteId: string | null;
  busyExportId: string | null;
  busyPublishId: string | null;
  onExportPdf: (portfolio: PortfolioListItem) => void;
  onOpenWorkspace: (portfolio: PortfolioListItem) => void;
  onDelete: (portfolio: PortfolioListItem) => void;
  onTogglePublish: (portfolio: PortfolioListItem) => void;
  onCopyPublicUrl: (portfolio: PortfolioListItem) => void;
  copiedPortfolioId: string | null;
}) {
  const sourceProjects = getProjectSummaries(portfolio);
  const isUrlCopied = copiedPortfolioId === portfolio.id;

  // ─── 백그라운드 생성 상태 ───
  // generationStatus="running" 이거나 store 의 activeJobs 에 있으면 진행 중으로 간주
  const activeJob = useBackgroundJobsStore((s) => s.activeJobs[portfolio.id]);
  const removeActiveJob = useBackgroundJobsStore((s) => s.removeActive);
  const isGenerating = portfolio.generationStatus === "running" || Boolean(activeJob);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  const handleCancelGeneration = async () => {
    if (!confirm("생성 중인 작업을 취소할까요?")) return;
    setCancelling(true);
    try {
      const response = await fetch(`/api/career/portfolios/${portfolio.id}/cancel`, {
        method: "POST",
      });
      if (response.status === 409) {
        toast.info("이미 완료된 작업이에요");
      } else if (!response.ok) {
        throw new Error("취소 실패");
      } else {
        toast.success("작업이 취소됐어요");
      }
      removeActiveJob(portfolio.id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "취소 중 오류");
    } finally {
      setCancelling(false);
    }
  };

  const previewPages =
    portfolio.publicSummary.previewPages?.length
      ? portfolio.publicSummary.previewPages
      : (portfolio.publicSummary.slideTitles || []).map((title, index) => ({
          id: `${portfolio.id}-${index}`,
          type: "project" as const,
          title,
          subtitle: "",
          thumbnailUrl: index === 0 ? portfolio.publicSummary.thumbnailUrl : "",
          canvas: undefined,
        }));
  const pageCount = portfolio.publicSummary.sectionCount || previewPages.length || 0;
  const pageUnit = getPageUnit(portfolio);

  return (
    <div className="flex h-full flex-col animate-in fade-in">
      {/* 생성 중 배너 — 진행 중일 때만 표시 */}
      {isGenerating ? (
        <div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-600" />
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold text-amber-800">
                백그라운드에서 생성 중
                {activeJob?.stage?.label ? (
                  <span className="ml-1.5 font-medium text-amber-700">
                    · {activeJob.stage.label}
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] font-medium text-amber-700/80">
                완료되면 알림으로 알려드려요
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelGeneration}
            disabled={cancelling}
            className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
          >
            {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            취소
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-100 px-6 py-3">
        <div className="group relative shrink-0">
          <button
            type="button"
            onClick={() => onTogglePublish(portfolio)}
            disabled={busyPublishId === portfolio.id || isGenerating}
            aria-label={portfolio.isPublic ? "포트폴리오 비공개로 전환" : "포트폴리오 공개하기"}
            className={cn(
              "flex h-8 w-[116px] items-center justify-between rounded-lg border px-2.5 text-[12px] font-semibold transition-colors disabled:opacity-60",
              portfolio.isPublic
                ? "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
            )}
          >
            {busyPublishId === portfolio.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    portfolio.isPublic ? "bg-primary" : "bg-slate-400",
                  )}
                />
                {portfolio.isPublic ? "공개" : "비공개"}
              </span>
            )}
            <span
              className={cn(
                "relative h-4 w-8 rounded-full p-0.5",
                portfolio.isPublic ? "bg-primary" : "bg-slate-300",
              )}
            >
              <span
                className={cn(
                  "block h-3 w-3 rounded-full bg-white shadow-sm",
                  portfolio.isPublic ? "ml-auto" : "ml-0",
                )}
              />
            </span>
          </button>
          <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-30 w-80 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <div className="mb-1 flex items-center gap-1.5 font-bold text-slate-700">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              공개 상태
            </div>
            공개하면 내 프로필의 포트폴리오 링크에서 읽기 전용으로 볼 수 있습니다. 비공개로 바꾸면 본인만 접근할 수 있습니다.
          </div>
        </div>
        <button
          onClick={() => onOpenWorkspace(portfolio)}
          title="워크스페이스 열기"
          aria-label="워크스페이스 열기"
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-100"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">워크스페이스</span>
        </button>
        <button
          onClick={() => onExportPdf(portfolio)}
          disabled={busyExportId === portfolio.id || isGenerating}
          title={isGenerating ? "생성 완료 후 가능합니다" : "PDF 다운로드 (브라우저 인쇄 → PDF로 저장)"}
          aria-label="PDF 다운로드"
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 text-[12px] font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
        >
          {busyExportId === portfolio.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span className="hidden md:inline">PDF</span>
        </button>
        <button
          onClick={() => onDelete(portfolio)}
          disabled={busyDeleteId === portfolio.id || isGenerating}
          title={isGenerating ? "생성 완료 후 가능합니다" : "포트폴리오 삭제"}
          aria-label="포트폴리오 삭제"
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 text-[12px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
        >
          {busyDeleteId === portfolio.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          <span className="hidden xl:inline">삭제</span>
        </button>
      </div>

      <div className="border-b border-slate-100 px-8 pb-6 pt-6">
        <div className="flex max-w-3xl flex-wrap items-center gap-2">
          <PortfolioVisibilityBadge isPublic={portfolio.isPublic} />
          {[getFormatLabel(portfolio), `${pageCount} ${pageUnit}`].map(
            (label) => (
              <span
                key={label}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {label}
              </span>
            ),
          )}
        </div>
        <h2 className="mt-4 max-w-3xl text-xl font-bold leading-tight text-slate-900">
          {portfolio.title || "(제목 없음)"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          {portfolio.publicSummary.headline || "대표 문장을 워크스페이스에서 편집하세요."}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            수정일: {formatDateLabel(portfolio.updatedAt)}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Layers3 className="h-3.5 w-3.5" />
            생성 상태: {portfolio.generationStatus || "draft"}
          </span>
        </div>
        {portfolio.isPublic && portfolio.publicUrl ? (
          <div className="mt-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">공개 링크</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                읽기 전용 포트폴리오를 바로 열거나 링크를 복사할 수 있습니다.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={getShareUrl(portfolio)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/20 bg-white px-3 text-[12px] font-semibold text-primary hover:bg-primary/5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                바로가기
              </a>
              <button
                type="button"
                onClick={() => onCopyPublicUrl(portfolio)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:bg-primary/90"
              >
                {isUrlCopied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {isUrlCopied ? "복사됨" : "복사"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
        <div className="space-y-10">
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  포트폴리오 정보
                </h4>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  기반 프로젝트
                </h4>
                <span className="text-[12px] font-semibold text-slate-500">
                  {sourceProjects.length ? `${sourceProjects.length}개` : "미지정"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="divide-y divide-slate-100 border-y border-slate-200">
                <InfoRow label="포맷" value={getFormatLabel(portfolio)} />
                <InfoRow label="페이지" value={`${pageCount}${pageUnit}`} />
                <InfoRow label="공개상태" value={portfolio.isPublic ? "공개" : "비공개"} />
                <InfoRow label="생성일" value={formatDateLabel(portfolio.generatedAt)} />
              </div>

              <div className="space-y-3 self-start">
                {sourceProjects.length ? (
                  <div className="space-y-3">
                    {sourceProjects.map((project) => (
                      <div key={project.title} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                        <p className="truncate text-sm font-medium text-slate-800">{project.title}</p>
                        {project.tags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {project.tags.slice(0, 5).map((tag) => (
                              <span
                                key={`${project.title}-${tag}`}
                                className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    이전 방식으로 생성되어 기반 프로젝트 정보가 없습니다.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-baseline gap-2">
                <h4 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  포트폴리오 미리보기
                </h4>
                <span className="text-[11px] font-medium text-slate-400">
                  · 실제 디자인으로 표시
                </span>
              </div>
              <span className="text-[12px] font-semibold text-slate-500">
                {pageCount}개 페이지
              </span>
            </div>
            <PortfolioLivePreview portfolioId={portfolio.id} format={portfolio.format} />
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-center gap-4 py-3 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="truncate font-medium text-slate-800">{value || "---"}</span>
    </div>
  );
}

// Kept for the legacy page-preview path that can be re-enabled by the editor.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PortfolioPagePreview({
  portfolio,
  page,
  index,
}: {
  portfolio: PortfolioListItem;
  page: NonNullable<PortfolioListItem["publicSummary"]["previewPages"]>[number];
  index: number;
}) {
  const isDocument = portfolio.format === "document";
  const isSite = portfolio.format === "site";
  const thumbnailUrl =
    page.thumbnailUrl ||
    (index === 0 ? portfolio.publicSummary.thumbnailUrl : "") ||
    PORTFOLIO_BACKGROUND_IMAGES.calmGreenProfile;

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
      <div className="mx-auto w-full max-w-[900px]">
        <div
          className="relative overflow-hidden rounded-lg border border-slate-300 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
          style={{ aspectRatio: isDocument ? "0.707 / 1" : "16 / 9" }}
        >
          {page.canvas?.elements?.length ? (
            <PortfolioCanvasPreview page={page} />
          ) : thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={`${page.title} 미리보기`}
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(132,204,22,0.18),transparent_34%),linear-gradient(135deg,#ffffff,#f8fafc)]" />
              <div className="absolute inset-x-[7%] top-[8%] flex items-center justify-between border-b border-slate-300/80 pb-[1.8%]">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary md:text-xs">
                  {page.type}
                </span>
                <span className="text-[10px] font-bold text-slate-500 md:text-xs">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="absolute left-[7%] right-[7%] top-[28%]">
                <h5 className="max-w-[70%] text-2xl font-black leading-tight text-slate-950 md:text-4xl">
                  {page.title}
                </h5>
                {page.subtitle ? (
                  <p className="mt-[4%] max-w-[62%] text-sm font-medium leading-relaxed text-slate-600 md:text-base">
                    {page.subtitle}
                  </p>
                ) : null}
              </div>
              <div className="absolute bottom-[6%] left-[7%] right-[7%] flex items-center justify-between border-t border-slate-300/70 pt-[1.8%]">
                <span className="text-[10px] font-bold text-slate-400 md:text-xs">
                  {getFormatLabel(portfolio)}
                </span>
                <span className="text-[10px] font-bold text-slate-500 md:text-xs">
                  {index + 1}/{portfolio.publicSummary.sectionCount || "?"}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <p className="truncate text-sm font-semibold text-slate-700">{page.title}</p>
          <span className="shrink-0 text-xs text-slate-400">
            {isSite ? "web page" : isDocument ? "A4 page" : "slide"}
          </span>
        </div>
      </div>
    </article>
  );
}

function PortfolioCanvasPreview({
  page,
}: {
  page: NonNullable<PortfolioListItem["publicSummary"]["previewPages"]>[number];
}) {
  const canvas = page.canvas;
  if (!canvas) return null;

  return (
    <svg
      className="absolute inset-0 h-full w-full bg-white"
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${page.title} 축소 미리보기`}
    >
      <rect width={canvas.width} height={canvas.height} fill="#ffffff" />
      {canvas.elements.map((element) => (
        <PortfolioCanvasElementPreview key={element.id} element={element} />
      ))}
    </svg>
  );
}

function PortfolioCanvasElementPreview({
  element,
}: {
  element: NonNullable<
    NonNullable<PortfolioListItem["publicSummary"]["previewPages"]>[number]["canvas"]
  >["elements"][number];
}) {
  if (element.kind === "image" || element.kind === "techLogo") {
    const imageUrl = element.image?.url || PORTFOLIO_BACKGROUND_IMAGES.calmGreenProfile;
    return (
      <image
        href={imageUrl}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        preserveAspectRatio="xMidYMid slice"
        opacity={element.opacity ?? 1}
      />
    );
  }

  if (element.kind === "shadcnBlock") {
    const items = element.props?.items?.slice(0, element.variant === "project-index-cards" ? 6 : 4) || [];
    const accent = element.stroke || "#84b946";
    return (
      <foreignObject
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        opacity={element.opacity ?? 1}
      >
        <div
          className="h-full w-full overflow-hidden rounded-2xl border bg-white/90 p-3"
          style={{ borderColor: `${accent}66`, color: "#0f172a" }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-[13px] font-black" style={{ color: accent }}>
              {element.props?.title ||
                (element.variant === "tech-logo-grid"
                  ? "기술 스택"
                  : element.variant === "problem-solution-result"
                    ? "문제 해결 흐름"
                    : "요약")}
            </p>
            {element.props?.badges?.[0] ? (
              <span className="shrink-0 rounded-full bg-[#eef6e8] px-2 py-0.5 text-[9px] font-black text-[#6f9e34]">
                {element.props.badges[0]}
              </span>
            ) : null}
          </div>
          <div
            className={
              element.variant === "tech-logo-grid"
                ? "grid h-[calc(100%-24px)] grid-cols-3 gap-2"
                : element.variant === "problem-solution-result"
                  ? "grid h-[calc(100%-24px)] grid-cols-3 gap-2"
                  : "space-y-1.5"
            }
          >
            {(items.length ? items : [{ title: "포트폴리오", body: "자동 구성" }]).map((item, index) => (
              <div
                key={`${item.title || item.label || index}`}
                className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white/82 px-2 py-1.5"
              >
                <p className="truncate text-[10px] font-black" style={{ color: accent }}>
                  {item.label || String(index + 1).padStart(2, "0")}
                </p>
                <p className="truncate text-[11px] font-black text-slate-900">
                  {item.title || item.value || item.label}
                </p>
                {item.body ? (
                  <p className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-3 text-slate-500">
                    {item.body}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </foreignObject>
    );
  }

  if (element.kind === "shape") {
    return (
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rx={element.role === "decorative" ? Math.min(element.width, element.height) / 2 : 18}
        fill={element.fill || "rgba(132, 204, 22, 0.14)"}
        stroke={element.stroke || "none"}
        opacity={element.opacity ?? 1}
      />
    );
  }

  if (element.kind === "line") {
    return (
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={Math.max(1, element.height)}
        fill={element.stroke || element.fill || "#cbd5e1"}
        opacity={element.opacity ?? 1}
      />
    );
  }

  if (element.kind === "metric") {
    return (
      <g opacity={element.opacity ?? 1}>
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx="14"
          fill={element.fill || "#ffffff"}
          stroke={element.stroke || "#dbeafe"}
        />
        <text x={element.x + 12} y={element.y + 22} fill="#64748b" fontSize="11" fontWeight="700">
          {element.label}
        </text>
        <text
          x={element.x + 12}
          y={element.y + element.height - 16}
          fill="#0f172a"
          fontSize="21"
          fontWeight="900"
        >
          {element.value}
        </text>
      </g>
    );
  }

  if (element.kind === "flow" || element.kind === "timeline") {
    const items = element.items?.slice(0, 5) || [];
    const gap = 12;
    const itemWidth = items.length
      ? (element.width - gap * Math.max(0, items.length - 1)) / items.length
      : 0;
    return (
      <g opacity={element.opacity ?? 1}>
        {items.map((item, index) => {
          const x = element.x + index * (itemWidth + gap);
          return (
            <g key={`${element.id}-${item}-${index}`}>
              <rect
                x={x}
                y={element.y}
                width={itemWidth}
                height={element.height}
                rx={element.height / 2}
                fill={element.fill || "#ffffff"}
                stroke={element.stroke || "#84b946"}
              />
              <foreignObject
                x={x + 8}
                y={element.y + 8}
                width={Math.max(0, itemWidth - 16)}
                height={Math.max(0, element.height - 16)}
              >
                <div
                  className="flex h-full items-center justify-center text-center text-[11px] font-black leading-tight"
                  style={{ color: element.stroke || "#5f8f2f" }}
                >
                  {item}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <foreignObject
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      opacity={element.opacity ?? 1}
    >
      <div
        className="h-full w-full overflow-hidden whitespace-pre-wrap"
      style={{
        color: element.color || "#0f172a",
        fontSize: element.fontSize || 16,
        fontWeight: element.fontWeight || 500,
        lineHeight: element.lineHeight || 1.25,
        textAlign: element.textAlign || "left",
      }}
      >
        {element.content}
      </div>
    </foreignObject>
  );
}
