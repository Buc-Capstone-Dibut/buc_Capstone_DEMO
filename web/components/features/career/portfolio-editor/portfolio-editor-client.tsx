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
  Crop,
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
  PORTFOLIO_SAMPLE_IMAGES,
  createSampleImageSlot,
  getPortfolioPagePreset,
  normalizePortfolioDocument,
  withPortfolioSampleImages,
  type PortfolioAsset,
  type PortfolioCanvasElement,
  type PortfolioCanvasFontFamily,
  type PortfolioDocument,
  type PortfolioImageFit,
  type PortfolioImageSlot,
  type PortfolioListItem,
  type PortfolioSection,
  type PortfolioSectionType,
  type PortfolioSourceData,
  type PortfolioTemplateId,
} from "@/lib/career-portfolios";
import {
  PortfolioRenderer,
  PortfolioSlideThumbnail,
  type PortfolioElementAction,
} from "./portfolio-renderer";

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
  sections: GenerationSectionStatus[];
  error?: string;
};

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

const SAMPLE_IMAGE_OPTIONS = [
  ["프로필", PORTFOLIO_SAMPLE_IMAGES.profilePortrait, "프로필 이미지"],
  ["대시보드", PORTFOLIO_SAMPLE_IMAGES.projectDashboard, "분석 대시보드 이미지"],
  ["코드 작업", PORTFOLIO_SAMPLE_IMAGES.workspaceApp, "개발자 코드 작업 이미지"],
  ["협업", PORTFOLIO_SAMPLE_IMAGES.productGallery, "팀 협업 이미지"],
  ["오피스", PORTFOLIO_SAMPLE_IMAGES.studioOffice, "모던 오피스 이미지"],
] as const;

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
  const [isPublic, setIsPublic] = useState(portfolio.isPublic);
  const [publicUrl, setPublicUrl] = useState(initialPublicUrl);
  const [generation, setGeneration] = useState<GenerationState>({
    active: shouldAutoGenerate,
    stage: shouldAutoGenerate ? "워크스페이스 준비 중" : "",
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

    const eventSource = new EventSource(`/api/career/portfolios/${portfolio.id}/generate`);
    setGeneration({
      active: true,
      stage: "프로젝트 정보 가져오는 중",
      sections: [],
    });

    eventSource.addEventListener("stage", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { label?: string };
      setGeneration((current) => ({
        ...current,
        active: true,
        stage: payload.label || current.stage,
      }));
    });

    eventSource.addEventListener("document", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { document?: PortfolioDocument };
      if (!payload.document) return;
      const nextDocument = prepareDocument(payload.document, portfolio.templateId);
      setDocument(nextDocument);
      setSelectedSectionId(nextDocument.sections[0]?.id || "");
      setSelectedElement(null);
    });

    eventSource.addEventListener("section", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as {
        index: number;
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
      if (payload.item?.title) setTitle(payload.item.title);
      if (payload.document) {
        const nextDocument = prepareDocument(payload.document, payload.item?.templateId || portfolio.templateId);
        setDocument(nextDocument);
        setSelectedSectionId(nextDocument.sections[0]?.id || "");
        setSelectedElement(null);
      }
      setGeneration((current) => ({
        ...current,
        active: false,
        stage: "AI 생성 완료",
        sections: [],
      }));
      window.setTimeout(() => {
        setGeneration({ active: false, stage: "", sections: [] });
      }, 2000);
      eventSource.close();
      window.history.replaceState(null, "", window.location.pathname);
    });

    eventSource.addEventListener("portfolio-error", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { error?: string };
      setGeneration((current) => ({
        ...current,
        active: false,
        stage: "기본 템플릿으로 열기",
        error: payload.error || "포트폴리오 생성에 실패했습니다.",
      }));
      eventSource.close();
    });

    eventSource.onerror = () => {
      setGeneration((current) =>
        current.stage === "완료"
          ? current
          : {
              ...current,
              active: false,
              error: current.error || "실시간 생성 연결이 끊어졌습니다.",
            },
      );
      eventSource.close();
    };

    return () => eventSource.close();
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
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            저장
          </Button>
          <Button
            className="h-9 gap-2 rounded-xl"
            onClick={() => void handlePublish(!isPublic)}
            disabled={isPublishing}
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
          <div className="min-h-0 flex-1 overflow-auto px-8 py-7 pb-44">
            <div className="flex min-h-full items-center justify-center">
              <PortfolioRenderer
                document={document}
                selectedSectionId={selectedSectionId}
                selectedElementId={activeElement?.id || null}
                onSelectSection={handleSelectSection}
                onSelectElement={(sectionId, element, seedElements = [element]) => {
                  setSelectedSectionId(sectionId);
                  setSelectedElement({ sectionId, element, seedElements });
                }}
                editable
                onSectionPatch={updateSectionById}
                onElementPatch={updateElementById}
                onElementAction={handleElementAction}
              />
            </div>
          </div>

          <GenerationStatusOverlay generation={generation} />

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

function GenerationStatusOverlay({ generation }: { generation: GenerationState }) {
  if (!generation.active && !generation.error && generation.stage !== "AI 생성 완료") return null;
  const completed = generation.stage === "AI 생성 완료" && !generation.error;

  return (
    <div className="pointer-events-none absolute right-6 top-5 z-40 w-[320px] rounded-3xl border border-[#d8e4d0] bg-white/92 p-4 shadow-[0_22px_60px_rgba(42,72,42,0.16)] ring-1 ring-white/70 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            generation.error
              ? "bg-red-50 text-red-500"
              : "bg-primary/12 text-primary"
          }`}
        >
          {generation.error ? (
            <X className="h-5 w-5" />
          ) : completed ? (
            <Check className="h-5 w-5" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8ca67a]">
            AI Portfolio Builder
          </p>
          <h2 className="mt-1 text-sm font-black text-slate-900">
            {generation.error || generation.stage || "포트폴리오 생성 중"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            프로젝트 대표 이미지와 입력 데이터를 바탕으로 PPT 초안을 워크스페이스에 바로 반영합니다.
          </p>
        </div>
      </div>

      {generation.sections.length ? (
        <div className="mt-4 space-y-2">
          {generation.sections.slice(-4).map((section) => (
            <div
              key={`${section.index}-${section.title}`}
              className="flex items-center gap-2 rounded-2xl border border-[#e1ead9] bg-[#f8faf5]/88 px-3 py-2"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-black text-primary">
                {section.index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-800">
                  {section.title || SECTION_LABEL[section.type]}
                </p>
                <p className="text-[11px] font-semibold text-slate-400">
                  {SECTION_LABEL[section.type]} 슬라이스 반영
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
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
    <div
      className="border-t border-[#b8cba9]/45 bg-[#eef6e8]/70 px-5 py-2.5 shadow-[0_-18px_42px_rgba(42,72,42,0.08)] backdrop-blur-2xl"
      style={{ position: "absolute", bottom: "6.25rem", left: 0, right: 0, zIndex: 20 }}
    >
      <div className="mx-auto flex max-w-6xl items-end gap-3 overflow-x-auto pb-1">
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
  const image = element.image || createSampleImageSlot(
    PORTFOLIO_SAMPLE_IMAGES.projectDashboard,
    "포트폴리오 이미지",
  );

  const patchImage = (patch: Partial<typeof image>) => {
    onPatch({
      image: {
        ...image,
        ...patch,
        focalPoint: {
          ...image.focalPoint,
          ...(patch.focalPoint || {}),
        },
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
                {isImage ? "이미지" : isVisual ? "요소" : "텍스트"}
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
        <>
          <PanelBlock icon={<Crop className="h-4 w-4" />} title="사진 자르기">
            <ImageCropPanel image={image} onPatch={patchImage} />
            <label className="mt-3 block text-xs font-semibold text-slate-500">
              캡션
              <Input
                value={image.caption || ""}
                onChange={(event) => patchImage({ caption: event.target.value })}
                className="mt-1 h-9 border-slate-200 bg-white text-slate-800"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-500">
              대체 텍스트
              <Input
                value={image.alt || ""}
                onChange={(event) => patchImage({ alt: event.target.value })}
                className="mt-1 h-9 border-slate-200 bg-white text-slate-800"
              />
            </label>
          </PanelBlock>

          <PanelBlock icon={<ImageIcon className="h-4 w-4" />} title="예시 이미지">
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_IMAGE_OPTIONS.map(([label, url, alt]) => (
                <button
                  key={url}
                  type="button"
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left text-[11px] font-bold text-slate-600 transition hover:border-primary hover:text-primary"
                  onClick={() => {
                    const nextImage = createSampleImageSlot(
                      url,
                      alt,
                      image.aspectRatio || "16:9",
                      image.caption || "",
                    );
                    onPatch({
                      image: {
                        ...nextImage,
                        objectFit: image.objectFit || "cover",
                        focalPoint: image.focalPoint || { x: 50, y: 50 },
                      },
                    });
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={alt} className="aspect-[16/9] w-full object-cover" draggable={false} />
                  <span className="block px-2 py-1.5">{label}</span>
                </button>
              ))}
            </div>
          </PanelBlock>
        </>
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
  const focalX = image.focalPoint?.x ?? 50;
  const focalY = image.focalPoint?.y ?? 50;

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
                objectPosition: `${focalX}% ${focalY}%`,
              }}
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
              Image
            </div>
          )}
          <div
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow"
            style={{ left: `${focalX}%`, top: `${focalY}%` }}
            aria-hidden
          />
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

      <RangeField
        label="가로 초점"
        value={focalX}
        onChange={(x) => onPatch({ focalPoint: { ...image.focalPoint, x: clampNumber(x, 0, 100) } })}
      />
      <RangeField
        label="세로 초점"
        value={focalY}
        onChange={(y) => onPatch({ focalPoint: { ...image.focalPoint, y: clampNumber(y, 0, 100) } })}
      />
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

function RangeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs font-semibold text-slate-500">
      <span className="mb-1 flex items-center justify-between">
        <span>{label}</span>
        <span className="font-bold text-slate-700">{Math.round(value)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-primary"
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
