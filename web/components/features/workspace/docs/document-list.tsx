"use client";

import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Trash2,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Doc {
  id: string;
  title: string;
  emoji?: string;
  parent_id: string | null;
  updated_at: string;
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
}

export function DocumentList({
  workspaceId,
  docs,
  readOnly = false,
  level = 0,
  parentId = null,
  onExpand,
  expanded = {},
  onSelect,
  activeDocId,
}: DocumentListProps) {
  const router = useRouter();

  // Filter docs for current level
  const currentDocs = docs.filter((doc) => doc.parent_id === parentId);

  if (currentDocs.length === 0) return null;

  const handleCreateChild = async (e: React.MouseEvent, parentId: string) => {
    e.stopPropagation();
    if (readOnly) return;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/docs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "제목 없음", parentId }),
      });

      if (!res.ok) throw new Error("Failed to create");

      const newDoc = await res.json();

      if (onSelect) {
        onSelect(newDoc.id);
      } else {
        router.push(`/workspace/${workspaceId}/docs/${newDoc.id}`);
      }

      // Expand parent to show new child
      if (onExpand) onExpand(parentId);
      toast.success("문서가 생성되었습니다.");
    } catch {
      toast.error("문서 생성 실패");
    }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (readOnly) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/docs/${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("문서가 삭제되었습니다.");
      // We rely on SWR revalidation or global state update here.
      // Ideally mutate parent.
      location.reload(); // Temporary reload for simplicity
    } catch {
      toast.error("삭제 실패");
    }
  };

  return (
    <div className="space-y-[1px]">
      {currentDocs.map((doc) => {
        const isExpanded = expanded[doc.id];
        const hasChildren = docs.some((d) => d.parent_id === doc.id);
        const isActive = activeDocId === doc.id;

        return (
          <div key={doc.id}>
            <div
              role="button"
              onClick={() => {
                if (onSelect) {
                  onSelect(doc.id);
                } else {
                  router.push(`/workspace/${workspaceId}/docs/${doc.id}`);
                }
              }}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted/50 transition-colors min-h-[32px]",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              style={{ paddingLeft: level ? `${level * 12 + 8}px` : "8px" }}
            >
              <div
                className="h-6 w-6 rounded-sm hover:bg-muted/70 flex items-center justify-center shrink-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onExpand) onExpand(doc.id);
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

              <div className="flex items-center gap-2 truncate flex-1">
                {doc.emoji ? (
                  <span>{doc.emoji}</span>
                ) : (
                  <File className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{doc.title}</span>
              </div>

              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                {!readOnly && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div
                          role="button"
                          className="h-full rounded-sm hover:bg-muted/70 p-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => handleDelete(e, doc.id)}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div
                      role="button"
                      onClick={(e) => handleCreateChild(e, doc.id)}
                      className="ml-1 h-full rounded-sm hover:bg-muted/70 p-0.5"
                    >
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {isExpanded && (
              <DocumentList
                workspaceId={workspaceId}
                docs={docs}
                readOnly={readOnly}
                level={level + 1}
                parentId={doc.id}
                onExpand={onExpand}
                expanded={expanded}
                onSelect={onSelect}
                activeDocId={activeDocId}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
