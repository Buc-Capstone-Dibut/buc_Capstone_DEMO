import type { FaceSample } from "@/lib/interview/face/face-metrics";

export function sampleAtTime(samples: FaceSample[], tMs: number): FaceSample | null {
  if (samples.length === 0) return null;
  const hi0 = samples.length - 1;
  if (tMs <= samples[0].tMs) return samples[0];
  if (tMs >= samples[hi0].tMs) return samples[hi0];
  let lo = 0, hi = hi0;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].tMs < tMs) lo = mid + 1;
    else hi = mid;
  }
  const a = samples[lo - 1], b = samples[lo];
  return tMs - a.tMs <= b.tMs - tMs ? a : b;
}

export interface ContentRect { offsetX: number; offsetY: number; width: number; height: number }

export function letterboxRect(natW: number, natH: number, elemW: number, elemH: number): ContentRect {
  if (natW <= 0 || natH <= 0) return { offsetX: 0, offsetY: 0, width: elemW, height: elemH };
  const scale = Math.min(elemW / natW, elemH / natH);
  const width = natW * scale, height = natH * scale;
  return { offsetX: (elemW - width) / 2, offsetY: (elemH - height) / 2, width, height };
}

export function awayAtTime(awaySegments: Array<[number, number]>, tMs: number): boolean {
  return awaySegments.some(([s, e]) => tMs >= s && tMs <= e);
}
