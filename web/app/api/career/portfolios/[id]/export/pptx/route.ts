import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import pptxgen from "pptxgenjs";
import {
  PORTFOLIO_CANVAS_STYLE_VERSION,
  buildPortfolioSectionCanvas,
  getPortfolioPagePreset,
  normalizePortfolioDocument,
  polishPortfolioDocument,
  withPortfolioSampleImages,
  type PortfolioCanvasElement,
  type PortfolioDocument,
  type PortfolioImageSlot,
  type PortfolioTemplateId,
} from "@/lib/career-portfolios";
import {
  normalizePortfolioRowDocument,
  portfolioDelegate,
  type PortfolioRow,
} from "@/lib/server/career-portfolios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PptxSlide = ReturnType<InstanceType<typeof pptxgen>["addSlide"]>;

const SHAPE_TYPE = {
  line: "line",
  roundRect: "roundRect",
} as const;
const FALLBACK_TEXT = "#0f172a";
const FALLBACK_MUTED = "#64748b";

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}

function stripHash(color: string | undefined, fallback = FALLBACK_TEXT) {
  return (color || fallback).replace("#", "").slice(0, 6);
}

function toPptUnits(value: number, source: number, target: number) {
  return (value / source) * target;
}

function toPptRect(
  element: Pick<PortfolioCanvasElement, "x" | "y" | "width" | "height">,
  canvasWidth: number,
  canvasHeight: number,
  slideWidth: number,
  slideHeight: number,
) {
  return {
    x: toPptUnits(element.x, canvasWidth, slideWidth),
    y: toPptUnits(element.y, canvasHeight, slideHeight),
    w: toPptUnits(element.width, canvasWidth, slideWidth),
    h: toPptUnits(element.height, canvasHeight, slideHeight),
  };
}

function toFontSize(element: PortfolioCanvasElement, canvasHeight: number, slideHeight: number) {
  return Math.max(7, Math.round(toPptUnits(element.fontSize || 12, canvasHeight, slideHeight) * 1.22));
}

function toTextOptions(
  element: PortfolioCanvasElement,
  canvasWidth: number,
  canvasHeight: number,
  slideWidth: number,
  slideHeight: number,
): pptxgen.TextPropsOptions {
  return {
    ...toPptRect(element, canvasWidth, canvasHeight, slideWidth, slideHeight),
    fontFace: element.fontFamily === "mono" ? "Consolas" : "Pretendard",
    fontSize: toFontSize(element, canvasHeight, slideHeight),
    bold: (element.fontWeight || 400) >= 700,
    color: stripHash(element.color),
    valign: "middle",
    align: element.textAlign || "left",
    breakLine: false,
    margin: 0.03,
    fit: "shrink",
    transparency: element.opacity !== undefined ? Math.round((1 - element.opacity) * 100) : 0,
  };
}

function imagePathFromPublicUrl(url: string) {
  if (!url.startsWith("/")) return null;
  const pathname = url.split("?")[0];
  const filePath = path.join(process.cwd(), "public", pathname.replace(/^\/+/, ""));
  return existsSync(filePath) ? filePath : null;
}

async function imageDataFromSlot(image?: PortfolioImageSlot) {
  const url = image?.url;
  if (!url) return null;

  if (url.startsWith("data:")) return url;

  const localPath = imagePathFromPublicUrl(url);
  if (localPath) {
    const buffer = await readFile(localPath);
    const extension = path.extname(localPath).replace(".", "").toLowerCase() || "png";
    const mime = extension === "jpg" || extension === "jpeg" ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }

  if (/^https?:\/\//.test(url)) {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const mime = response.headers.get("content-type")?.split(";")[0] || "image/png";
      return `data:${mime};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
    } catch {
      return null;
    }
  }

  return null;
}

function addTextElement(
  slide: PptxSlide,
  element: PortfolioCanvasElement,
  canvasWidth: number,
  canvasHeight: number,
  slideWidth: number,
  slideHeight: number,
) {
  slide.addText(element.content || "", toTextOptions(element, canvasWidth, canvasHeight, slideWidth, slideHeight));
}

function addShapeElement(
  slide: PptxSlide,
  element: PortfolioCanvasElement,
  canvasWidth: number,
  canvasHeight: number,
  slideWidth: number,
  slideHeight: number,
) {
  const rect = toPptRect(element, canvasWidth, canvasHeight, slideWidth, slideHeight);
  if (element.kind === "line") {
    slide.addShape(SHAPE_TYPE.line, {
      x: rect.x,
      y: rect.y,
      w: rect.w || 0.01,
      h: rect.h || 0.01,
      line: { color: stripHash(element.stroke, FALLBACK_MUTED), width: 1 },
    });
    return;
  }

  slide.addShape(SHAPE_TYPE.roundRect, {
    ...rect,
    rectRadius: 0.04,
    fill: { color: stripHash(element.fill, "ffffff"), transparency: element.opacity !== undefined ? Math.round((1 - element.opacity) * 100) : 0 },
    line: { color: stripHash(element.stroke, "e2e8f0"), transparency: element.stroke ? 0 : 100 },
  });
}

function addMetricElement(
  slide: PptxSlide,
  element: PortfolioCanvasElement,
  canvasWidth: number,
  canvasHeight: number,
  slideWidth: number,
  slideHeight: number,
) {
  const rect = toPptRect(element, canvasWidth, canvasHeight, slideWidth, slideHeight);
  const accent = stripHash(element.stroke || element.fill, "84b946");
  slide.addShape(SHAPE_TYPE.roundRect, {
    ...rect,
    fill: { color: stripHash(element.fill, "ffffff") },
    line: { color: accent, transparency: 38 },
  });
  slide.addText(element.label || "Metric", {
    x: rect.x + 0.12,
    y: rect.y + 0.08,
    w: Math.max(0.2, rect.w - 0.24),
    h: rect.h * 0.34,
    fontSize: 8,
    bold: true,
    color: FALLBACK_MUTED.replace("#", ""),
    margin: 0,
    fit: "shrink",
  });
  slide.addText(element.value || "", {
    x: rect.x + 0.12,
    y: rect.y + rect.h * 0.42,
    w: Math.max(0.2, rect.w - 0.24),
    h: rect.h * 0.42,
    fontSize: Math.max(12, rect.h * 12),
    bold: true,
    color: accent,
    margin: 0,
    fit: "shrink",
  });
}

function addFlowElement(
  slide: PptxSlide,
  element: PortfolioCanvasElement,
  canvasWidth: number,
  canvasHeight: number,
  slideWidth: number,
  slideHeight: number,
) {
  const rect = toPptRect(element, canvasWidth, canvasHeight, slideWidth, slideHeight);
  const items = (element.items?.length ? element.items : ["문제", "해결", "결과"]).slice(0, 4);
  const gap = 0.08;
  const itemWidth = (rect.w - gap * (items.length - 1)) / items.length;
  items.forEach((item, index) => {
    const x = rect.x + index * (itemWidth + gap);
    slide.addShape(SHAPE_TYPE.roundRect, {
      x,
      y: rect.y,
      w: itemWidth,
      h: rect.h,
      fill: { color: stripHash(index % 2 ? element.fill : element.stroke, "eef6e8") },
      line: { color: stripHash(element.stroke, "84b946"), transparency: 50 },
    });
    slide.addText(item, {
      x: x + 0.08,
      y: rect.y + 0.08,
      w: Math.max(0.2, itemWidth - 0.16),
      h: Math.max(0.2, rect.h - 0.16),
      fontSize: 9,
      bold: true,
      color: FALLBACK_TEXT.replace("#", ""),
      margin: 0,
      align: "center",
      valign: "middle",
      fit: "shrink",
    });
  });
}

function addBlockElement(
  slide: PptxSlide,
  element: PortfolioCanvasElement,
  canvasWidth: number,
  canvasHeight: number,
  slideWidth: number,
  slideHeight: number,
) {
  const rect = toPptRect(element, canvasWidth, canvasHeight, slideWidth, slideHeight);
  const accent = stripHash(element.stroke, "84b946");
  const items = (element.props?.items || []).filter((item) => item.title || item.label || item.body || item.value).slice(0, 4);
  slide.addShape(SHAPE_TYPE.roundRect, {
    ...rect,
    fill: { color: stripHash(element.fill, "ffffff"), transparency: 4 },
    line: { color: accent, transparency: 45 },
  });
  if (element.props?.title) {
    slide.addText(element.props.title, {
      x: rect.x + 0.14,
      y: rect.y + 0.1,
      w: Math.max(0.2, rect.w - 0.28),
      h: 0.22,
      fontSize: 9,
      bold: true,
      color: accent,
      margin: 0,
      fit: "shrink",
    });
  }
  const top = rect.y + (element.props?.title ? 0.42 : 0.16);
  const gap = 0.08;
  const count = Math.max(1, items.length);
  const cardWidth = element.variant === "timeline-steps" || element.variant === "project-index-cards"
    ? rect.w - 0.28
    : (rect.w - 0.28 - gap * (count - 1)) / count;

  items.forEach((item, index) => {
    const isList = element.variant === "timeline-steps" || element.variant === "project-index-cards";
    const x = isList ? rect.x + 0.14 : rect.x + 0.14 + index * (cardWidth + gap);
    const y = isList ? top + index * 0.44 : top;
    const h = isList ? 0.36 : Math.max(0.3, rect.h - (top - rect.y) - 0.18);
    slide.addShape(SHAPE_TYPE.roundRect, {
      x,
      y,
      w: cardWidth,
      h,
      fill: { color: "ffffff", transparency: 8 },
      line: { color: "e2e8f0", transparency: 10 },
    });
    slide.addText(item.value || item.title || item.label || `0${index + 1}`, {
      x: x + 0.08,
      y: y + 0.06,
      w: Math.max(0.2, cardWidth - 0.16),
      h: isList ? 0.12 : 0.24,
      fontSize: isList ? 7 : 9,
      bold: true,
      color: accent,
      margin: 0,
      fit: "shrink",
    });
    if (item.body) {
      slide.addText(item.body, {
        x: x + 0.08,
        y: y + (isList ? 0.19 : 0.34),
        w: Math.max(0.2, cardWidth - 0.16),
        h: Math.max(0.12, h - (isList ? 0.22 : 0.38)),
        fontSize: 6.5,
        color: FALLBACK_TEXT.replace("#", ""),
        margin: 0,
        fit: "shrink",
      });
    }
  });
}

async function addImageElement(
  slide: PptxSlide,
  element: PortfolioCanvasElement,
  canvasWidth: number,
  canvasHeight: number,
  slideWidth: number,
  slideHeight: number,
) {
  const rect = toPptRect(element, canvasWidth, canvasHeight, slideWidth, slideHeight);
  const data = await imageDataFromSlot(element.image);
  if (!data) {
    slide.addShape(SHAPE_TYPE.roundRect, {
      ...rect,
      fill: { color: "eef2f7" },
      line: { color: "cbd5e1", transparency: 35 },
    });
    slide.addText(element.image?.alt || "Image", {
      ...rect,
      fontSize: 10,
      bold: true,
      color: FALLBACK_MUTED.replace("#", ""),
      align: "center",
      valign: "middle",
      fit: "shrink",
    });
    return;
  }
  slide.addImage({ data, ...rect });
}

function getCanvasElements(section: PortfolioDocument["sections"][number], document: PortfolioDocument) {
  if (
    section.canvas?.styleVersion === PORTFOLIO_CANVAS_STYLE_VERSION &&
    section.canvas.elements?.length
  ) {
    return section.canvas;
  }
  return buildPortfolioSectionCanvas(section, document);
}

async function createPptxBuffer(document: PortfolioDocument, title: string) {
  const pptx = new pptxgen();
  const preset = getPortfolioPagePreset(document.pageSize || "16:9");
  const slideWidth = document.pageSize === "a4" ? 7.5 : 13.333;
  const slideHeight = document.pageSize === "a4" ? 10.607 : 7.5;
  pptx.defineLayout({ name: "PORTFOLIO_CANVAS", width: slideWidth, height: slideHeight });
  pptx.layout = "PORTFOLIO_CANVAS";
  pptx.author = "Dibut";
  pptx.company = "Dibut";
  pptx.subject = "AI generated developer portfolio";
  pptx.title = title;
  pptx.theme = {
    headFontFace: "Pretendard",
    bodyFontFace: "Pretendard",
  };

  for (const section of document.sections.filter((item) => item.visible !== false)) {
    const slide = pptx.addSlide();
    slide.background = { color: stripHash(document.theme.background, "f8fafc") };
    const canvas = getCanvasElements(section, document);
    const canvasWidth = canvas?.width || preset.width;
    const canvasHeight = canvas?.height || preset.height;
    const elements = canvas?.elements || [];

    for (const element of elements) {
      if (element.kind === "text" || element.kind === "tags") {
        addTextElement(slide, element, canvasWidth, canvasHeight, slideWidth, slideHeight);
      } else if (element.kind === "image" || element.kind === "techLogo") {
        await addImageElement(slide, element, canvasWidth, canvasHeight, slideWidth, slideHeight);
      } else if (element.kind === "metric") {
        addMetricElement(slide, element, canvasWidth, canvasHeight, slideWidth, slideHeight);
      } else if (element.kind === "flow" || element.kind === "timeline") {
        addFlowElement(slide, element, canvasWidth, canvasHeight, slideWidth, slideHeight);
      } else if (element.kind === "shadcnBlock") {
        addBlockElement(slide, element, canvasWidth, canvasHeight, slideWidth, slideHeight);
      } else {
        addShapeElement(slide, element, canvasWidth, canvasHeight, slideWidth, slideHeight);
      }
    }
  }

  return pptx.write({ outputType: "nodebuffer" }) as unknown as Promise<Buffer>;
}

function assertValidPptxBuffer(buffer: Buffer, expectedSlideCount: number) {
  const requiredEntries = [
    "[Content_Types].xml",
    "ppt/presentation.xml",
    "ppt/slides/slide1.xml",
  ];
  const startsWithZipSignature = buffer.subarray(0, 2).toString("utf8") === "PK";
  const hasRequiredEntries = requiredEntries.every((entry) =>
    buffer.includes(Buffer.from(entry, "utf8")),
  );

  if (!startsWithZipSignature || !hasRequiredEntries || buffer.byteLength < 10_000) {
    throw new Error("PPTX 파일 구조 검증에 실패했습니다.");
  }

  if (expectedSlideCount > 0) {
    const expectedLastSlide = `ppt/slides/slide${expectedSlideCount}.xml`;
    if (!buffer.includes(Buffer.from(expectedLastSlide, "utf8"))) {
      throw new Error("PPTX 슬라이드 개수 검증에 실패했습니다.");
    }
  }
}

function downloadFilename(title: string) {
  const normalized = title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${normalized || "portfolio"}.pptx`;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = (await portfolioDelegate().findFirst({
    where: { id: params.id, user_id: user.id },
  })) as PortfolioRow | null;

  if (!row) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  const document = polishPortfolioDocument(
    withPortfolioSampleImages(
      normalizePortfolioDocument(normalizePortfolioRowDocument(row), row.template_id as PortfolioTemplateId),
    ),
  );
  const buffer = await createPptxBuffer(document, row.title);
  const slideCount = document.sections.filter((item) => item.visible !== false).length;
  assertValidPptxBuffer(buffer, slideCount);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadFilename(row.title))}`,
      "Cache-Control": "no-store",
      "X-Portfolio-Slide-Count": String(slideCount),
    },
  });
}
