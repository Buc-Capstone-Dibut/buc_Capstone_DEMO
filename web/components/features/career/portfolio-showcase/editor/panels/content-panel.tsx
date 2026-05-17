"use client";

import type { NeonEditorialContent } from "../../templates/neon-editorial/types";

type Setter = (updater: (prev: NeonEditorialContent) => NeonEditorialContent) => void;

export function ContentPanel({ value, onChange }: { value: NeonEditorialContent; onChange: Setter }) {
  return (
    <div className="space-y-6 text-xs">
      <Section title="Hero">
        <Field label="직무 (Job title)">
          <input
            className={inputCls}
            value={value.hero.jobTitle}
            onChange={(e) => onChange((p) => ({ ...p, hero: { ...p.hero, jobTitle: e.target.value } }))}
          />
        </Field>
        <Field label="연도">
          <input
            className={inputCls}
            value={value.hero.year}
            onChange={(e) => onChange((p) => ({ ...p, hero: { ...p.hero, year: e.target.value } }))}
          />
        </Field>
        <Field label="헤드라인 줄 (한 줄마다 엔터)">
          <textarea
            className={`${inputCls} h-24`}
            value={value.hero.headlineLines.join("\n")}
            onChange={(e) => onChange((p) => ({ ...p, hero: { ...p.hero, headlineLines: e.target.value.split("\n") } }))}
          />
        </Field>
        <Field label="한 줄 소개">
          <textarea
            className={`${inputCls} h-20`}
            value={value.hero.bio}
            onChange={(e) => onChange((p) => ({ ...p, hero: { ...p.hero, bio: e.target.value } }))}
          />
        </Field>
      </Section>

      <Section title="Marquee 키워드 (콤마 구분)">
        <input
          className={inputCls}
          value={value.marqueeKeywords.join(", ")}
          onChange={(e) => onChange((p) => ({
            ...p,
            marqueeKeywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
          }))}
        />
      </Section>

      <Section title="About">
        <Field label="인용구">
          <textarea
            className={`${inputCls} h-20`}
            value={value.about.quote}
            onChange={(e) => onChange((p) => ({ ...p, about: { ...p.about, quote: e.target.value } }))}
          />
        </Field>
        <Field label="문단 (한 줄마다 엔터)">
          <textarea
            className={`${inputCls} h-28`}
            value={value.about.paragraphs.join("\n")}
            onChange={(e) => onChange((p) => ({
              ...p,
              about: { ...p.about, paragraphs: e.target.value.split("\n").filter((line) => line.length > 0) },
            }))}
          />
        </Field>
        <Field label="강점 카드 (최대 4개)">
          <div className="space-y-2">
            {value.about.strengths.map((s, i) => (
              <div key={i} className="grid grid-cols-[40px_1fr] gap-2">
                <input
                  className={inputCls}
                  value={s.num}
                  onChange={(e) => onChange((p) => {
                    const next = [...p.about.strengths];
                    next[i] = { ...next[i], num: e.target.value };
                    return { ...p, about: { ...p.about, strengths: next } };
                  })}
                />
                <div className="space-y-1">
                  <input
                    className={inputCls}
                    placeholder="제목"
                    value={s.title}
                    onChange={(e) => onChange((p) => {
                      const next = [...p.about.strengths];
                      next[i] = { ...next[i], title: e.target.value };
                      return { ...p, about: { ...p.about, strengths: next } };
                    })}
                  />
                  <textarea
                    className={`${inputCls} h-14`}
                    placeholder="설명"
                    value={s.body}
                    onChange={(e) => onChange((p) => {
                      const next = [...p.about.strengths];
                      next[i] = { ...next[i], body: e.target.value };
                      return { ...p, about: { ...p.about, strengths: next } };
                    })}
                  />
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              {value.about.strengths.length < 4 && (
                <button
                  type="button"
                  className={btnCls}
                  onClick={() => onChange((p) => ({
                    ...p,
                    about: {
                      ...p.about,
                      strengths: [
                        ...p.about.strengths,
                        { num: String(p.about.strengths.length + 1).padStart(2, "0"), title: "", body: "" },
                      ],
                    },
                  }))}
                >＋ 강점 추가</button>
              )}
              {value.about.strengths.length > 0 && (
                <button
                  type="button"
                  className={btnCls}
                  onClick={() => onChange((p) => ({
                    ...p,
                    about: { ...p.about, strengths: p.about.strengths.slice(0, -1) },
                  }))}
                >마지막 제거</button>
              )}
            </div>
          </div>
        </Field>
      </Section>

      <Section title="KPI (최대 3개)">
        <div className="space-y-2">
          {value.kpis.map((k, i) => (
            <div key={i} className="grid grid-cols-[80px_60px_1fr] gap-2">
              <input
                type="number"
                className={inputCls}
                value={k.num}
                onChange={(e) => onChange((p) => {
                  const next = [...p.kpis];
                  next[i] = { ...next[i], num: Number(e.target.value) || 0 };
                  return { ...p, kpis: next };
                })}
              />
              <input
                className={inputCls}
                placeholder="단위"
                value={k.suffix}
                onChange={(e) => onChange((p) => {
                  const next = [...p.kpis];
                  next[i] = { ...next[i], suffix: e.target.value };
                  return { ...p, kpis: next };
                })}
              />
              <input
                className={inputCls}
                placeholder="라벨"
                value={k.label}
                onChange={(e) => onChange((p) => {
                  const next = [...p.kpis];
                  next[i] = { ...next[i], label: e.target.value };
                  return { ...p, kpis: next };
                })}
              />
            </div>
          ))}
          <div className="flex gap-2">
            {value.kpis.length < 3 && (
              <button
                type="button"
                className={btnCls}
                onClick={() => onChange((p) => ({ ...p, kpis: [...p.kpis, { num: 0, suffix: "", label: "" }] }))}
              >＋ KPI 추가</button>
            )}
            {value.kpis.length > 0 && (
              <button
                type="button"
                className={btnCls}
                onClick={() => onChange((p) => ({ ...p, kpis: p.kpis.slice(0, -1) }))}
              >마지막 제거</button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Contact">
        <Field label="이메일">
          <input
            className={inputCls}
            value={value.contact.email}
            onChange={(e) => onChange((p) => ({ ...p, contact: { ...p.contact, email: e.target.value } }))}
          />
        </Field>
      </Section>
    </div>
  );
}

const inputCls = "w-full rounded border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-900";
const btnCls = "rounded border border-slate-300 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      {children}
    </label>
  );
}
