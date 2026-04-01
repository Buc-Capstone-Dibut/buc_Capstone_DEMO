"use client";

import "@blocknote/mantine/style.css";
import {
  SuggestionMenuController,
  useCreateBlockNote,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Hash } from "lucide-react";
import { toast } from "sonner";
import {
  createWorkspaceDocAssetAccessPath,
  parseWorkspaceDocAssetUrl,
} from "@/lib/workspace-doc-assets";

interface UserInfo {
  name: string;
  color: string;
}

interface WorkspaceTaskSearchResult {
  id: string;
  title: string;
  priority?: string | null;
  columnTitle?: string | null;
}

interface NormalDocumentEditorProps {
  docId: string;
  workspaceId?: string;
  initialContent?: unknown;
  readOnly?: boolean;
  user?: UserInfo;
  onTaskLinked?: () => void;
  onOpenTask?: (taskId: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export interface NormalDocumentEditorHandle {
  saveNow: (options?: { silent?: boolean }) => Promise<boolean>;
  hasUnsavedChanges: () => boolean;
}

const PAPER_SURFACE_STYLE = {
  "--bn-colors-editor-background": "hsl(42 45% 98%)",
  "--bn-colors-menu-background": "#ffffff",
  "--bn-colors-tooltip-background": "#fffaf0",
  "--bn-colors-hovered-background": "rgba(148, 163, 184, 0.12)",
  "--bn-colors-border": "rgba(148, 163, 184, 0.28)",
  "--bn-colors-shadow": "rgba(15, 23, 42, 0.14)",
  "--bn-font-family":
    '"Noto Sans KR", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  "--bn-border-radius": "0px",
} as CSSProperties;

function serializeBlocks(blocks: unknown) {
  return JSON.stringify(Array.isArray(blocks) ? blocks : []);
}

export const NormalDocumentEditor = forwardRef<
  NormalDocumentEditorHandle,
  NormalDocumentEditorProps
>(function NormalDocumentEditor(
  {
    docId,
    workspaceId,
    initialContent,
    readOnly = false,
    onTaskLinked,
    onOpenTask,
    onDirtyChange,
  }: NormalDocumentEditorProps,
  ref,
) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const lastSavedSnapshotRef = useRef(serializeBlocks(initialContent));
  const latestDirtyRef = useRef(false);

  const resolvedWorkspaceId = useMemo(() => {
    if (workspaceId) return workspaceId;
    const match = pathname?.match(/\/workspace\/([^/?]+)/);
    return match?.[1] ?? null;
  }, [pathname, workspaceId]);

  const uploadAsset = async (file: File) => {
    if (!resolvedWorkspaceId) {
      throw new Error("워크스페이스 정보를 찾을 수 없습니다.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `/api/workspaces/${resolvedWorkspaceId}/docs/${docId}/assets`,
      {
        method: "POST",
        body: formData,
      },
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error ||
          payload?.message ||
          "이미지 업로드에 실패했습니다.",
      );
    }

    const stableUrl =
      payload?.url ??
      payload?.assetUrl ??
      payload?.data?.url ??
      payload?.data?.assetUrl;

    if (typeof stableUrl !== "string" || stableUrl.length === 0) {
      throw new Error("업로드 응답에 문서 자산 URL이 없습니다.");
    }

    return stableUrl;
  };

  const resolveAssetUrl = useCallback(async (url: string) => {
    const parsedAsset = parseWorkspaceDocAssetUrl(url);
    if (parsedAsset) {
      return createWorkspaceDocAssetAccessPath(
        parsedAsset.workspaceId,
        parsedAsset.assetId,
      );
    }

    return url;
  }, []);

  const editor = useCreateBlockNote(
    {
      uploadFile: async (file) => {
        if (readOnly) {
          throw new Error("읽기 전용 문서에서는 이미지를 업로드할 수 없습니다.");
        }
        return uploadAsset(file);
      },
      resolveFileUrl: resolveAssetUrl,
      initialContent:
        Array.isArray(initialContent) && initialContent.length > 0
          ? (initialContent as PartialBlock[])
          : undefined,
    },
    [docId, readOnly, resolvedWorkspaceId, resolveAssetUrl],
  );

  const emitDirtyChange = useCallback(
    (nextDirty: boolean) => {
      latestDirtyRef.current = nextDirty;
      onDirtyChange?.(nextDirty);
    },
    [onDirtyChange],
  );

  useEffect(() => {
    lastSavedSnapshotRef.current = serializeBlocks(initialContent);
    emitDirtyChange(false);
  }, [docId, emitDirtyChange, initialContent]);

  useEffect(() => {
    if (
      initialContent &&
      Array.isArray(initialContent) &&
      initialContent.length > 0
    ) {
      const currentBlocks = editor.document;
      const isDefault =
        currentBlocks.length === 0 ||
        (currentBlocks.length === 1 &&
          currentBlocks[0].type === "paragraph" &&
          (!currentBlocks[0].content ||
            (Array.isArray(currentBlocks[0].content) &&
              currentBlocks[0].content.length === 0)));

      if (isDefault) {
        editor.replaceBlocks(editor.document, initialContent as PartialBlock[]);
        lastSavedSnapshotRef.current = serializeBlocks(initialContent);
        emitDirtyChange(false);
      }
    }
  }, [editor, emitDirtyChange, initialContent]);

  const saveCurrentState = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!resolvedWorkspaceId || readOnly) {
        lastSavedSnapshotRef.current = serializeBlocks(editor.document);
        emitDirtyChange(false);
        return true;
      }

      try {
        const response = await fetch(
          `/api/workspaces/${resolvedWorkspaceId}/docs/${docId}/save`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: editor.document,
            }),
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error || payload?.message || "문서 저장에 실패했습니다.",
          );
        }

        lastSavedSnapshotRef.current = serializeBlocks(editor.document);
        emitDirtyChange(false);
        return true;
      } catch (error) {
        if (!options?.silent) {
          toast.error(
            (error as Error).message || "문서 저장에 실패했습니다.",
          );
        }
        return false;
      }
    },
    [docId, editor.document, emitDirtyChange, readOnly, resolvedWorkspaceId],
  );

  useImperativeHandle(
    ref,
    () => ({
      saveNow: saveCurrentState,
      hasUnsavedChanges: () => latestDirtyRef.current,
    }),
    [saveCurrentState],
  );

  const handleTaskMention = useCallback(async (
    task: WorkspaceTaskSearchResult,
    options?: { silent?: boolean },
  ) => {
    if (!resolvedWorkspaceId || readOnly) return;

    const taskHref = `/workspace/${resolvedWorkspaceId}?tab=board&task=${task.id}`;
    const mentionLabel = `#${task.title}`;

    try {
      editor.insertInlineContent(
        [
          {
            type: "link",
            href: taskHref,
            content: mentionLabel,
          },
          " ",
        ],
        { updateSelection: true },
      );

      const response = await fetch(
        `/api/workspaces/${resolvedWorkspaceId}/board/tasks/${task.id}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            docId,
            relationType: "reference",
            isPrimary: false,
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error || payload?.message || "태스크 연결 저장에 실패했습니다.",
        );
      }

      onTaskLinked?.();
      if (!options?.silent) {
        toast.success("태스크 언급을 문서에 추가했습니다.");
      }
    } catch (error) {
      if (!options?.silent) {
        toast.error(
          (error as Error).message || "태스크 언급 추가에 실패했습니다.",
        );
      }
    }
  }, [docId, editor, onTaskLinked, readOnly, resolvedWorkspaceId]);

  const getTaskMentionItems = useCallback(
    async (query: string): Promise<DefaultReactSuggestionItem[]> => {
      if (!resolvedWorkspaceId || readOnly) return [];

      const response = await fetch(
        `/api/workspaces/${resolvedWorkspaceId}/tasks/search?q=${encodeURIComponent(query)}`,
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return [];
      }

      const rawItems = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload?.tasks)
            ? payload.tasks
            : [];

      return rawItems
        .map((item: unknown) => normalizeTaskSearchItem(item))
        .filter(
          (
            item: WorkspaceTaskSearchResult | null,
          ): item is WorkspaceTaskSearchResult => item !== null,
        )
        .map((task: WorkspaceTaskSearchResult) => ({
          title: `#${task.title}`,
          subtext: task.columnTitle || "워크스페이스 태스크",
          badge: task.priority ? task.priority.toUpperCase() : undefined,
          group: "태스크",
          key: "paragraph",
          icon: <Hash className="h-4 w-4 text-emerald-600" />,
          onItemClick: () => {
            void handleTaskMention(task, { silent: true });
          },
        }));
    },
    [handleTaskMention, readOnly, resolvedWorkspaceId],
  );

  const handleTaskLinkInteraction = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const link = target.closest('a[href*="?tab=board&task="]');
    if (!(link instanceof HTMLAnchorElement)) return;

    const href = link.getAttribute("href");
    if (!href) return;

    const taskId = new URL(href, window.location.origin).searchParams.get("task");
    if (!taskId) return;

    event.preventDefault();
    event.stopPropagation();
    onOpenTask?.(taskId);
  }, [onOpenTask]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-12 pb-24">
      <div
        className="doc-editor-surface min-h-[calc(100vh-20rem)] rounded-none border border-slate-200/70 bg-[linear-gradient(180deg,#fffdf7_0%,#fffaf0_100%)] shadow-[0_28px_60px_-34px_rgba(15,23,42,0.32)] ring-1 ring-white/70"
        style={PAPER_SURFACE_STYLE}
        onMouseDownCapture={handleTaskLinkInteraction}
        onClickCapture={handleTaskLinkInteraction}
        onAuxClickCapture={handleTaskLinkInteraction}
      >
        <BlockNoteView
          editor={editor}
          theme={theme === "dark" ? "dark" : "light"}
          editable={!readOnly}
          linkToolbar={false}
          onChange={() => {
            emitDirtyChange(
              serializeBlocks(editor.document) !== lastSavedSnapshotRef.current,
            );
          }}
          className="min-h-[calc(100vh-24rem)] px-6 py-8 [&_.bn-editor]:rounded-none [&_.bn-editor]:bg-transparent [&_.bn-editor]:shadow-none"
        >
          <SuggestionMenuController
            triggerCharacter="#"
            minQueryLength={0}
            getItems={getTaskMentionItems}
          />
        </BlockNoteView>
      </div>

      <style jsx global>{`
        .doc-editor-surface a[href*="?tab=board&task="] {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          border: 1px solid rgba(16, 185, 129, 0.22);
          background: rgba(236, 253, 245, 0.92);
          color: rgb(6, 95, 70);
          border-radius: 9999px;
          padding: 0.12rem 0.48rem;
          font-size: 0.92em;
          font-weight: 600;
          line-height: 1.5;
          text-decoration: none;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        .doc-editor-surface a[href*="?tab=board&task="]:hover {
          background: rgba(209, 250, 229, 0.96);
          color: rgb(4, 120, 87);
        }
      `}</style>
    </div>
  );
});

NormalDocumentEditor.displayName = "NormalDocumentEditor";

function normalizeTaskSearchItem(
  item: unknown,
): WorkspaceTaskSearchResult | null {
  if (!item || typeof item !== "object") return null;

  const candidate = item as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id : null;
  const title =
    typeof candidate.title === "string"
      ? candidate.title
      : typeof candidate.name === "string"
        ? candidate.name
        : null;

  if (!id || !title) return null;

  return {
    id,
    title,
    priority:
      typeof candidate.priority === "string" ? candidate.priority : undefined,
    columnTitle:
      typeof candidate.columnTitle === "string"
        ? candidate.columnTitle
        : typeof candidate.status === "string"
          ? candidate.status
          : undefined,
  };
}
