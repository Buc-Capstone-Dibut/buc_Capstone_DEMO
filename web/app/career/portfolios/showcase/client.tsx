"use client";

import Link from "next/link";

type Item = {
  id: string; slug: string; title: string; templateId: string;
  isPublic: boolean; updatedAt: string; publishedAt: string | null;
  publicUrl: string | null;
};

export default function ShowcaseListClient({ initialItems }: { initialItems: Item[] }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-950">디자인 포트폴리오</h1>
          <p className="mt-1 text-sm text-slate-500">템플릿 기반 단일 페이지 포트폴리오 (베타)</p>
        </div>
        <Link
          href="/career/projects"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
        >
          프로젝트 보관함으로
        </Link>
      </header>

      {initialItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500">아직 만든 디자인 포트폴리오가 없습니다.</p>
          <p className="mt-2 text-xs text-slate-400">프로젝트 보관함에서 프로젝트를 선택해 만들 수 있어요.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {initialItems.map((it) => (
            <li key={it.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Link href={`/career/portfolios/showcase/${it.id}/edit`} className="text-lg font-bold text-slate-900 hover:underline">
                    {it.title}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">{it.templateId} · 수정 {new Date(it.updatedAt).toLocaleString("ko-KR")}</p>
                </div>
                {it.publicUrl ? (
                  <Link href={it.publicUrl} target="_blank" className="text-sm font-bold text-emerald-600 hover:underline">
                    공개 페이지 ↗
                  </Link>
                ) : (
                  <span className="text-xs text-slate-400">비공개</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
