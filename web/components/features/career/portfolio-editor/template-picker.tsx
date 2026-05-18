"use client";

import { LayoutTemplate } from "lucide-react";
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
  PORTFOLIO_TEMPLATES,
  getPortfolioTemplate,
  type PortfolioTemplateId,
} from "@/lib/career-portfolios";
import { cn } from "@/lib/utils";

type TemplatePickerProps = {
  templateId: PortfolioTemplateId;
  onChange: (nextId: PortfolioTemplateId) => void;
};

export function TemplatePicker({ templateId, onChange }: TemplatePickerProps) {
  const current = getPortfolioTemplate(templateId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-lg border-[#d8e4d0] bg-white/75 px-3 text-slate-700 hover:bg-white"
        >
          <span
            className="h-3.5 w-3.5 rounded-full ring-1 ring-slate-200"
            style={{ backgroundColor: current.theme.primary }}
            aria-hidden
          />
          <LayoutTemplate className="h-3.5 w-3.5" />
          <span className="text-xs font-bold">{current.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[120] w-80">
        <DropdownMenuLabel className="text-xs font-bold text-slate-500">
          템플릿 선택
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PORTFOLIO_TEMPLATES.map((template) => (
          <DropdownMenuItem
            key={template.id}
            className={cn(
              "flex items-start gap-3 py-2",
              template.id === current.id && "bg-primary/8",
            )}
            onSelect={() => onChange(template.id)}
          >
            <span
              className="mt-0.5 h-7 w-7 shrink-0 rounded-md ring-1 ring-slate-200"
              style={{
                background: `linear-gradient(135deg, ${template.theme.primary} 0 50%, ${template.theme.accent} 50% 100%)`,
              }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{template.name}</p>
              <p className="mt-0.5 text-[11px] font-semibold leading-[1.55] text-slate-500">
                {template.description}
              </p>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[11px] font-medium leading-snug text-slate-500">
          ※ 템플릿을 바꾼 뒤 저장하고 다시 AI 생성을 실행해야 페이지 흐름이 새 템플릿에 맞춰 만들어집니다.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
