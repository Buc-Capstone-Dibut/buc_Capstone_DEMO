"use client";

import { useState } from "react";
import {
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  Paperclip,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectAttachment } from "@/app/my/[handle]/profile-types";

/**
 * 프로젝트 보관 파일 섹션.
 *
 * 한 프로젝트당 최대 5장까지(이미지/PDF) 보관할 수 있다.
 * 첫 번째 image 항목이 자동으로 대표 이미지가 되며, 사용자가 별 아이콘으로
 * 다른 이미지 항목을 대표로 지정할 수 있다.
 */
const MAX_ATTACHMENTS = 5;

interface ProjectAttachmentsSectionProps {
  attachments: ProjectAttachment[];
  onChange: (next: ProjectAttachment[]) => void;
}

export function ProjectAttachmentsSection({
  attachments,
  onChange,
}: ProjectAttachmentsSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, MAX_ATTACHMENTS - attachments.length);
  const canAdd = remaining > 0;

  const ensureSinglePrimary = (list: ProjectAttachment[]) => {
    const primaryCount = list.filter((a) => a.isPrimary).length;
    if (primaryCount > 1) {
      // 가장 마지막 isPrimary 만 유지
      let kept = false;
      for (let i = list.length - 1; i >= 0; i -= 1) {
        if (list[i].isPrimary) {
          if (kept) list[i] = { ...list[i], isPrimary: false };
          else kept = true;
        }
      }
    } else if (primaryCount === 0) {
      const firstImage = list.find((a) => a.kind === "image");
      if (firstImage) {
        const idx = list.indexOf(firstImage);
        list[idx] = { ...firstImage, isPrimary: true };
      }
    }
    return list;
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const slots = remaining;
    const targets = Array.from(fileList).slice(0, slots);
    if (targets.length === 0) return;

    setUploading(true);
    try {
      const uploaded: ProjectAttachment[] = [];
      for (const file of targets) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/career/projects/attachments", {
          method: "POST",
          body: fd,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || "파일 업로드에 실패했습니다.");
        }
        uploaded.push(json.attachment as ProjectAttachment);
      }
      const next = ensureSinglePrimary([...attachments, ...uploaded]);
      onChange(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "파일 업로드에 실패했습니다.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (target: ProjectAttachment) => {
    try {
      await fetch(
        `/api/career/projects/attachments?storagePath=${encodeURIComponent(
          target.storagePath,
        )}`,
        { method: "DELETE" },
      );
    } catch {
      // storage 삭제 실패는 무시하고 클라이언트 상태에서는 제거 (orphan은 별도 정리 가능)
    }
    const next = ensureSinglePrimary(
      attachments.filter((a) => a.id !== target.id),
    );
    onChange(next);
  };

  const handleSetPrimary = (target: ProjectAttachment) => {
    if (target.kind !== "image") return;
    const next = attachments.map((a) => ({
      ...a,
      isPrimary: a.id === target.id,
    }));
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
          보관 파일{" "}
          <span className="text-slate-400">
            ({attachments.length} / {MAX_ATTACHMENTS})
          </span>
        </label>
        <span className="text-[11px] text-slate-500">
          이미지 또는 PDF · 최대 5장
        </span>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        {attachments.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {attachments.map((attachment) => (
              <AttachmentTile
                key={attachment.id}
                attachment={attachment}
                onRemove={() => handleRemove(attachment)}
                onSetPrimary={() => handleSetPrimary(attachment)}
              />
            ))}
          </ul>
        )}

        <label
          className={cn(
            "mt-3 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold transition dark:border-slate-800 dark:bg-slate-900",
            canAdd
              ? "text-slate-600 hover:border-primary hover:text-primary dark:text-slate-300"
              : "cursor-not-allowed text-slate-400",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />업로드 중...
            </>
          ) : canAdd ? (
            <>
              <ImagePlus className="h-4 w-4" aria-hidden />
              {attachments.length === 0
                ? "수료증·활동 사진·문서 등 파일 추가"
                : `파일 추가 (${remaining}장 더 등록 가능)`}
            </>
          ) : (
            <>
              <Paperclip className="h-4 w-4" aria-hidden />최대 5장까지 등록했어요
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            className="sr-only"
            disabled={!canAdd || uploading}
            onChange={(event) => {
              void handleUpload(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {error && (
        <p className="ml-1 text-[11px] font-medium text-red-500">{error}</p>
      )}
      <p className="ml-1 text-[11px] font-medium text-slate-500">
        이미지 항목의 별 아이콘을 누르면 카드의 대표 이미지로 지정됩니다. 대표 미지정 시 첫 번째 이미지가 자동 사용됩니다.
      </p>
    </div>
  );
}

function AttachmentTile({
  attachment,
  onRemove,
  onSetPrimary,
}: {
  attachment: ProjectAttachment;
  onRemove: () => void;
  onSetPrimary: () => void;
}) {
  const isImage = attachment.kind === "image";
  return (
    <li className="group relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.url}
          alt={attachment.alt || attachment.fileName}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 bg-slate-100 p-2 text-center dark:bg-slate-900"
        >
          <FileText className="h-7 w-7 text-slate-400" aria-hidden />
          <span className="line-clamp-2 break-all text-[10.5px] font-medium text-slate-600 dark:text-slate-300">
            {attachment.fileName}
          </span>
        </a>
      )}

      {/* 대표 배지 */}
      {attachment.isPrimary && (
        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
          <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />대표
        </span>
      )}

      {/* 액션 */}
      <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isImage && !attachment.isPrimary && (
          <button
            type="button"
            onClick={onSetPrimary}
            aria-label="대표 이미지로 지정"
            className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-amber-500 shadow-sm transition hover:bg-amber-50"
          >
            <Star className="h-3 w-3" aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="첨부 삭제"
          className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-slate-500 shadow-sm transition hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-3 w-3" aria-hidden />
        </button>
      </div>
    </li>
  );
}
