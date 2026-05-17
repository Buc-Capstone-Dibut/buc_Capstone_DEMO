"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { NeonEditorialContent } from "../../templates/neon-editorial/types";

type Setter = (updater: (prev: NeonEditorialContent) => NeonEditorialContent) => void;
// NeonEditorialContent.projects is `Record<string, any>[]` (zod z.record schema).
// We keep the panel's internal type aligned so the array stays assignable.
type ProjectItem = NeonEditorialContent["projects"][number];

type ProjectsPanelProps = {
  value: NeonEditorialContent;
  onChange: Setter;
  portfolioId: string;
};

export function ProjectsPanel({ value, onChange, portfolioId }: ProjectsPanelProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [allTimeline, setAllTimeline] = useState<ProjectItem[] | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    if (!importOpen || allTimeline) return;
    setLoadingTimeline(true);
    fetch("/api/career/portfolios/showcase/timeline-source")
      .then((r) => r.json())
      .then((d) => setAllTimeline(Array.isArray(d.projects) ? d.projects : []))
      .finally(() => setLoadingTimeline(false));
  }, [importOpen, allTimeline]);

  const includedIds = new Set(value.projects.map((p) => (p as { id?: string }).id).filter(Boolean) as string[]);

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const activeId = String(event.active.id);
    const overId = String(event.over.id);
    const oldIndex = value.projects.findIndex((p) => keyFor(p) === activeId);
    const newIndex = value.projects.findIndex((p) => keyFor(p) === overId);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange((p) => ({ ...p, projects: arrayMove(p.projects, oldIndex, newIndex) }));
  }

  function addFromTimeline(snapshot: ProjectItem) {
    onChange((p) => ({ ...p, projects: [...p.projects, structuredClone(snapshot)] }));
    setImportOpen(false);
  }

  function removeAt(index: number) {
    onChange((p) => ({ ...p, projects: p.projects.filter((_, i) => i !== index) }));
  }

  function setProjectImage(index: number, url: string, fileName?: string) {
    onChange((p) => {
      const next = [...p.projects];
      const project = { ...(next[index] as Record<string, unknown>) };
      project.representativeImage = {
        url,
        alt: fileName ?? "",
      };
      next[index] = project as typeof next[number];
      return { ...p, projects: next };
    });
  }

  return (
    <div className="space-y-3 text-xs">
      <button
        type="button"
        onClick={() => setImportOpen(true)}
        className="w-full rounded border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
      >
        ＋ Timeline에서 프로젝트 가져오기
      </button>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.projects.map(keyFor)} strategy={verticalListSortingStrategy}>
          {value.projects.map((p, i) => (
            <SortableCard
              key={keyFor(p)}
              id={keyFor(p)}
              index={i}
              project={p}
              portfolioId={portfolioId}
              onRemove={() => removeAt(i)}
              onImageUploaded={(url, name) => setProjectImage(i, url, name)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {value.projects.length === 0 && (
        <p className="rounded border border-dashed border-slate-300 p-3 text-center text-slate-400">아직 추가된 프로젝트가 없습니다.</p>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setImportOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Timeline 프로젝트 가져오기</h3>
            {loadingTimeline ? (
              <p className="py-8 text-center text-slate-400">불러오는 중…</p>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {(allTimeline ?? []).filter((p) => !includedIds.has(String((p as { id?: string }).id ?? ""))).map((p, i) => {
                  const title = String((p as { company?: string; position?: string }).company ?? (p as { position?: string }).position ?? "(제목 없음)");
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => addFromTimeline(p)}
                        className="w-full rounded border border-slate-200 px-3 py-2 text-left text-xs hover:bg-slate-50"
                      >
                        {title}
                      </button>
                    </li>
                  );
                })}
                {(allTimeline ?? []).filter((p) => !includedIds.has(String((p as { id?: string }).id ?? ""))).length === 0 && (
                  <li className="py-4 text-center text-slate-400">추가할 프로젝트가 없습니다.</li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function keyFor(p: ProjectItem): string {
  return String((p as { id?: string }).id ?? `${(p as { company?: string }).company ?? ""}-${(p as { period?: string }).period ?? ""}`);
}

function SortableCard({
  id, index, project, portfolioId, onRemove, onImageUploaded,
}: {
  id: string;
  index: number;
  project: ProjectItem;
  portfolioId: string;
  onRemove: () => void;
  onImageUploaded: (url: string, fileName?: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const title = String((project as { company?: string; position?: string }).company ?? (project as { position?: string }).position ?? "프로젝트");
  const repImage = (project as { representativeImage?: { url?: string } }).representativeImage;
  const imageUrl = repImage?.url;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/career/portfolios/showcase/${portfolioId}/assets`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || `업로드 실패 (${res.status})`);
        return;
      }
      const data = await res.json();
      onImageUploaded(data.url, data.fileName);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded border border-slate-200 bg-white p-2"
    >
      <span {...attributes} {...listeners} className="cursor-grab text-slate-400 active:cursor-grabbing">⋮⋮</span>
      <span className="h-8 w-8 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </span>
      <span className="flex-1 truncate text-xs">{String(index + 1).padStart(2, "0")} · {title}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-[10px] font-bold text-slate-500 hover:text-slate-900 disabled:opacity-50"
        aria-label="이미지 변경"
        title="이미지 변경"
      >
        {uploading ? "..." : "🖼"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-600" aria-label="제거">×</button>
    </div>
  );
}
