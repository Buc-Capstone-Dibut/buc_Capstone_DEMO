"use client";

import { useMemo, useState, type DragEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Trash2,
  File,
  Folder,
  FolderOpen,
  PencilLine,
  FolderPlus,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  computeDocMove,
  type DocTreeItem,
  type DropPosition,
} from "./tree-dnd";

interface Doc extends DocTreeItem {
  title: string;
  emoji?: string | null;
  updated_at?: string;
}

interface DocumentListProps {
  workspaceId: string;
  docs: Doc[];
  readOnly?: boolean;
  level?: number;
  parentId?: string | null;
  onExpand?: (id: string) => void;
  expanded?: Record<string, boolean>;
  onSelect?: (id: string) => void;
  activeDocId?: string | null;
  onMutate?: () => void;
  onDocArchived?: (id: string) => void;
}

type DropPreview = {
  targetId: string;
  position: DropPosition;
} | null;

function sortDocs(docs: Doc[]) {
  return [...docs].sort((left, right) => {
    const leftOrder = left.sort_order ?? 0;
    const rightOrder = right.sort_order ?? 0;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.title.localeCompare(right.title, "ko");
  });
}

function getDropPosition(
  event: DragEvent<HTMLDivElement>,
  isFolder: boolean,
): DropPosition {
  const bounds = event.currentTarget.getBoundingClientRect();
  const offsetY = event.clientY - bounds.top;
  const ratio = bounds.height === 0 ? 0.5 : offsetY / bounds.height;

  if (ratio <= 0.28) return "before";
  if (ratio >= 0.72) return "after";
  return isFolder ? "inside" : "after";
}

async function persistMove(
  workspaceId: string,
  docs: Doc[],
  sourceId: string,
  targetId: string,
  position: DropPosition,
) {
  const result = computeDocMove(docs, sourceId, targetId, position);

  if (!result.ok) {
    throw new Error(result.reason);
  }

  const movedPatch = result.patches.find((patch) => patch.id === sourceId);
  if (!movedPatch) {
    throw new Error("이동 대상을 계산할 수 없습니다.");
  }

  const res = await fetch(`/api/workspaces/${workspaceId}/docs/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      docId: sourceId,
      targetParentId: movedPatch.parentId,
      targetIndex: movedPatch.sortOrder,
    }),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error || "문서 이동에 실패했습니다.");
  }
}

export function DocumentList(props: DocumentListProps) {
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview>(null);
  const [isMoving, setIsMoving] = useState(false);

  const orderedDocs = useMemo(() => sortDocs(props.docs), [props.docs]);

  const handleMove = async (targetId: string, position: DropPosition) => {
    if (!draggingDocId || draggingDocId === targetId) return;

    setIsMoving(true);
    try {
      await persistMove(
        props.workspaceId,
        orderedDocs,
        draggingDocId,
        targetId,
        position,
      );
      props.onMutate?.();
      toast.success("문서 위치를 변경했습니다.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "문서 이동에 실패했습니다.",
      );
    } finally {
      setIsMoving(false);
      setDraggingDocId(null);
      setDropPreview(null);
    }
  };

  return (
    <DocumentTreeBranch
      {...props}
      docs={orderedDocs}
      draggingDocId={draggingDocId}
      dropPreview={dropPreview}
      isMoving={isMoving}
      setDraggingDocId={setDraggingDocId}
      setDropPreview={setDropPreview}
      onPerformMove={handleMove}
    />
  );
}

interface DocumentTreeBranchProps extends DocumentListProps {
  docs: Doc[];
  draggingDocId: string | null;
  dropPreview: DropPreview;
  isMoving: boolean;
  setDraggingDocId: (id: string | null) => void;
  setDropPreview: (preview: DropPreview) => void;
  onPerformMove: (targetId: string, position: DropPosition) => Promise<void>;
}

function DocumentTreeBranch({
  workspaceId,
  docs,
  readOnly = false,
  level = 0,
  parentId = null,
  onExpand,
  expanded = {},
  onSelect,
  activeDocId,
  onMutate,
  onDocArchived,
  draggingDocId,
  dropPreview,
  isMoving,
  setDraggingDocId,
  setDropPreview,
  onPerformMove,
}: DocumentTreeBranchProps) {
  const router = useRouter();
  const currentDocs = useMemo(
    () => docs.filter((doc) => doc.parent_id === parentId),
    [docs, parentId],
  );

  if (currentDocs.length === 0) return null;

  const handleCreateChild = async (
    e: MouseEvent,
    nextParentId: string,
    kind: "page" | "folder" = "page",
  ) => {
    e.stopPropagation();
    if (readOnly) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: kind === "folder" ? "새 폴더" : "제목 없음",
          parentId: nextParentId,
          kind,
        }),
      });

      if (!res.ok) throw new Error("Failed to create");

      const newDoc = (await res.json()) as { id: string };

      if (kind === "page" && onSelect) {
        onSelect(newDoc.id);
      } else if (kind === "page") {
        router.push(`/workspace/${workspaceId}/docs/${newDoc.id}`);
      }

      onExpand?.(nextParentId);
      onMutate?.();
      toast.success(
        kind === "folder" ? "하위 폴더가 생성되었습니다." : "문서가 생성되었습니다.",
      );
    } catch {
      toast.error(kind === "folder" ? "폴더 생성 실패" : "문서 생성 실패");
    }
  };

  const handleDelete = async (e: MouseEvent, docId: string) => {
    e.stopPropagation();
    if (readOnly) return;
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/docs/${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("문서가 삭제되었습니다.");
      onDocArchived?.(docId);
      onMutate?.();
    } catch {
      toast.error("삭제 실패");
    }
  };

  const handleRename = async (
    e: MouseEvent,
    docId: string,
    currentTitle: string,
  ) => {
    e.stopPropagation();
    if (readOnly) return;

    const nextTitle = window.prompt("새 이름을 입력하세요.", currentTitle)?.trim();
    if (!nextTitle || nextTitle === currentTitle) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/docs/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });

      if (!res.ok) throw new Error("Failed to rename");
      onMutate?.();
      toast.success("이름을 변경했습니다.");
    } catch {
      toast.error("이름 변경 실패");
    }
  };

  return (
    <div className="space-y-[1px]">
      {currentDocs.map((doc) => {
        const isExpanded = expanded[doc.id];
        const hasChildren = docs.some((child) => child.parent_id === doc.id);
        const isActive = activeDocId === doc.id;
        const isFolder = doc.kind === "folder";
        const isDragging = draggingDocId === doc.id;
        const previewPosition =
          dropPreview?.targetId === doc.id ? dropPreview.position : null;

        return (
          <div key={doc.id}>
            <div
              draggable={!readOnly && !isMoving}
              onDragStart={(event) => {
                if (readOnly || isMoving) return;
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", doc.id);
                setDraggingDocId(doc.id);
              }}
              onDragEnd={() => {
                setDraggingDocId(null);
                setDropPreview(null);
              }}
              onDragOver={(event) => {
                if (!draggingDocId || draggingDocId === doc.id) return;
                event.preventDefault();
                const position = getDropPosition(event, isFolder);
                if (
                  dropPreview?.targetId !== doc.id ||
                  dropPreview.position !== position
                ) {
                  setDropPreview({ targetId: doc.id, position });
                }
              }}
              onDrop={async (event) => {
                event.preventDefault();
                if (!draggingDocId || draggingDocId === doc.id) return;
                const position =
                  dropPreview?.targetId === doc.id
                    ? dropPreview.position
                    : getDropPosition(event, isFolder);
                setDropPreview({ targetId: doc.id, position });
                await onPerformMove(doc.id, position);
              }}
              role="button"
              onClick={() => {
                if (isFolder) {
                  onExpand?.(doc.id);
                  return;
                }

                if (onSelect) {
                  onSelect(doc.id);
                } else {
                  router.push(`/workspace/${workspaceId}/docs/${doc.id}`);
                }
              }}
              className={cn(
                "group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors min-h-[32px]",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                isDragging && "opacity-50",
                previewPosition === "inside" &&
                  "bg-amber-50 text-foreground ring-1 ring-amber-300/70",
              )}
              style={{ paddingLeft: level ? `${level * 12 + 8}px` : "8px" }}
            >
              {previewPosition === "before" && (
                <div className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded-full bg-amber-400" />
              )}
              {previewPosition === "after" && (
                <div className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-amber-400" />
              )}

              {!readOnly ? (
                <div
                  className="flex h-6 w-4 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                  onClick={(event) => event.stopPropagation()}
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="w-4 shrink-0" />
              )}

              <div
                className="h-6 w-6 rounded-sm hover:bg-muted/70 flex items-center justify-center shrink-0 cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  onExpand?.(doc.id);
                }}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )
                ) : (
                  <div className="w-3.5" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
                {doc.emoji ? (
                  <span>{doc.emoji}</span>
                ) : isFolder ? (
                  isExpanded ? (
                    <FolderOpen className="h-4 w-4 shrink-0" />
                  ) : (
                    <Folder className="h-4 w-4 shrink-0" />
                  )
                ) : (
                  <File className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{doc.title}</span>
              </div>

              <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                {!readOnly && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div
                          role="button"
                          className="h-full rounded-sm p-0.5 hover:bg-muted/70"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem
                          onClick={(event) => handleRename(event, doc.id, doc.title)}
                        >
                          <PencilLine className="mr-2 h-4 w-4" />
                          이름 변경
                        </DropdownMenuItem>
                        {isFolder && (
                          <>
                            <DropdownMenuItem
                              onClick={(event) =>
                                handleCreateChild(event, doc.id, "page")
                              }
                            >
                              <File className="mr-2 h-4 w-4" />
                              하위 문서 추가
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(event) =>
                                handleCreateChild(event, doc.id, "folder")
                              }
                            >
                              <FolderPlus className="mr-2 h-4 w-4" />
                              하위 폴더 추가
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={(event) => handleDelete(event, doc.id)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {isFolder && (
                      <div
                        role="button"
                        onClick={(event) => handleCreateChild(event, doc.id, "page")}
                        className="ml-1 h-full rounded-sm p-0.5 hover:bg-muted/70"
                      >
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {isExpanded && (
              <DocumentTreeBranch
                workspaceId={workspaceId}
                docs={docs}
                readOnly={readOnly}
                level={level + 1}
                parentId={doc.id}
                onExpand={onExpand}
                expanded={expanded}
                onSelect={onSelect}
                activeDocId={activeDocId}
                onMutate={onMutate}
                onDocArchived={onDocArchived}
                draggingDocId={draggingDocId}
                dropPreview={dropPreview}
                isMoving={isMoving}
                setDraggingDocId={setDraggingDocId}
                setDropPreview={setDropPreview}
                onPerformMove={onPerformMove}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
