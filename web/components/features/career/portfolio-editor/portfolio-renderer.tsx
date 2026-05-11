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
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart4Outlined,
  CloudIot2Outlined,
  Code1Outlined,
  DashboardSquare1Outlined,
  Database2Outlined,
  QuestionMarkCircleOutlined,
  TargetUserOutlined,
  VectorNodes6Outlined,
  type IconData,
} from "@lineiconshq/free-icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  PORTFOLIO_BACKGROUND_IMAGES,
  PORTFOLIO_CANVAS_STYLE_VERSION,
  buildPortfolioSectionCanvas,
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
  const canonicalCanvas = buildPortfolioSectionCanvas(section, document);
  if (canonicalCanvas?.elements?.length) return canonicalCanvas.elements;

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

function visualCanvasElement(
  id: string,
  kind: Exclude<PortfolioCanvasElement["kind"], "text" | "tags" | "image">,
  x: number,
  y: number,
  width: number,
  height: number,
  patch: Partial<PortfolioCanvasElement> = {},
): PortfolioCanvasElement {
  return {
    id,
    kind,
    role:
      kind === "techLogo"
        ? "techLogo"
        : kind === "shadcnBlock"
          ? "component"
          : kind === "metric" || kind === "flow" || kind === "timeline"
            ? kind
            : "decorative",
    x,
    y,
    width,
    height,
    ...patch,
  };
}

function expandedBlockItems(element: PortfolioCanvasElement) {
  const items = (element.props?.items || []).filter(
    (item) => item.title || item.label || item.body || item.value || item.image?.url,
  );

  if (items.length) return items;
  if (element.variant === "tech-logo-grid") return [{ title: "Stack" }, { title: "API" }, { title: "DB" }];
  if (element.variant === "kpi-cards") return [{ label: "핵심", value: "1", body: "정리" }];
  return [{ label: "01", title: "문제 정의", body: "핵심 내용을 입력하세요." }];
}

function expandShadcnBlockElement(
  element: PortfolioCanvasElement,
  theme: PortfolioDocument["theme"],
): PortfolioCanvasElement[] {
  if (element.kind !== "shadcnBlock") return [element];

  const accent = element.stroke || theme.primary;
  const fill = element.fill || "#ffffff";
  const items = expandedBlockItems(element);
  const baseId = element.id;
  const children: PortfolioCanvasElement[] = [
    visualCanvasElement(`${baseId}-surface`, "shape", element.x, element.y, element.width, element.height, {
      fill,
      stroke: `${accent}55`,
      opacity: element.opacity ?? 1,
    }),
  ];
  const addText = (
    id: string,
    content: string | undefined,
    x: number,
    y: number,
    width: number,
    height: number,
    fontSize: number,
    fontWeight: number,
    color = theme.text,
  ) => {
    if (!content) return;
    children.push(textElement(`${baseId}-${id}`, "label", content, x, y, width, height, fontSize, fontWeight, color));
  };
  const addShape = (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    shapeFill = "#ffffff",
    shapeStroke = "#e2e8f0",
    opacity = 1,
  ) => {
    children.push(visualCanvasElement(`${baseId}-${id}`, "shape", x, y, width, height, {
      fill: shapeFill,
      stroke: shapeStroke,
      opacity,
    }));
  };

  if (element.props?.title) {
    addText("title", element.props.title, element.x + 16, element.y + 12, element.width - 32, 22, 14, 900, accent);
  }

  if (element.variant === "tech-logo-grid") {
    const top = element.y + (element.props?.title ? 44 : 14);
    const gap = 10;
    const columns = element.width > 500 ? 4 : 3;
    const itemWidth = (element.width - 32 - gap * (columns - 1)) / columns;
    const itemHeight = 66;

    items.slice(0, 12).forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = element.x + 16 + col * (itemWidth + gap);
      const y = top + row * (itemHeight + 10);
      addShape(`tech-${index}-card`, x, y, itemWidth, itemHeight, "#ffffff", "#e2e8f0", 0.92);
      if (item.image?.url) {
        children.push(imageElement(`${baseId}-tech-${index}-image`, item.image, x + 12, y + 12, 28, 28));
      } else {
        addShape(`tech-${index}-mark`, x + 12, y + 12, 28, 28, accent, accent, 1);
        addText(`tech-${index}-initial`, (item.title || item.label || "ST").slice(0, 2).toUpperCase(), x + 12, y + 18, 28, 16, 9, 900, "#ffffff");
      }
      addText(`tech-${index}-title`, item.title || item.label || "Stack", x + 48, y + 16, itemWidth - 58, 22, 11, 900, theme.text);
      addText(`tech-${index}-body`, item.body, x + 48, y + 38, itemWidth - 58, 18, 9, 700, theme.muted);
    });
    return children;
  }

  if (element.variant === "project-index-cards") {
    const top = element.y + (element.props?.title ? 46 : 12);
    const rowHeight = Math.min(42, Math.max(30, (element.height - (top - element.y) - 12) / Math.max(items.length, 1)));
    items.slice(0, 8).forEach((item, index) => {
      const y = top + index * rowHeight;
      addShape(`row-${index}`, element.x + 14, y, element.width - 28, rowHeight - 6, "#ffffff", "#e2e8f0", 0.86);
      addText(`row-${index}-label`, item.label || String(index + 1).padStart(2, "0"), element.x + 28, y + 9, 46, 18, 11, 900, accent);
      addText(`row-${index}-title`, item.title || item.value || "프로젝트", element.x + 82, y + 7, element.width - 118, 18, 12, 900, theme.text);
      addText(`row-${index}-body`, item.body, element.x + 82, y + 24, element.width - 118, 14, 9, 700, theme.muted);
    });
    return children;
  }

  if (element.variant === "timeline-steps") {
    const top = element.y + (element.props?.title ? 44 : 14);
    const stepHeight = Math.min(58, Math.max(42, (element.height - (top - element.y) - 12) / Math.max(items.length, 1)));
    items.slice(0, 5).forEach((item, index) => {
      const y = top + index * stepHeight;
      addShape(`step-${index}-dot`, element.x + 18, y + 7, 28, 28, accent, accent, 1);
      addText(`step-${index}-number`, item.label || `${index + 1}`, element.x + 18, y + 14, 28, 14, 9, 900, "#ffffff");
      if (index < items.length - 1) {
        children.push(visualCanvasElement(`${baseId}-step-${index}-line`, "line", element.x + 32, y + 37, 1, Math.max(8, stepHeight - 26), { stroke: "#dbe5d0" }));
      }
      addShape(`step-${index}-card`, element.x + 58, y, element.width - 74, stepHeight - 7, "#ffffff", "#e2e8f0", 0.86);
      addText(`step-${index}-title`, item.title || "단계", element.x + 72, y + 8, element.width - 104, 17, 12, 900, theme.text);
      addText(`step-${index}-body`, item.body, element.x + 72, y + 25, element.width - 104, 15, 9, 700, theme.muted);
    });
    return children;
  }

  if (element.variant === "metric-trend") {
    const top = element.y + (element.props?.title ? 44 : 14);
    const chartX = element.x + 16;
    const chartY = top + 4;
    const chartWidth = Math.max(120, element.width * 0.42);
    const chartHeight = Math.max(70, element.height - (top - element.y) - 24);
    const rowX = chartX + chartWidth + 18;
    const rowWidth = element.x + element.width - rowX - 16;
    addShape("chart-panel", chartX, chartY, chartWidth, chartHeight, "#ffffff", "#e2e8f0", 0.88);
    items.slice(0, 4).forEach((item, index) => {
      const barGap = 10;
      const barWidth = (chartWidth - 32 - barGap * 3) / 4;
      const value = clamp(item.progress ?? 42 + index * 16, 18, 96);
      const barHeight = Math.max(16, (chartHeight - 34) * (value / 100));
      const x = chartX + 16 + index * (barWidth + barGap);
      const y = chartY + chartHeight - 18 - barHeight;
      addShape(`bar-${index}`, x, y, barWidth, barHeight, itemToneColor(item.tone, theme, accent), itemToneColor(item.tone, theme, accent), 0.92);
      addText(`bar-${index}-label`, item.label || `${index + 1}`, x - 4, chartY + chartHeight - 16, barWidth + 8, 12, 8, 900, theme.muted);
    });
    items.slice(0, 3).forEach((item, index) => {
      const rowHeight = Math.min(40, Math.max(32, (chartHeight - 6) / 3));
      const y = chartY + index * (rowHeight + 3);
      addShape(`metric-row-${index}`, rowX, y, rowWidth, rowHeight, "#ffffff", "#e2e8f0", 0.82);
      addText(`metric-row-${index}-label`, item.label || item.title, rowX + 10, y + 7, rowWidth * 0.45, 14, 9, 900, theme.muted);
      addText(`metric-row-${index}-value`, item.value || item.title, rowX + rowWidth * 0.48, y + 7, rowWidth * 0.46, 14, 11, 900, itemToneColor(item.tone, theme, accent));
      addShape(`metric-row-${index}-track`, rowX + 10, y + rowHeight - 11, rowWidth - 20, 3, "#e2e8f0", "#e2e8f0", 1);
      addShape(`metric-row-${index}-progress`, rowX + 10, y + rowHeight - 11, (rowWidth - 20) * (clamp(item.progress ?? 50, 0, 100) / 100), 3, itemToneColor(item.tone, theme, accent), itemToneColor(item.tone, theme, accent), 1);
    });
    return children;
  }

  if (element.variant === "system-architecture-map") {
    const top = element.y + (element.props?.title ? 54 : 24);
    const nodeCount = Math.min(Math.max(items.length, 1), 4);
    const gap = 10;
    const nodeWidth = (element.width - 32 - gap * (nodeCount - 1)) / nodeCount;
    const nodeHeight = Math.max(74, element.height - (top - element.y) - 24);
    children.push(visualCanvasElement(`${baseId}-connector`, "line", element.x + 34, top + nodeHeight / 2, element.width - 68, 1, { stroke: "#dbe5d0" }));
    items.slice(0, nodeCount).forEach((item, index) => {
      const x = element.x + 16 + index * (nodeWidth + gap);
      const y = top;
      addShape(`node-${index}`, x, y, nodeWidth, nodeHeight, "#ffffff", "#e2e8f0", 0.9);
      addShape(`node-${index}-mark`, x + nodeWidth / 2 - 15, y + 12, 30, 30, itemToneColor(item.tone, theme, accent), itemToneColor(item.tone, theme, accent), 1);
      addText(`node-${index}-label`, item.label || `${index + 1}`, x + nodeWidth / 2 - 15, y + 20, 30, 13, 8, 900, "#ffffff");
      addText(`node-${index}-title`, item.title || item.value, x + 10, y + 50, nodeWidth - 20, 17, 10, 900, theme.text);
      addText(`node-${index}-body`, item.body, x + 10, y + 70, nodeWidth - 20, Math.max(18, nodeHeight - 78), 8, 700, theme.muted);
    });
    return children;
  }

  if (element.variant === "impact-matrix") {
    const top = element.y + (element.props?.title ? 44 : 14);
    const gap = 10;
    const cellWidth = (element.width - 32 - gap) / 2;
    const cellHeight = (element.height - (top - element.y) - 18 - gap) / 2;
    items.slice(0, 4).forEach((item, index) => {
      const x = element.x + 16 + (index % 2) * (cellWidth + gap);
      const y = top + Math.floor(index / 2) * (cellHeight + gap);
      addShape(`matrix-${index}`, x, y, cellWidth, cellHeight, "#ffffff", "#e2e8f0", 0.9);
      addText(`matrix-${index}-label`, item.label || `${index + 1}`, x + 10, y + 8, cellWidth - 32, 13, 9, 900, itemToneColor(item.tone, theme, accent));
      addShape(`matrix-${index}-dot`, x + cellWidth - 20, y + 11, 7, 7, itemToneColor(item.tone, theme, accent), itemToneColor(item.tone, theme, accent), 1);
      addText(`matrix-${index}-title`, item.title || item.value, x + 10, y + 27, cellWidth - 20, 16, 11, 900, theme.text);
      addText(`matrix-${index}-body`, item.body, x + 10, y + 48, cellWidth - 20, Math.max(18, cellHeight - 56), 8, 700, theme.muted);
    });
    return children;
  }

  if (element.variant === "decision-tree") {
    const top = element.y + (element.props?.title ? 44 : 14);
    const contentHeight = element.height - (top - element.y) - 18;
    const colWidth = (element.width - 42) / 3;
    const centerHeight = (contentHeight - 10) / 2;
    const positions = [
      { x: element.x + 16, y: top + contentHeight * 0.16, width: colWidth, height: contentHeight * 0.68 },
      { x: element.x + 26 + colWidth, y: top, width: colWidth, height: centerHeight },
      { x: element.x + 26 + colWidth, y: top + centerHeight + 10, width: colWidth, height: centerHeight },
      { x: element.x + 36 + colWidth * 2, y: top + contentHeight * 0.16, width: colWidth, height: contentHeight * 0.68 },
    ];
    children.push(visualCanvasElement(`${baseId}-branch-a`, "line", element.x + 16 + colWidth, top + contentHeight / 2, 20, 1, { stroke: "#dbe5d0" }));
    children.push(visualCanvasElement(`${baseId}-branch-b`, "line", element.x + 26 + colWidth * 2, top + contentHeight / 2, 20, 1, { stroke: "#dbe5d0" }));
    items.slice(0, 4).forEach((item, index) => {
      const position = positions[index];
      addShape(`tree-${index}`, position.x, position.y, position.width, position.height, "#ffffff", "#e2e8f0", 0.9);
      addShape(`tree-${index}-mark`, position.x + 10, position.y + 10, 22, 22, itemToneColor(item.tone, theme, accent), itemToneColor(item.tone, theme, accent), 1);
      addText(`tree-${index}-label`, item.label || `${index + 1}`, position.x + 10, position.y + 16, 22, 12, 8, 900, "#ffffff");
      addText(`tree-${index}-title`, item.title || item.value, position.x + 40, position.y + 12, position.width - 50, 18, 11, 900, itemToneColor(item.tone, theme, accent));
      addText(`tree-${index}-body`, item.body, position.x + 12, position.y + 42, position.width - 24, Math.max(12, position.height - 52), 7, 700, theme.muted);
    });
    return children;
  }

  if (element.variant === "competency-radar") {
    const top = element.y + (element.props?.title ? 44 : 14);
    const chartSize = Math.min(116, Math.max(86, element.height - (top - element.y) - 18));
    const chartX = element.x + 20;
    const chartY = top + Math.max(0, (element.height - (top - element.y) - chartSize) / 2 - 6);
    const rowX = chartX + chartSize + 22;
    const rowWidth = element.x + element.width - rowX - 16;
    addShape("radar-outer", chartX, chartY, chartSize, chartSize, "#ffffff", "#e2e8f0", 0.88);
    addShape("radar-mid", chartX + chartSize * 0.2, chartY + chartSize * 0.2, chartSize * 0.6, chartSize * 0.6, "#f8fafc", "#e2e8f0", 0.6);
    items.slice(0, 4).forEach((item, index) => {
      const value = clamp(item.progress ?? 60, 20, 92) / 100;
      const angle = (index / 4) * Math.PI * 2 - Math.PI / 2;
      const x = chartX + chartSize / 2 + Math.cos(angle) * chartSize * 0.38 * value;
      const y = chartY + chartSize / 2 + Math.sin(angle) * chartSize * 0.38 * value;
      addShape(`radar-dot-${index}`, x - 5, y - 5, 10, 10, itemToneColor(item.tone, theme, accent), itemToneColor(item.tone, theme, accent), 1);
    });
    items.slice(0, 5).forEach((item, index) => {
      const rowHeight = Math.min(24, Math.max(18, (chartSize - 4) / Math.max(items.length, 1)));
      const y = chartY + index * (rowHeight + 2);
      addText(`radar-row-${index}-label`, item.label || item.title, rowX, y + 1, rowWidth * 0.54, 13, 9, 900, theme.muted);
      addText(`radar-row-${index}-value`, `${Math.round(item.progress ?? 60)}`, rowX + rowWidth - 28, y + 1, 28, 13, 9, 900, itemToneColor(item.tone, theme, accent));
      addShape(`radar-row-${index}-track`, rowX, y + rowHeight - 6, rowWidth, 3, "#e2e8f0", "#e2e8f0", 1);
      addShape(`radar-row-${index}-progress`, rowX, y + rowHeight - 6, rowWidth * (clamp(item.progress ?? 60, 0, 100) / 100), 3, itemToneColor(item.tone, theme, accent), itemToneColor(item.tone, theme, accent), 1);
    });
    return children;
  }

  const isKpi = element.variant === "kpi-cards";
  const isFourStep =
    element.variant === "star-method" ||
    element.variant === "architecture-stack" ||
    element.variant === "role-contribution" ||
    element.variant === "before-after-impact";
  const maxItems = isKpi ? 2 : isFourStep ? 4 : 3;
  const gap = isKpi ? 8 : 10;
  const top = element.y + (element.props?.title ? 40 : 8);
  const cardWidth = (element.width - 28 - gap * (maxItems - 1)) / maxItems;
  const cardHeight = element.height - (top - element.y) - 14;

  items.slice(0, maxItems).forEach((item, index) => {
    const x = element.x + 14 + index * (cardWidth + gap);
    const y = top;
    const title = item.title || item.label || (isKpi ? "핵심" : "항목");
    addShape(`item-${index}-card`, x, y, cardWidth, cardHeight, "#ffffff", "#e2e8f0", 0.9);
    if (isKpi) {
      addText(`item-${index}-label`, item.label || title, x + 12, y + 10, cardWidth - 24, 14, 9, 900, theme.muted);
      addText(`item-${index}-value`, item.value || title, x + 12, y + 26, cardWidth - 24, 26, 19, 900, accent);
      addText(`item-${index}-body`, item.body, x + 12, y + 54, cardWidth - 24, 14, 9, 700, theme.muted);
      return;
    }
    addShape(`item-${index}-dot`, x + 12, y + 12, 24, 24, accent, accent, 1);
    addText(`item-${index}-number`, String(index + 1), x + 12, y + 18, 24, 13, 9, 900, "#ffffff");
    addText(`item-${index}-title`, title, x + 12, y + 44, cardWidth - 24, 20, 12, 900, accent);
    addText(`item-${index}-body`, item.body || item.value, x + 12, y + 68, cardWidth - 24, Math.max(22, cardHeight - 78), 10, 650, theme.text);
  });

  return children;
}

function expandCanvasElements(
  elements: PortfolioCanvasElement[],
  theme: PortfolioDocument["theme"],
) {
  return elements.flatMap((element) => expandShadcnBlockElement(element, theme));
}

function materializeCanvasElements(
  section: PortfolioSection,
  document: PortfolioDocument,
  options: { expandBlocks?: boolean } = {},
) {
  const defaults = defaultCanvasElements(section, document);
  const resolveElements = (elements: PortfolioCanvasElement[]) =>
    options.expandBlocks ? expandCanvasElements(elements, document.theme) : elements;

  if (!section.canvas) return resolveElements(defaults);

  if (section.canvas.styleVersion !== PORTFOLIO_CANVAS_STYLE_VERSION) {
    const savedById = new Map(section.canvas.elements.map((element) => [element.id, element]));
    const mergedDefaults = defaults.map((element) => {
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
    return resolveElements(mergedDefaults);
  }

  const defaultById = new Map(defaults.map((element) => [element.id, element]));
  const materialized = section.canvas.elements.map((element) => ({
    ...defaultById.get(element.id),
    ...element,
  }));
  return resolveElements(materialized);
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
      <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#e8f2e1_52%,#f5f1d8_100%)]">
        <div className="absolute left-[12%] top-[18%] h-[18%] w-[40%] rounded-full bg-white/65" />
        <div className="absolute bottom-[16%] left-[12%] right-[12%] grid h-[36%] grid-cols-4 items-end gap-2">
          {[42, 68, 54, 82].map((height, index) => (
            <span
              key={height}
              className="rounded-t-lg bg-primary/45"
              style={{ height: `${height}%`, opacity: 0.55 + index * 0.08 }}
            />
          ))}
        </div>
        <div className="absolute right-[14%] top-[18%] h-[34%] w-[34%] rounded-full border border-primary/20 bg-white/35" />
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

function itemToneColor(
  tone: NonNullable<NonNullable<PortfolioCanvasElement["props"]>["items"]>[number]["tone"] | undefined,
  theme: PortfolioDocument["theme"],
  fallback: string,
) {
  if (tone === "accent") return theme.accent;
  if (tone === "muted") return theme.muted;
  return fallback;
}

function chartItems(element: PortfolioCanvasElement) {
  const items = (element.props?.items || []).filter(
    (item) => item.title || item.label || item.body || item.value || typeof item.progress === "number",
  );
  return items.length
    ? items
    : [
        { label: "Before", title: "문제", value: "35", progress: 35, tone: "muted" as const },
        { label: "Build", title: "구현", value: "68", progress: 68, tone: "accent" as const },
        { label: "Impact", title: "성과", value: "88", progress: 88, tone: "primary" as const },
      ];
}

function chartValue(item: ReturnType<typeof chartItems>[number], fallback: number) {
  if (typeof item.progress === "number") return clamp(item.progress, 0, 100);
  const numeric = Number(String(item.value || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? clamp(numeric, 0, 100) : fallback;
}

function LineIconMark({
  icon,
  color,
  className,
  strokeWidth = 1.8,
}: {
  icon: IconData;
  color: string;
  className?: string;
  strokeWidth?: number;
}) {
  const iconMeta = icon as IconData & { defaultFill?: string };
  const svg = icon.svg
    .replace(/fill="\{color\}"/g, `fill="${color}"`)
    .replace(/stroke="\{color\}"/g, `stroke="${color}"`)
    .replace(/stroke-width="\{strokeWidth\}"/g, `stroke-width="${strokeWidth}"`);

  return (
    <svg
      viewBox={icon.viewBox}
      className={className}
      fill={iconMeta.defaultFill || "none"}
      stroke={icon.hasStroke ? color : "none"}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function PortfolioCanvasShadcnBlock({
  element,
  theme,
}: {
  element: PortfolioCanvasElement;
  theme: PortfolioDocument["theme"];
}) {
  const props = element.props || {};
  const items = (props.items || []).filter(
    (item) => item.title || item.label || item.body || item.value || item.image?.url,
  );
  const accent = element.stroke || theme.primary;
  const softFill = element.fill && element.fill !== "#ffffff" ? element.fill : "rgba(255,255,255,0.9)";
  const cardStyle = {
    borderColor: `${accent}55`,
    backgroundColor: softFill,
    color: theme.text,
    opacity: element.opacity ?? 1,
  };

  if (element.variant === "tech-logo-grid") {
    return (
      <Card className="h-full w-full overflow-hidden rounded-2xl border shadow-none" style={cardStyle}>
        <CardHeader className="px-4 pb-2 pt-3">
          <CardTitle className="truncate text-sm font-black" style={{ color: accent }}>
            {props.title || "기술 스택"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid h-[calc(100%-44px)] grid-cols-3 gap-2 px-4 pb-4 pt-0">
          {(items.length ? items : [{ title: "Stack" }, { title: "API" }, { title: "DB" }])
            .slice(0, 9)
            .map((item, index) => {
              const title = item.title || item.label || "Stack";
              return (
                <div
                  key={`${title}-${index}`}
                  className="flex min-h-0 flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white/82 px-2 py-1.5 text-center"
                >
                  {item.image?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image.url}
                      alt={item.image.alt || title}
                      className="h-7 w-7 object-contain"
                      draggable={false}
                    />
                  ) : (
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {title.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <span className="mt-1 max-w-full truncate text-[10px] font-black text-slate-600">
                    {title}
                  </span>
                </div>
              );
            })}
        </CardContent>
      </Card>
    );
  }

  if (element.variant === "problem-solution-result") {
    const flowItems = (items.length ? items : [
      { label: "문제", body: "문제를 정의합니다." },
      { label: "해결", body: "해결 방안을 실행합니다." },
      { label: "결과", body: "결과를 정리합니다." },
    ]).slice(0, 3);

    return (
      <Card className="h-full w-full overflow-hidden rounded-2xl border shadow-none" style={cardStyle}>
        <CardHeader className="flex-row items-start justify-between gap-3 px-4 pb-2 pt-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-sm font-black" style={{ color: accent }}>
              {props.title || "문제 해결 흐름"}
            </CardTitle>
            {props.subtitle ? (
              <p className="mt-1 truncate text-[10px] font-semibold text-slate-500">{props.subtitle}</p>
            ) : null}
          </div>
          {props.badges?.length ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {props.badges.slice(0, 2).map((badge) => (
                <Badge
                  key={badge}
                  variant="outline"
                  className="h-5 border-primary/25 bg-primary/5 px-1.5 text-[9px] font-black text-primary"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="grid h-[calc(100%-46px)] grid-cols-3 gap-2 px-4 pb-4 pt-0">
          {flowItems.map((item, index) => {
            const color = itemToneColor(item.tone, theme, accent);
            return (
              <div
                key={`${item.label || item.title}-${index}`}
                className="min-h-0 rounded-xl border border-slate-200/80 bg-white/80 p-2"
              >
                <span
                  className="mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white"
                  style={{ backgroundColor: color }}
                >
                  {index + 1}
                </span>
                <p className="truncate text-[11px] font-black" style={{ color }}>
                  {item.title || item.label}
                </p>
                <p className="mt-1 line-clamp-3 text-[10px] font-semibold leading-4 text-slate-600">
                  {item.body}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  if (element.variant === "project-index-cards") {
    return (
      <Card className="h-full w-full overflow-hidden rounded-2xl border shadow-none" style={cardStyle}>
        <CardHeader className="px-4 pb-2 pt-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="truncate text-sm font-black" style={{ color: accent }}>
              {props.title || "프로젝트 인덱스"}
            </CardTitle>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
              {items.length} projects
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <Table className="text-[11px]">
            <TableBody>
              {(items.length ? items : [{ title: "대표 프로젝트", body: "케이스스터디" }])
                .slice(0, 6)
                .map((item, index) => (
                  <TableRow key={`${item.title || item.label}-${index}`} className="border-slate-100">
                    <TableCell className="w-12 py-2 pl-0 pr-2 font-black" style={{ color: accent }}>
                      {item.label || String(index + 1).padStart(2, "0")}
                    </TableCell>
                    <TableCell className="min-w-0 py-2 pl-0 pr-2">
                      <p className="truncate font-black text-slate-900">{item.title}</p>
                      <p className="truncate text-[10px] font-semibold text-slate-500">{item.body}</p>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (element.variant === "timeline-steps") {
    return (
      <Card className="h-full w-full overflow-hidden rounded-2xl border shadow-none" style={cardStyle}>
        <CardHeader className="px-4 pb-2 pt-3">
          <CardTitle className="truncate text-sm font-black" style={{ color: accent }}>
            {props.title || "진행 흐름"}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-44px)] space-y-2 overflow-hidden px-4 pb-4 pt-0">
          {(items.length ? items : [{ title: "문제 정의" }, { title: "실행" }, { title: "개선" }])
            .slice(0, 4)
            .map((item, index, array) => (
              <div key={`${item.title || item.label}-${index}`} className="flex min-h-0 gap-2">
                <div className="flex shrink-0 flex-col items-center">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {item.label || index + 1}
                  </span>
                  {index < array.length - 1 ? <Separator orientation="vertical" className="my-1 flex-1 bg-slate-200" /> : null}
                </div>
                <div className="min-w-0 flex-1 rounded-xl bg-white/70 px-2.5 py-1.5">
                  <p className="truncate text-[11px] font-black text-slate-900">{item.title}</p>
                  <p className="truncate text-[10px] font-semibold text-slate-500">{item.body}</p>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    );
  }

  if (element.variant === "metric-trend") {
    const trendItems = chartItems(element).slice(0, 4);
    const data = trendItems.map((item, index) => ({
      name: item.label || item.title || `Step ${index + 1}`,
      value: chartValue(item, 40 + index * 16),
      fill: itemToneColor(item.tone, theme, accent),
    }));

    return (
      <Card className="h-full w-full overflow-hidden rounded-2xl border shadow-none" style={cardStyle}>
        <CardHeader className="px-4 pb-2 pt-3">
          <CardTitle className="truncate text-sm font-black" style={{ color: accent }}>
            {props.title || "지표 변화 흐름"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid h-[calc(100%-44px)] grid-cols-[1.25fr_0.75fr] gap-3 px-4 pb-4 pt-0">
          <div className="min-h-0 rounded-xl border border-slate-200/80 bg-white/82 px-2 py-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: 0, right: 8, top: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id={`portfolio-trend-${element.id}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={accent} stopOpacity={0.42} />
                    <stop offset="95%" stopColor={accent} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: theme.muted }} />
                <YAxis hide domain={[0, 100]} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={accent}
                  strokeWidth={3}
                  fill={`url(#portfolio-trend-${element.id})`}
                  dot={{ r: 4, strokeWidth: 2, fill: "#ffffff", stroke: accent }}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 overflow-hidden">
            {trendItems.slice(0, 3).map((item, index) => (
              <div key={`${item.label || index}-row`} className="rounded-xl bg-white/72 px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] font-black text-slate-500">{item.label}</span>
                  <strong className="truncate text-[11px] font-black" style={{ color: itemToneColor(item.tone, theme, accent) }}>{item.value || item.title}</strong>
                </div>
                <Progress value={chartValue(item, 50)} className="mt-1 h-1.5 bg-slate-100" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (element.variant === "system-architecture-map") {
    const nodes = (items.length ? items : [
      { label: "Input", title: "사용자/데이터" },
      { label: "Service", title: "API/업무 로직" },
      { label: "Data", title: "DB/Storage" },
      { label: "Output", title: "리포트/화면" },
    ]).slice(0, 4);
    const [inputNode, serviceNode, dataNode, outputNode] = nodes;
    const nodeTone = (item: typeof nodes[number] | undefined, fallback = accent) =>
      item ? itemToneColor(item.tone, theme, fallback) : fallback;
    const nodeIcons = [TargetUserOutlined, CloudIot2Outlined, Database2Outlined, DashboardSquare1Outlined];

    return (
      <Card className="h-full w-full overflow-hidden rounded-2xl border shadow-none" style={cardStyle}>
        <CardContent className="grid h-full grid-cols-[0.78fr_1.22fr] gap-3 p-4">
          <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/82 p-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Architecture</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-black leading-5" style={{ color: accent }}>
                {props.title || "시스템 구조 맵"}
              </h3>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {nodes.map((item, index) => (
                <div key={`${item.label || index}-chip`} className="min-w-0 rounded-xl bg-slate-50 px-2 py-1.5">
                  <LineIconMark icon={nodeIcons[index] || VectorNodes6Outlined} color={itemToneColor(item.tone, theme, accent)} className="mb-1 h-4 w-4" />
                  <span className="block truncate text-[10px] font-black text-slate-800">{item.title || item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative min-h-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-[radial-gradient(circle_at_20%_20%,rgba(23,122,77,0.12),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-3">
            <div className="grid h-full grid-cols-[0.92fr_1.08fr_0.92fr] grid-rows-2 gap-2">
              <div className="relative row-span-2 flex min-w-0 flex-col justify-center rounded-2xl border border-slate-200 bg-white/92 p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <LineIconMark icon={TargetUserOutlined} color={nodeTone(inputNode, theme.muted)} className="h-5 w-5" />
                </span>
                <p className="mt-2 truncate text-[11px] font-black text-slate-950">{inputNode?.title || inputNode?.label}</p>
                <p className="mt-1 line-clamp-2 text-[9px] font-semibold leading-3 text-slate-500">{inputNode?.body}</p>
                <span className="absolute -right-3 top-1/2 h-px w-3 bg-slate-300" />
              </div>

              <div className="relative min-w-0 rounded-2xl border border-emerald-200 bg-white p-2.5 shadow-[0_14px_28px_rgba(23,122,77,0.12)]">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-black" style={{ color: nodeTone(serviceNode) }}>
                  <LineIconMark icon={CloudIot2Outlined} color={nodeTone(serviceNode)} className="h-3.5 w-3.5" />
                  Core
                </span>
                <p className="mt-1 truncate text-[11px] font-black text-slate-950">{serviceNode?.title || serviceNode?.label}</p>
                <p className="mt-1 line-clamp-1 text-[8px] font-semibold leading-3 text-slate-500">{serviceNode?.body}</p>
                <span className="absolute -right-3 top-1/2 h-px w-3 bg-slate-300" />
              </div>

              <div className="relative min-w-0 rounded-2xl border border-slate-200 bg-white/92 p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[8px] font-black" style={{ color: nodeTone(dataNode, theme.accent) }}>
                  <LineIconMark icon={Database2Outlined} color={nodeTone(dataNode, theme.accent)} className="h-3.5 w-3.5" />
                  Data
                </span>
                <p className="mt-1 truncate text-[11px] font-black text-slate-950">{dataNode?.title || dataNode?.label}</p>
                <p className="mt-1 line-clamp-1 text-[8px] font-semibold leading-3 text-slate-500">{dataNode?.body}</p>
                <span className="absolute -right-3 top-1/2 h-px w-3 bg-slate-300" />
              </div>

              <div className="relative col-start-3 row-span-2 flex min-w-0 flex-col justify-center rounded-2xl border border-slate-200 bg-white/92 p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <LineIconMark icon={DashboardSquare1Outlined} color={nodeTone(outputNode)} className="h-5 w-5" />
                </span>
                <p className="mt-2 truncate text-[11px] font-black text-slate-950">{outputNode?.title || outputNode?.label}</p>
                <p className="mt-1 line-clamp-2 text-[9px] font-semibold leading-3 text-slate-500">{outputNode?.body}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (element.variant === "impact-matrix") {
    const matrixItems = (items.length ? items : [
      { label: "Before", title: "문제" },
      { label: "Action", title: "실행" },
      { label: "After", title: "성과" },
      { label: "Next", title: "확장" },
    ]).slice(0, 4);
    const data = matrixItems.map((item, index) => ({
      name: item.label || item.title || `Step ${index + 1}`,
      value: chartValue(item, 34 + index * 16),
      fill: itemToneColor(item.tone, theme, accent),
    }));

    return (
      <Card className="h-full w-full overflow-hidden rounded-2xl border shadow-none" style={cardStyle}>
        <CardHeader className="px-4 pb-2 pt-3">
          <CardTitle className="truncate text-sm font-black" style={{ color: accent }}>
            {props.title || "임팩트 매트릭스"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid h-[calc(100%-44px)] grid-cols-[1.15fr_0.85fr] gap-3 px-4 pb-4 pt-0">
          <div className="min-h-0 rounded-xl border border-slate-200/80 bg-white/82 px-2 py-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 4, right: 10, top: 4, bottom: 4 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: theme.muted }} width={46} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={14}>
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid min-h-0 grid-cols-1 gap-2">
            {matrixItems.slice(0, 3).map((item, index) => (
              <div key={`${item.label || index}-cell`} className="min-h-0 rounded-xl border border-slate-200/80 bg-white/82 px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[10px] font-black" style={{ color: itemToneColor(item.tone, theme, accent) }}>{item.label || index + 1}</span>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: itemToneColor(item.tone, theme, accent) }} />
                </div>
                <p className="mt-0.5 truncate text-[11px] font-black text-slate-900">{item.title || item.value}</p>
                <p className="mt-0.5 line-clamp-1 text-[9px] font-semibold leading-3 text-slate-500">{item.body}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (element.variant === "decision-tree") {
    const treeItems = (items.length ? items : [
      { label: "기준", title: "문제 정의" },
      { label: "선택", title: "대안 비교" },
      { label: "결정", title: "구현 방향" },
      { label: "검증", title: "성과 확인" },
    ]).slice(0, 4);
    const decisionIcons = [QuestionMarkCircleOutlined, VectorNodes6Outlined, Code1Outlined, BarChart4Outlined];

    return (
      <Card className="h-full w-full overflow-hidden rounded-2xl border shadow-none" style={cardStyle}>
        <CardContent className="grid h-full grid-cols-[0.72fr_1.28fr] gap-3 p-4">
          <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/82 p-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Decision</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-black leading-5" style={{ color: accent }}>
                {props.title || "의사결정 트리"}
              </h3>
            </div>
            <div className="mt-3 space-y-1.5">
              {treeItems.slice(0, 4).map((item, index) => (
                <div key={`${item.label || index}-summary`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
                    <LineIconMark icon={decisionIcons[index] || VectorNodes6Outlined} color={itemToneColor(item.tone, theme, accent)} className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-[10px] font-black text-slate-700">{item.title || item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative min-h-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-3">
            <div className="absolute left-[22%] right-[22%] top-1/2 h-px bg-slate-300" />
            <div className="absolute left-[49%] top-[27%] h-[46%] w-px bg-slate-300" />
            <div className="grid h-full grid-cols-[0.95fr_1.05fr_0.95fr] grid-rows-2 gap-2">
            {treeItems.map((item, index) => (
              <div
                key={`${item.label || index}-tree`}
                className={`relative min-h-0 rounded-2xl border border-slate-200 bg-white/90 p-2.5 shadow-[0_10px_22px_rgba(15,23,42,0.06)] ${index === 0 ? "col-start-1 row-span-2 self-center" : index === 3 ? "col-start-3 row-span-2 self-center" : "col-start-2"}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <LineIconMark icon={decisionIcons[index] || VectorNodes6Outlined} color={itemToneColor(item.tone, theme, accent)} className="h-5 w-5" />
                </span>
                <p className="mt-2 truncate text-[11px] font-black" style={{ color: itemToneColor(item.tone, theme, accent) }}>{item.title || item.value}</p>
                <p className="mt-1 line-clamp-2 text-[8px] font-semibold leading-3 text-slate-500">{item.body}</p>
              </div>
            ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (element.variant === "competency-radar") {
    const radarItems = (items.length ? items : [
      { label: "문제정의", progress: 72 },
      { label: "구현", progress: 84 },
      { label: "협업", progress: 68 },
      { label: "성과", progress: 88 },
    ]).slice(0, 5);
    const data = radarItems.map((item, index) => ({
      subject: item.label || item.title || `역량 ${index + 1}`,
      value: chartValue(item, 62 + index * 6),
    }));

    return (
      <Card className="h-full w-full overflow-hidden rounded-2xl border shadow-none" style={cardStyle}>
        <CardHeader className="px-4 pb-2 pt-3">
          <CardTitle className="truncate text-sm font-black" style={{ color: accent }}>
            {props.title || "역량 레이더"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid h-[calc(100%-44px)] grid-cols-[1fr_0.9fr] gap-3 px-4 pb-4 pt-0">
          <div className="min-h-0 rounded-xl border border-slate-200/80 bg-white/82 px-1 py-1">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="72%" margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <PolarGrid stroke="#dbe5d0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: theme.muted }} />
                <Radar dataKey="value" stroke={accent} fill={accent} fillOpacity={0.28} strokeWidth={2.5} dot />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 overflow-hidden">
            {radarItems.map((item, index) => (
              <div key={`${item.label || index}-metric`}>
                <div className="mb-0.5 flex justify-between gap-2 text-[10px] font-black text-slate-500">
                  <span className="truncate">{item.label || item.title}</span>
                  <span>{Math.round(chartValue(item, 60))}</span>
                </div>
                <Progress value={chartValue(item, 60)} className="h-1.5 bg-slate-100" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (element.variant === "kpi-cards") {
    return (
      <div
        className="grid h-full w-full gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(Math.max(items.length, 1), 2)}, minmax(0, 1fr))`,
          opacity: element.opacity ?? 1,
        }}
      >
        {(items.length ? items : [{ label: "핵심", value: "1", body: "정리" }])
          .slice(0, 2)
          .map((item, index) => {
            const color = itemToneColor(item.tone, theme, accent);
            return (
              <Card
                key={`${item.label || item.title}-${index}`}
                className="flex h-full flex-col justify-center overflow-hidden rounded-2xl border bg-white/90 px-3 py-2 shadow-none"
                style={{ borderColor: `${color}55` }}
              >
                <span className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  {item.label || item.title}
                </span>
                <strong className="mt-0.5 truncate text-xl font-black leading-none" style={{ color }}>
                  {item.value || item.title || "0"}
                </strong>
                {typeof item.progress === "number" ? (
                  <Progress value={clamp(item.progress, 0, 100)} className="mt-2 h-1.5 bg-slate-100" />
                ) : (
                  <span className="mt-1 truncate text-[10px] font-semibold text-slate-500">{item.body}</span>
                )}
              </Card>
            );
          })}
      </div>
    );
  }

  return (
    <Card className="h-full w-full overflow-hidden rounded-2xl border shadow-none" style={cardStyle}>
      <CardHeader className="px-4 pb-2 pt-3">
        <CardTitle className="truncate text-sm font-black" style={{ color: accent }}>
          {props.title || "요약"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4 pt-0">
        {props.subtitle ? <p className="text-xs font-semibold text-slate-500">{props.subtitle}</p> : null}
        {items.slice(0, 3).map((item, index) => (
          <p key={`${item.title || item.body}-${index}`} className="line-clamp-2 text-[11px] font-semibold leading-4 text-slate-700">
            {item.title || item.label}: {item.body || item.value}
          </p>
        ))}
      </CardContent>
    </Card>
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

  if (element.kind === "shadcnBlock") {
    return <PortfolioCanvasShadcnBlock element={element} theme={theme} />;
  }

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
        selected ? "ring-1 ring-primary/20" : editable ? "hover:ring-1 hover:ring-primary/30" : ""
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
            wordBreak: "keep-all",
            overflowWrap: "break-word",
          }}
          spellCheck={false}
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
