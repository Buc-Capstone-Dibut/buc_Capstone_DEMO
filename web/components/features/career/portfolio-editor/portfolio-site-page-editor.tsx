"use client";

/**
 * 웹슬라이드 편집기의 우측 패널.
 *
 * 활성 페이지의 텍스트(title/subtitle/eyebrow/narrative/emphasis) +
 * 블록 리스트(text/tags/metric/callout/timeline/flow/matrix/contribution)를
 * 추가/수정/삭제할 수 있게 한다.
 *
 * AI 페이지 재생성 버튼은 이 패널 헤더에 함께 배치.
 */

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eraser,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  PortfolioSiteBlock,
  PortfolioSiteBlockType,
  PortfolioSitePage,
  PortfolioSitePageType,
} from "@/lib/career-portfolios";

const PAGE_TYPE_LABEL: Record<PortfolioSitePageType, string> = {
  cover: "표지",
  profile: "프로필",
  skills: "기술",
  "project-index": "프로젝트 목차",
  "case-study": "케이스 스터디",
  "project-detail": "프로젝트 상세",
  experience: "경력",
  retrospective: "회고/성장",
  contact: "연락처",
};

const BLOCK_TYPE_LABEL: Record<PortfolioSiteBlockType, string> = {
  text: "텍스트 단락",
  tags: "태그 묶음",
  metric: "수치 강조",
  callout: "인용 블록",
  timeline: "타임라인",
  flow: "단계 흐름",
  matrix: "키워드 매트릭스",
  contribution: "기여도/지표",
  image: "이미지",
};

type Props = {
  page: PortfolioSitePage | null;
  onPatch: (patch: Partial<PortfolioSitePage>) => void;
  onRegenerate?: (instruction?: string) => void;
  isRegenerating?: boolean;
  disabled?: boolean;
};

export function PortfolioSitePageEditor({
  page,
  onPatch,
  onRegenerate,
  isRegenerating,
  disabled,
}: Props) {
  if (!page) {
    return (
      <aside className="flex h-full w-[340px] shrink-0 flex-col items-center justify-center border-l border-[#d8e4d0]/80 bg-white/82 p-6 text-center text-sm text-slate-500 backdrop-blur-xl">
        편집할 슬라이드를 좌측에서 선택하세요.
      </aside>
    );
  }

  const handleBlockPatch = (blockId: string, patch: Partial<PortfolioSiteBlock>) => {
    onPatch({
      blocks: page.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    });
  };

  const handleBlockDelete = (blockId: string) => {
    onPatch({ blocks: page.blocks.filter((b) => b.id !== blockId) });
  };

  const handleBlockReorder = (blockId: string, direction: -1 | 1) => {
    const idx = page.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= page.blocks.length) return;
    const next = [...page.blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    onPatch({ blocks: next });
  };

  const handleBlockAdd = (type: PortfolioSiteBlockType) => {
    const newBlock: PortfolioSiteBlock = makeEmptyBlock(type);
    onPatch({ blocks: [...page.blocks, newBlock] });
  };

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-[#d8e4d0]/80 bg-white/82 backdrop-blur-xl">
      {/* 헤더 */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#d8e4d0]/60 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#6f7d66]">
            편집
          </p>
          <span className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-bold text-primary">
            {PAGE_TYPE_LABEL[page.type]}
          </span>
        </div>
        {onRegenerate ? (
          <RegenerateMenu onRegenerate={onRegenerate} isRegenerating={isRegenerating} disabled={disabled} />
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {/* 기본 정보 */}
        <Section title="기본 정보">
          <Field label="제목">
            <Input
              value={page.title || ""}
              onChange={(e) => onPatch({ title: e.target.value })}
              placeholder="슬라이드 제목"
              disabled={disabled}
              className="h-9 rounded-lg border-[#d8e4d0] bg-white/86 text-[13px] font-bold text-slate-900"
            />
          </Field>
          <Field label="부제">
            <Input
              value={page.subtitle || ""}
              onChange={(e) => onPatch({ subtitle: e.target.value })}
              placeholder="(선택) 부제"
              disabled={disabled}
              className="h-9 rounded-lg border-[#d8e4d0] bg-white/86 text-[13px] text-slate-800"
            />
          </Field>
          <Field label="Eyebrow (상단 라벨)">
            <Input
              value={page.eyebrow || ""}
              onChange={(e) => onPatch({ eyebrow: e.target.value })}
              placeholder="(선택) 케이스 스터디 / About / ..."
              disabled={disabled}
              className="h-9 rounded-lg border-[#d8e4d0] bg-white/86 text-[12px] text-slate-700"
            />
          </Field>
          <Field label="본문 narrative">
            <textarea
              value={page.narrative || ""}
              onChange={(e) => onPatch({ narrative: e.target.value })}
              placeholder="이 슬라이드의 메인 본문 텍스트"
              disabled={disabled}
              className="min-h-[88px] w-full rounded-lg border border-[#d8e4d0] bg-white/86 px-3 py-2 text-[13px] leading-6 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
          <Field label="강조 키워드 (쉼표로 구분)">
            <Input
              value={(page.emphasis || []).join(", ")}
              onChange={(e) =>
                onPatch({
                  emphasis: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="예: React, GSAP, AI"
              disabled={disabled}
              className="h-9 rounded-lg border-[#d8e4d0] bg-white/86 text-[12px] text-slate-700"
            />
          </Field>
        </Section>

        {/* 블록 */}
        <Section
          title={`블록 ${page.blocks.length}`}
          right={
            <AddBlockMenu onAdd={handleBlockAdd} disabled={disabled} />
          }
        >
          {page.blocks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#d8e4d0] bg-white/40 px-3 py-4 text-center text-[12px] text-slate-400">
              아직 블록이 없습니다. 우측 + 버튼으로 추가하세요.
            </p>
          ) : (
            <ul className="space-y-2">
              {page.blocks.map((block, i) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  index={i}
                  total={page.blocks.length}
                  onPatch={(patch) => handleBlockPatch(block.id, patch)}
                  onDelete={() => handleBlockDelete(block.id)}
                  onMoveUp={() => handleBlockReorder(block.id, -1)}
                  onMoveDown={() => handleBlockReorder(block.id, 1)}
                  disabled={disabled}
                />
              ))}
            </ul>
          )}
        </Section>
      </div>
    </aside>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 블록 카드 — 타입별 입력 폼
// ──────────────────────────────────────────────────────────────────────────

function BlockCard({
  block,
  index,
  total,
  onPatch,
  onDelete,
  onMoveUp,
  onMoveDown,
  disabled,
}: {
  block: PortfolioSiteBlock;
  index: number;
  total: number;
  onPatch: (patch: Partial<PortfolioSiteBlock>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <li className="rounded-lg border border-[#d8e4d0] bg-white/72">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-7 flex-1 items-center gap-2 rounded-md px-2 text-left text-[12px] font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-black text-primary">
            {index + 1}
          </span>
          <span className="flex-1">{BLOCK_TYPE_LABEL[block.type]}</span>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </button>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={disabled || index === 0}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
          aria-label="위로"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={disabled || index >= total - 1}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
          aria-label="아래로"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          aria-label="삭제"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {open ? (
        <div className="space-y-2 border-t border-[#d8e4d0] px-3 py-2.5">
          <BlockFields block={block} onPatch={onPatch} disabled={disabled} />
        </div>
      ) : null}
    </li>
  );
}

function BlockFields({
  block,
  onPatch,
  disabled,
}: {
  block: PortfolioSiteBlock;
  onPatch: (patch: Partial<PortfolioSiteBlock>) => void;
  disabled?: boolean;
}) {
  switch (block.type) {
    case "text":
      return (
        <>
          <Field label="라벨 (선택)">
            <Input
              value={block.label || ""}
              onChange={(e) => onPatch({ label: e.target.value })}
              placeholder="예: 문제 / 역할 / 해결"
              disabled={disabled}
              className="h-8 rounded-lg border-[#d8e4d0] bg-white/86 text-[12px]"
            />
          </Field>
          <Field label="본문">
            <textarea
              value={block.content || ""}
              onChange={(e) => onPatch({ content: e.target.value })}
              placeholder="본문 텍스트"
              disabled={disabled}
              className="min-h-[72px] w-full rounded-lg border border-[#d8e4d0] bg-white/86 px-3 py-2 text-[12.5px] leading-6 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </Field>
        </>
      );
    case "callout":
      return (
        <Field label="인용 내용">
          <textarea
            value={block.content || ""}
            onChange={(e) => onPatch({ content: e.target.value })}
            placeholder="강조하고 싶은 한 줄"
            disabled={disabled}
            className="min-h-[72px] w-full rounded-lg border border-[#d8e4d0] bg-white/86 px-3 py-2 text-[12.5px] leading-6 italic text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
      );
    case "metric":
      return (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="수치">
              <Input
                value={block.value || ""}
                onChange={(e) => onPatch({ value: e.target.value })}
                placeholder="예: 32%"
                disabled={disabled}
                className="h-8 rounded-lg border-[#d8e4d0] bg-white/86 text-[12px] font-bold"
              />
            </Field>
            <Field label="라벨">
              <Input
                value={block.label || ""}
                onChange={(e) => onPatch({ label: e.target.value })}
                placeholder="예: 전환율 상승"
                disabled={disabled}
                className="h-8 rounded-lg border-[#d8e4d0] bg-white/86 text-[12px]"
              />
            </Field>
          </div>
          <Field label="설명 caption">
            <Input
              value={block.caption || ""}
              onChange={(e) => onPatch({ caption: e.target.value })}
              placeholder="(선택) 보조 설명"
              disabled={disabled}
              className="h-8 rounded-lg border-[#d8e4d0] bg-white/86 text-[12px]"
            />
          </Field>
        </>
      );
    case "tags":
    case "timeline":
    case "flow":
    case "matrix":
      return (
        <Field label={`항목 (한 줄에 하나씩)`}>
          <textarea
            value={(block.items || []).join("\n")}
            onChange={(e) =>
              onPatch({
                items: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder={"항목 1\n항목 2\n항목 3"}
            disabled={disabled}
            className="min-h-[96px] w-full rounded-lg border border-[#d8e4d0] bg-white/86 px-3 py-2 text-[12.5px] leading-6 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </Field>
      );
    case "contribution":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field label="라벨">
            <Input
              value={block.label || ""}
              onChange={(e) => onPatch({ label: e.target.value })}
              placeholder="예: 프론트엔드 설계"
              disabled={disabled}
              className="h-8 rounded-lg border-[#d8e4d0] bg-white/86 text-[12px]"
            />
          </Field>
          <Field label="값">
            <Input
              value={block.value || ""}
              onChange={(e) => onPatch({ value: e.target.value })}
              placeholder="예: 70%"
              disabled={disabled}
              className="h-8 rounded-lg border-[#d8e4d0] bg-white/86 text-[12px] font-bold"
            />
          </Field>
        </div>
      );
    case "image":
      return (
        <p className="px-1 text-[11px] text-slate-400">
          이미지 블록은 추후 업로드 UI 와 함께 지원 예정입니다.
        </p>
      );
    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 작은 helper 컴포넌트
// ──────────────────────────────────────────────────────────────────────────

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {title}
        </p>
        {right}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-semibold text-slate-500">{label}</p>
      {children}
    </div>
  );
}

function AddBlockMenu({
  onAdd,
  disabled,
}: {
  onAdd: (type: PortfolioSiteBlockType) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const types: PortfolioSiteBlockType[] = [
    "text",
    "callout",
    "metric",
    "tags",
    "flow",
    "timeline",
    "matrix",
    "contribution",
  ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex h-7 items-center gap-1 rounded-md border border-primary/30 bg-primary/8 px-2 text-[11px] font-bold text-primary transition hover:bg-primary/14 disabled:opacity-40"
      >
        <Plus className="h-3 w-3" />
        블록 추가
      </button>
      {open ? (
        <div
          className="absolute right-0 top-9 z-10 w-[180px] overflow-hidden rounded-lg border border-[#d8e4d0] bg-white shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onAdd(t);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-primary/8 hover:text-primary"
            >
              {BLOCK_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RegenerateMenu({
  onRegenerate,
  isRegenerating,
  disabled,
}: {
  onRegenerate: (instruction?: string) => void;
  isRegenerating?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  return (
    <div className="relative">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || isRegenerating}
        size="sm"
        className={cn(
          "h-7 gap-1.5 rounded-md bg-primary px-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-primary/90",
        )}
      >
        <Sparkles className="h-3 w-3" />
        {isRegenerating ? "재생성 중…" : "AI 재생성"}
      </Button>
      {open ? (
        <div
          className="absolute right-0 top-9 z-20 w-[240px] overflow-hidden rounded-lg border border-[#d8e4d0] bg-white p-2 shadow-lg"
        >
          <p className="px-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            이 페이지를 다시 만들기
          </p>
          <div className="mt-1 space-y-1">
            {[
              { label: "그대로 다시 만들기", instruction: undefined },
              { label: "더 짧게 / 핵심만", instruction: "더 짧고 핵심적인 톤으로 줄여줘." },
              { label: "더 임팩트 있게", instruction: "더 강한 임팩트와 시각적 강조가 있는 톤으로 다시 작성해줘." },
              { label: "더 캐주얼하게", instruction: "더 캐주얼하고 친근한 톤으로 다시 작성해줘." },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onRegenerate(preset.instruction);
                  setOpen(false);
                }}
                className="block w-full rounded-md px-2 py-1.5 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-primary/8 hover:text-primary"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mt-2 border-t pt-2">
            <p className="px-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              직접 입력
            </p>
            <textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="예: 데이터 정합성 강조"
              className="mt-1 h-16 w-full rounded-md border border-[#d8e4d0] bg-white px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="mt-1 flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setCustom("")}
                className="flex h-6 items-center gap-1 rounded px-1.5 text-[10px] text-slate-400 hover:text-slate-600"
              >
                <Eraser className="h-3 w-3" /> 비우기
              </button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onRegenerate(custom.trim() || undefined);
                  setCustom("");
                  setOpen(false);
                }}
                className="h-6 gap-1 rounded-md bg-primary px-2 text-[10.5px] font-bold text-white"
              >
                <Sparkles className="h-3 w-3" />
                실행
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 block w-full rounded-md py-1 text-center text-[10px] font-semibold text-slate-400 hover:text-slate-600"
          >
            닫기
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// 빈 블록 기본값
// ──────────────────────────────────────────────────────────────────────────

function makeEmptyBlock(type: PortfolioSiteBlockType): PortfolioSiteBlock {
  const id = `block-${Date.now().toString(36)}-${Math.floor(Math.random() * 9999)}`;
  switch (type) {
    case "text":
      return { id, type, content: "", label: "" };
    case "callout":
      return { id, type, content: "" };
    case "metric":
      return { id, type, value: "", label: "", caption: "" };
    case "tags":
    case "timeline":
    case "flow":
    case "matrix":
      return { id, type, items: [] };
    case "contribution":
      return { id, type, label: "", value: "" };
    case "image":
      return { id, type };
    default:
      return { id, type };
  }
}
