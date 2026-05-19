"use client";

import { useState } from "react";
import { Copy, ExternalLink, X, Globe, Lock } from "lucide-react";

export type ShareModalProps = {
  open: boolean;
  onClose: () => void;
  isPublic: boolean;
  onTogglePublic: () => Promise<void>;
  publicUrl: string | null;
};

export function ShareModal({ open, onClose, isPublic, onTogglePublic, publicUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (!open) return null;

  const fullUrl = publicUrl ? (typeof window !== "undefined" ? `${window.location.origin}${publicUrl}` : publicUrl) : "";

  async function handleCopy() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback: select on focus
    }
  }

  async function handleTogglePublic() {
    setToggling(true);
    try {
      await onTogglePublic();
    } finally {
      setToggling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">포트폴리오 공유</h2>
            <p className="mt-1 text-xs text-slate-500">
              {isPublic
                ? "이 URL을 채용 담당자나 지인에게 보낼 수 있어요."
                : "공개로 전환하면 누구나 링크로 볼 수 있습니다."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 공개 토글 */}
        <div className={`mb-4 flex items-center justify-between gap-3 rounded-lg border p-3 ${isPublic ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
          <div className="flex items-center gap-2">
            {isPublic ? (
              <Globe className="h-4 w-4 text-emerald-600" />
            ) : (
              <Lock className="h-4 w-4 text-slate-500" />
            )}
            <span className={`text-sm font-bold ${isPublic ? "text-emerald-700" : "text-slate-700"}`}>
              {isPublic ? "공개" : "비공개"}
            </span>
            <span className="text-xs text-slate-500">
              {isPublic ? "링크가 있는 누구나 접근 가능" : "나만 볼 수 있음"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleTogglePublic}
            disabled={toggling}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition disabled:opacity-50 ${
              isPublic ? "bg-emerald-500" : "bg-slate-300"
            }`}
            aria-label={isPublic ? "공개 해제" : "공개 전환"}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                isPublic ? "translate-x-5" : "translate-x-0.5"
              } translate-y-0.5`}
            />
          </button>
        </div>

        {/* URL + 액션 */}
        {isPublic && publicUrl ? (
          <>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                공개 URL
              </span>
              <div className="flex items-stretch gap-2">
                <input
                  readOnly
                  value={fullUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                    copied
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "복사됨!" : "복사"}
                </button>
              </div>
            </label>

            <div className="mt-3 flex gap-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                새 탭에서 열기
              </a>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              💡 채용 담당자 / 지인 / 동료에게 이 URL을 보내면 별도의 로그인 없이 바로 볼 수 있어요.
            </p>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
            <Lock className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-2 text-sm font-bold text-slate-700">아직 비공개입니다</p>
            <p className="mt-1 text-xs text-slate-500">위 토글로 공개 전환하면 공유 URL이 생성됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
