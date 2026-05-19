"use client";

import { useEffect, useState } from "react";
import { X, Share2 } from "lucide-react";
import { getShowcaseTemplate } from "../templates/registry";
import type { NeonEditorialContent, NeonEditorialTokens } from "../templates/neon-editorial/types";
import { ContentPanel } from "./panels/content-panel";
import { TokensPanel } from "./panels/tokens-panel";
import { ProjectsPanel } from "./panels/projects-panel";
import { ShareModal } from "./share-modal";

export type ShowcaseEditorOverlayProps = {
  portfolio: {
    id: string;
    slug: string;
    title: string;
    templateId: string;
    isPublic: boolean;
  };
  initialContent: Record<string, unknown>;
  initialTokens: Record<string, unknown>;
  onExit: () => void;
};

export function ShowcaseEditorOverlay({
  portfolio,
  initialContent,
  initialTokens,
  onExit,
}: ShowcaseEditorOverlayProps) {
  const template = getShowcaseTemplate(portfolio.templateId);
  const [content, setContent] = useState<NeonEditorialContent>(() =>
    template.contentSchema.parse(initialContent) as NeonEditorialContent
  );
  const [tokens, setTokens] = useState<NeonEditorialTokens>(() =>
    template.tokensSchema.parse(initialTokens) as NeonEditorialTokens
  );
  const [activeTab, setActiveTab] = useState<"content" | "tokens" | "projects">("content");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(portfolio.isPublic);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (isPublic) {
      fetch(`/api/career/portfolios/showcase/${portfolio.id}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      })
        .then((r) => r.json())
        .then((d) => setPublicUrl(d.publicUrl ?? null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolio.id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/career/portfolios/showcase/${portfolio.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, tokens }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || `저장 실패 (${res.status})`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    const next = !isPublic;
    setIsPublic(next);
    const res = await fetch(`/api/career/portfolios/showcase/${portfolio.id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });
    const data = await res.json().catch(() => ({}));
    setPublicUrl(data.publicUrl ?? null);
  }

  const Template = template.Component;

  return (
    <div className="fixed inset-0 z-[80] flex bg-slate-100">
      <button
        onClick={onExit}
        className="fixed right-4 top-4 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        aria-label="닫기"
        title="닫기"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Left panel */}
      <aside className="flex h-full w-[360px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 px-4">
          <h2 className="truncate text-sm font-bold text-slate-900">{portfolio.title}</h2>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>

        <nav className="flex border-b border-slate-200">
          {([
            ["content", "콘텐츠"],
            ["tokens", "디자인"],
            ["projects", "프로젝트"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 px-3 py-2 text-xs font-bold ${
                activeTab === key ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-4">
          {error && <p className="mb-3 rounded bg-red-50 p-2 text-xs text-red-600">{error}</p>}
          {activeTab === "content" && (
            <ContentPanel value={content} onChange={(updater) => setContent((p) => updater(p))} />
          )}
          {activeTab === "tokens" && (
            <TokensPanel value={tokens} onChange={(updater) => setTokens((p) => updater(p))} />
          )}
          {activeTab === "projects" && (
            <ProjectsPanel
              value={content}
              onChange={(updater) => setContent((p) => updater(p))}
              portfolioId={portfolio.id}
            />
          )}
        </div>
      </aside>

      {/* Right preview pane */}
      <main className="relative flex-1 overflow-y-auto bg-slate-50">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur">
          <span className={`flex items-center gap-1.5 text-xs font-bold ${isPublic ? "text-emerald-600" : "text-slate-500"}`}>
            {isPublic ? (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                공개됨
              </>
            ) : (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                비공개
              </>
            )}
          </span>

          {publicUrl && (
            <span className="ml-2 hidden truncate font-mono text-[10px] text-slate-400 lg:block" title={publicUrl}>
              {publicUrl}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600"
          >
            <Share2 className="h-3.5 w-3.5" />
            공유
          </button>
        </div>
        <div className="origin-top">
          <Template content={content} tokens={tokens} animate={false} />
        </div>
      </main>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        isPublic={isPublic}
        onTogglePublic={togglePublish}
        publicUrl={publicUrl}
      />
    </div>
  );
}
