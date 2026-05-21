"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  Check,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Minus,
  Palette,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PORTFOLIO_CANVAS_STYLE_VERSION,
  getPortfolioPagePreset,
  getPortfolioTemplate,
  normalizePortfolioDocument,
  withPortfolioSampleImages,
  type PortfolioAsset,
  type PortfolioCanvasElement,
  type PortfolioCanvasFontFamily,
  type PortfolioCanvasLayout,
  type PortfolioDocument,
  type PortfolioImageFit,
  type PortfolioImageSlot,
  type PortfolioListItem,
  type PortfolioSection,
  type PortfolioSectionType,
  type PortfolioSitePage,
  type PortfolioSitePageType,
  type PortfolioSourceData,
  type PortfolioTemplateId,
} from "@/lib/career-portfolios";
import { PortfolioSitePagesSidebar } from "./portfolio-site-pages-sidebar";
import { PortfolioSitePageEditor } from "./portfolio-site-page-editor";
import { PortfolioSiteAiChat } from "./portfolio-site-ai-chat";
import {
  PortfolioRenderer,
  PortfolioSlideThumbnail,
  type PortfolioElementAction,
} from "./portfolio-renderer";
import { PortfolioSiteRenderer } from "../portfolio-site/portfolio-site-renderer";
import { EditFocusBadge } from "../portfolio-site/renderers/edit-focus";
import { TemplatePicker } from "./template-picker";
import { RendererPicker } from "./renderer-picker";

type PortfolioEditorClientProps = {
  portfolio: PortfolioListItem;
  document: PortfolioDocument;
  source: PortfolioSourceData;
  assets: PortfolioAsset[];
  publicUrl: string | null;
};

type SelectedCanvasElement = {
  sectionId: string;
  element: PortfolioCanvasElement;
  seedElements: PortfolioCanvasElement[];
};

type GenerationSectionStatus = {
  index: number;
  title: string;
  type: PortfolioSectionType;
};

type GenerationState = {
  active: boolean;
  stage: string;
  progress: number;
  sections: GenerationSectionStatus[];
  total?: number;
  error?: string;
};

const GENERATION_STAGE_LABELS = [
  "프로젝트 정보 가져오는 중",
  "프로젝트 데이터 분석 중",
  "핵심 경험 정리 중",
  "대표 이미지 선택 중",
  "슬라이드 구성 설계 중",
  "인포그래픽 배치 중",
  "디자인 자동 정돈 중",
  "저장 중",
] as const;

const SECTION_LABEL: Record<PortfolioSectionType, string> = {
  hero: "표지",
  about: "소개",
  skills: "기술",
  index: "인덱스",
  project: "프로젝트",
  experience: "경력",
  quote: "자소서",
  gallery: "갤러리",
  retrospective: "회고",
  contact: "연락처",
};

const TEXT_COLOR_PALETTE = [
  "#0f172a",
  "#334155",
  "#475569",
  "#64748b",
  "#111827",
  "#ffffff",
  "#f8fafc",
  "#9bb97c",
  "#7c955f",
  "#55783f",
  "#f8f1c1",
  "#f6d46b",
  "#f97316",
  "#ef4444",
  "#14b8a6",
  "#0ea5e9",
  "#2563eb",
  "#9333ea",
  "#f8c4b6",
  "#d9ead0",
  "#b7e1db",
  "#bae6fd",
  "#c7d2fe",
  "#e9d5ff",
] as const;

function makeClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function prepareDocument(document: PortfolioDocument, templateId: PortfolioTemplateId) {
  return withPortfolioSampleImages(normalizePortfolioDocument(document, templateId));
}

function getSectionCanvasSize(section: PortfolioSection | undefined, document: PortfolioDocument) {
  const preset = getPortfolioPagePreset(document.pageSize || "16:9");
  return {
    width: section?.canvas?.width || preset.width,
    height: section?.canvas?.height || preset.height,
  };
}

export function PortfolioEditorClient({
  portfolio,
  document: initialDocument,
  publicUrl: initialPublicUrl,
}: PortfolioEditorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldAutoGenerate = searchParams.get("generate") === "1";
  const generationStartedRef = useRef(false);
  const [title, setTitle] = useState(portfolio.title);
  const [document, setDocument] = useState(() => prepareDocument(initialDocument, portfolio.templateId));
  const [selectedSectionId, setSelectedSectionId] = useState(document.sections[0]?.id || "");
  const [selectedElement, setSelectedElement] = useState<SelectedCanvasElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPublic, setIsPublic] = useState(portfolio.isPublic);
  const [publicUrl, setPublicUrl] = useState(initialPublicUrl);
  const [generation, setGeneration] = useState<GenerationState>({
    active: shouldAutoGenerate,
    stage: shouldAutoGenerate ? "워크스페이스 준비 중" : "",
    progress: shouldAutoGenerate ? 6 : 0,
    sections: [],
  });

  const selectedSection = useMemo(
    () => document.sections.find((section) => section.id === selectedSectionId) || null,
    [document.sections, selectedSectionId],
  );

  const activeElement =
    selectedElement && selectedElement.sectionId === selectedSectionId
      ? selectedElement.element
      : null;

  useEffect(() => {
    if (!shouldAutoGenerate || generationStartedRef.current) return;
    generationStartedRef.current = true;

    // SSE 연결이 끊겨도 DB에는 결과가 저장될 수 있으므로, complete 미수신 상태에서는
    // /api/career/portfolios/[id] 를 짧은 주기로 폴링해 최종본을 따라잡는다.
    let completed = false;
    let pollTimer: number | null = null;
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 36; // 5s * 36 = 180s
    const POLL_INTERVAL_MS = 5000;

    const stopPolling = () => {
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
        pollTimer = null;
      }
    };

    const applyFinalDocument = (
      nextDocument: PortfolioDocument,
      templateOverride?: string,
      titleOverride?: string,
    ) => {
      const prepared = prepareDocument(
        nextDocument,
        (templateOverride as typeof portfolio.templateId) || portfolio.templateId,
      );
      setDocument(prepared);
      setSelectedSectionId(prepared.sections[0]?.id || "");
      setSelectedElement(null);
      if (titleOverride) setTitle(titleOverride);
      setGeneration({
        active: false,
        stage: "AI 생성 완료",
        progress: 100,
        sections: [],
      });
      window.setTimeout(() => {
        setGeneration({ active: false, stage: "", progress: 0, sections: [] });
      }, 2000);
      window.history.replaceState(null, "", window.location.pathname);
    };

    const pollOnce = async () => {
      if (completed) return;
      pollAttempts += 1;
      try {
        const response = await fetch(`/api/career/portfolios/${portfolio.id}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const data = (await response.json()) as {
            item?: PortfolioListItem;
            document?: PortfolioDocument;
          };
          const status = data.item?.generationStatus;
          if (status === "completed" && data.document) {
            completed = true;
            stopPolling();
            applyFinalDocument(
              data.document,
              data.item?.templateId,
              data.item?.title,
            );
            return;
          }
          if (status === "failed") {
            completed = true;
            stopPolling();
            setGeneration((current) => ({
              ...current,
              active: false,
              stage: "생성 실패",
              error: current.error || "포트폴리오 생성에 실패했습니다.",
            }));
            return;
          }
        }
      } catch {
        // network blip — retry on next tick
      }
      if (!completed && pollAttempts < MAX_POLL_ATTEMPTS) {
        pollTimer = window.setTimeout(pollOnce, POLL_INTERVAL_MS);
      }
    };

    const ensurePolling = () => {
      if (completed || pollTimer !== null) return;
      pollTimer = window.setTimeout(pollOnce, POLL_INTERVAL_MS);
    };

    const eventSource = new EventSource(`/api/career/portfolios/${portfolio.id}/generate`);
    setGeneration({
      active: true,
      stage: "프로젝트 정보 가져오는 중",
      progress: 8,
      sections: [],
    });

    eventSource.addEventListener("stage", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { label?: string; progress?: number };
      setGeneration((current) => ({
        ...current,
        active: true,
        stage: payload.label || current.stage,
        progress: clampNumber(payload.progress ?? current.progress + 6, 8, 96),
      }));
    });

    eventSource.addEventListener("document", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { document?: PortfolioDocument };
      if (!payload.document) return;
      const nextDocument = prepareDocument(payload.document, portfolio.templateId);
      setDocument(nextDocument);
      setSelectedSectionId(nextDocument.sections[0]?.id || "");
      setSelectedElement(null);
      setGeneration((current) => ({
        ...current,
        active: true,
        total: nextDocument.sections.length,
      }));
    });

    eventSource.addEventListener("section", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as {
        index: number;
        total?: number;
        section?: PortfolioSection;
      };
      if (!payload.section) return;
      setDocument((current) => {
        const nextSections = [...current.sections];
        nextSections[payload.index] = payload.section!;
        return prepareDocument({ ...current, sections: nextSections }, current.templateId);
      });
      setGeneration((current) => ({
        ...current,
        active: true,
        progress: Math.max(current.progress, 72),
        total: payload.total || current.total,
        sections: [
          ...current.sections.filter((section) => section.index !== payload.index),
          {
            index: payload.index,
            title: payload.section?.title || SECTION_LABEL[payload.section?.type || "project"],
            type: payload.section?.type || "project",
          },
        ].sort((a, b) => a.index - b.index),
      }));
    });

    eventSource.addEventListener("complete", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as {
        item?: PortfolioListItem;
        document?: PortfolioDocument;
      };
      completed = true;
      stopPolling();
      if (payload.document) {
        applyFinalDocument(
          payload.document,
          payload.item?.templateId,
          payload.item?.title,
        );
      } else {
        setGeneration((current) => ({
          ...current,
          active: false,
          stage: "AI 생성 완료",
          progress: 100,
          sections: [],
        }));
      }
      eventSource.close();
    });

    eventSource.addEventListener("portfolio-error", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { error?: string };
      completed = true;
      stopPolling();
      setGeneration((current) => ({
        ...current,
        active: false,
        stage: "기본 템플릿으로 열기",
        progress: current.progress || 0,
        error: payload.error || "포트폴리오 생성에 실패했습니다.",
      }));
      eventSource.close();
    });

    eventSource.onerror = () => {
      // SSE 가 끊겼지만 서버 생성은 계속될 수 있으므로 폴링으로 결과를 받아온다.
      eventSource.close();
      if (completed) return;
      setGeneration((current) => ({
        ...current,
        stage: current.stage || "결과 확인 중",
        progress: current.progress || 0,
      }));
      ensurePolling();
    };

    return () => {
      stopPolling();
      eventSource.close();
    };
  }, [portfolio.id, portfolio.templateId, shouldAutoGenerate]);

  const updateDocument = (updater: (current: PortfolioDocument) => PortfolioDocument) => {
    setDocument((current) => prepareDocument(updater(current), current.templateId));
  };

  const updateSectionById = (sectionId: string, patch: Partial<PortfolioSection>) => {
    updateDocument((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    }));
  };

  const updateElementById = (
    sectionId: string,
    elementId: string,
    patch: Partial<PortfolioCanvasElement>,
    seedElements?: PortfolioCanvasElement[],
  ) => {
    setSelectedElement((current) => {
      if (!current || current.sectionId !== sectionId || current.element.id !== elementId) return current;
      return { ...current, element: { ...current.element, ...patch } };
    });

    updateDocument((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const canvasSize = getSectionCanvasSize(section, current);
        const hasCurrentCanvas =
          section.canvas?.styleVersion === PORTFOLIO_CANVAS_STYLE_VERSION &&
          section.canvas?.elements?.length;
        const baseElements =
          hasCurrentCanvas
            ? section.canvas?.elements || []
            : seedElements ||
              (selectedElement?.sectionId === sectionId
                ? selectedElement.seedElements
                : []);
        return {
          ...section,
          canvas: {
            width: canvasSize.width,
            height: canvasSize.height,
            styleVersion: PORTFOLIO_CANVAS_STYLE_VERSION,
            elements: baseElements.map((element) =>
              element.id === elementId ? { ...element, ...patch } : element,
            ),
          },
        };
      }),
    }));
  };

  const updateSectionCanvasElements = (
    sectionId: string,
    elements: PortfolioCanvasElement[],
  ) => {
    updateDocument((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              canvas: {
                width: getSectionCanvasSize(section, current).width,
                height: getSectionCanvasSize(section, current).height,
                styleVersion: PORTFOLIO_CANVAS_STYLE_VERSION,
                elements,
              },
            }
          : section,
      ),
    }));
  };

  const handleElementAction = (
    sectionId: string,
    elementId: string,
    action: PortfolioElementAction,
    seedElements: PortfolioCanvasElement[] = [],
  ) => {
    const section = document.sections.find((item) => item.id === sectionId);
    const hasCurrentCanvas =
      section?.canvas?.styleVersion === PORTFOLIO_CANVAS_STYLE_VERSION &&
      section.canvas.elements?.length;
    const baseElements =
      hasCurrentCanvas
        ? section?.canvas?.elements || []
        : seedElements.length
          ? seedElements
          : selectedElement?.sectionId === sectionId
            ? selectedElement.seedElements
            : [];
    const targetIndex = baseElements.findIndex((element) => element.id === elementId);
    if (targetIndex < 0) return;

    let nextElements = [...baseElements];
    let nextSelected: PortfolioCanvasElement | null = nextElements[targetIndex] || null;

    if (action === "duplicate") {
      const source = baseElements[targetIndex];
      const canvasSize = getSectionCanvasSize(section, document);
      const duplicate: PortfolioCanvasElement = {
        ...source,
        id: makeClientId(`${source.kind}-${source.role}`),
        x: clampNumber(source.x + 24, 0, canvasSize.width - source.width),
        y: clampNumber(source.y + 24, 0, canvasSize.height - source.height),
      };
      nextElements.splice(targetIndex + 1, 0, duplicate);
      nextSelected = duplicate;
    }

    if (action === "delete") {
      nextElements = baseElements.filter((element) => element.id !== elementId);
      nextSelected = null;
    }

    if (action === "bring-forward" && targetIndex < baseElements.length - 1) {
      const [target] = nextElements.splice(targetIndex, 1);
      nextElements.splice(targetIndex + 1, 0, target);
      nextSelected = target;
    }

    if (action === "send-backward" && targetIndex > 0) {
      const [target] = nextElements.splice(targetIndex, 1);
      nextElements.splice(targetIndex - 1, 0, target);
      nextSelected = target;
    }

    updateSectionCanvasElements(sectionId, nextElements);
    setSelectedElement(
      nextSelected
        ? { sectionId, element: nextSelected, seedElements: nextElements }
        : null,
    );
  };

  const handleSelectSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setSelectedElement(null);
  };

  // ────────────────────────────────────────────────────────────────────────
  // 웹슬라이드(site) 포맷 — 페이지 helpers (좌측 사이드바와 연동)
  // ────────────────────────────────────────────────────────────────────────
  const sitePages = useMemo(() => document.pages || [], [document.pages]);
  const [activeSitePageId, setActiveSitePageId] = useState<string>(() => sitePages[0]?.id || "");

  // 페이지 목록 변경 시 활성 페이지 보정
  useEffect(() => {
    if (!sitePages.length) {
      if (activeSitePageId) setActiveSitePageId("");
      return;
    }
    if (!sitePages.some((p) => p.id === activeSitePageId)) {
      setActiveSitePageId(sitePages[0].id);
    }
  }, [sitePages, activeSitePageId]);

  const togglePageVisibility = (pageId: string) => {
    updateDocument((current) => ({
      ...current,
      pages: (current.pages || []).map((p) =>
        p.id === pageId ? { ...p, visible: p.visible === false } : p,
      ),
    }));
  };

  const deletePage = (pageId: string) => {
    updateDocument((current) => ({
      ...current,
      pages: (current.pages || []).filter((p) => p.id !== pageId),
    }));
    if (activeSitePageId === pageId) {
      const fallback =
        sitePages[sitePages.findIndex((p) => p.id === pageId) + 1]?.id ||
        sitePages[sitePages.findIndex((p) => p.id === pageId) - 1]?.id ||
        sitePages.find((p) => p.id !== pageId)?.id ||
        "";
      setActiveSitePageId(fallback);
    }
  };

  const reorderPages = (orderedIds: string[]) => {
    updateDocument((current) => {
      const byId = new Map((current.pages || []).map((p) => [p.id, p] as const));
      const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as typeof current.pages;
      return { ...current, pages: reordered };
    });
  };

  const updatePageById = (pageId: string, patch: Partial<PortfolioSitePage>) => {
    updateDocument((current) => ({
      ...current,
      pages: (current.pages || []).map((p) =>
        p.id === pageId ? { ...p, ...patch } : p,
      ),
    }));
  };

  // AI 페이지 재생성
  const [regeneratingPageId, setRegeneratingPageId] = useState<string | null>(null);
  // 우측 패널 ↔ 슬라이드 캔버스 강조 동기화
  const [editFocus, setEditFocus] = useState<{
    field?: "title" | "subtitle" | "eyebrow" | "narrative" | "emphasis" | null;
    blockId?: string | null;
  }>({ field: null, blockId: null });
  const regeneratePage = async (pageId: string, instruction?: string) => {
    if (regeneratingPageId) return;
    setRegeneratingPageId(pageId);
    try {
      const response = await fetch(
        `/api/career/portfolios/${portfolio.id}/pages/${pageId}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction: instruction || undefined }),
        },
      );
      const payload = await response.json();
      if (!response.ok || !payload.page) {
        throw new Error(payload.error || "재생성 실패");
      }
      updateDocument((current) => ({
        ...current,
        pages: (current.pages || []).map((p) =>
          p.id === pageId ? { ...(payload.page as PortfolioSitePage) } : p,
        ),
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "AI 재생성 실패");
    } finally {
      setRegeneratingPageId(null);
    }
  };

  const addPage = (type: PortfolioSitePageType) => {
    const PAGE_TYPE_LABEL_LOCAL: Record<PortfolioSitePageType, string> = {
      cover: "표지",
      profile: "프로필",
      skills: "기술",
      "project-index": "프로젝트 목차",
      "case-study": "케이스 스터디",
      "project-detail": "프로젝트 상세",
      experience: "경력",
      retrospective: "회고",
      contact: "연락처",
    };
    const TYPE_TO_LAYOUT: Record<PortfolioSitePageType, PortfolioSitePage["layout"]> = {
      cover: "cover-focus",
      profile: "profile-summary",
      skills: "skills-grid",
      "project-index": "project-index",
      "case-study": "case-study",
      "project-detail": "project-detail",
      experience: "case-study",
      retrospective: "case-study",
      contact: "cover-focus",
    };
    const newId = `page-${Date.now().toString(36)}-${Math.floor(Math.random() * 9999)}`;
    const newPage: PortfolioSitePage = {
      id: newId,
      type,
      title: `새 ${PAGE_TYPE_LABEL_LOCAL[type]}`,
      eyebrow: PAGE_TYPE_LABEL_LOCAL[type],
      narrative: "",
      emphasis: [],
      layout: TYPE_TO_LAYOUT[type],
      blocks: [],
      visible: true,
    };
    updateDocument((current) => ({
      ...current,
      pages: [...(current.pages || []), newPage],
    }));
    setActiveSitePageId(newId);
  };

  const deleteSection = (sectionId: string) => {
    if (document.sections.length <= 1) {
      alert("최소 1개의 슬라이스는 필요합니다.");
      return;
    }
    const targetIndex = document.sections.findIndex((section) => section.id === sectionId);
    const target = document.sections[targetIndex];
    if (!target) return;
    if (!confirm(`"${target.title || SECTION_LABEL[target.type]}" 슬라이스를 삭제할까요?`)) return;

    const nextSelection =
      document.sections[targetIndex + 1]?.id ||
      document.sections[targetIndex - 1]?.id ||
      document.sections.find((section) => section.id !== sectionId)?.id ||
      "";

    updateDocument((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== sectionId),
    }));
    setSelectedSectionId(nextSelection);
    if (selectedElement?.sectionId === sectionId) setSelectedElement(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/career/portfolios/${portfolio.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          templateId: document.templateId,
          document,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "저장 실패");
      setDocument(prepareDocument(payload.document, document.templateId));
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : "저장에 실패했습니다.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async (nextPublic: boolean) => {
    setIsPublishing(true);
    try {
      const saved = await handleSave();
      if (!saved) return;
      const response = await fetch(`/api/career/portfolios/${portfolio.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextPublic }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "공개 상태 변경 실패");
      setIsPublic(payload.item.isPublic);
      setPublicUrl(payload.publicUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : "공개 상태 변경에 실패했습니다.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleExportPptx = async () => {
    setIsExporting(true);
    try {
      const saved = await handleSave();
      if (!saved) return;
      window.location.href = `/api/career/portfolios/${portfolio.id}/export/pptx`;
    } finally {
      window.setTimeout(() => setIsExporting(false), 1200);
    }
  };

  if (document.format === "site") {
    return (
      <div className="fixed left-0 top-0 z-[80] flex h-[100svh] min-h-0 w-screen flex-col overflow-hidden bg-[#f5f8f1] text-slate-900">
        <header className="flex h-14 w-full shrink-0 items-center justify-between gap-4 overflow-hidden border-b border-[#d8e4d0]/80 bg-white/90 px-4 shadow-sm backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500 hover:bg-primary/10 hover:text-primary"
              onClick={() => router.push("/career/portfolios")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-9 w-72 border-[#d8e4d0] bg-white/75 font-semibold text-slate-900 placeholder:text-slate-400"
              aria-label="포트폴리오 이름"
            />
            <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              웹 슬라이드
            </span>
            <span className="rounded-full border border-[#d8e4d0] bg-white/75 px-3 py-1 text-xs font-bold text-slate-600">
              {isPublic ? "공개 중" : "비공개"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <RendererPicker
              rendererId={document.rendererId}
              onChange={(nextId) =>
                setDocument((current) => ({ ...current, rendererId: nextId }))
              }
            />
            <TemplatePicker
              templateId={document.templateId}
              onChange={(nextId) => {
                const nextTemplate = getPortfolioTemplate(nextId);
                setDocument((current) => ({
                  ...current,
                  templateId: nextId,
                  theme: nextTemplate.theme,
                }));
              }}
            />
            <span className="h-6 w-px bg-[#d8e4d0]" />
            {publicUrl ? (
              <Button
                variant="outline"
                className="h-9 gap-2 rounded-lg border-[#d8e4d0] bg-white/75 text-slate-700 hover:bg-white"
                onClick={() => window.open(publicUrl, "_blank")}
              >
                <Eye className="h-4 w-4" />
                공개 보기
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-9 gap-2 rounded-lg border-[#d8e4d0] bg-white/75 text-slate-700 hover:bg-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              저장
            </Button>
            <Button
              className="h-9 gap-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => void handlePublish(!isPublic)}
              disabled={isPublishing}
            >
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isPublic ? "비공개 전환" : "공개"}
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <PortfolioSitePagesSidebar
            pages={sitePages}
            activePageId={activeSitePageId}
            onSelectPage={(pageId) => setActiveSitePageId(pageId)}
            onReorderPages={reorderPages}
            onToggleVisibility={togglePageVisibility}
            onDeletePage={deletePage}
            onAddPage={addPage}
            disabled={generation.active}
          />
          <main className="relative min-h-0 min-w-0 flex-1 overflow-auto">
            <PortfolioSiteRenderer
              document={document}
              activeIndex={Math.max(
                0,
                sitePages.findIndex((p) => p.id === activeSitePageId),
              )}
              onActiveIndexChange={(next) => {
                const target = sitePages[next];
                if (target) setActiveSitePageId(target.id);
              }}
              hideThumbnails
              includeHiddenPages
              disableKeyboardNav={generation.active}
              editFocus={editFocus}
              inlineEdit={
                generation.active || regeneratingPageId !== null
                  ? undefined
                  : {
                      onPatchPageField: (field, value) => {
                        if (!activeSitePageId) return;
                        updatePageById(activeSitePageId, {
                          [field]: value,
                        } as Partial<PortfolioSitePage>);
                      },
                      onPatchBlockContent: (blockId, content) => {
                        if (!activeSitePageId) return;
                        const page = sitePages.find((p) => p.id === activeSitePageId);
                        if (!page) return;
                        updatePageById(activeSitePageId, {
                          blocks: page.blocks.map((b) =>
                            b.id === blockId ? { ...b, content } : b,
                          ),
                        });
                      },
                    }
              }
            />
            <GenerationStatusOverlay generation={generation} document={document} />
          </main>
          <PortfolioSitePageEditor
            page={sitePages.find((p) => p.id === activeSitePageId) || null}
            onPatch={(patch) => {
              if (!activeSitePageId) return;
              updatePageById(activeSitePageId, patch);
            }}
            onRegenerate={(instruction) => {
              if (!activeSitePageId) return;
              void regeneratePage(activeSitePageId, instruction);
            }}
            isRegenerating={regeneratingPageId === activeSitePageId}
            disabled={generation.active || regeneratingPageId !== null}
            onFocusChange={(focus) => setEditFocus(focus)}
          />
        </div>
        <EditFocusBadge focus={editFocus} />
        <PortfolioSiteAiChat
          portfolioId={portfolio.id}
          activePageId={activeSitePageId || null}
          onApplyPatches={(patches) => {
            updateDocument((current) => {
              const byId = new Map(patches.map((p) => [p.pageId, p.patch] as const));
              return {
                ...current,
                pages: (current.pages || []).map((p) => {
                  const patch = byId.get(p.id);
                  return patch ? { ...p, ...patch } : p;
                }),
              };
            });
          }}
          disabled={generation.active}
        />
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 z-[80] flex h-[100svh] min-h-0 w-screen overflow-hidden flex-col bg-[#f5f8f1] text-slate-800">
      <header className="flex h-14 w-full shrink-0 items-center justify-start gap-4 overflow-hidden border-b border-[#d8e4d0]/80 bg-white/88 px-4 shadow-sm backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:bg-primary/10 hover:text-primary"
            onClick={() => router.push("/career/portfolios")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-9 w-72 border-[#d8e4d0] bg-white/72 font-semibold text-slate-900"
            aria-label="포트폴리오 이름"
          />
          <span className="rounded-full bg-[#eef6e8]/85 px-3 py-1 text-xs font-bold text-[#6f7d66]">
            {isPublic ? "공개 중" : "비공개"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {publicUrl ? (
            <Button
              variant="outline"
              className="h-9 gap-2 rounded-xl border-[#d8e4d0] bg-white/72 text-slate-700 hover:bg-white"
              onClick={() => window.open(publicUrl, "_blank")}
            >
              <Eye className="h-4 w-4" />
              공개 보기
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="h-9 gap-2 rounded-xl border-[#d8e4d0] bg-white/72 text-slate-700 hover:bg-white"
            onClick={handleSave}
            disabled={isSaving || isExporting || generation.active}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            저장
          </Button>
          <Button
            variant="outline"
            className="h-9 gap-2 rounded-xl border-[#d8e4d0] bg-white/72 text-slate-700 hover:bg-white"
            onClick={() => void handleExportPptx()}
            disabled={isSaving || isExporting || generation.active}
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PPTX
          </Button>
          <Button
            className="h-9 gap-2 rounded-xl"
            onClick={() => void handlePublish(!isPublic)}
            disabled={isPublishing || isExporting || generation.active}
          >
            {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isPublic ? "비공개 전환" : "공개"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <aside
          className="min-h-0 shrink-0 overflow-y-auto border-r border-[#d8e4d0]/80 bg-white/82 p-4 backdrop-blur-xl"
          style={{ width: 300 }}
        >
          {activeElement ? (
            <ElementInspector
              element={activeElement}
              onBack={() => setSelectedElement(null)}
              onPatch={(patch) => {
                if (!activeElement || !selectedElement) return;
                updateElementById(selectedElement.sectionId, activeElement.id, patch);
              }}
            />
          ) : (
            <SlideInspectorPanel
              document={document}
              selectedSection={selectedSection}
              onDeleteSection={deleteSection}
              onPatchSection={(patch) => {
                if (!selectedSection) return;
                updateSectionById(selectedSection.id, patch);
              }}
            />
          )}
        </aside>

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(135deg,#f8faf6_0%,#eef5e8_100%)]">
          <div className="min-h-0 flex-1 overflow-auto px-8 py-7 pb-8">
            <div className="flex min-h-full items-center justify-center">
              <PortfolioRenderer
                document={document}
                selectedSectionId={selectedSectionId}
                selectedElementId={activeElement?.id || null}
                onSelectSection={handleSelectSection}
                onSelectElement={(sectionId, element, seedElements = [element]) => {
                  if (generation.active) return;
                  setSelectedSectionId(sectionId);
                  setSelectedElement({ sectionId, element, seedElements });
                }}
                editable={!generation.active}
                onSectionPatch={updateSectionById}
                onElementPatch={updateElementById}
                onElementAction={handleElementAction}
              />
            </div>
          </div>

          <GenerationStatusOverlay generation={generation} document={document} />

          <SlideThumbnailStrip
            document={document}
            sections={document.sections}
            selectedSectionId={selectedSectionId}
            onSelectSection={handleSelectSection}
          />
        </main>

      </div>
    </div>
  );
}

function getGenerationProgress(generation: GenerationState) {
  if (generation.stage === "AI 생성 완료" && !generation.error) return 100;
  if (generation.error) return 100;
  if (generation.progress) return Math.round(clampNumber(generation.progress, 8, 96));
  const stageIndex = GENERATION_STAGE_LABELS.findIndex((stage) => generation.stage.includes(stage));
  const stageProgress = stageIndex >= 0 ? 10 + stageIndex * 9 : 8;
  const total = generation.total || 10;
  const sectionProgress = generation.sections.length > 0
    ? 28 + Math.min(54, (generation.sections.length / Math.max(total, 1)) * 54)
    : 0;
  return Math.min(96, Math.max(stageProgress, sectionProgress));
}

function GenerationStatusOverlay({
  generation,
  document,
}: {
  generation: GenerationState;
  document: PortfolioDocument;
}) {
  if (!generation.active && !generation.error && generation.stage !== "AI 생성 완료") return null;
  const completed = generation.stage === "AI 생성 완료" && !generation.error;
  const progress = getGenerationProgress(generation);
  const total = generation.total || document.sections.length || 10;
  const blocking = generation.active || completed;

  // 현재 스테이지 인덱스 (단계 칩 강조용)
  const stageIndex = generation.error
    ? -1
    : completed
      ? GENERATION_STAGE_LABELS.length
      : Math.max(
          0,
          GENERATION_STAGE_LABELS.findIndex((s) => generation.stage.includes(s)),
        );

  const latest = generation.sections[generation.sections.length - 1];
  const sectionCount = Math.min(generation.sections.length, total);

  return (
    <div
      className={`fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto px-6 py-10 backdrop-blur-2xl ${
        blocking ? "pointer-events-auto" : "pointer-events-none"
      }`}
      style={{
        background:
          "linear-gradient(135deg, rgba(248,250,246,0.97) 0%, rgba(234,243,223,0.97) 100%)",
      }}
    >
      <div className="relative w-full max-w-md">
        {/* 카드 */}
        <div className="relative overflow-hidden rounded-[28px] border border-[#d8e4d0] bg-white shadow-[0_30px_80px_rgba(15,42,28,0.25)]">
          {/* 상단 — 슬라이드 스택 일러스트 */}
          <div className="relative flex h-44 items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#f8faf6_0%,#eaf3df_100%)]">
            <SlideStackIllustration
              error={Boolean(generation.error)}
              completed={completed}
            />
            {/* eyebrow */}
            <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary shadow-sm backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                {!completed && !generation.error ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </>
                ) : (
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </span>
              AI Portfolio Builder
            </div>
            <div className="absolute right-5 top-5 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-black text-primary shadow-sm backdrop-blur">
              {progress}%
            </div>
          </div>

          {/* 본문 */}
          <div className="px-6 pb-6 pt-5">
            <h2 className="text-[19px] font-black tracking-tight text-slate-900">
              {generation.error
                ? "포트폴리오 생성에 실패했어요"
                : completed
                  ? "포트폴리오가 완성됐어요"
                  : generation.stage || "포트폴리오를 만들고 있어요"}
            </h2>
            <p className="mt-1.5 text-[13px] leading-6 text-slate-500">
              {generation.error
                ? generation.error
                : completed
                  ? "잠시 후 편집기로 이동합니다"
                  : "선택한 프로젝트를 분석해 슬라이드를 한 장씩 짜고 있어요 · 보통 30~60초 걸려요"}
            </p>

            {/* 진행 바 */}
            <div className="mt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#eef6e8]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    generation.error ? "bg-red-400" : "bg-primary"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>
                  슬라이드 {sectionCount} / {total}
                </span>
                <span>
                  {generation.error ? "중단됨" : completed ? "완료" : "진행 중"}
                </span>
              </div>
            </div>

            {/* 단계 칩 */}
            {!generation.error ? (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {GENERATION_STAGE_LABELS.map((label, i) => {
                  const done = i < stageIndex;
                  const active = i === stageIndex && !completed;
                  return (
                    <span
                      key={label}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold transition ${
                        done
                          ? "bg-primary/10 text-primary"
                          : active
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <span
                        className={`flex h-1.5 w-1.5 items-center justify-center rounded-full ${
                          done
                            ? "bg-primary"
                            : active
                              ? "animate-pulse bg-white"
                              : "bg-slate-300"
                        }`}
                      />
                      {label}
                    </span>
                  );
                })}
              </div>
            ) : null}

            {/* 최근 생성된 슬라이드 */}
            {latest && !generation.error ? (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#e1ead9] bg-[#f8faf5]/70 px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-xs font-black text-primary">
                  {latest.index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-black text-slate-800">
                    {latest.title || SECTION_LABEL[latest.type]}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400">
                    방금 추가 · {SECTION_LABEL[latest.type]}
                  </p>
                </div>
                {!completed ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* 외곽 글로우 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] bg-primary/30 blur-3xl"
        />
      </div>
    </div>
  );
}

/**
 * 로딩 일러스트 — 3 장의 슬라이드가 위로 떠오르며 셔머가 흐름.
 * completed/error 상태에서는 정지된 모양만 유지.
 */
function SlideStackIllustration({
  error,
  completed,
}: {
  error: boolean;
  completed: boolean;
}) {
  const stopped = error || completed;
  return (
    <div className="relative h-28 w-44">
      {[0, 1, 2].map((i) => {
        const tilt = (i - 1) * 4;
        return (
          <div
            key={i}
            className={`absolute left-1/2 top-1/2 h-20 w-32 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-[#d8e4d0] bg-white shadow-[0_10px_30px_rgba(42,72,42,0.18)] ${
              stopped ? "" : "animate-portfolio-slide-stack"
            }`}
            style={{
              transform: `translate(-50%, -50%) rotate(${tilt}deg) translateY(${i * -4}px)`,
              animationDelay: stopped ? undefined : `${i * 0.35}s`,
              opacity: stopped ? (i === 1 ? 1 : 0.55) : undefined,
              zIndex: 3 - i,
            }}
          >
            {/* 슬라이드 내부 미니어처 */}
            <div className="flex h-full flex-col gap-1.5 px-2.5 py-2.5">
              <div className="h-1.5 w-10 rounded-full bg-primary/60" />
              <div className="h-1 w-16 rounded-full bg-slate-200" />
              <div className="h-1 w-12 rounded-full bg-slate-200" />
              <div className="mt-auto flex gap-1">
                <div className="h-4 w-4 rounded bg-primary/25" />
                <div className="h-4 flex-1 rounded bg-slate-100" />
              </div>
            </div>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes portfolio-slide-stack {
          0%,
          100% {
            transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) translateY(0px);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) rotate(var(--rot, 0deg)) translateY(-6px);
            opacity: 1;
          }
        }
        .animate-portfolio-slide-stack {
          animation: portfolio-slide-stack 2.4s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
        }
      `}</style>
    </div>
  );
}

function SlideInspectorPanel({
  document,
  selectedSection,
  onDeleteSection,
  onPatchSection,
}: {
  document: PortfolioDocument;
  selectedSection: PortfolioSection | null;
  onDeleteSection: (sectionId: string) => void;
  onPatchSection: (patch: Partial<PortfolioSection>) => void;
}) {
  return (
    <div className="space-y-4">
      <PanelBlock icon={<FileText className="h-4 w-4" />} title="슬라이스 제목">
        <div className="mb-3 flex items-center justify-between rounded-xl border border-[#d8e4d0] bg-white/78 px-3 py-2 text-xs font-bold text-[#6f7d66]">
          <span className="inline-flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            {selectedSection ? SECTION_LABEL[selectedSection.type] : "슬라이스"}
          </span>
          <span>{document.sections.length}장</span>
        </div>
        <Input
          value={selectedSection?.title || ""}
          onChange={(event) => onPatchSection({ title: event.target.value })}
          className="h-10 rounded-xl border-[#d8e4d0] bg-white/82 font-bold text-slate-900"
          placeholder="슬라이스 제목"
        />
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-9 w-full rounded-xl border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600"
          disabled={!selectedSection || document.sections.length <= 1}
          onClick={() => selectedSection && onDeleteSection(selectedSection.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          현재 슬라이스 삭제
        </Button>
      </PanelBlock>
    </div>
  );
}

function SlideThumbnailStrip({
  document,
  sections,
  selectedSectionId,
  onSelectSection,
}: {
  document: PortfolioDocument;
  sections: PortfolioSection[];
  selectedSectionId: string;
  onSelectSection: (sectionId: string) => void;
}) {
  return (
    <div className="shrink-0 border-t border-[#b8cba9]/45 bg-[#eef6e8]/70 px-5 py-2.5 shadow-[0_-18px_42px_rgba(42,72,42,0.08)] backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-6xl min-w-0 items-end gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-color:#9bb97c_transparent] [scrollbar-width:thin]">
        {sections.map((section, index) => {
          const selected = section.id === selectedSectionId;

          return (
            <button
              key={section.id}
              type="button"
              className={`group flex w-[126px] shrink-0 flex-col items-center gap-1.5 text-center transition ${
                selected ? "text-primary" : "text-[#6f7d66] hover:text-slate-800"
              }`}
              onClick={() => onSelectSection(section.id)}
            >
              <span
                className={`relative block overflow-hidden rounded-lg border bg-white/80 shadow-sm transition ${
                  selected
                    ? "border-primary ring-2 ring-primary/25"
                    : "border-[#cbd9c0]/80 group-hover:border-[#9fb58f]"
                }`}
              >
                <PortfolioSlideThumbnail
                  document={document}
                  section={section}
                  index={index}
                  total={sections.length}
                  width={126}
                />
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${selected ? "bg-primary/12 text-primary" : "bg-white/55 text-[#708060]"}`}>
                {index + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ElementInspector({
  element,
  onBack,
  onPatch,
}: {
  element: PortfolioCanvasElement;
  onBack: () => void;
  onPatch: (patch: Partial<PortfolioCanvasElement>) => void;
}) {
  const isImage = element.kind === "image" || element.kind === "techLogo";
  const isVisual = !isImage && element.kind !== "text" && element.kind !== "tags";
  const isComponent = element.kind === "shadcnBlock";
  const image: PortfolioImageSlot = element.image || {
    aspectRatio: "16:9",
    objectFit: "cover",
    focalPoint: { x: 50, y: 50 },
  };

  const patchImage = (patch: Partial<typeof image>) => {
    onPatch({
      image: {
        ...image,
        ...patch,
      },
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {isImage ? (
              <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <Type className="h-4 w-4 shrink-0 text-primary" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-400">선택 개체</p>
              <h2 className="truncate text-sm font-bold text-slate-900">
                {isImage ? "이미지" : isComponent ? "인포그래픽" : isVisual ? "요소" : "텍스트"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700"
            onClick={onBack}
            aria-label="슬라이스 패널로 돌아가기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </section>

      {isImage ? (
        <PanelBlock icon={<ImageIcon className="h-4 w-4" />} title="이미지 설정">
          <ImageCropPanel image={image} onPatch={patchImage} />
        </PanelBlock>
      ) : isVisual ? (
        <PanelBlock icon={<SlidersHorizontal className="h-4 w-4" />} title="요소 스타일">
          <ColorPalette
            value={element.fill || element.stroke || "#9bb97c"}
            onChange={(color) => onPatch({ fill: color, stroke: color })}
          />
          <NumberField
            label="투명도"
            value={Math.round((element.opacity ?? 1) * 100)}
            onChange={(value) => onPatch({ opacity: clampNumber(value, 0, 100) / 100 })}
          />
        </PanelBlock>
      ) : (
        <PanelBlock icon={<SlidersHorizontal className="h-4 w-4" />} title="텍스트">
          <SelectField
            label="글꼴"
            value={element.fontFamily || "pretendard"}
            onChange={(fontFamily) => onPatch({ fontFamily: fontFamily as PortfolioCanvasFontFamily })}
            options={[
              ["pretendard", "Pretendard"],
              ["system", "System"],
              ["serif", "Serif"],
              ["mono", "Mono"],
            ]}
          />
          <TextFormatControls element={element} onPatch={onPatch} />
          <ColorPalette value={element.color || "#334155"} onChange={(color) => onPatch({ color })} />
        </PanelBlock>
      )}
    </div>
  );
}

function TextFormatControls({
  element,
  onPatch,
}: {
  element: PortfolioCanvasElement;
  onPatch: (patch: Partial<PortfolioCanvasElement>) => void;
}) {
  const fontSize = element.fontSize || 16;
  const fontWeight = element.fontWeight || 500;
  const textAlign = element.textAlign || "left";

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <p className="mb-1 text-xs font-semibold text-slate-500">크기</p>
          <div className="grid h-10 grid-cols-[40px_1fr_40px] overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              className="flex items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-primary"
              onClick={() => onPatch({ fontSize: Math.max(8, fontSize - 2) })}
              aria-label="글자 크기 줄이기"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={Math.round(fontSize)}
              min={8}
              max={140}
              onChange={(event) => onPatch({ fontSize: clampNumber(Number(event.target.value), 8, 140) })}
              className="border-x border-slate-200 bg-white text-center text-sm font-bold text-slate-900 outline-none"
              aria-label="글자 크기"
            />
            <button
              type="button"
              className="flex items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-primary"
              onClick={() => onPatch({ fontSize: Math.min(140, fontSize + 2) })}
              aria-label="글자 크기 키우기"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <button
          type="button"
          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black transition ${
            fontWeight >= 700
              ? "border-primary bg-primary/10 text-primary"
              : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
          }`}
          onClick={() => onPatch({ fontWeight: fontWeight >= 700 ? 500 : 800 })}
          aria-label="굵게"
        >
          <Bold className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="굵기"
          value={fontWeight}
          step={100}
          onChange={(nextWeight) => onPatch({ fontWeight: clampNumber(nextWeight, 100, 900) })}
        />
        <NumberField
          label="행간"
          value={element.lineHeight || Math.round(fontSize * 1.35)}
          onChange={(lineHeight) => onPatch({ lineHeight: Math.max(10, lineHeight) })}
        />
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-slate-500">정렬</p>
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {[
            ["left", AlignLeft, "왼쪽"],
            ["center", AlignCenter, "가운데"],
            ["right", AlignRight, "오른쪽"],
          ].map(([value, Icon, label]) => {
            const selected = textAlign === value;
            const AlignIcon = Icon as typeof AlignLeft;
            return (
              <button
                key={value as string}
                type="button"
                className={`flex h-10 items-center justify-center border-r border-slate-200 last:border-r-0 transition ${
                  selected ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
                onClick={() => onPatch({ textAlign: value as PortfolioCanvasElement["textAlign"] })}
                aria-label={label as string}
              >
                <AlignIcon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ColorPalette({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-600">
        <Palette className="h-4 w-4 text-primary" />
        색상
      </div>
      <div className="grid grid-cols-6 gap-2">
        {TEXT_COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            className={`h-8 rounded-lg border transition ${
              value.toLowerCase() === color.toLowerCase()
                ? "border-primary ring-2 ring-primary/25"
                : "border-slate-200 hover:border-slate-400"
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            aria-label={`색상 ${color}`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          className="h-9 w-9 shrink-0 rounded-xl border border-slate-200"
          style={{ backgroundColor: value }}
          aria-hidden
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 border-slate-200 bg-white font-semibold text-slate-800"
          aria-label="색상 코드"
        />
      </div>
    </div>
  );
}

function ImageCropPanel({
  image,
  onPatch,
}: {
  image: PortfolioImageSlot;
  onPatch: (patch: Partial<PortfolioImageSlot>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative aspect-[16/9] bg-slate-100">
          {image.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={image.alt || "이미지 미리보기"}
              className="h-full w-full"
              style={{
                objectFit: image.objectFit || "cover",
                objectPosition: `${image.focalPoint?.x ?? 50}% ${image.focalPoint?.y ?? 50}%`,
              }}
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
              Image
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="맞춤"
          value={image.objectFit || "cover"}
          onChange={(objectFit) => onPatch({ objectFit: objectFit as PortfolioImageFit })}
          options={[
            ["cover", "채우기"],
            ["contain", "맞춤"],
          ]}
        />
        <SelectField
          label="비율"
          value={image.aspectRatio || "16:9"}
          onChange={(aspectRatio) => onPatch({ aspectRatio: aspectRatio as typeof image.aspectRatio })}
          options={[
            ["original", "원본"],
            ["1:1", "1:1"],
            ["4:3", "4:3"],
            ["16:9", "16:9"],
            ["3:4", "3:4"],
          ]}
        />
      </div>
    </div>
  );
}

function PanelBlock({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#d8e4d0] bg-[#f8faf5]/82 p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-xs font-semibold text-slate-500">
      {label}
      <Input
        type="number"
        value={Number.isFinite(value) ? Math.round(value) : 0}
        step={step}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="mt-1 h-9 border-slate-200 bg-white text-slate-800"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
