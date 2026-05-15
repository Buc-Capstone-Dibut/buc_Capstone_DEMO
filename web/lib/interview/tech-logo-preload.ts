/**
 * 기술 로고(SVG) 를 html2canvas-pro 가 안정적으로 캡쳐할 수 있도록 PNG data URI 로
 * 미리 변환·캐싱한다.
 *
 * 왜 PNG 변환이 필요한가:
 *   tech-logos 디렉토리의 SVG 들은 `width`/`height` 속성 없이 `viewBox` 만 가지고 있다.
 *   html2canvas 가 `<img src=data:svg>` 를 캔버스에 그릴 때 `img.naturalWidth/Height`
 *   를 그리기 size 로 쓰는데, 그 값이 0 으로 보고돼 빈 칸으로 캡쳐된다.
 *   브라우저 canvas API 로 SVG 를 PNG 로 한 번 라스터화해 두면 이 문제가 사라진다.
 */
import { getTechLogo } from "@/lib/interview/tech-logos";

const cache = new Map<string, string>();

// retina 해상도 대비 — chip 안 4×4 영역에 들어가지만 PDF 가 2배 scale 로 캡쳐하므로
// 64×64 로 라스터화해두면 어떤 zoom 에서도 또렷하다.
const PNG_SIZE = 64;

/**
 * SVG 텍스트에 width/height 가 없으면 PNG_SIZE 로 주입. naturalWidth/Height 가 0 이
 * 되는 것을 막아 canvas drawImage 가 제대로 동작하게 한다.
 */
function ensureSvgDimensions(svgText: string): string {
  if (/\bwidth\s*=/.test(svgText) && /\bheight\s*=/.test(svgText)) return svgText;
  // <svg ...> 의 첫 매칭만 갈아끼움
  return svgText.replace(
    /<svg\b([^>]*)>/i,
    (_match, attrs: string) => {
      const hasWidth = /\bwidth\s*=/.test(attrs);
      const hasHeight = /\bheight\s*=/.test(attrs);
      const extras = [
        hasWidth ? "" : `width="${PNG_SIZE}"`,
        hasHeight ? "" : `height="${PNG_SIZE}"`,
      ]
        .filter(Boolean)
        .join(" ");
      return `<svg${attrs} ${extras}>`;
    },
  );
}

/**
 * SVG 텍스트 → 64×64 PNG data URI.
 * 브라우저 canvas 에서 라스터화. 서버 사이드에서는 호출되지 않아야 한다 (window 필요).
 */
async function rasterizeSvgToPngDataUri(svgText: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const normalized = ensureSvgDimensions(svgText);
  const blob = new Blob([normalized], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg image load failed"));
    });
    const canvas = document.createElement("canvas");
    canvas.width = PNG_SIZE;
    canvas.height = PNG_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // 투명 배경 유지하면서 그리기
    ctx.clearRect(0, 0, PNG_SIZE, PNG_SIZE);
    ctx.drawImage(img, 0, 0, PNG_SIZE, PNG_SIZE);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * 단일 라벨의 로고 → PNG data URI. 동일 라벨은 캐시 재사용. 사전에 없으면 null.
 */
export async function fetchLogoDataUri(label: string): Promise<string | null> {
  const meta = getTechLogo(label);
  if (!meta) return null;
  if (cache.has(meta.src)) return cache.get(meta.src)!;
  try {
    const res = await fetch(meta.src);
    if (!res.ok) return null;
    const text = await res.text();
    const png = await rasterizeSvgToPngDataUri(text);
    if (!png) return null;
    cache.set(meta.src, png);
    return png;
  } catch {
    return null;
  }
}

/**
 * 여러 라벨을 병렬로 fetch + 라스터화 → `{ [label]: pngDataUri }` 맵으로 반환.
 * PDF 생성 직전 한 번 호출하면 모든 chip 의 로고가 빈 칸 없이 PNG 로 박힌다.
 */
export async function preloadLogosForLabels(
  labels: string[],
): Promise<Record<string, string>> {
  const unique = Array.from(
    new Set(labels.map((l) => l.trim()).filter(Boolean)),
  );
  const entries = await Promise.all(
    unique.map(async (label) => {
      const uri = await fetchLogoDataUri(label);
      return uri ? ([label, uri] as const) : null;
    }),
  );
  return Object.fromEntries(entries.filter((e): e is [string, string] => e !== null));
}
