"use client";

import type { NeonEditorialTokens } from "../../templates/neon-editorial/types";

type Setter = (updater: (prev: NeonEditorialTokens) => NeonEditorialTokens) => void;

// Debut 그린을 첫 프리셋으로 — 라이트(사이트 톤) 배경과 한 세트.
const ACCENT_PRESETS = ["#82B84C", "#39FF14", "#FF3D00", "#FFEB3B", "#00E5FF", "#E040FB"];

const BG_OPTIONS: Array<{ id: NeonEditorialTokens["bg"]; label: string; hint: string }> = [
  { id: "light", label: "라이트", hint: "Debut 사이트 톤" },
  { id: "dark", label: "다크", hint: "네온 에디토리얼" },
];

export function TokensPanel({ value, onChange }: { value: NeonEditorialTokens; onChange: Setter }) {
  return (
    <div className="space-y-6 text-xs">
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Background</h3>
        <div className="grid grid-cols-2 overflow-hidden rounded border border-slate-300">
          {BG_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange((p) => ({ ...p, bg: option.id }))}
              className={`px-2 py-1.5 text-xs font-bold ${
                value.bg === option.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option.label}
              <span className={`block text-[9px] font-semibold ${value.bg === option.id ? "text-slate-300" : "text-slate-400"}`}>
                {option.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Accent</h3>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value.accent}
            onChange={(e) => onChange((p) => ({ ...p, accent: e.target.value.toUpperCase() }))}
            className="h-9 w-9 cursor-pointer rounded border border-slate-300"
          />
          <input
            type="text"
            value={value.accent}
            onChange={(e) => onChange((p) => ({ ...p, accent: e.target.value }))}
            className="flex-1 rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
          />
        </div>
        <div className="mt-2 flex gap-1.5">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange((p) => ({ ...p, accent: c }))}
              className="h-6 w-6 rounded border border-slate-300"
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Density</h3>
        <div className="grid grid-cols-3 overflow-hidden rounded border border-slate-300">
          {(["spacious", "balanced", "compact"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange((p) => ({ ...p, density: d }))}
              className={`px-2 py-1.5 text-xs font-bold ${
                value.density === d ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
