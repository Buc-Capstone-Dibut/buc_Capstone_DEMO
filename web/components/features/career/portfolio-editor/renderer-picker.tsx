"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PORTFOLIO_RENDERERS,
  getPortfolioRenderer,
  type PortfolioRendererId,
} from "@/lib/career-portfolios";
import { cn } from "@/lib/utils";

type RendererPickerProps = {
  rendererId?: PortfolioRendererId;
  onChange: (nextId: PortfolioRendererId | undefined) => void;
};

// 미구현 렌더러는 비활성화 표시 — 사용자에게 *준비 중* 임을 알림
const IMPLEMENTED: ReadonlySet<PortfolioRendererId> = new Set([
  "minimal-mono",
  "editorial-magazine",
  "brutalist-tech",
  "soft-pastel-card",
  "terminal-code",
  "notion-document",
  "gallery-mood",
]);

export function RendererPicker({ rendererId, onChange }: RendererPickerProps) {
  const current = getPortfolioRenderer(rendererId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-lg border-[#d8e4d0] bg-white/75 px-3 text-slate-700 hover:bg-white"
        >
          {current ? (
            <span
              className="h-3.5 w-3.5 rounded-full ring-1 ring-slate-200"
              style={{ backgroundColor: current.previewColors.primary }}
              aria-hidden
            />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          <span className="text-xs font-bold">
            {current ? current.name : "디자인 선택"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[120] w-[340px]">
        <DropdownMenuLabel className="text-xs font-bold text-slate-500">
          디자인 렌더러
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PORTFOLIO_RENDERERS.map((renderer) => {
          const implemented = IMPLEMENTED.has(renderer.id);
          return (
            <DropdownMenuItem
              key={renderer.id}
              disabled={!implemented}
              className={cn(
                "flex items-start gap-3 py-2",
                renderer.id === current?.id && "bg-primary/8",
                !implemented && "cursor-not-allowed opacity-55",
              )}
              onSelect={() => {
                if (!implemented) return;
                onChange(renderer.id);
              }}
            >
              <span
                className="mt-0.5 h-8 w-8 shrink-0 rounded-md ring-1 ring-slate-200"
                style={{
                  background: `linear-gradient(135deg, ${renderer.previewColors.primary} 0 50%, ${renderer.previewColors.accent} 50% 100%)`,
                }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{renderer.name}</p>
                  {!implemented ? (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                      준비 중
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px] font-semibold leading-[1.55] text-slate-500">
                  {renderer.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(
            "flex items-start gap-3 py-2",
            !rendererId && "bg-primary/8",
          )}
          onSelect={() => onChange(undefined)}
        >
          <span
            className="mt-0.5 h-8 w-8 shrink-0 rounded-md bg-slate-100 ring-1 ring-slate-200"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">기본 렌더러 (이전 디자인)</p>
            <p className="mt-0.5 text-[11px] font-semibold leading-[1.55] text-slate-500">
              지금까지 쓰던 기본 슬라이드 디자인.
            </p>
          </div>
        </DropdownMenuItem>
        <p className="px-2 py-2 text-[11px] font-medium leading-snug text-slate-500">
          ※ 디자인을 바꾸면 페이지 데이터는 그대로지만 시각이 완전히 달라집니다. 저장 후 새로고침.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
