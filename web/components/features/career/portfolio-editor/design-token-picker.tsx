"use client";

import { Palette, Type } from "lucide-react";
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
  PORTFOLIO_FONT_PAIRS,
  PORTFOLIO_PALETTES,
  applyPalette,
  getPortfolioFontPair,
  getPortfolioPalette,
  type PortfolioFontPairId,
  type PortfolioPaletteId,
  type PortfolioTheme,
} from "@/lib/career-portfolios";
import { cn } from "@/lib/utils";

type DesignTokenPickerProps = {
  theme: PortfolioTheme;
  onChange: (nextTheme: PortfolioTheme) => void;
};

export function DesignTokenPicker({ theme, onChange }: DesignTokenPickerProps) {
  const currentPalette = getPortfolioPalette(theme.paletteId);
  const currentFontPair = getPortfolioFontPair(theme.fontPairId);

  const handlePaletteChange = (paletteId: PortfolioPaletteId) => {
    onChange(applyPalette(theme, paletteId));
  };

  const handleFontChange = (fontPairId: PortfolioFontPairId) => {
    onChange({ ...theme, fontPairId });
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-lg border-[#d8e4d0] bg-white/75 px-3 text-slate-700 hover:bg-white"
          >
            <span
              className="h-3.5 w-3.5 rounded-full ring-1 ring-slate-200"
              style={{ backgroundColor: currentPalette.preview }}
              aria-hidden
            />
            <Palette className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{currentPalette.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[120] w-72">
          <DropdownMenuLabel className="text-xs font-bold text-slate-500">
            색 팔레트
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PORTFOLIO_PALETTES.map((palette) => (
            <DropdownMenuItem
              key={palette.id}
              className={cn(
                "gap-3 py-2",
                palette.id === currentPalette.id && "bg-primary/8",
              )}
              onSelect={() => handlePaletteChange(palette.id)}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-md ring-1 ring-slate-200"
                style={{
                  background: `linear-gradient(135deg, ${palette.theme.primary} 0 50%, ${palette.theme.accent} 50% 100%)`,
                }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{palette.name}</p>
                <p className="truncate text-[11px] font-medium text-slate-500">
                  {palette.description}
                </p>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-lg border-[#d8e4d0] bg-white/75 px-3 text-slate-700 hover:bg-white"
          >
            <Type className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{currentFontPair.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[120] w-80">
          <DropdownMenuLabel className="text-xs font-bold text-slate-500">
            폰트 페어링
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PORTFOLIO_FONT_PAIRS.map((pair) => (
            <DropdownMenuItem
              key={pair.id}
              className={cn(
                "flex flex-col items-start gap-1 py-2",
                pair.id === currentFontPair.id && "bg-primary/8",
              )}
              onSelect={() => handleFontChange(pair.id)}
            >
              <div className="flex w-full items-center gap-2">
                <span
                  className="text-base font-bold text-slate-900"
                  style={{ fontFamily: pair.heading }}
                >
                  Aa
                </span>
                <span
                  className="text-sm font-semibold text-slate-700"
                  style={{ fontFamily: pair.body }}
                >
                  김지원
                </span>
                <span className="ml-auto text-sm font-bold text-slate-900">
                  {pair.name}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                {pair.description}
              </p>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
