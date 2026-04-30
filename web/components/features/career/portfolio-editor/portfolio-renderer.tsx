"use client";

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { CopyPlus, MoreHorizontal, Move, Trash2, WandSparkles } from "lucide-react";
import {
  PORTFOLIO_BACKGROUND_IMAGES,
  PORTFOLIO_CANVAS_STYLE_VERSION,
  getPortfolioPagePreset,
  createTechLogoImageSlot,
  isLegacyPortfolioSampleImageUrl,
  type PortfolioCanvasElement,
  type PortfolioDocument,
  type PortfolioImageSlot,
  type PortfolioSection,
} from "@/lib/career-portfolios";

const FALLBACK_CANVAS_WIDTH = 960;
const FALLBACK_CANVAS_HEIGHT = 540;

type ElementPatchHandler = (
  sectionId: string,
  elementId: string,
  patch: Partial<PortfolioCanvasElement>,
  seedElements?: PortfolioCanvasElement[],
) => void;

export type PortfolioElementAction =
  | "duplicate"
  | "delete"
  | "bring-forward"
  | "send-backward";

type ElementActionHandler = (
  sectionId: string,
  elementId: string,
  action: PortfolioElementAction,
  seedElements?: PortfolioCanvasElement[],
) => void;

type PortfolioRendererProps = {
  document: PortfolioDocument;
  selectedSectionId?: string | null;
  selectedElementId?: string | null;
  onSelectSection?: (sectionId: string) => void;
  onSelectElement?: (
    sectionId: string,
    element: PortfolioCanvasElement,
    seedElements?: PortfolioCanvasElement[],
  ) => void;
  onElementPatch?: ElementPatchHandler;
  onElementAction?: ElementActionHandler;
  onSectionPatch?: (sectionId: string, patch: Partial<PortfolioSection>) => void;
  readonly?: boolean;
  editable?: boolean;
};

type DragState = {
  mode: "move" | ResizeMode;
  sectionId: string;
  elementId: string;
  startX: number;
  startY: number;
  startElement: PortfolioCanvasElement;
  seedElements: PortfolioCanvasElement[];
};

type ResizeMode =
  | "resize-n"
  | "resize-s"
  | "resize-e"
  | "resize-w"
  | "resize-ne"
  | "resize-nw"
  | "resize-se"
  | "resize-sw";

type DragMode = "move" | ResizeMode;

function bodyLines(body?: string, max = 8) {
  return (body || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function safeText(value: string | undefined, fallback: string) {
  return value?.trim() ? value : fallback;
}

function textElement(
  id: string,
  role: PortfolioCanvasElement["role"],
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  fontWeight: number,
  color: string,
): PortfolioCanvasElement {
  return {
    id,
    kind: role === "tags" ? "tags" : "text",
    role,
    content,
    x,
    y,
    width,
    height,
    fontSize,
    fontWeight,
    fontFamily: "pretendard",
    color,
    lineHeight: Math.round(fontSize * 1.38),
  };
}

function fontFamilyValue(fontFamily: PortfolioCanvasElement["fontFamily"]) {
  if (fontFamily === "serif") return "Georgia, 'Times New Roman', serif";
  if (fontFamily === "mono") return "'SFMono-Regular', Consolas, monospace";
  if (fontFamily === "system") return "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  return "Pretendard, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
}

function imageElement(
  id: string,
  image: PortfolioImageSlot | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): PortfolioCanvasElement {
  return {
    id,
    kind: "image",
    role: "image",
    image,
    x,
    y,
    width,
    height,
  };
}

function skillLogoElements(section: PortfolioSection, theme: PortfolioDocument["theme"]) {
  const skillNames =
    section.tags?.length
      ? section.tags
      : (section.body || "")
          .split(/[,/\n]/)
          .map((name) => name.trim())
          .filter(Boolean);
  const skillImages =
    section.images?.length
      ? section.images
      : skillNames
          .map((tag) => createTechLogoImageSlot(tag))
          .filter((image): image is PortfolioImageSlot => Boolean(image));

  return skillImages.slice(0, 10).flatMap((image, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    const x = 526 + col * 76;
    const y = 144 + row * 112;
    const label = image.caption || image.alt?.replace(/\s*로고$/, "") || "Skill";

    return [
      imageElement(`skill-logo-${index}`, image, x, y, 56, 56),
      textElement(`skill-logo-label-${index}`, "label", label, x - 8, y + 64, 72, 22, 11, 800, theme.muted),
    ];
  });
}

function defaultCanvasElements(
  section: PortfolioSection,
  document: PortfolioDocument,
): PortfolioCanvasElement[] {
  const theme = document.theme;
  const label = section.type === "project" ? "PROJECT" : section.type.toUpperCase();

  if (section.type === "hero") {
    return [
      textElement("label", "label", "Portfolio", 74, 60, 180, 28, 16, 700, theme.muted),
      textElement("title", "title", safeText(section.title, "포트폴리오 제목"), 74, 166, 570, 160, 62, 900, theme.text),
      textElement("subtitle", "subtitle", safeText(section.subtitle, "나를 설명하는 한 문장"), 78, 344, 520, 72, 23, 700, theme.muted),
      imageElement("image", section.image, 672, 126, 184, 184),
    ];
  }

  if (section.type === "about") {
    return [
      textElement("label", "label", "PROFILE", 76, 58, 160, 26, 14, 900, theme.primary),
      textElement("title", "title", safeText(section.title, "소개"), 382, 88, 430, 56, 34, 900, theme.primary),
      textElement("body", "body", safeText(section.body, "문제를 정의하고 구현하며 결과를 검증하는 과정을 정리합니다."), 382, 168, 486, 128, 18, 500, theme.text),
      imageElement("image", section.image, 76, 134, 190, 190),
      textElement("subtitle", "subtitle", safeText(section.subtitle, "프로필"), 78, 352, 190, 64, 16, 800, theme.muted),
    ];
  }

  if (section.type === "project") {
    return [
      textElement("label", "label", "PROJECT CASE", 58, 58, 170, 26, 14, 900, "#f8fafc"),
      textElement("title", "title", safeText(section.title, "프로젝트명"), 58, 128, 324, 134, 35, 900, "#ffffff"),
      textElement("subtitle", "subtitle", safeText(section.subtitle, "역할, 기간, 핵심 키워드"), 60, 330, 300, 34, 16, 800, "#f8fafc"),
      textElement("tags", "tags", (section.tags || []).slice(0, 5).join("  ·  "), 60, 380, 304, 56, 14, 800, "#f8fafc"),
      imageElement("image", section.image, 432, 82, 398, 176),
      textElement("body", "body", bodyLines(section.body, 6).join("\n"), 438, 302, 408, 140, 15, 500, theme.text),
    ];
  }

  if (section.type === "gallery") {
    return [
      textElement("label", "label", "VISUAL PROOF", 72, 74, 170, 26, 14, 900, theme.primary),
      textElement("title", "title", safeText(section.title, "작업물 갤러리"), 72, 118, 360, 58, 38, 900, theme.text),
      textElement("subtitle", "subtitle", safeText(section.subtitle, "프로젝트 대표 사진과 스크린샷을 모아 보여줍니다."), 468, 122, 350, 54, 16, 700, theme.muted),
      imageElement("image-1", section.images?.[0], 72, 220, 248, 184),
      imageElement("image-2", section.images?.[1], 356, 220, 248, 184),
      imageElement("image-3", section.images?.[2], 640, 220, 248, 184),
    ];
  }

  if (section.type === "skills") {
    const logos = skillLogoElements(section, theme);
    return [
      textElement("label", "label", "STACK", 72, 88, 160, 26, 15, 900, theme.primary),
      textElement("title", "title", safeText(section.title, "기술 스택"), 72, 144, 330, 58, 40, 900, theme.text),
      textElement("body", "body", safeText(section.body, "프로젝트에 실제 사용한 기술 스택입니다."), 74, 230, 310, 116, 16, 600, theme.muted),
      ...(logos.length
        ? logos
        : [
            textElement(
              "tags",
              "tags",
              (section.tags?.length ? section.tags : bodyLines(section.body, 7)).join("\n"),
              510,
              132,
              260,
              286,
              18,
              800,
              theme.text,
            ),
          ]),
    ];
  }

  if (section.type === "index") {
    const items = section.tags?.length ? section.tags.slice(0, 6) : ["대표 프로젝트", "핵심 역량", "기술 스택"];
    return [
      textElement("label", "label", "INDEX", 72, 70, 140, 26, 15, 900, theme.primary),
      textElement("title", "title", safeText(section.title, "프로젝트 인덱스"), 72, 126, 386, 58, 40, 900, theme.text),
      {
        id: "timeline",
        kind: "timeline",
        role: "timeline",
        x: 118,
        y: 220,
        width: 724,
        height: 210,
        items,
        stroke: theme.primary,
        fill: "#ffffff",
      },
    ];
  }

  if (section.type === "experience") {
    return [
      textElement("label", "label", "CAREER", 72, 90, 160, 26, 15, 900, theme.primary),
      textElement("title", "title", safeText(section.title, "경력"), 72, 148, 330, 64, 40, 900, theme.text),
      textElement("subtitle", "subtitle", safeText(section.subtitle, "직무와 기간"), 74, 232, 330, 44, 17, 800, theme.muted),
      textElement("body", "body", bodyLines(section.body, 7).join("\n"), 460, 132, 376, 270, 17, 500, theme.text),
    ];
  }

  if (section.type === "quote") {
    return [
      textElement("label", "label", "RESULT", 72, 66, 160, 26, 15, 900, theme.primary),
      textElement("title", "title", safeText(section.title, "핵심 문장"), 172, 96, 650, 72, 42, 900, theme.text),
      textElement("subtitle", "subtitle", safeText(section.subtitle, "자기소개서 문장"), 638, 202, 250, 38, 17, 800, theme.primary),
      textElement("body", "body", bodyLines(section.body, 6).join("\n"), 638, 254, 250, 178, 15, 500, theme.text),
    ];
  }

  if (section.type === "contact") {
    return [
      textElement("label", "label", "CONTACT", 390, 132, 180, 28, 16, 900, theme.primary),
      textElement("title", "title", safeText(section.title, "연락처"), 282, 196, 396, 70, 46, 900, theme.text),
      textElement("body", "body", safeText(section.body, "email@example.com"), 292, 304, 376, 90, 18, 700, theme.muted),
    ];
  }

  if (section.type === "retrospective") {
    return [
      textElement("label", "label", "GROWTH", 72, 70, 160, 26, 14, 900, theme.primary),
      textElement("title", "title", safeText(section.title, "성장 포인트"), 72, 126, 440, 58, 40, 900, theme.text),
      textElement("body", "body", safeText(section.body, "경험을 통해 확장한 역량을 정리합니다."), 74, 214, 370, 128, 17, 600, theme.muted),
      {
        id: "timeline",
        kind: "timeline",
        role: "timeline",
        x: 512,
        y: 120,
        width: 330,
        height: 280,
        items: section.tags?.length ? section.tags.slice(0, 4) : ["문제 정의", "실행", "검증", "개선"],
        stroke: theme.primary,
        fill: "#ffffff",
      },
    ];
  }

  return [
    textElement("label", "label", label, 72, 92, 160, 26, 16, 800, theme.primary),
    textElement("title", "title", safeText(section.title, "섹션 제목"), 72, 150, 320, 68, 40, 900, theme.text),
    textElement("subtitle", "subtitle", safeText(section.subtitle, "보조 설명"), 74, 236, 320, 44, 17, 700, theme.muted),
    textElement("body", "body", safeText(section.body, "본문을 입력하세요."), 462, 132, 360, 260, 17, 500, theme.text),
  ];
}

function materializeCanvasElements(section: PortfolioSection, document: PortfolioDocument) {
  const defaults = defaultCanvasElements(section, document);
  if (!section.canvas?.elements?.length) return defaults;

  if (section.canvas.styleVersion !== PORTFOLIO_CANVAS_STYLE_VERSION) {
    const savedById = new Map(section.canvas.elements.map((element) => [element.id, element]));
    return defaults.map((element) => {
      const saved = savedById.get(element.id);
      if (!saved) return element;
      return {
        ...element,
        content: element.role === "label" ? element.content : saved.content ?? element.content,
        image:
          saved.image && !isLegacyPortfolioSampleImageUrl(saved.image.url)
            ? saved.image
            : element.image,
      };
    });
  }

  const defaultById = new Map(defaults.map((element) => [element.id, element]));
  const materialized = section.canvas.elements.map((element) => ({
    ...defaultById.get(element.id),
    ...element,
  }));
  const materializedIds = new Set(materialized.map((element) => element.id));
  return [
    ...materialized,
    ...defaults.filter((element) => !materializedIds.has(element.id)),
  ];
}

function getCanvasSize(section: PortfolioSection | undefined, document: PortfolioDocument) {
  const preset = getPortfolioPagePreset(document.pageSize || "16:9");
  return {
    width: section?.canvas?.width || preset.width || FALLBACK_CANVAS_WIDTH,
    height: section?.canvas?.height || preset.height || FALLBACK_CANVAS_HEIGHT,
  };
}

function SlideBackdrop({
  type,
}: {
  type: PortfolioSection["type"];
}) {
  const backgroundUrl =
    type === "hero" || type === "contact"
      ? PORTFOLIO_BACKGROUND_IMAGES.calmGreenCover
      : type === "project" || type === "gallery" || type === "quote"
        ? PORTFOLIO_BACKGROUND_IMAGES.calmGreenCase
        : PORTFOLIO_BACKGROUND_IMAGES.calmGreenProfile;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={backgroundUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
}

function elementToCss(
  element: PortfolioCanvasElement,
  canvasWidth: number,
  canvasHeight: number,
): CSSProperties {
  return {
    left: `${(element.x / canvasWidth) * 100}%`,
    top: `${(element.y / canvasHeight) * 100}%`,
    width: `${(element.width / canvasWidth) * 100}%`,
    height: `${(element.height / canvasHeight) * 100}%`,
  };
}

function normalizeEditableText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\n{4,}/g, "\n\n").trim();
}

function sectionPatchFromElement(
  element: PortfolioCanvasElement,
  content: string,
): Partial<PortfolioSection> {
  if (element.role === "title") return { title: content };
  if (element.role === "subtitle") return { subtitle: content };
  if (element.role === "body") return { body: content };
  if (element.role === "tags") {
    return {
      tags: content
        .split(/\n|,/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
  }
  return {};
}

function PortfolioCanvasImage({ element }: { element: PortfolioCanvasElement }) {
  const image = element.image;
  const src = image?.url;

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-400">
        Image
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={image?.alt || "포트폴리오 이미지"}
      className="h-full w-full"
      style={{
        objectFit: image.objectFit || "cover",
        objectPosition: `${image.focalPoint?.x ?? 50}% ${image.focalPoint?.y ?? 50}%`,
      }}
      draggable={false}
    />
  );
}

function PortfolioCanvasVisual({
  element,
  theme,
}: {
  element: PortfolioCanvasElement;
  theme: PortfolioDocument["theme"];
}) {
  const fill = element.fill || theme.primary;
  const stroke = element.stroke || theme.primary;
  const opacity = element.opacity ?? 1;

  if (element.kind === "shape") {
    return (
      <div
        className="h-full w-full"
        style={{
          backgroundColor: fill,
          border: element.stroke ? `1px solid ${stroke}` : undefined,
          borderRadius: theme.radius * 2,
          opacity,
        }}
      />
    );
  }

  if (element.kind === "line") {
    return (
      <div
        className="h-full w-full"
        style={{
          borderTop: `${Math.max(1, Math.round(element.height || 2))}px solid ${stroke}`,
          opacity,
        }}
      />
    );
  }

  if (element.kind === "metric") {
    return (
      <div
        className="flex h-full w-full flex-col justify-center rounded-2xl border bg-white/86 px-4"
        style={{ borderColor: stroke, color: theme.text }}
      >
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          {element.label || "Metric"}
        </span>
        <strong className="mt-1 text-2xl font-black" style={{ color: stroke }}>
          {element.value || "0"}
        </strong>
      </div>
    );
  }

  if (element.kind === "flow") {
    const items = element.items?.length ? element.items.slice(0, 4) : ["문제", "해결", "결과"];
    return (
      <div className="flex h-full w-full items-center gap-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex min-w-0 flex-1 items-center">
            <div
              className="flex h-full min-h-12 flex-1 items-center justify-center rounded-2xl border px-2 text-center text-xs font-black leading-4"
              style={{
                borderColor: stroke,
                backgroundColor: index === 1 ? fill : "#ffffff",
                color: index === 1 ? "#ffffff" : theme.text,
                opacity,
              }}
            >
              {item}
            </div>
            {index < items.length - 1 ? (
              <div className="mx-1 h-px w-5 shrink-0" style={{ backgroundColor: stroke }} />
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (element.kind === "timeline") {
    const items = element.items?.length ? element.items.slice(0, 6) : ["표지", "소개", "프로젝트"];
    return (
      <div className="grid h-full w-full grid-cols-2 gap-3">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="flex min-w-0 items-center gap-3 rounded-2xl border bg-white/88 px-4"
            style={{ borderColor: index === 0 ? stroke : "#dbe6d4" }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
              style={{ backgroundColor: stroke }}
            >
              {index + 1}
            </span>
            <span className="truncate text-sm font-black" style={{ color: theme.text }}>
              {item}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return <PortfolioCanvasImage element={element} />;
}

function CanvasElementView({
  section,
  document,
  element,
  elements,
  selected,
  editable,
  onSelectElement,
  onElementPatch,
  onElementAction,
  onSectionPatch,
  onStartDrag,
  canvasWidth,
  canvasHeight,
}: {
  section: PortfolioSection;
  document: PortfolioDocument;
  element: PortfolioCanvasElement;
  elements: PortfolioCanvasElement[];
  selected: boolean;
  editable?: boolean;
  onSelectElement?: (
    sectionId: string,
    element: PortfolioCanvasElement,
    seedElements?: PortfolioCanvasElement[],
  ) => void;
  onElementPatch?: ElementPatchHandler;
  onElementAction?: ElementActionHandler;
  onSectionPatch?: (sectionId: string, patch: Partial<PortfolioSection>) => void;
  onStartDrag: (
    event: PointerEvent<HTMLElement>,
    element: PortfolioCanvasElement,
    mode: DragMode,
  ) => void;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const isText = element.kind === "text" || element.kind === "tags";
  const isImage = element.kind === "image" || element.kind === "techLogo";
  const content = element.content || "";

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    const nextContent = normalizeEditableText(event.currentTarget.innerText);
    onElementPatch?.(section.id, element.id, { content: nextContent }, elements);
    onSectionPatch?.(section.id, sectionPatchFromElement(element, nextContent));
  };

  const runAction = (action: PortfolioElementAction) => (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onElementAction?.(section.id, element.id, action, elements);
  };

  return (
    <div
      className={`group absolute outline-none ${
        selected ? "z-30" : editable ? "hover:ring-1 hover:ring-primary/30" : ""
      } ${isImage ? "rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]" : ""}`}
      style={elementToCss(element, canvasWidth, canvasHeight)}
      onPointerDown={(event) => {
        if (!editable) return;
        onSelectElement?.(section.id, element, elements);
        if (!isText || event.altKey) onStartDrag(event, element, "move");
      }}
      onClick={(event) => {
        if (!editable) return;
        event.stopPropagation();
        onSelectElement?.(section.id, element, elements);
      }}
    >
      {isText ? (
        <div
          key={`${section.id}-${element.id}-${content}`}
          contentEditable={editable}
          suppressContentEditableWarning
          role={editable ? "textbox" : undefined}
          tabIndex={editable ? 0 : undefined}
          className="h-full w-full overflow-hidden whitespace-pre-line break-words outline-none"
          style={{
            color: element.color,
            fontFamily: fontFamilyValue(element.fontFamily),
            fontSize: element.fontSize,
            fontWeight: element.fontWeight,
            lineHeight: `${element.lineHeight || Math.round((element.fontSize || 16) * 1.35)}px`,
            textAlign: element.textAlign || "left",
          }}
          onFocus={() => onSelectElement?.(section.id, element, elements)}
          onBlur={handleBlur}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        >
          {content}
        </div>
      ) : isImage ? (
        <div className="h-full w-full overflow-hidden rounded-[inherit]">
          <PortfolioCanvasImage element={element} />
        </div>
      ) : (
        <div className="h-full w-full overflow-hidden rounded-[inherit]">
          <PortfolioCanvasVisual element={element} theme={document.theme} />
        </div>
      )}

      {selected && editable ? (
        <>
          <div
            className="absolute left-1/2 top-0 z-40 flex -translate-x-1/2 -translate-y-[calc(100%+12px)] items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="맨 앞으로 가져오기"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-100 hover:text-primary"
              onClick={runAction("bring-forward")}
            >
              <WandSparkles className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="복제"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-100 hover:text-primary"
              onClick={runAction("duplicate")}
            >
              <CopyPlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="삭제"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-red-50 hover:text-red-500"
              onClick={runAction("delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="뒤로 보내기"
              className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-100 hover:text-primary"
              onClick={runAction("send-backward")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <SelectionBox element={element} onStartDrag={onStartDrag} />
        </>
      ) : null}
    </div>
  );
}

function SelectionBox({
  element,
  onStartDrag,
}: {
  element: PortfolioCanvasElement;
  onStartDrag: (
    event: PointerEvent<HTMLElement>,
    element: PortfolioCanvasElement,
    mode: DragMode,
  ) => void;
}) {
  const handles: Array<{
    mode: ResizeMode;
    className: string;
    cursor: string;
  }> = [
    { mode: "resize-nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-nwse-resize" },
    { mode: "resize-n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-ns-resize" },
    { mode: "resize-ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "cursor-nesw-resize" },
    { mode: "resize-w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-ew-resize" },
    { mode: "resize-e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "cursor-ew-resize" },
    { mode: "resize-sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2", cursor: "cursor-nesw-resize" },
    { mode: "resize-s", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2", cursor: "cursor-ns-resize" },
    { mode: "resize-se", className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2", cursor: "cursor-nwse-resize" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-30 border-2 border-[#21c7d9]">
      {handles.map((handle) => (
        <button
          key={handle.mode}
          type="button"
          aria-label="크기 조절"
          className={`pointer-events-auto absolute h-4 w-4 rounded-full border-2 border-[#21c7d9] bg-white shadow-sm ${handle.cursor} ${handle.className}`}
          onPointerDown={(event) => onStartDrag(event, element, handle.mode)}
        />
      ))}
      <button
        type="button"
        aria-label="이동"
        className="pointer-events-auto absolute left-1/2 top-full mt-5 flex h-9 w-9 -translate-x-1/2 cursor-move items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_12px_26px_rgba(15,23,42,0.2)] transition hover:text-primary"
        onPointerDown={(event) => onStartDrag(event, element, "move")}
      >
        <Move className="h-4 w-4" />
      </button>
    </div>
  );
}

function SlideFrame({
  section,
  document,
  index,
  total,
  selectedElementId,
  editable,
  onSelectSection,
  onSelectElement,
  onElementPatch,
  onElementAction,
  onSectionPatch,
}: {
  section: PortfolioSection;
  document: PortfolioDocument;
  index: number;
  total: number;
  selectedElementId?: string | null;
  editable?: boolean;
  onSelectSection?: (sectionId: string) => void;
  onSelectElement?: (
    sectionId: string,
    element: PortfolioCanvasElement,
    seedElements?: PortfolioCanvasElement[],
  ) => void;
  onElementPatch?: ElementPatchHandler;
  onElementAction?: ElementActionHandler;
  onSectionPatch?: (sectionId: string, patch: Partial<PortfolioSection>) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const elements = useMemo(() => materializeCanvasElements(section, document), [section, document]);
  const canvasSize = useMemo(() => getCanvasSize(section, document), [section, document]);

  const patchElementFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const scaleX = canvasSize.width / rect.width;
    const scaleY = canvasSize.height / rect.height;
    const dx = (event.clientX - dragState.startX) * scaleX;
    const dy = (event.clientY - dragState.startY) * scaleY;

    if (dragState.mode !== "move") {
      const minWidth = 34;
      const minHeight = 24;
      const mode = dragState.mode;
      let x = dragState.startElement.x;
      let y = dragState.startElement.y;
      let width = dragState.startElement.width;
      let height = dragState.startElement.height;

      if (mode.includes("e")) {
        width = clamp(Math.round(dragState.startElement.width + dx), minWidth, canvasSize.width - x);
      }

      if (mode.includes("s")) {
        height = clamp(Math.round(dragState.startElement.height + dy), minHeight, canvasSize.height - y);
      }

      if (mode.includes("w")) {
        const boundedDx = clamp(Math.round(dx), -dragState.startElement.x, dragState.startElement.width - minWidth);
        x = dragState.startElement.x + boundedDx;
        width = dragState.startElement.width - boundedDx;
      }

      if (mode.includes("n")) {
        const boundedDy = clamp(Math.round(dy), -dragState.startElement.y, dragState.startElement.height - minHeight);
        y = dragState.startElement.y + boundedDy;
        height = dragState.startElement.height - boundedDy;
      }

      onElementPatch?.(
        dragState.sectionId,
        dragState.elementId,
        {
          x,
          y,
          width,
          height,
        },
        dragState.seedElements,
      );
      return;
    }

    onElementPatch?.(
      dragState.sectionId,
      dragState.elementId,
      {
        x: Math.max(
          0,
          Math.min(canvasSize.width - dragState.startElement.width, Math.round(dragState.startElement.x + dx)),
        ),
        y: Math.max(
          0,
          Math.min(canvasSize.height - dragState.startElement.height, Math.round(dragState.startElement.y + dy)),
        ),
      },
      dragState.seedElements,
    );
  };

  const startDrag = (
    event: PointerEvent<HTMLElement>,
    element: PortfolioCanvasElement,
    mode: DragMode,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({
      mode,
      sectionId: section.id,
      elementId: element.id,
      startX: event.clientX,
      startY: event.clientY,
      startElement: element,
      seedElements: elements,
    });
  };

  return (
    <section
      ref={viewportRef}
      className="relative h-full w-full overflow-hidden bg-white"
      style={{ color: document.theme.text }}
      onClick={() => onSelectSection?.(section.id)}
      onPointerMove={patchElementFromPointer}
      onPointerUp={() => setDragState(null)}
      onPointerCancel={() => setDragState(null)}
    >
      <SlideBackdrop type={section.type} />
      {elements.map((element) => (
        <CanvasElementView
          key={element.id}
          section={section}
          document={document}
          element={element}
          elements={elements}
          selected={selectedElementId === element.id}
          editable={editable}
          onSelectElement={onSelectElement}
          onElementPatch={onElementPatch}
          onElementAction={onElementAction}
          onSectionPatch={onSectionPatch}
          onStartDrag={startDrag}
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
        />
      ))}
      <div
        className="absolute bottom-0 left-0 right-0 flex h-8 items-center justify-end px-8 text-[10px] font-semibold text-white"
        style={{ backgroundColor: document.theme.primary }}
      >
        {index + 1}/{total}
      </div>
    </section>
  );
}

export function PortfolioSlideThumbnail({
  document,
  section,
  index,
  total,
  width = 136,
}: {
  document: PortfolioDocument;
  section: PortfolioSection;
  index: number;
  total: number;
  width?: number;
}) {
  const canvasSize = getCanvasSize(section, document);
  const scale = width / canvasSize.width;

  return (
    <div
      className="pointer-events-none relative overflow-hidden bg-white"
      style={{
        width,
        height: width * (canvasSize.height / canvasSize.width),
      }}
      aria-hidden
    >
      <div
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <SlideFrame section={section} document={document} index={index} total={total} />
      </div>
    </div>
  );
}

export function PortfolioRenderer({
  document,
  selectedSectionId,
  selectedElementId,
  onSelectSection,
  onSelectElement,
  readonly = false,
  editable = false,
  onSectionPatch,
  onElementPatch,
  onElementAction,
}: PortfolioRendererProps) {
  const [localIndex, setLocalIndex] = useState(0);
  const visibleSections = useMemo(
    () => document.sections.filter((section) => section.visible !== false),
    [document.sections],
  );
  const selectedIndex = visibleSections.findIndex((section) => section.id === selectedSectionId);
  const currentIndex =
    selectedIndex >= 0 ? selectedIndex : Math.min(localIndex, Math.max(visibleSections.length - 1, 0));
  const currentSection = visibleSections[currentIndex];
  const currentCanvasSize = getCanvasSize(currentSection, document);

  const moveTo = (nextIndex: number) => {
    if (!visibleSections.length) return;
    const boundedIndex = (nextIndex + visibleSections.length) % visibleSections.length;
    setLocalIndex(boundedIndex);
    onSelectSection?.(visibleSections[boundedIndex].id);
  };

  if (!currentSection) {
    return (
      <div
        className="w-full border border-dashed border-slate-300 bg-white p-10 text-sm text-slate-400"
        style={{
          maxWidth: FALLBACK_CANVAS_WIDTH,
          aspectRatio: `${FALLBACK_CANVAS_WIDTH} / ${FALLBACK_CANVAS_HEIGHT}`,
        }}
      >
        표시할 슬라이스가 없습니다.
      </div>
    );
  }

  return (
    <div
      className="w-full"
      style={
        editable && !readonly
          ? {
              width:
                document.format === "document"
                  ? "clamp(420px, calc((100dvh - 12rem) * 794 / 1123), 760px)"
                  : "clamp(560px, calc((100dvh - 12rem) * 16 / 9), 960px)",
              maxWidth: "100%",
            }
          : { maxWidth: currentCanvasSize.width }
      }
    >
      <div className="relative rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
        <div
          className="relative mx-auto w-full overflow-hidden bg-white"
          style={{
            backgroundColor: document.theme.surface,
            aspectRatio: `${currentCanvasSize.width} / ${currentCanvasSize.height}`,
          }}
        >
          <SlideFrame
            section={currentSection}
            document={document}
            index={currentIndex}
            total={visibleSections.length}
            selectedElementId={selectedElementId}
            editable={editable && !readonly}
            onSelectSection={onSelectSection}
            onSelectElement={onSelectElement}
            onElementPatch={onElementPatch}
            onElementAction={onElementAction}
            onSectionPatch={onSectionPatch}
          />
        </div>

        {visibleSections.length > 1 ? (
          <>
            <button
              type="button"
              className="absolute left-[-18px] top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-[#d8e4d0] bg-white/82 text-xl font-black text-primary shadow-lg backdrop-blur transition hover:bg-[#eef6e8]"
              onClick={() => moveTo(currentIndex - 1)}
              aria-label="이전 슬라이스"
            >
              ‹
            </button>
            <button
              type="button"
              className="absolute right-[-18px] top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-[#d8e4d0] bg-white/82 text-xl font-black text-primary shadow-lg backdrop-blur transition hover:bg-[#eef6e8]"
              onClick={() => moveTo(currentIndex + 1)}
              aria-label="다음 슬라이스"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

    </div>
  );
}
