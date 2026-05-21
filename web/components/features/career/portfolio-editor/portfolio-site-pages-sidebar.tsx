"use client";

/**
 * 웹슬라이드 편집기 좌측 사이드바.
 * - 페이지 카드 리스트 + 활성 표시
 * - 드래그 순서 변경 (@dnd-kit/sortable)
 * - 표시/숨김 토글, 삭제, 추가
 */

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PortfolioSitePage, PortfolioSitePageType } from "@/lib/career-portfolios";

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

type Props = {
  pages: PortfolioSitePage[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onReorderPages: (orderedIds: string[]) => void;
  onToggleVisibility: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onAddPage: (type: PortfolioSitePageType) => void;
  disabled?: boolean;
};

export function PortfolioSitePagesSidebar({
  pages,
  activePageId,
  onSelectPage,
  onReorderPages,
  onToggleVisibility,
  onDeletePage,
  onAddPage,
  disabled,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [addOpen, setAddOpen] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pages.findIndex((p) => p.id === active.id);
    const newIndex = pages.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(pages, oldIndex, newIndex).map((p) => p.id);
    onReorderPages(next);
  };

  return (
    <aside
      className="flex h-full w-[280px] shrink-0 flex-col border-r border-[#d8e4d0]/80 bg-white/82 backdrop-blur-xl"
      aria-label="슬라이드 페이지 목록"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#d8e4d0]/60 px-4">
        <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#6f7d66]">
          슬라이드 {pages.length}
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            disabled={disabled}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/30 bg-primary/8 text-primary transition hover:bg-primary/14 disabled:opacity-40"
            aria-label="슬라이드 추가"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {addOpen ? (
            <div
              className="absolute right-0 top-8 z-[5] w-[200px] overflow-hidden rounded-lg border border-[#d8e4d0] bg-white shadow-lg"
              onMouseLeave={() => setAddOpen(false)}
            >
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                페이지 타입 선택
              </p>
              {(Object.keys(PAGE_TYPE_LABEL) as PortfolioSitePageType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onAddPage(type);
                    setAddOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-[12px] font-semibold text-slate-700 transition hover:bg-primary/8 hover:text-primary"
                >
                  {PAGE_TYPE_LABEL[type]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {pages.map((page, i) => (
                <SortablePageItem
                  key={page.id}
                  page={page}
                  index={i}
                  active={page.id === activePageId}
                  onSelect={() => onSelectPage(page.id)}
                  onToggleVisibility={() => onToggleVisibility(page.id)}
                  onDelete={() => {
                    if (pages.length <= 1) {
                      alert("마지막 슬라이드는 삭제할 수 없습니다.");
                      return;
                    }
                    if (confirm(`"${page.title}" 슬라이드를 삭제할까요?`)) {
                      onDeletePage(page.id);
                    }
                  }}
                  disabled={disabled}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    </aside>
  );
}

function SortablePageItem({
  page,
  index,
  active,
  onSelect,
  onToggleVisibility,
  onDelete,
  disabled,
}: {
  page: PortfolioSitePage;
  index: number;
  active: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
    disabled,
  });
  const hidden = page.visible === false;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn(
        "group relative flex items-center gap-2 rounded-lg border transition",
        active
          ? "border-primary/40 bg-primary/8"
          : "border-transparent bg-white/0 hover:bg-slate-50",
        hidden && !active ? "opacity-60" : "",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-full w-5 shrink-0 cursor-grab items-center justify-center text-slate-300 transition hover:text-slate-500 group-hover:opacity-100 sm:opacity-50"
        aria-label="드래그하여 순서 변경"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pr-2 text-left"
      >
        <span
          className={cn(
            "flex h-7 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-black tabular-nums",
            active ? "bg-primary text-white" : "bg-slate-100 text-slate-500",
          )}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-[12.5px] font-bold",
              active ? "text-primary" : "text-slate-800",
            )}
          >
            {page.title || PAGE_TYPE_LABEL[page.type]}
          </p>
          <p className="truncate text-[10.5px] font-semibold text-slate-400">
            {PAGE_TYPE_LABEL[page.type]}
            {hidden ? " · 숨김" : ""}
          </p>
        </div>
      </button>
      <div className="flex shrink-0 items-center pr-1.5 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={onToggleVisibility}
          disabled={disabled}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={hidden ? "표시" : "숨김"}
          title={hidden ? "표시로 전환" : "숨김으로 전환"}
        >
          {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          aria-label="삭제"
          title="삭제"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}
