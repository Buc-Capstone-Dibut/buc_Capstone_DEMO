"use client";

import { useState } from "react";
import { getShowcaseTemplate } from "../templates/registry";
import type { NeonEditorialContent, NeonEditorialTokens } from "../templates/neon-editorial/types";

export type ShowcaseEditorClientProps = {
  portfolio: {
    id: string;
    slug: string;
    title: string;
    templateId: string;
    isPublic: boolean;
  };
  initialContent: Record<string, unknown>;
  initialTokens: Record<string, unknown>;
};

export function ShowcaseEditorClient({ portfolio, initialContent, initialTokens }: ShowcaseEditorClientProps) {
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

  const Template = template.Component;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
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
          {/* Panels mounted in Tasks 13/14/15 */}
          {activeTab === "content" && (
            <div data-testid="content-panel-placeholder" className="text-xs text-slate-400">콘텐츠 패널 — Task 13에서 작성</div>
          )}
          {activeTab === "tokens" && (
            <div data-testid="tokens-panel-placeholder" className="text-xs text-slate-400">디자인 토큰 패널 — Task 14에서 작성</div>
          )}
          {activeTab === "projects" && (
            <div data-testid="projects-panel-placeholder" className="text-xs text-slate-400">프로젝트 패널 — Task 15에서 작성</div>
          )}
        </div>
      </aside>

      {/* Right preview pane */}
      <main className="relative flex-1 overflow-y-auto bg-slate-50">
        <div className="origin-top">
          <Template content={content} tokens={tokens} />
        </div>
      </main>
    </div>
  );
}
