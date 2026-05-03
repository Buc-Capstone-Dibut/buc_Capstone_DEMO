"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  FileImage,
  FileText,
  HelpCircle,
  Layers3,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PORTFOLIO_BACKGROUND_IMAGES,
  type PortfolioListItem,
} from "@/lib/career-portfolios";
import { cn } from "@/lib/utils";

type PortfoliosClientProps = {
  initialPortfolios: PortfolioListItem[];
  sourceStats: {
    projects: number;
    workExperiences: number;
    coverLetters: number;
    skills: number;
  };
};

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
  return portfolio.format === "document" ? "A4 보고서" : "PPT 16:9";
}

function getPageUnit(portfolio: PortfolioListItem) {
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
}: PortfoliosClientProps) {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState(initialPortfolios);
  const [selectedId, setSelectedId] = useState(initialPortfolios[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "title">("recent");
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [busyPublishId, setBusyPublishId] = useState<string | null>(null);
  const [copiedPortfolioId, setCopiedPortfolioId] = useState<string | null>(null);

  const filteredPortfolios = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const next = portfolios.filter((portfolio) => {
      if (!query) return true;
      const sourceText = getProjectTitles(portfolio).join(" ");
      return `${portfolio.title} ${portfolio.publicSummary.headline || ""} ${sourceText}`
        .toLowerCase()
        .includes(query);
    });

    return next.sort((a, b) => {
      if (sortOrder === "title") return a.title.localeCompare(b.title, "ko");
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [portfolios, searchQuery, sortOrder]);

  const selectedPortfolio =
    portfolios.find((portfolio) => portfolio.id === selectedId) || filteredPortfolios[0] || null;

  useEffect(() => {
    if (!selectedPortfolio && filteredPortfolios[0]) {
      setSelectedId(filteredPortfolios[0].id);
    }
  }, [filteredPortfolios, selectedPortfolio]);

  const handleStartCreate = () => {
    router.push("/career/projects?portfolioMode=1");
  };

  const handleOpenWorkspace = (portfolio: PortfolioListItem) => {
    window.open(`/career/portfolios/${portfolio.id}/edit`, "_blank", "noopener,noreferrer");
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
      const nextItem = {
        ...payload.item,
        publicUrl: payload.publicUrl || null,
      };
      setPortfolios((prev) =>
        prev.map((item) => (item.id === portfolio.id ? nextItem : item)),
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

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-8 md:pt-16">
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

      <div className="flex min-h-[640px] min-w-0 flex-col gap-6 lg:h-[calc(100vh-16rem)] lg:flex-row">
        <aside className="flex max-h-[420px] w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 shadow-sm lg:max-h-none lg:w-[360px]">
          <div className="space-y-3 border-b border-slate-200 bg-white/70 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="포트폴리오 검색..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-[13px] text-slate-700 outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium text-slate-500">정렬</span>
              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value === "title" ? "title" : "recent")
                }
                className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 outline-none focus:border-primary"
              >
                <option value="recent">최근 수정순</option>
                <option value="title">제목순</option>
              </select>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3 no-scrollbar">
            {filteredPortfolios.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredPortfolios.map((portfolio) => {
                const isActive = selectedPortfolio?.id === portfolio.id;
                const sourceTitles = getProjectTitles(portfolio);
                return (
                  <button
                    key={portfolio.id}
                    type="button"
                    onClick={() => setSelectedId(portfolio.id)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-all",
                      isActive
                        ? "border-primary/30 bg-white shadow-sm ring-1 ring-primary/20"
                        : "border-transparent bg-transparent hover:bg-slate-100",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3
                        className={cn(
                          "line-clamp-2 text-[14px] font-semibold",
                          isActive ? "text-primary" : "text-slate-700",
                        )}
                      >
                        {portfolio.title || "(제목 없음)"}
                      </h3>
                      <Badge
                        variant={portfolio.isPublic ? "default" : "secondary"}
                        className="shrink-0 rounded-full text-[10px]"
                      >
                        {portfolio.isPublic ? "공개" : "비공개"}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                      {sourceTitles.length > 0
                        ? sourceTitles.slice(0, 2).join(" · ")
                        : "기반 프로젝트 미지정"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-500">
                      <span>{getFormatLabel(portfolio)}</span>
                      <span className="shrink-0">{formatDateLabel(portfolio.updatedAt)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {selectedPortfolio ? (
            <PortfolioDetail
              portfolio={selectedPortfolio}
              busyDeleteId={busyDeleteId}
              busyPublishId={busyPublishId}
              onOpenWorkspace={handleOpenWorkspace}
              onDelete={handleDelete}
              onTogglePublish={handleTogglePublish}
              onCopyPublicUrl={handleCopyPublicUrl}
              copiedPortfolioId={copiedPortfolioId}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400">
              <FileImage className="mb-4 h-12 w-12 opacity-30" />
              <h3 className="mb-2 text-lg font-semibold text-slate-500">
                선택된 포트폴리오가 없습니다.
              </h3>
              <p className="max-w-md text-[13px] text-slate-500">
                프로젝트 보관함에서 포트폴리오 작성 모드를 켜고 프로젝트를 선택해 생성하세요.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PortfolioDetail({
  portfolio,
  busyDeleteId,
  busyPublishId,
  onOpenWorkspace,
  onDelete,
  onTogglePublish,
  onCopyPublicUrl,
  copiedPortfolioId,
}: {
  portfolio: PortfolioListItem;
  busyDeleteId: string | null;
  busyPublishId: string | null;
  onOpenWorkspace: (portfolio: PortfolioListItem) => void;
  onDelete: (portfolio: PortfolioListItem) => void;
  onTogglePublish: (portfolio: PortfolioListItem) => void;
  onCopyPublicUrl: (portfolio: PortfolioListItem) => void;
  copiedPortfolioId: string | null;
}) {
  const sourceProjects = getProjectSummaries(portfolio);
  const isUrlCopied = copiedPortfolioId === portfolio.id;
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
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <div className="group relative">
          <button
            type="button"
            onClick={() => onTogglePublish(portfolio)}
            disabled={busyPublishId === portfolio.id}
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
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-100"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          워크스페이스
        </button>
        <button
          onClick={() => onDelete(portfolio)}
          disabled={busyDeleteId === portfolio.id}
          className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
        >
          {busyDeleteId === portfolio.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          삭제
        </button>
      </div>

      <div className="mt-2 border-b border-slate-100 px-8 pb-6 pt-10">
        <div className="flex max-w-3xl flex-wrap items-center gap-2">
          {[portfolio.isPublic ? "공개" : "비공개", getFormatLabel(portfolio), `${pageCount} ${pageUnit}`].map(
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
              <h4 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                포트폴리오 미리보기
              </h4>
              <span className="text-[12px] font-semibold text-slate-500">
                {previewPages.length}개
              </span>
            </div>
            {previewPages.length ? (
              <div className="space-y-6">
                {previewPages.map((page, index) => (
                  <PortfolioPagePreview
                    key={page.id || `${portfolio.id}-${index}`}
                    portfolio={portfolio}
                    page={page}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center">
                <FileText className="mb-3 h-9 w-9 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">
                  표시할 미리보기가 없습니다.
                </p>
              </div>
            )}
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
            {isDocument ? "A4 page" : "slide"}
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
