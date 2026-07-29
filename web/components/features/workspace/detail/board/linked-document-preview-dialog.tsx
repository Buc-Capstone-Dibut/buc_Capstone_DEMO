"use client";

import type { ReactNode } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DocumentBlock = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: DocumentBlock[];
};

type WorkspaceDocumentPreview = {
  id: string;
  title: string;
  emoji?: string | null;
  content?: unknown;
  updated_at?: string | null;
  author?: {
    nickname?: string | null;
  } | null;
};

interface LinkedDocumentPreviewDialogProps {
  workspaceId: string;
  docId: string | null;
  fallbackTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const previewFetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("문서를 불러오지 못했습니다.");
  }
  return response.json();
};

function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join("");
  }
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  return extractText(record.content);
}

function renderBlock(block: DocumentBlock, index: number): ReactNode {
  const key = block.id || `${block.type || "block"}-${index}`;
  const text = extractText(block.content);
  const childBlocks =
    Array.isArray(block.children) && block.children.length > 0
      ? block.children
      : [];
  let content: ReactNode;

  if (block.type === "heading") {
    const level = Number(block.props?.level || 2);
    content =
      level === 1 ? (
        <h1 className="text-2xl font-bold tracking-tight">{text}</h1>
      ) : level === 3 ? (
        <h3 className="text-base font-semibold">{text}</h3>
      ) : (
        <h2 className="text-xl font-semibold">{text}</h2>
      );
  } else if (block.type === "bulletListItem") {
    content = (
      <div className="flex gap-2">
        <span className="text-muted-foreground">•</span>
        <p className="min-w-0 flex-1">{text}</p>
      </div>
    );
  } else if (block.type === "numberedListItem") {
    content = (
      <div className="flex gap-2">
        <span className="text-muted-foreground">{index + 1}.</span>
        <p className="min-w-0 flex-1">{text}</p>
      </div>
    );
  } else if (block.type === "checkListItem") {
    const checked = Boolean(block.props?.checked);
    content = (
      <div className="flex gap-2">
        <span className="text-muted-foreground">{checked ? "☑" : "☐"}</span>
        <p className="min-w-0 flex-1">{text}</p>
      </div>
    );
  } else if (block.type === "codeBlock") {
    content = (
      <pre className="overflow-x-auto rounded-lg bg-slate-950 px-4 py-3 text-xs leading-5 text-slate-100">
        <code>{text}</code>
      </pre>
    );
  } else if (block.type === "quote") {
    content = (
      <blockquote className="border-l-2 border-slate-300 pl-3 text-muted-foreground">
        {text}
      </blockquote>
    );
  } else if (block.type === "divider") {
    content = <hr className="border-slate-200" />;
  } else if (block.type === "image" || block.type === "file") {
    content = (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <FileText className="h-4 w-4" />
        첨부 콘텐츠는 전체 문서에서 확인할 수 있습니다.
      </div>
    );
  } else {
    content = text ? (
      <p className="whitespace-pre-wrap leading-7 text-slate-700">{text}</p>
    ) : null;
  }

  return (
    <div key={key} className="space-y-2">
      {content}
      {childBlocks.length > 0 && (
        <div className="ml-5 space-y-2 border-l pl-4">
          {childBlocks.map(renderBlock)}
        </div>
      )}
    </div>
  );
}

export function LinkedDocumentPreviewDialog({
  workspaceId,
  docId,
  fallbackTitle,
  open,
  onOpenChange,
}: LinkedDocumentPreviewDialogProps) {
  const { data, error, isLoading } = useSWR<WorkspaceDocumentPreview>(
    open && docId ? `/api/workspaces/${workspaceId}/docs/${docId}` : null,
    previewFetcher,
    { revalidateOnFocus: false },
  );
  const blocks = Array.isArray(data?.content)
    ? (data.content as DocumentBlock[])
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[82vh] flex-col overflow-hidden p-0 sm:max-w-[760px]">
        <DialogHeader className="shrink-0 border-b bg-muted/20 px-6 py-4 pr-14">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <span>{data?.emoji || "📄"}</span>
                <span className="truncate">
                  {data?.title || fallbackTitle || "연결 문서"}
                </span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {data?.author?.nickname
                  ? `${data.author.nickname} 작성`
                  : "연결 문서 미리보기"}
              </DialogDescription>
            </div>
            {docId && (
              <Button variant="outline" size="sm" className="shrink-0" asChild>
                <a href={`/workspace/${workspaceId}?tab=docs&doc=${docId}`}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  전체 문서
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 p-6">
          <article className="mx-auto min-h-80 max-w-3xl space-y-4 rounded-xl border bg-white px-8 py-7 text-sm shadow-sm">
            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                문서를 불러오는 중입니다.
              </div>
            ) : error ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-destructive">
                문서를 불러오지 못했습니다.
              </div>
            ) : blocks.length > 0 ? (
              blocks.map(renderBlock)
            ) : (
              <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
                작성된 내용이 없습니다.
              </div>
            )}
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
