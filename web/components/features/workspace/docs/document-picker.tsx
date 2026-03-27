"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface DocumentPickerItem {
  id: string;
  kind: "page" | "folder";
  title: string;
  emoji?: string | null;
  parent_id: string | null;
  sort_order?: number;
  is_archived?: boolean;
}

interface DocumentPickerProps {
  docs: DocumentPickerItem[];
  linkedDocIds?: string[];
  search?: string;
  onSelect: (docId: string) => void;
  className?: string;
}

function sortDocs<T extends DocumentPickerItem>(docs: T[]) {
  return [...docs].sort((left, right) => {
    const leftOrder = left.sort_order ?? 0;
    const rightOrder = right.sort_order ?? 0;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.title.localeCompare(right.title, "ko");
  });
}

function collectAncestorIds(
  docMap: Map<string, DocumentPickerItem>,
  docId: string,
  bucket: Set<string>,
) {
  let parentId = docMap.get(docId)?.parent_id ?? null;

  while (parentId) {
    if (bucket.has(parentId)) break;
    bucket.add(parentId);
    parentId = docMap.get(parentId)?.parent_id ?? null;
  }
}

function collectDescendantIds(
  docs: DocumentPickerItem[],
  parentId: string,
  bucket: Set<string>,
) {
  const queue = [parentId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;

    docs.forEach((doc) => {
      if (doc.parent_id !== currentId) return;
      if (bucket.has(doc.id)) return;
      bucket.add(doc.id);
      if (doc.kind === "folder") {
        queue.push(doc.id);
      }
    });
  }
}

function computeVisibleIds(
  docs: DocumentPickerItem[],
  linkedDocIds: Set<string>,
  search: string,
) {
  const keyword = search.trim().toLowerCase();
  if (!keyword) return null;

  const docMap = new Map(docs.map((doc) => [doc.id, doc] as const));
  const visibleIds = new Set<string>();

  docs.forEach((doc) => {
    if (doc.is_archived) return;
    if (!doc.title.toLowerCase().includes(keyword)) return;

    visibleIds.add(doc.id);
    collectAncestorIds(docMap, doc.id, visibleIds);

    if (doc.kind === "folder") {
      collectDescendantIds(docs, doc.id, visibleIds);
    }
  });

  docs.forEach((doc) => {
    if (doc.kind !== "page") return;
    if (!visibleIds.has(doc.id)) return;
    if (!linkedDocIds.has(doc.id)) return;
    visibleIds.delete(doc.id);
  });

  return visibleIds;
}

export function DocumentPicker({
  docs,
  linkedDocIds = [],
  search = "",
  onSelect,
  className,
}: DocumentPickerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(
    {},
  );

  const orderedDocs = useMemo(() => sortDocs(docs), [docs]);
  const linkedDocIdSet = useMemo(() => new Set(linkedDocIds), [linkedDocIds]);
  const visibleIds = useMemo(
    () => computeVisibleIds(orderedDocs, linkedDocIdSet, search),
    [linkedDocIdSet, orderedDocs, search],
  );
  const isSearching = search.trim().length > 0;

  useEffect(() => {
    if (!orderedDocs.length) return;
    setExpandedFolders((prev) => {
      if (Object.keys(prev).length > 0) return prev;

      const nextState: Record<string, boolean> = {};
      orderedDocs.forEach((doc) => {
        if (doc.kind === "folder" && doc.parent_id === null) {
          nextState[doc.id] = true;
        }
      });
      return nextState;
    });
  }, [orderedDocs]);

  const toggleFolder = (docId: string) => {
    setExpandedFolders((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  const hasVisiblePages = useMemo(
    () =>
      orderedDocs.some((doc) => {
        if (doc.kind !== "page" || doc.is_archived || linkedDocIdSet.has(doc.id)) {
          return false;
        }
        return visibleIds ? visibleIds.has(doc.id) : true;
      }),
    [linkedDocIdSet, orderedDocs, visibleIds],
  );

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <ScrollArea className="max-h-[min(60vh,20rem)]">
        <div className="p-1.5">
          {hasVisiblePages ? (
            <DocumentPickerBranch
              docs={orderedDocs}
              parentId={null}
              depth={0}
              expandedFolders={expandedFolders}
              visibleIds={visibleIds}
              isSearching={isSearching}
              linkedDocIds={linkedDocIdSet}
              onToggleFolder={toggleFolder}
              onSelect={onSelect}
            />
          ) : (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              연결 가능한 페이지가 없습니다.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface DocumentPickerBranchProps {
  docs: DocumentPickerItem[];
  parentId: string | null;
  depth: number;
  expandedFolders: Record<string, boolean>;
  visibleIds: Set<string> | null;
  isSearching: boolean;
  linkedDocIds: Set<string>;
  onToggleFolder: (docId: string) => void;
  onSelect: (docId: string) => void;
}

function DocumentPickerBranch({
  docs,
  parentId,
  depth,
  expandedFolders,
  visibleIds,
  isSearching,
  linkedDocIds,
  onToggleFolder,
  onSelect,
}: DocumentPickerBranchProps) {
  const currentDocs = docs.filter((doc) => {
    if (doc.parent_id !== parentId) return false;
    if (doc.is_archived) return false;
    if (visibleIds && !visibleIds.has(doc.id)) return false;
    return true;
  });

  if (currentDocs.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {currentDocs.map((doc) => {
        const hasChildren = docs.some(
          (child) =>
            child.parent_id === doc.id &&
            !child.is_archived &&
            (!visibleIds || visibleIds.has(child.id)),
        );
        const isFolder = doc.kind === "folder";
        const isExpanded = isSearching || expandedFolders[doc.id];
        const isLinked = linkedDocIds.has(doc.id);

        return (
          <div key={doc.id}>
            <button
              type="button"
              onClick={() => {
                if (isFolder) {
                  onToggleFolder(doc.id);
                  return;
                }
                if (!isLinked) {
                  onSelect(doc.id);
                }
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                isFolder
                  ? "text-foreground hover:bg-muted/70"
                  : isLinked
                    ? "cursor-not-allowed text-muted-foreground/60"
                    : "text-foreground hover:bg-muted/70",
              )}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                {isFolder ? (
                  hasChildren ? (
                    isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )
                  ) : (
                    <span className="w-3.5" />
                  )
                ) : (
                  <span className="w-3.5" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {doc.emoji ? (
                  <span className="shrink-0">{doc.emoji}</span>
                ) : isFolder ? (
                  isExpanded ? (
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )
                ) : (
                  <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{doc.title}</span>
              </span>
              {!isFolder && isLinked && (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]">
                  연결됨
                </span>
              )}
            </button>

            {isFolder && isExpanded && (
              <DocumentPickerBranch
                docs={docs}
                parentId={doc.id}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                visibleIds={visibleIds}
                isSearching={isSearching}
                linkedDocIds={linkedDocIds}
                onToggleFolder={onToggleFolder}
                onSelect={onSelect}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
