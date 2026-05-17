# Workspace Portfolio Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a second portfolio track that turns a user's selected timeline projects into a single, public-shareable React-rendered design portfolio (first template: NeonEditorial — visual sibling of `web/public/portfolio-demo-neon/index.html`), with a WYSIWYG content+token editor, leaving 갈래 A untouched.

**Architecture:** Add an isolated route group under `web/app/career/portfolios/showcase/*` + `web/app/p/[handle]/[slug]` + `web/app/api/career/portfolios/showcase/*` and an isolated component tree under `web/components/features/career/portfolio-showcase/*`. New DB table `showcase_portfolios` with two JSON columns — `content_payload` (snapshot of selected timeline projects + hero/contact/etc.) and `tokens_payload` (color/font/density tokens). 갈래 A's tables, helpers and routes are read-only; only one existing file is edited — `project-archive-screen.tsx` — to add a third option to the format selection modal.

**Tech Stack:**
- Next.js 14 App Router (existing)
- Prisma + Supabase Postgres (existing)
- React 18 (existing)
- @dnd-kit/core + @dnd-kit/sortable (already installed)
- zod (already installed)
- GSAP + ScrollTrigger via CDN (mirroring the demo HTML)
- Pretendard via CDN
- Test runner: `tsx --test` (Node's `node:test` + `node:assert/strict`) — same as `web/lib/interview/report/*.test.ts`

---

## Branch Policy (HARD)

- Working branch: `feat/workspace-portfolio` (already checked out, off `develop`)
- **NEVER** push to `main`. **NEVER** merge into `main`. All commits stay on the feat branch; final integration into `develop` happens only after user explicit approval.
- Commits should be small and atomic. One task = one commit (unless task notes otherwise).

## Test Strategy

- **Unit tests (`tsx --test`)** for pure logic: project snapshot mapper, slug uniqueness, content schema validators, template registry lookups.
- **Visual / integration verification via Claude Preview tools** for UI tasks: `preview_eval` to navigate (always append `?v=<ts>` for cache bust), `preview_snapshot` for structure, `preview_screenshot` for visual proof.
- **No React unit tests** — the project has no React Testing Library setup; do not introduce one.
- Each task lists explicit verification commands or observable results.

---

## File Structure (created/modified)

```
docs/superpowers/plans/2026-05-17-workspace-portfolio-showcase.md   (this file)

CREATE:
  web/prisma/migrations/20260517_showcase_portfolios/migration.sql
  web/components/features/career/portfolio-showcase/
    templates/
      neon-editorial/
        index.tsx                    React component (props: { content, tokens })
        styles.module.css            scoped CSS (or styled-jsx inline)
        types.ts                     zod content schema + Tokens type
      registry.ts                    templateId → { Component, defaults, schema, label, previewImage }
    server/
      showcase-portfolios.ts         server-only delegate helpers + snapshot mapper
      showcase-portfolios.test.ts    unit tests (tsx --test)
    shared/
      template-picker.tsx
      project-snapshot-types.ts      shared TS types
    editor/
      showcase-editor-client.tsx     client component shell
      panels/
        content-panel.tsx
        tokens-panel.tsx
        projects-panel.tsx           DnD-sortable list
      action-bar.tsx

  web/app/career/portfolios/showcase/page.tsx                     list
  web/app/career/portfolios/showcase/new/page.tsx                 template picker + POST + redirect (server action)
  web/app/career/portfolios/showcase/[id]/edit/page.tsx           editor host (server) → client
  web/app/p/[handle]/[slug]/page.tsx                              public page

  web/app/api/career/portfolios/showcase/route.ts                 POST(new) + GET(list)
  web/app/api/career/portfolios/showcase/[id]/route.ts            GET / PUT / DELETE
  web/app/api/career/portfolios/showcase/[id]/publish/route.ts    POST is_public toggle

MODIFY:
  web/prisma/schema.prisma                                        +1 model `showcase_portfolios`, +1 relation on `profiles`
  web/components/features/career/project-archive/project-archive-screen.tsx
                                                                   add third option in format dialog (lines 199-233)
```

---

## Multi-Agent Dispatch Plan (waves)

| Wave | Tasks | Agents | Notes |
|---|---|---|---|
| 1 | T1 → T2 → T3 | 1 sequential | Foundation: DB migration, types, snapshot mapper. Must complete before others. |
| 2 | (T4+T5+T6) ∥ (T7+T8+T9) | 2 parallel | Template chain and API chain don't share files. |
| 3 | (T10+T11+T12) ∥ (T17) | 2 parallel | List/new/editor-shell and public page touch disjoint files. |
| 4 | T13 → T14 → T15 → T16 | 1 sequential | Editor panels build on editor shell. |
| 5 | T18 | 1 | Wiring entry point — needs editor reachable. |
| 6 | T19 | main session | End-to-end smoke + commit/PR decision. |

Two-stage review applies to each agent: the dispatched agent self-reports success criteria evidence, main session verifies before moving to next wave.

---

## Phase 1 — Foundation (Sequential, 1 agent)

### Task 1: Prisma migration + schema for `showcase_portfolios`

**Goal:** Create the `showcase_portfolios` table and Prisma model.

**Files:**
- Create: `web/prisma/migrations/20260517_showcase_portfolios/migration.sql`
- Modify: `web/prisma/schema.prisma` (add `showcase_portfolios` model, add `showcase_portfolios showcase_portfolios[]` relation on the `profiles` model)

**Dependencies:** None.

- [ ] **Step 1: Write the migration SQL**

Create `web/prisma/migrations/20260517_showcase_portfolios/migration.sql`:

```sql
create table if not exists public.showcase_portfolios (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  slug             text not null,
  title            text not null default '새 포트폴리오',
  template_id      text not null default 'neon-editorial',
  content_payload  jsonb not null default '{}'::jsonb,
  tokens_payload   jsonb not null default '{}'::jsonb,
  is_public        boolean not null default false,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint showcase_portfolios_user_slug_unique unique (user_id, slug)
);

create index if not exists showcase_portfolios_user_updated_idx
  on public.showcase_portfolios (user_id, updated_at desc);

create index if not exists showcase_portfolios_public_published_idx
  on public.showcase_portfolios (is_public, published_at desc);
```

- [ ] **Step 2: Add the Prisma model**

Locate the `profiles` model in `web/prisma/schema.prisma`. Add this line to its body (near other `xxx xxx[]` relations):

```prisma
  showcase_portfolios   showcase_portfolios[]
```

Append the model at an appropriate location (next to `user_portfolios`):

```prisma
model showcase_portfolios {
  id              String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  user_id         String   @db.Uuid
  slug            String
  title           String   @default("새 포트폴리오")
  template_id     String   @default("neon-editorial")
  content_payload Json     @default("{}")
  tokens_payload  Json     @default("{}")
  is_public       Boolean  @default(false)
  published_at    DateTime? @db.Timestamptz(6)
  created_at      DateTime @default(now()) @db.Timestamptz(6)
  updated_at      DateTime @default(now()) @updatedAt @db.Timestamptz(6)
  profiles        profiles @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([user_id, slug])
  @@index([user_id, updated_at(sort: Desc)])
  @@index([is_public, published_at(sort: Desc)])
  @@schema("public")
}
```

- [ ] **Step 3: Apply the migration locally**

Run:
```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx prisma migrate deploy
```
Expected: `1 migration found` / `Applying migration 20260517_showcase_portfolios`.

If `prisma migrate deploy` is the wrong command for this dev setup, fall back to:
```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx prisma db push
```
Expected: applied.

- [ ] **Step 4: Generate the client**

```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx prisma generate
```
Expected: `✔ Generated Prisma Client`.

- [ ] **Step 5: Verify**

```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx tsx -e "import prisma from './lib/prisma'; (async () => { const c = await prisma.showcase_portfolios.count(); console.log('rows:', c); process.exit(0); })()"
```
Expected: `rows: 0` (or any non-error number).

- [ ] **Step 6: Commit**

```bash
git add web/prisma/migrations/20260517_showcase_portfolios web/prisma/schema.prisma
git commit -m "feat(showcase): add showcase_portfolios table + Prisma model"
```

**Success criteria:** `npx prisma migrate status` shows the migration applied; `prisma.showcase_portfolios.count()` returns a number.

---

### Task 2: Content + Tokens types + zod schemas for NeonEditorial

**Goal:** Define typed and validated `Content` and `Tokens` shapes for the NeonEditorial template.

**Files:**
- Create: `web/components/features/career/portfolio-showcase/shared/project-snapshot-types.ts`
- Create: `web/components/features/career/portfolio-showcase/templates/neon-editorial/types.ts`
- Create: `web/components/features/career/portfolio-showcase/templates/neon-editorial/types.test.ts`

**Dependencies:** None (parallel to Task 1 if desired, but Task 3 needs this so keep sequential).

- [ ] **Step 1: Write shared snapshot type**

Create `web/components/features/career/portfolio-showcase/shared/project-snapshot-types.ts`:

```ts
import type { ResumePayload } from "@/app/my/[handle]/profile-types";

// A project snapshot is a deep copy of one resume_payload.timeline item
// taken at the moment the user selects it. We DO NOT keep a foreign key to
// the live timeline — see spec §4.
export type ProjectSnapshot = NonNullable<ResumePayload["timeline"]>[number];
```

- [ ] **Step 2: Write the failing test for content schema**

Create `web/components/features/career/portfolio-showcase/templates/neon-editorial/types.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NeonEditorialContentSchema,
  NeonEditorialTokensSchema,
  createDefaultNeonEditorialContent,
  createDefaultNeonEditorialTokens,
} from "./types";

test("default content parses successfully", () => {
  const content = createDefaultNeonEditorialContent({ name: "DOYOON KIM" });
  const parsed = NeonEditorialContentSchema.safeParse(content);
  assert.equal(parsed.success, true);
});

test("default tokens parse successfully", () => {
  const tokens = createDefaultNeonEditorialTokens();
  const parsed = NeonEditorialTokensSchema.safeParse(tokens);
  assert.equal(parsed.success, true);
});

test("content with empty projects array is still valid", () => {
  const content = createDefaultNeonEditorialContent({ name: "X" });
  content.projects = [];
  const parsed = NeonEditorialContentSchema.safeParse(content);
  assert.equal(parsed.success, true);
});

test("invalid token color is rejected", () => {
  const tokens = createDefaultNeonEditorialTokens();
  // @ts-expect-error testing runtime rejection
  tokens.accent = 123;
  const parsed = NeonEditorialTokensSchema.safeParse(tokens);
  assert.equal(parsed.success, false);
});
```

- [ ] **Step 3: Run the test, expect failure**

```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx tsx --test components/features/career/portfolio-showcase/templates/neon-editorial/types.test.ts
```
Expected: FAIL with "Cannot find module './types'".

- [ ] **Step 4: Write the types module**

Create `web/components/features/career/portfolio-showcase/templates/neon-editorial/types.ts`:

```ts
import { z } from "zod";
import type { ProjectSnapshot } from "../../shared/project-snapshot-types";

// Tokens — design-system knobs the user can change in the "디자인" tab.
export const NeonEditorialTokensSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{3,8}$/),  // hex color
  bg: z.enum(["dark"]),                              // dark-only in v1
  fontPair: z.enum(["pretendard"]),                  // 1 option in v1
  density: z.enum(["spacious", "balanced", "compact"]),
});
export type NeonEditorialTokens = z.infer<typeof NeonEditorialTokensSchema>;

// Hero
const HeroSchema = z.object({
  jobTitle: z.string().default("PRODUCT ENGINEER"),
  year: z.string().default("© 2026"),
  headlineLines: z.array(z.string()).min(1).max(4),
  bio: z.string().default(""),
});

// About
const StrengthSchema = z.object({
  num: z.string(),
  title: z.string(),
  body: z.string(),
});
const AboutSchema = z.object({
  quote: z.string().default(""),
  paragraphs: z.array(z.string()).default([]),
  strengths: z.array(StrengthSchema).max(4).default([]),
});

// KPI
const KpiSchema = z.object({
  num: z.number(),
  suffix: z.string().default(""),
  label: z.string(),
});

// Project snapshot type — treated as opaque JSON by zod (validated upstream by timeline)
const ProjectSnapshotSchema = z.record(z.string(), z.any());

// Timeline rows for Experience/Education
const TimelineRowSchema = z.object({
  date: z.string(),
  title: z.string(),
  org: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

// Contact
const ContactSchema = z.object({
  email: z.string().default(""),
  socials: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
});

// Top-level content
export const NeonEditorialContentSchema = z.object({
  hero: HeroSchema,
  marqueeKeywords: z.array(z.string()).default([]),
  about: AboutSchema,
  projects: z.array(ProjectSnapshotSchema).default([]),
  kpis: z.array(KpiSchema).default([]),
  experience: z.array(TimelineRowSchema).default([]),
  education: z.array(TimelineRowSchema).default([]),
  contact: ContactSchema,
});
export type NeonEditorialContent = z.infer<typeof NeonEditorialContentSchema>;

// Defaults — used when creating a new portfolio before user edits.
export function createDefaultNeonEditorialTokens(): NeonEditorialTokens {
  return {
    accent: "#39FF14",
    bg: "dark",
    fontPair: "pretendard",
    density: "spacious",
  };
}

export function createDefaultNeonEditorialContent(seed: {
  name: string;
  projects?: ProjectSnapshot[];
}): NeonEditorialContent {
  const parts = (seed.name || "PORTFOLIO").trim().split(/\s+/).slice(0, 2);
  const headlineLines = parts.length > 1 ? [...parts, "PORTFOLIO."] : [parts[0] || "PORTFOLIO", "PORTFOLIO."];

  return {
    hero: {
      jobTitle: "PRODUCT ENGINEER",
      year: "© 2026",
      headlineLines,
      bio: "한 줄 소개를 입력하세요.",
    },
    marqueeKeywords: ["TYPESCRIPT", "NEXT.JS", "POSTGRESQL", "AWS", "DESIGN SYSTEMS"],
    about: {
      quote: "기술은 도구일 뿐, 만드는 사람의 의도가 곧 프로덕트의 품질이다.",
      paragraphs: ["소개 문단을 입력하세요."],
      strengths: [],
    },
    projects: (seed.projects ?? []) as Record<string, unknown>[],
    kpis: [],
    experience: [],
    education: [],
    contact: { email: "", socials: [] },
  };
}
```

- [ ] **Step 5: Run the test, expect pass**

```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx tsx --test components/features/career/portfolio-showcase/templates/neon-editorial/types.test.ts
```
Expected: `# pass 4`.

- [ ] **Step 6: Commit**

```bash
git add web/components/features/career/portfolio-showcase/shared web/components/features/career/portfolio-showcase/templates/neon-editorial/types.ts web/components/features/career/portfolio-showcase/templates/neon-editorial/types.test.ts
git commit -m "feat(showcase): add NeonEditorial content/tokens types + zod schemas"
```

**Success criteria:** `tsx --test` reports 4 passing assertions for the types module.

---

### Task 3: Project snapshot mapping helper + slug helper

**Goal:** Pure functions to convert a fresh fetch of `resume_payload.timeline` into the `ProjectSnapshot[]` shape, plus a unique-slug generator scoped to `showcase_portfolios`.

**Files:**
- Create: `web/components/features/career/portfolio-showcase/server/showcase-portfolios.ts`
- Create: `web/components/features/career/portfolio-showcase/server/showcase-portfolios.test.ts`

**Dependencies:** Task 1 (Prisma client), Task 2 (snapshot type).

- [ ] **Step 1: Write failing test**

Create `web/components/features/career/portfolio-showcase/server/showcase-portfolios.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pickProjectSnapshotsByIds,
  normalizeShowcaseSlug,
} from "./showcase-portfolios";

test("pickProjectSnapshotsByIds preserves order from the ids array", () => {
  const all = [
    { id: "a", company: "A" },
    { id: "b", company: "B" },
    { id: "c", company: "C" },
  ];
  const result = pickProjectSnapshotsByIds(all as never, ["c", "a"]);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, "c");
  assert.equal(result[1].id, "a");
});

test("pickProjectSnapshotsByIds skips unknown ids", () => {
  const all = [{ id: "a" }];
  const result = pickProjectSnapshotsByIds(all as never, ["a", "missing"]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "a");
});

test("pickProjectSnapshotsByIds returns a deep copy (mutation-safe)", () => {
  const all = [{ id: "a", company: "Original", tags: ["x"] }];
  const result = pickProjectSnapshotsByIds(all as never, ["a"]);
  (result[0] as { company: string }).company = "Mutated";
  (result[0] as { tags: string[] }).tags.push("y");
  assert.equal((all[0] as { company: string }).company, "Original");
  assert.equal((all[0] as { tags: string[] }).tags.length, 1);
});

test("normalizeShowcaseSlug strips invalid chars and falls back", () => {
  assert.equal(normalizeShowcaseSlug("My Portfolio! v2"), "my-portfolio-v2");
  assert.equal(normalizeShowcaseSlug(""), "");  // empty case — caller decides
  assert.equal(normalizeShowcaseSlug("프론트 엔드"), "프론트-엔드");
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx tsx --test components/features/career/portfolio-showcase/server/showcase-portfolios.test.ts
```
Expected: FAIL with "Cannot find module './showcase-portfolios'".

- [ ] **Step 3: Write the module**

Create `web/components/features/career/portfolio-showcase/server/showcase-portfolios.ts`:

```ts
import "server-only";

import prisma from "@/lib/prisma";
import type { ProjectSnapshot } from "../shared/project-snapshot-types";

export type ShowcasePortfolioRow = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  template_id: string;
  content_payload: unknown;
  tokens_payload: unknown;
  is_public: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type ShowcaseDelegate = {
  findMany(args: unknown): Promise<ShowcasePortfolioRow[]>;
  findFirst(args: unknown): Promise<ShowcasePortfolioRow | null>;
  create(args: unknown): Promise<ShowcasePortfolioRow>;
  update(args: unknown): Promise<ShowcasePortfolioRow>;
  delete(args: unknown): Promise<ShowcasePortfolioRow>;
};

export function showcasePortfolioDelegate() {
  return (prisma as unknown as { showcase_portfolios: ShowcaseDelegate }).showcase_portfolios;
}

/**
 * Take the user's full timeline + a list of ids the user selected, and
 * return a deep-cloned subset preserving the user's chosen order. The
 * clone protects callers from later timeline mutations (snapshot semantics).
 */
export function pickProjectSnapshotsByIds(
  timeline: ProjectSnapshot[],
  ids: string[],
): ProjectSnapshot[] {
  const byId = new Map<string, ProjectSnapshot>();
  for (const item of timeline) {
    const id = (item as { id?: string })?.id;
    if (typeof id === "string" && id) byId.set(id, item);
  }
  const picked: ProjectSnapshot[] = [];
  for (const id of ids) {
    const found = byId.get(id);
    if (!found) continue;
    picked.push(structuredClone(found));
  }
  return picked;
}

export function normalizeShowcaseSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createUniqueShowcaseSlug(userId: string, title: string): Promise<string> {
  const base = normalizeShowcaseSlug(title || "portfolio") || `portfolio-${Date.now().toString(36)}`;
  const delegate = showcasePortfolioDelegate();
  let candidate = base;
  let n = 2;
  while (await delegate.findFirst({ where: { user_id: userId, slug: candidate } })) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx tsx --test components/features/career/portfolio-showcase/server/showcase-portfolios.test.ts
```
Expected: `# pass 4`. (The 4 tests are pure functions, no DB hit.)

- [ ] **Step 5: Commit**

```bash
git add web/components/features/career/portfolio-showcase/server
git commit -m "feat(showcase): add server delegate + snapshot picker + slug helper"
```

**Success criteria:** All 4 tests pass; module exports compile cleanly.

---

## Phase 2 — Template (Parallel with Phase 3)

### Task 4: NeonEditorial template — static structural port (no animations yet)

**Goal:** A React component `<NeonEditorialTemplate content tokens />` that renders all sections from the demo HTML at the correct DOM/CSS hierarchy. GSAP / cursor / count-up / marquee animations come in Task 5.

**Files:**
- Create: `web/components/features/career/portfolio-showcase/templates/neon-editorial/index.tsx`
- Create: `web/components/features/career/portfolio-showcase/templates/neon-editorial/styles.module.css`
- Reference (read-only): `web/public/portfolio-demo-neon/index.html`

**Dependencies:** Task 2 (types).

- [ ] **Step 1: Port the demo's `<style>` block to a CSS module**

Open `web/public/portfolio-demo-neon/index.html`, copy the contents of `<style>...</style>` into `styles.module.css`. Adjust:
- Rename selectors using CSS Modules convention is automatic (classes get hashed). Since we want the existing class names to keep working, use `:global(...)` wrappers for the descendant selectors, OR use plain class names with a wrapper. Simplest: keep the file as a plain `.module.css` but use `:global` aggressively for the inner tree.

Recommended approach: use a top-level wrapper class `.root` and `:global` for everything inside, so the template's internal markup can keep readable class names:

```css
.root {
  /* tokens get injected via inline style on root */
}

.root :global(.hero) { /* ...exact CSS from demo... */ }
.root :global(.hero-top) { /* ... */ }
/* ... all other selectors ... */
```

Replace hard-coded `--accent: #39FF14;` etc. — the `:root` block in the original CSS is **dropped** because we'll inject CSS variables via inline `style` on the `.root` element (token-driven).

- [ ] **Step 2: Write the React component**

Create `web/components/features/career/portfolio-showcase/templates/neon-editorial/index.tsx`:

```tsx
"use client";

import { useId } from "react";
import styles from "./styles.module.css";
import type { NeonEditorialContent, NeonEditorialTokens } from "./types";

export type NeonEditorialTemplateProps = {
  content: NeonEditorialContent;
  tokens: NeonEditorialTokens;
};

export function NeonEditorialTemplate({ content, tokens }: NeonEditorialTemplateProps) {
  const styleVars = {
    ["--accent" as string]: tokens.accent,
    ["--bg" as string]: "#0A0A0A",
    ["--bg-alt" as string]: "#111111",
    ["--bg-card" as string]: "#161616",
    ["--text-primary" as string]: "#F0F0F0",
    ["--text-secondary" as string]: "#888888",
    ["--border" as string]: "#222222",
  } as React.CSSProperties;

  return (
    <div className={styles.root} style={styleVars} data-density={tokens.density}>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
      />

      <div className="cursor-ring" aria-hidden="true" />
      <div className="cursor-dot" aria-hidden="true" />
      <div className="scroll-progress" aria-hidden="true" />

      {/* HERO */}
      <section className="hero">
        <div className="hero-top">
          <span className="label accent">{content.hero.jobTitle}</span>
          <span className="label">{content.hero.year}</span>
        </div>
        <div className="hero-name">
          {content.hero.headlineLines.map((line, i) => (
            <div className={`hero-line${i === content.hero.headlineLines.length - 1 ? " sub" : ""}`} key={i}>
              <span className="word">{line}</span>
            </div>
          ))}
        </div>
        <div className="hero-bottom">
          <p className="bio">{content.hero.bio}</p>
          <span className="scroll-hint">SCROLL <span className="arrow">↓</span></span>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...content.marqueeKeywords, ...content.marqueeKeywords].map((kw, i) => (
            <span key={i}>{kw}<span className="star">✦</span></span>
          ))}
        </div>
      </div>

      {/* ABOUT */}
      {(content.about.quote || content.about.paragraphs.length > 0 || content.about.strengths.length > 0) && (
        <section className="section about" id="about">
          <div className="section-head">
            <span className="label accent">01 / ABOUT</span>
            <h2 className="section-display">AB&nbsp;OUT</h2>
          </div>
          <div className="about-grid">
            <div className="about-quote">
              <blockquote>{content.about.quote}</blockquote>
            </div>
            <div className="about-body">
              {content.about.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
          {content.about.strengths.length > 0 && (
            <div className="strength-grid">
              {content.about.strengths.map((s, i) => (
                <div className="strength-card" key={i}>
                  <span className="strength-num">{s.num}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* WORKS */}
      {content.projects.length > 0 && (
        <section className="section works" id="works">
          <div className="section-head">
            <span className="label accent">02 / WORKS</span>
            <h2 className="section-display">WO&nbsp;RKS</h2>
          </div>
          <div className="works-list">
            {content.projects.map((p, i) => {
              const project = p as Record<string, unknown>;
              const title = String(project.company ?? project.position ?? "프로젝트");
              const role = String(project.position ?? "");
              const period = String(project.period ?? "");
              const tags = Array.isArray(project.techStack) ? (project.techStack as string[]) : Array.isArray(project.tags) ? (project.tags as string[]) : [];
              const num = String(i + 1).padStart(2, "0");
              return (
                <a className="work-row" href={`#work-${i}`} key={i}>
                  <span className="work-num">{num}</span>
                  <div className="work-info">
                    <h3>{title}</h3>
                    <span className="work-meta">{[period, role].filter(Boolean).join(" — ")}</span>
                  </div>
                  <div className="work-tags">{tags.slice(0, 5).join(" · ")}</div>
                  <span className="work-arrow">→</span>
                </a>
              );
            })}
          </div>
          {content.kpis.length > 0 && (
            <div className="kpi-spotlight">
              {content.kpis.map((k, i) => (
                <div className="kpi" key={i}>
                  <div className="kpi-num-wrap">
                    <span className="kpi-num" data-count={k.num}>0</span>
                    <span className="kpi-suffix">{k.suffix}</span>
                  </div>
                  <span className="kpi-label">{k.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* EXPERIENCE */}
      {(content.experience.length > 0 || content.education.length > 0) && (
        <section className="section experience" id="experience">
          <div className="section-head">
            <span className="label accent">03 / EXPERIENCE</span>
            <h2 className="section-display">EXPE&nbsp;RI&nbsp;ENCE</h2>
          </div>
          {content.experience.length > 0 && (
            <div className="timeline">
              {content.experience.map((row, i) => (
                <div className="timeline-row" key={i}>
                  <span className="t-date">{row.date}</span>
                  <div className="t-info">
                    <h3>{row.title} <span className="org">· {row.org}</span></h3>
                    <ul>{row.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
                  </div>
                </div>
              ))}
            </div>
          )}
          {content.education.length > 0 && (
            <>
              <div className="section-head subhead">
                <span className="label accent">EDUCATION</span>
              </div>
              <div className="timeline">
                {content.education.map((row, i) => (
                  <div className="timeline-row" key={i}>
                    <span className="t-date">{row.date}</span>
                    <div className="t-info">
                      <h3>{row.title} <span className="org">· {row.org}</span></h3>
                      <ul>{row.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* CONTACT */}
      <section className="section contact" id="contact">
        <span className="label accent">04 / CONTACT</span>
        <h2 className="contact-display">
          <span className="line"><span>LET'S</span></span>
          <span className="line"><span className="accent">TALK.</span></span>
        </h2>
        {content.contact.email && (
          <a className="magnetic-btn" href={`mailto:${content.contact.email}`}>
            <span>{content.contact.email.toUpperCase()}</span>
            <span className="arrow">→</span>
          </a>
        )}
        {content.contact.socials.length > 0 && (
          <div className="socials">
            {content.contact.socials.map((s, i) => (
              <a key={i} href={s.url} rel="noreferrer">{s.label}</a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify via preview**

Defer visual verification to after Task 5 (animations bolted on). For now, just ensure it compiles. Run:

```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -E "showcase|portfolio-showcase" | head -20
```
Expected: no errors mentioning the new files. (Other unrelated TS errors are fine and out of scope.)

- [ ] **Step 4: Commit**

```bash
git add web/components/features/career/portfolio-showcase/templates/neon-editorial/index.tsx web/components/features/career/portfolio-showcase/templates/neon-editorial/styles.module.css
git commit -m "feat(showcase): port NeonEditorial template structure (no animations yet)"
```

**Success criteria:** TS check shows no errors in the new files. The component renders without throwing when given default content/tokens (verified in Task 5).

---

### Task 5: NeonEditorial GSAP integration (cursor + entrance + scroll triggers + count-up + magnetic)

**Goal:** Wire all GSAP behaviors from the demo into the React component using `useEffect`. Re-trigger ScrollTrigger refresh on props change.

**Files:**
- Modify: `web/components/features/career/portfolio-showcase/templates/neon-editorial/index.tsx`

**Dependencies:** Task 4.

- [ ] **Step 1: Load GSAP via CDN script tags + add useEffect block**

At the top of the file (above the component), add a one-time loader helper:

```tsx
"use client";

import { useEffect, useRef } from "react";
import styles from "./styles.module.css";
import type { NeonEditorialContent, NeonEditorialTokens } from "./types";

declare global {
  interface Window {
    gsap?: any;
    ScrollTrigger?: any;
  }
}

const GSAP_SRC = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js";
const ST_SRC = "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js";

let gsapReadyPromise: Promise<void> | null = null;

function ensureGsap(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.gsap && window.ScrollTrigger) return Promise.resolve();
  if (gsapReadyPromise) return gsapReadyPromise;

  gsapReadyPromise = new Promise<void>((resolve) => {
    const loadOne = (src: string) =>
      new Promise<void>((res) => {
        const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
        if (existing) {
          if ((existing as any)._loaded) res();
          else existing.addEventListener("load", () => res(), { once: true });
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.async = false;  // serialize to preserve order
        s.addEventListener("load", () => { (s as any)._loaded = true; res(); }, { once: true });
        document.head.appendChild(s);
      });
    loadOne(GSAP_SRC).then(() => loadOne(ST_SRC)).then(() => resolve());
  });
  return gsapReadyPromise;
}
```

- [ ] **Step 2: Replace the component body to attach a ref + effect**

Modify the return to attach `ref={rootRef}` on the outer `<div className={styles.root}>` and add the effect before `return`:

```tsx
export function NeonEditorialTemplate({ content, tokens }: NeonEditorialTemplateProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let scopedTriggers: any[] = [];
    let stopCursor: (() => void) | null = null;
    let stopProgress: (() => void) | null = null;

    ensureGsap().then(() => {
      if (cancelled || !rootRef.current) return;
      const { gsap, ScrollTrigger } = window as any;
      if (!gsap || !ScrollTrigger) return;
      gsap.registerPlugin(ScrollTrigger);
      const root = rootRef.current;
      const isCoarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 900;

      // -------- Custom cursor (skip on touch) --------
      const dot = root.querySelector<HTMLElement>(".cursor-dot");
      const ring = root.querySelector<HTMLElement>(".cursor-ring");
      if (!isCoarse && dot && ring) {
        let mx = window.innerWidth / 2, my = window.innerHeight / 2;
        let dx = mx, dy = my, rx = mx, ry = my;
        let raf = 0;
        const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
        const tick = () => {
          dx += (mx - dx) * 0.35; dy += (my - dy) * 0.35;
          rx += (mx - rx) * 0.08; ry += (my - ry) * 0.08;
          dot.style.transform = `translate3d(${dx - 3}px, ${dy - 3}px, 0)`;
          ring.style.transform = `translate3d(${rx - 18}px, ${ry - 18}px, 0)`;
          raf = requestAnimationFrame(tick);
        };
        window.addEventListener("mousemove", onMove);
        tick();
        const hoverables = root.querySelectorAll<HTMLElement>("a, button, .work-row, .strength-card");
        const onEnter = () => { dot.classList.add("is-hover"); ring.classList.add("is-hover"); };
        const onLeave = () => { dot.classList.remove("is-hover"); ring.classList.remove("is-hover"); };
        hoverables.forEach((el) => {
          el.addEventListener("mouseenter", onEnter);
          el.addEventListener("mouseleave", onLeave);
        });
        stopCursor = () => {
          window.removeEventListener("mousemove", onMove);
          cancelAnimationFrame(raf);
          hoverables.forEach((el) => {
            el.removeEventListener("mouseenter", onEnter);
            el.removeEventListener("mouseleave", onLeave);
          });
        };
      }

      // -------- Scroll progress --------
      const progress = root.querySelector<HTMLElement>(".scroll-progress");
      if (progress) {
        const update = () => {
          const sH = document.documentElement.scrollHeight - window.innerHeight;
          progress.style.width = sH > 0 ? `${(window.scrollY / sH) * 100}%` : "0%";
        };
        window.addEventListener("scroll", update, { passive: true });
        update();
        stopProgress = () => window.removeEventListener("scroll", update);
      }

      // -------- Hero entrance --------
      gsap.set(root.querySelectorAll(".hero-line .word"), { clipPath: "inset(0 0 100% 0)", yPercent: 8 });
      gsap.to(root.querySelectorAll(".hero-line .word"), {
        clipPath: "inset(0 0 0% 0)", yPercent: 0,
        duration: 1.2, stagger: 0.18, ease: "power4.out", delay: 0.25,
      });
      gsap.from(root.querySelectorAll(".hero-top .label.accent"), { y: 20, opacity: 0, duration: 0.8, delay: 0.5, ease: "power3.out" });
      gsap.from(root.querySelectorAll(".hero-top .label:not(.accent)"), { y: 20, opacity: 0, duration: 0.8, delay: 0.65, ease: "power3.out" });
      gsap.from(root.querySelectorAll(".hero-bottom .bio"), { y: 20, opacity: 0, duration: 0.8, delay: 1.35, ease: "power3.out" });
      gsap.from(root.querySelectorAll(".hero-bottom .scroll-hint"), { y: 20, opacity: 0, duration: 0.8, delay: 1.5, ease: "power3.out" });

      // -------- Section displays --------
      root.querySelectorAll<HTMLElement>(".section-display").forEach((el) => {
        const t = gsap.from(el, {
          y: 60, opacity: 0, duration: 1.0, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
        scopedTriggers.push(t.scrollTrigger);
      });

      // -------- About body / quote --------
      root.querySelectorAll<HTMLElement>(".about-quote blockquote, .about-body p").forEach((el) => {
        const t = gsap.from(el, {
          y: 30, opacity: 0, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
        scopedTriggers.push(t.scrollTrigger);
      });

      // -------- Strength cards --------
      const strength = root.querySelector(".strength-grid");
      if (strength) {
        const t = gsap.from(root.querySelectorAll(".strength-card"), {
          y: 30, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out",
          scrollTrigger: { trigger: strength, start: "top 85%" },
        });
        scopedTriggers.push(t.scrollTrigger);
      }

      // -------- Works rows --------
      const works = root.querySelector(".works-list");
      if (works) {
        const t = gsap.from(root.querySelectorAll(".work-row"), {
          x: -20, opacity: 0, duration: 0.7, stagger: 0.07, ease: "power3.out",
          scrollTrigger: { trigger: works, start: "top 85%" },
        });
        scopedTriggers.push(t.scrollTrigger);
      }

      // -------- Experience rows --------
      root.querySelectorAll<HTMLElement>(".timeline-row").forEach((el) => {
        const t = gsap.from(el, {
          y: 20, opacity: 0, duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
        scopedTriggers.push(t.scrollTrigger);
      });

      // -------- KPI count-up --------
      root.querySelectorAll<HTMLElement>(".kpi-num").forEach((el) => {
        const target = parseInt(el.dataset.count || "0", 10);
        const obj = { v: 0 };
        const t = ScrollTrigger.create({
          trigger: el, start: "top 85%", once: true,
          onEnter: () => gsap.to(obj, {
            v: target, duration: 2, ease: "power2.out",
            onUpdate: () => { el.textContent = String(Math.round(obj.v)); },
          }),
        });
        scopedTriggers.push(t);
      });

      // -------- Contact display reveal --------
      gsap.set(root.querySelectorAll(".contact-display .line > span"), { yPercent: 110 });
      const ct = ScrollTrigger.create({
        trigger: root.querySelector(".contact-display"), start: "top 80%", once: true,
        onEnter: () => gsap.to(root.querySelectorAll(".contact-display .line > span"), {
          yPercent: 0, duration: 1.1, stagger: 0.15, ease: "power4.out",
        }),
      });
      scopedTriggers.push(ct);

      // -------- Magnetic button --------
      const btn = root.querySelector<HTMLElement>(".magnetic-btn");
      if (btn && !isCoarse) {
        const STRENGTH = 0.3;
        const onMove = (e: MouseEvent) => {
          const r = btn.getBoundingClientRect();
          const x = (e.clientX - r.left - r.width / 2) * STRENGTH;
          const y = (e.clientY - r.top - r.height / 2) * STRENGTH;
          gsap.to(btn, { x, y, duration: 0.3, ease: "power2.out" });
        };
        const onLeave = () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
        btn.addEventListener("mousemove", onMove);
        btn.addEventListener("mouseleave", onLeave);
        scopedTriggers.push({ kill: () => {
          btn.removeEventListener("mousemove", onMove);
          btn.removeEventListener("mouseleave", onLeave);
        }});
      }

      ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      stopCursor?.();
      stopProgress?.();
      for (const t of scopedTriggers) try { t?.kill?.(); } catch {}
    };
  }, [content, tokens]);

  // ... existing JSX (unchanged) ...
```

- [ ] **Step 2.5: Mount visual smoke harness (temp test page)**

Create `web/app/_test/neon-editorial/page.tsx` (temporary, deleted in Task 19):

```tsx
import { NeonEditorialTemplate } from "@/components/features/career/portfolio-showcase/templates/neon-editorial";
import {
  createDefaultNeonEditorialContent,
  createDefaultNeonEditorialTokens,
} from "@/components/features/career/portfolio-showcase/templates/neon-editorial/types";

export const dynamic = "force-dynamic";

export default function NeonEditorialTestPage() {
  const content = createDefaultNeonEditorialContent({ name: "DOYOON KIM" });
  content.hero.bio = "복잡한 시스템을 단순한 인터페이스로 옮기는 프로덕트 엔지니어.";
  content.about.paragraphs = ["테스트 페이지입니다.", "Task 19에서 삭제됩니다."];
  content.about.strengths = [
    { num: "01", title: "PRODUCT-FIRST", body: "Code is the means." },
    { num: "02", title: "PERFORMANCE", body: "<100ms." },
    { num: "03", title: "DESIGN-ENG GLUE", body: "Tokens + internals." },
    { num: "04", title: "LONG-TERM", body: "I stay until metrics move." },
  ];
  content.kpis = [
    { num: 40, suffix: "K+", label: "Monthly Active Users" },
    { num: 62, suffix: "%", label: "LCP Reduced" },
    { num: 800, suffix: "ms", label: "p95 Voice Latency" },
  ];
  return <NeonEditorialTemplate content={content} tokens={createDefaultNeonEditorialTokens()} />;
}
```

- [ ] **Step 3: Verify in preview**

Run via the dev server (already on port 3000):

```
preview_eval: window.location.assign('http://localhost:3000/_test/neon-editorial?v=' + Date.now()); 'navigating'
[wait 3500ms]
preview_eval: ({ url: location.href, headlineCount: document.querySelectorAll('.hero-line .word').length, kpiCount: document.querySelectorAll('.kpi-num').length, gsap: typeof window.gsap, scrollProgress: !!document.querySelector('.scroll-progress') })
```
Expected: `headlineCount >= 2`, `kpiCount === 3`, `gsap === "object"`, `scrollProgress === true`.

`preview_screenshot` for visual proof — should look like the demo's hero with "DOYOON KIM" visible (after 2-3 seconds of animation).

- [ ] **Step 4: Commit**

```bash
git add web/components/features/career/portfolio-showcase/templates/neon-editorial/index.tsx web/app/_test/neon-editorial/page.tsx
git commit -m "feat(showcase): integrate GSAP for NeonEditorial + visual smoke page"
```

**Success criteria:** `/_test/neon-editorial` renders the hero with animated entrance + count-up + cursor visible (per preview_screenshot, preview_eval checks).

---

### Task 6: Template registry

**Goal:** Single source of truth mapping `templateId` to its Component, defaults, and schema.

**Files:**
- Create: `web/components/features/career/portfolio-showcase/templates/registry.ts`
- Create: `web/components/features/career/portfolio-showcase/templates/registry.test.ts`

**Dependencies:** Task 4 (Component) + Task 2 (types).

- [ ] **Step 1: Write failing test**

Create `registry.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHOWCASE_TEMPLATES, getShowcaseTemplate, isShowcaseTemplateId } from "./registry";

test("neon-editorial entry exists", () => {
  assert.ok(SHOWCASE_TEMPLATES["neon-editorial"]);
  assert.equal(SHOWCASE_TEMPLATES["neon-editorial"].label, "Neon Editorial");
});

test("getShowcaseTemplate returns default for unknown id", () => {
  assert.equal(getShowcaseTemplate("does-not-exist").label, "Neon Editorial");
});

test("isShowcaseTemplateId narrows correctly", () => {
  assert.equal(isShowcaseTemplateId("neon-editorial"), true);
  assert.equal(isShowcaseTemplateId("nope"), false);
});
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx tsx --test components/features/career/portfolio-showcase/templates/registry.test.ts
```

- [ ] **Step 3: Write the registry**

Create `registry.ts`:

```ts
import { NeonEditorialTemplate } from "./neon-editorial";
import {
  NeonEditorialContentSchema,
  NeonEditorialTokensSchema,
  createDefaultNeonEditorialContent,
  createDefaultNeonEditorialTokens,
} from "./neon-editorial/types";

export const SHOWCASE_TEMPLATES = {
  "neon-editorial": {
    label: "Neon Editorial",
    description: "거대 디스플레이 타이포 + 네온 어센트 + GSAP 인터랙션",
    Component: NeonEditorialTemplate,
    contentSchema: NeonEditorialContentSchema,
    tokensSchema: NeonEditorialTokensSchema,
    createDefaultContent: createDefaultNeonEditorialContent,
    createDefaultTokens: createDefaultNeonEditorialTokens,
    previewImage: "/portfolio-template-previews/neon-editorial.png",
  },
} as const;

export type ShowcaseTemplateId = keyof typeof SHOWCASE_TEMPLATES;

const DEFAULT_TEMPLATE_ID: ShowcaseTemplateId = "neon-editorial";

export function isShowcaseTemplateId(value: unknown): value is ShowcaseTemplateId {
  return typeof value === "string" && value in SHOWCASE_TEMPLATES;
}

export function getShowcaseTemplate(id: unknown) {
  return SHOWCASE_TEMPLATES[isShowcaseTemplateId(id) ? id : DEFAULT_TEMPLATE_ID];
}
```

- [ ] **Step 4: Run test, expect PASS**

```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx tsx --test components/features/career/portfolio-showcase/templates/registry.test.ts
```
Expected: `# pass 3`.

- [ ] **Step 5: Commit**

```bash
git add web/components/features/career/portfolio-showcase/templates/registry.ts web/components/features/career/portfolio-showcase/templates/registry.test.ts
git commit -m "feat(showcase): template registry"
```

**Success criteria:** 3 passing tests; `getShowcaseTemplate("neon-editorial").Component` is the React component.

---

## Phase 3 — API Routes (Parallel with Phase 2)

### Task 7: POST + GET list endpoint

**Goal:** `POST /api/career/portfolios/showcase` creates a new row from selected timeline project ids; `GET` lists the user's showcase portfolios.

**Files:**
- Create: `web/app/api/career/portfolios/showcase/route.ts`

**Dependencies:** Task 1 (DB), Task 3 (server helpers), Task 6 (registry — for defaults).

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { ensureProfileForUser, extractAuthProfileSeed } from "@/lib/my-profile";
import { getPortfolioSourceData } from "@/lib/server/career-portfolios";
import {
  showcasePortfolioDelegate,
  pickProjectSnapshotsByIds,
  createUniqueShowcaseSlug,
} from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import {
  getShowcaseTemplate,
  isShowcaseTemplateId,
} from "@/components/features/career/portfolio-showcase/templates/registry";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await showcasePortfolioDelegate().findMany({
    where: { user_id: user.id },
    orderBy: { updated_at: "desc" },
  });
  return NextResponse.json({ items: rows.map(mapShowcaseRow) });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seed = extractAuthProfileSeed(user);
  await ensureProfileForUser({
    userId: user.id,
    nickname: seed.nickname,
    email: seed.email,
    avatarUrl: seed.avatarUrl,
  });

  const body = await request.json().catch(() => ({}));
  const projectIds: string[] = Array.isArray(body.projectIds)
    ? body.projectIds.filter((x: unknown): x is string => typeof x === "string")
    : [];
  const rawTemplateId = typeof body.templateId === "string" ? body.templateId : "neon-editorial";
  const templateKey = isShowcaseTemplateId(rawTemplateId) ? rawTemplateId : "neon-editorial";
  const template = getShowcaseTemplate(templateKey);
  const titleInput = typeof body.title === "string" ? body.title.trim() : "";
  const title = titleInput || "새 포트폴리오";

  // Snapshot the selected timeline projects.
  const source = await getPortfolioSourceData(user.id);
  const snapshots = pickProjectSnapshotsByIds(source.projects, projectIds);

  const displayName = source.personalInfo?.name?.trim() || (seed.nickname ?? "PORTFOLIO");
  const defaultContent = template.createDefaultContent({ name: displayName, projects: snapshots });
  defaultContent.contact.email = source.personalInfo?.email ?? "";

  const tokens = template.createDefaultTokens();
  const slug = await createUniqueShowcaseSlug(user.id, title);

  const row = await showcasePortfolioDelegate().create({
    data: {
      user_id: user.id,
      slug,
      title,
      template_id: templateKey,
      content_payload: defaultContent,
      tokens_payload: tokens,
      is_public: false,
    },
  });

  return NextResponse.json({ item: mapShowcaseRow(row) }, { status: 201 });
}

function mapShowcaseRow(row: Awaited<ReturnType<ReturnType<typeof showcasePortfolioDelegate>["create"]>>) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    templateId: row.template_id,
    isPublic: row.is_public,
    publishedAt: row.published_at?.toISOString?.() || null,
    updatedAt: row.updated_at?.toISOString?.() || new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Verify**

Manually via dev server (you must be logged in for this to succeed):

```bash
curl -i -X GET http://localhost:3000/api/career/portfolios/showcase
```
Expected: `401 Unauthorized` (no cookie). Logged-in browser fetch should return `{ items: [] }` if user has none. Defer authenticated test to Task 19.

- [ ] **Step 3: Commit**

```bash
git add web/app/api/career/portfolios/showcase/route.ts
git commit -m "feat(showcase): API POST(new) + GET(list)"
```

**Success criteria:** Unauthenticated curl returns 401; route file compiles (`tsc` clean for that path).

---

### Task 8: GET single + PUT + DELETE endpoint

**Goal:** `GET/PUT/DELETE /api/career/portfolios/showcase/[id]` for the editor and management.

**Files:**
- Create: `web/app/api/career/portfolios/showcase/[id]/route.ts`

**Dependencies:** Task 7 (mapping pattern).

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import {
  showcasePortfolioDelegate,
} from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import {
  getShowcaseTemplate,
  isShowcaseTemplateId,
} from "@/components/features/career/portfolio-showcase/templates/registry";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await showcasePortfolioDelegate().findFirst({ where: { id: params.id, user_id: user.id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: row });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const current = await showcasePortfolioDelegate().findFirst({ where: { id: params.id, user_id: user.id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const templateKey = isShowcaseTemplateId(body.templateId) ? body.templateId : current.template_id;
  const template = getShowcaseTemplate(templateKey);

  // Validate content/tokens if provided.
  let nextContent = current.content_payload;
  let nextTokens = current.tokens_payload;
  if (body.content !== undefined) {
    const parsed = template.contentSchema.safeParse(body.content);
    if (!parsed.success) return NextResponse.json({ error: "Invalid content", details: parsed.error.format() }, { status: 400 });
    nextContent = parsed.data;
  }
  if (body.tokens !== undefined) {
    const parsed = template.tokensSchema.safeParse(body.tokens);
    if (!parsed.success) return NextResponse.json({ error: "Invalid tokens", details: parsed.error.format() }, { status: 400 });
    nextTokens = parsed.data;
  }
  const nextTitle = typeof body.title === "string" && body.title.trim() ? body.title.trim() : current.title;

  const row = await showcasePortfolioDelegate().update({
    where: { id: current.id },
    data: {
      title: nextTitle,
      template_id: templateKey,
      content_payload: nextContent,
      tokens_payload: nextTokens,
      updated_at: new Date(),
    },
  });
  return NextResponse.json({ item: row });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const current = await showcasePortfolioDelegate().findFirst({ where: { id: params.id, user_id: user.id } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await showcasePortfolioDelegate().delete({ where: { id: current.id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Verify**

```bash
curl -i http://localhost:3000/api/career/portfolios/showcase/nonexistent
```
Expected: `401 Unauthorized`.

- [ ] **Step 3: Commit**

```bash
git add web/app/api/career/portfolios/showcase/\[id\]/route.ts
git commit -m "feat(showcase): API GET/PUT/DELETE single row"
```

**Success criteria:** Route compiles, unauth returns 401.

---

### Task 9: POST publish toggle

**Goal:** `POST /api/career/portfolios/showcase/[id]/publish` flips `is_public` and stamps `published_at`.

**Files:**
- Create: `web/app/api/career/portfolios/showcase/[id]/publish/route.ts`

**Dependencies:** Task 7.

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import {
  showcasePortfolioDelegate,
} from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const current = await showcasePortfolioDelegate().findFirst({
    where: { id: params.id, user_id: session.user.id },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const isPublic = Boolean(body.isPublic);

  const row = await showcasePortfolioDelegate().update({
    where: { id: current.id },
    data: {
      is_public: isPublic,
      published_at: isPublic ? (current.published_at || new Date()) : null,
      updated_at: new Date(),
    },
  });

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id },
    select: { handle: true },
  });

  return NextResponse.json({
    item: row,
    publicUrl: isPublic && profile?.handle
      ? `/p/${encodeURIComponent(profile.handle.toLowerCase())}/${encodeURIComponent(row.slug)}`
      : null,
  });
}
```

- [ ] **Step 2: Verify**

```bash
curl -i -X POST http://localhost:3000/api/career/portfolios/showcase/abc/publish -d '{"isPublic":true}' -H "content-type: application/json"
```
Expected: `401 Unauthorized`.

- [ ] **Step 3: Commit**

```bash
git add web/app/api/career/portfolios/showcase/\[id\]/publish/route.ts
git commit -m "feat(showcase): API publish toggle"
```

**Success criteria:** Route compiles, unauth returns 401.

---

## Phase 4 — Pages (Sequential within phase)

### Task 10: Showcase list page

**Goal:** `/career/portfolios/showcase` — server-rendered list of the logged-in user's showcase portfolios.

**Files:**
- Create: `web/app/career/portfolios/showcase/page.tsx`
- Create: `web/app/career/portfolios/showcase/client.tsx`

**Dependencies:** Task 3, Task 7.

- [ ] **Step 1: Write the server page**

```tsx
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { showcasePortfolioDelegate } from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import ShowcaseListClient from "./client";

export const dynamic = "force-dynamic";

export default async function ShowcaseListPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login?next=/career/portfolios/showcase");

  const [rows, profile] = await Promise.all([
    showcasePortfolioDelegate().findMany({
      where: { user_id: session.user.id },
      orderBy: { updated_at: "desc" },
    }),
    prisma.profiles.findUnique({
      where: { id: session.user.id },
      select: { handle: true },
    }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    templateId: r.template_id,
    isPublic: r.is_public,
    updatedAt: r.updated_at?.toISOString?.() || new Date().toISOString(),
    publishedAt: r.published_at?.toISOString?.() || null,
    publicUrl: r.is_public && profile?.handle
      ? `/p/${encodeURIComponent(profile.handle.toLowerCase())}/${encodeURIComponent(r.slug)}`
      : null,
  }));

  return <ShowcaseListClient initialItems={items} />;
}
```

- [ ] **Step 2: Write the client list (minimal)**

```tsx
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
```

- [ ] **Step 3: Verify**

```
preview_eval: window.location.assign('http://localhost:3000/career/portfolios/showcase?v=' + Date.now()); 'navigating'
[wait 2000ms]
preview_eval: JSON.stringify({ url: location.href, title: document.title, hasHeader: !!document.querySelector('h1'), headerText: document.querySelector('h1')?.textContent })
```
Expected (logged-in): `url` ends with `/career/portfolios/showcase`, `headerText === '디자인 포트폴리오'`.
Expected (logged-out): redirected to `/login?next=...`.

- [ ] **Step 4: Commit**

```bash
git add web/app/career/portfolios/showcase/page.tsx web/app/career/portfolios/showcase/client.tsx
git commit -m "feat(showcase): list page"
```

**Success criteria:** Logged-in user sees the page with `h1 = '디자인 포트폴리오'`; empty state shows the placeholder.

---

### Task 11: New (template picker) page

**Goal:** `/career/portfolios/showcase/new?projectIds=a,b,c` — server reads logged-in user, calls POST internally (server-side) with the projectIds, redirects to `/edit/[id]`. For v1 with one template, no UI picker needed — just call POST + redirect.

**Files:**
- Create: `web/app/career/portfolios/showcase/new/page.tsx`

**Dependencies:** Task 7.

- [ ] **Step 1: Write the page**

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser, extractAuthProfileSeed } from "@/lib/my-profile";
import { getPortfolioSourceData } from "@/lib/server/career-portfolios";
import {
  showcasePortfolioDelegate,
  pickProjectSnapshotsByIds,
  createUniqueShowcaseSlug,
} from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import { getShowcaseTemplate } from "@/components/features/career/portfolio-showcase/templates/registry";

export const dynamic = "force-dynamic";

export default async function NewShowcasePage({
  searchParams,
}: {
  searchParams: { projectIds?: string | string[]; templateId?: string; title?: string };
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const back = `/career/portfolios/showcase/new`;
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  const seed = extractAuthProfileSeed(session.user);
  await ensureProfileForUser({
    userId: session.user.id, nickname: seed.nickname, email: seed.email, avatarUrl: seed.avatarUrl,
  });

  const raw = searchParams.projectIds;
  const projectIds = (Array.isArray(raw) ? raw : raw ? raw.split(",") : [])
    .map((s) => s.trim())
    .filter(Boolean);

  const templateKey = "neon-editorial";
  const template = getShowcaseTemplate(templateKey);
  const title = (searchParams.title?.trim()) || `Portfolio ${new Date().toISOString().slice(0, 10)}`;

  const source = await getPortfolioSourceData(session.user.id);
  const snapshots = pickProjectSnapshotsByIds(source.projects, projectIds);
  const displayName = source.personalInfo?.name?.trim() || seed.nickname || "PORTFOLIO";

  const content = template.createDefaultContent({ name: displayName, projects: snapshots });
  content.contact.email = source.personalInfo?.email ?? "";

  const slug = await createUniqueShowcaseSlug(session.user.id, title);
  const row = await showcasePortfolioDelegate().create({
    data: {
      user_id: session.user.id,
      slug,
      title,
      template_id: templateKey,
      content_payload: content,
      tokens_payload: template.createDefaultTokens(),
      is_public: false,
    },
  });

  redirect(`/career/portfolios/showcase/${row.id}/edit`);
}
```

- [ ] **Step 2: Verify**

Manually (must be logged in): visit `http://localhost:3000/career/portfolios/showcase/new` — should create a new row with no projects and redirect to `/edit/<id>`. Verify via DB check or `/career/portfolios/showcase` list after redirect.

```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx tsx -e "import prisma from './lib/prisma'; (async()=>{const c=await prisma.showcase_portfolios.count();console.log('rows:',c);process.exit(0);})()"
```
Expected: rows count >= 1 after visiting the URL.

- [ ] **Step 3: Commit**

```bash
git add web/app/career/portfolios/showcase/new/page.tsx
git commit -m "feat(showcase): new page (server-side create + redirect)"
```

**Success criteria:** Visiting `/career/portfolios/showcase/new` while logged in produces a new row and a redirect to its edit URL.

---

### Task 12: Editor shell + preview wiring

**Goal:** Server page at `/career/portfolios/showcase/[id]/edit` loads row, hands off to client component which has empty left panel and a working live preview on the right.

**Files:**
- Create: `web/app/career/portfolios/showcase/[id]/edit/page.tsx`
- Create: `web/components/features/career/portfolio-showcase/editor/showcase-editor-client.tsx`

**Dependencies:** Task 6, Task 8.

- [ ] **Step 1: Write the server page**

```tsx
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { showcasePortfolioDelegate } from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import { ShowcaseEditorClient } from "@/components/features/career/portfolio-showcase/editor/showcase-editor-client";

export const dynamic = "force-dynamic";

export default async function ShowcaseEditPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/login?next=/career/portfolios/showcase/${params.id}/edit`);

  const row = await showcasePortfolioDelegate().findFirst({
    where: { id: params.id, user_id: session.user.id },
  });
  if (!row) notFound();

  return (
    <ShowcaseEditorClient
      portfolio={{
        id: row.id,
        slug: row.slug,
        title: row.title,
        templateId: row.template_id,
        isPublic: row.is_public,
      }}
      initialContent={row.content_payload as Record<string, unknown>}
      initialTokens={row.tokens_payload as Record<string, unknown>}
    />
  );
}
```

- [ ] **Step 2: Write the editor client shell**

```tsx
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
```

- [ ] **Step 3: Verify in preview**

```
preview_eval: window.location.assign('http://localhost:3000/career/portfolios/showcase/<id>/edit?v=' + Date.now())
[wait 3000ms]
preview_eval: JSON.stringify({
  url: location.href,
  tabs: document.querySelectorAll('aside nav button').length,
  hasPreviewHero: !!document.querySelector('.hero'),
  hasHeroWord: document.querySelectorAll('.hero-line .word').length,
})
```
Expected: `tabs === 3`, `hasPreviewHero === true`, `hasHeroWord >= 2`.

`<id>` must be an actual row id from Task 11's smoke. If none yet, manually create via `/career/portfolios/showcase/new`.

- [ ] **Step 4: Commit**

```bash
git add web/app/career/portfolios/showcase/\[id\]/edit/page.tsx web/components/features/career/portfolio-showcase/editor/showcase-editor-client.tsx
git commit -m "feat(showcase): editor shell with preview + tab scaffolding"
```

**Success criteria:** Editor page shows 3 tab buttons + live preview of the NeonEditorial template using the row's content. Clicking "저장" calls PUT and returns 200.

---

### Task 13: Content panel — inline editing of hero / about / KPI / contact

**Goal:** Functional content panel that mutates `content` state via setContent. Supports Hero (job title, year, headline lines as comma-separated string, bio), About (quote, paragraphs, strengths grid), KPI (3 numeric rows), Contact (email + socials list).

**Files:**
- Create: `web/components/features/career/portfolio-showcase/editor/panels/content-panel.tsx`
- Modify: `web/components/features/career/portfolio-showcase/editor/showcase-editor-client.tsx` (mount the panel)

**Dependencies:** Task 12.

- [ ] **Step 1: Write the content panel**

```tsx
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
```

- [ ] **Step 2: Mount the panel in the editor**

In `showcase-editor-client.tsx`, replace the content placeholder:

```tsx
import { ContentPanel } from "./panels/content-panel";
// ...
{activeTab === "content" && (
  <ContentPanel value={content} onChange={(updater) => setContent((p) => updater(p))} />
)}
```

- [ ] **Step 3: Verify**

```
preview_eval: window.location.assign('http://localhost:3000/career/portfolios/showcase/<id>/edit?v='+Date.now())
[wait 2500ms]
preview_eval: (() => {
  const heroBioInput = Array.from(document.querySelectorAll('aside textarea')).find(t => t.value.includes('소개'));
  return JSON.stringify({ hasContentPanel: !!document.querySelector('aside textarea'), heroBioPresent: !!heroBioInput });
})()
```
Expected: `hasContentPanel: true`. Type into a field manually and observe preview updates immediately.

- [ ] **Step 4: Commit**

```bash
git add web/components/features/career/portfolio-showcase/editor/panels/content-panel.tsx web/components/features/career/portfolio-showcase/editor/showcase-editor-client.tsx
git commit -m "feat(showcase): editor content panel with inline edits"
```

**Success criteria:** Typing in any content field updates the right-pane preview in real time; "저장" persists changes (verified via reload).

---

### Task 14: Tokens panel — accent color + density

**Goal:** Tokens panel mutates `tokens` state. v1 covers `accent` color picker + `density` segmented control.

**Files:**
- Create: `web/components/features/career/portfolio-showcase/editor/panels/tokens-panel.tsx`
- Modify: `web/components/features/career/portfolio-showcase/editor/showcase-editor-client.tsx`

**Dependencies:** Task 13.

- [ ] **Step 1: Write the tokens panel**

```tsx
"use client";

import type { NeonEditorialTokens } from "../../templates/neon-editorial/types";

type Setter = (updater: (prev: NeonEditorialTokens) => NeonEditorialTokens) => void;

const ACCENT_PRESETS = ["#39FF14", "#FF3D00", "#FFEB3B", "#00E5FF", "#E040FB"];

export function TokensPanel({ value, onChange }: { value: NeonEditorialTokens; onChange: Setter }) {
  return (
    <div className="space-y-6 text-xs">
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Accent</h3>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value.accent}
            onChange={(e) => onChange((p) => ({ ...p, accent: e.target.value.toUpperCase() }))}
            className="h-9 w-9 cursor-pointer rounded border border-slate-300"
          />
          <input
            type="text"
            value={value.accent}
            onChange={(e) => onChange((p) => ({ ...p, accent: e.target.value }))}
            className="flex-1 rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
          />
        </div>
        <div className="mt-2 flex gap-1.5">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange((p) => ({ ...p, accent: c }))}
              className="h-6 w-6 rounded border border-slate-300"
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Density</h3>
        <div className="grid grid-cols-3 overflow-hidden rounded border border-slate-300">
          {(["spacious", "balanced", "compact"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange((p) => ({ ...p, density: d }))}
              className={`px-2 py-1.5 text-xs font-bold ${
                value.density === d ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount in editor**

```tsx
import { TokensPanel } from "./panels/tokens-panel";
// ...
{activeTab === "tokens" && (
  <TokensPanel value={tokens} onChange={(updater) => setTokens((p) => updater(p))} />
)}
```

- [ ] **Step 3: Verify**

Click an accent preset → right pane's `--accent` CSS variable changes. Use `preview_eval`:
```
preview_eval: getComputedStyle(document.querySelector('aside ~ main [data-density]')).getPropertyValue('--accent')
```
Expected: matches selected preset color.

- [ ] **Step 4: Commit**

```bash
git add web/components/features/career/portfolio-showcase/editor/panels/tokens-panel.tsx web/components/features/career/portfolio-showcase/editor/showcase-editor-client.tsx
git commit -m "feat(showcase): editor tokens panel (accent + density)"
```

**Success criteria:** Changing accent updates preview accent color live; density change reflects in DOM `data-density` attribute.

---

### Task 15: Projects panel — add/remove + DnD reorder

**Goal:** Projects panel lists the snapshot project cards with DnD reordering (@dnd-kit) + a "+ timeline에서 가져오기" modal that lists user's timeline items not yet included and adds them as new snapshots.

**Files:**
- Create: `web/components/features/career/portfolio-showcase/editor/panels/projects-panel.tsx`
- Create: `web/app/api/career/portfolios/showcase/timeline-source/route.ts` (helper API to fetch the user's full timeline read-only)
- Modify: `web/components/features/career/portfolio-showcase/editor/showcase-editor-client.tsx`

**Dependencies:** Task 14.

- [ ] **Step 1: Add helper API to read the user's timeline for the import modal**

Create `web/app/api/career/portfolios/showcase/timeline-source/route.ts`:

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getPortfolioSourceData } from "@/lib/server/career-portfolios";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const source = await getPortfolioSourceData(session.user.id);
  return NextResponse.json({ projects: source.projects });
}
```

- [ ] **Step 2: Write the projects panel**

```tsx
"use client";

import { useEffect, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { NeonEditorialContent } from "../../templates/neon-editorial/types";
import type { ProjectSnapshot } from "../../shared/project-snapshot-types";

type Setter = (updater: (prev: NeonEditorialContent) => NeonEditorialContent) => void;

export function ProjectsPanel({ value, onChange }: { value: NeonEditorialContent; onChange: Setter }) {
  const [importOpen, setImportOpen] = useState(false);
  const [allTimeline, setAllTimeline] = useState<ProjectSnapshot[] | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    if (!importOpen || allTimeline) return;
    setLoadingTimeline(true);
    fetch("/api/career/portfolios/showcase/timeline-source")
      .then((r) => r.json())
      .then((d) => setAllTimeline(Array.isArray(d.projects) ? d.projects : []))
      .finally(() => setLoadingTimeline(false));
  }, [importOpen, allTimeline]);

  const includedIds = new Set(value.projects.map((p) => (p as { id?: string }).id).filter(Boolean) as string[]);

  function handleDragEnd(event: { active: { id: string }; over: { id: string } | null }) {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = value.projects.findIndex((p) => keyFor(p) === event.active.id);
    const newIndex = value.projects.findIndex((p) => keyFor(p) === event.over!.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange((p) => ({ ...p, projects: arrayMove(p.projects, oldIndex, newIndex) }));
  }

  function addFromTimeline(snapshot: ProjectSnapshot) {
    onChange((p) => ({ ...p, projects: [...p.projects, structuredClone(snapshot)] }));
    setImportOpen(false);
  }

  function removeAt(index: number) {
    onChange((p) => ({ ...p, projects: p.projects.filter((_, i) => i !== index) }));
  }

  return (
    <div className="space-y-3 text-xs">
      <button
        type="button"
        onClick={() => setImportOpen(true)}
        className="w-full rounded border border-dashed border-slate-300 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
      >
        ＋ Timeline에서 프로젝트 가져오기
      </button>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={value.projects.map(keyFor)} strategy={verticalListSortingStrategy}>
          {value.projects.map((p, i) => (
            <SortableCard key={keyFor(p)} id={keyFor(p)} index={i} project={p} onRemove={() => removeAt(i)} />
          ))}
        </SortableContext>
      </DndContext>

      {value.projects.length === 0 && (
        <p className="rounded border border-dashed border-slate-300 p-3 text-center text-slate-400">아직 추가된 프로젝트가 없습니다.</p>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setImportOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Timeline 프로젝트 가져오기</h3>
            {loadingTimeline ? (
              <p className="py-8 text-center text-slate-400">불러오는 중…</p>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {(allTimeline ?? []).filter((p) => !includedIds.has(String((p as { id?: string }).id ?? ""))).map((p, i) => {
                  const title = String((p as { company?: string; position?: string }).company ?? (p as { position?: string }).position ?? "(제목 없음)");
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => addFromTimeline(p)}
                        className="w-full rounded border border-slate-200 px-3 py-2 text-left text-xs hover:bg-slate-50"
                      >
                        {title}
                      </button>
                    </li>
                  );
                })}
                {(allTimeline ?? []).filter((p) => !includedIds.has(String((p as { id?: string }).id ?? ""))).length === 0 && (
                  <li className="py-4 text-center text-slate-400">추가할 프로젝트가 없습니다.</li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function keyFor(p: ProjectSnapshot): string {
  return String((p as { id?: string }).id ?? `${(p as { company?: string }).company ?? ""}-${(p as { period?: string }).period ?? ""}`);
}

function SortableCard({
  id, index, project, onRemove,
}: { id: string; index: number; project: ProjectSnapshot; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const title = String((project as { company?: string; position?: string }).company ?? (project as { position?: string }).position ?? "프로젝트");
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2"
    >
      <span {...attributes} {...listeners} className="cursor-grab text-slate-400 active:cursor-grabbing">⋮⋮</span>
      <span className="flex-1 truncate text-xs">{String(index + 1).padStart(2, "0")} · {title}</span>
      <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-600" aria-label="제거">×</button>
    </div>
  );
}
```

- [ ] **Step 3: Mount in editor**

```tsx
import { ProjectsPanel } from "./panels/projects-panel";
// ...
{activeTab === "projects" && (
  <ProjectsPanel value={content} onChange={(updater) => setContent((p) => updater(p))} />
)}
```

- [ ] **Step 4: Verify**

In the editor with projects already added: drag a card down/up — preview's WORKS section reflects new order. Click "+ Timeline에서 가져오기" — modal opens with timeline list.

```
preview_eval: document.querySelectorAll('aside [data-rfd-draggable-id], aside .cursor-grab').length
```
Expected: equal to `content.projects.length` after switching to the "프로젝트" tab.

- [ ] **Step 5: Commit**

```bash
git add web/app/api/career/portfolios/showcase/timeline-source/route.ts web/components/features/career/portfolio-showcase/editor/panels/projects-panel.tsx web/components/features/career/portfolio-showcase/editor/showcase-editor-client.tsx
git commit -m "feat(showcase): editor projects panel — DnD + import from timeline"
```

**Success criteria:** Reordering in panel re-renders preview WORKS in matching order; import adds a fresh clone (not a reference) — verify clone by changing the timeline source data in DB and confirming the saved snapshot is unaffected.

---

### Task 16: Top action bar — save / publish / copy URL / open

**Goal:** Persistent top action bar above the preview pane (or in editor header) with: Save (already in shell), Publish toggle, Copy URL, Open in new tab.

**Files:**
- Modify: `web/components/features/career/portfolio-showcase/editor/showcase-editor-client.tsx`

**Dependencies:** Task 12, Task 15.

- [ ] **Step 1: Extend the editor client with handlers + UI**

In `showcase-editor-client.tsx` add state, handlers, and a top bar above the preview pane:

```tsx
// Add state
const [isPublic, setIsPublic] = useState(portfolio.isPublic);
const [publicUrl, setPublicUrl] = useState<string | null>(null);

useEffect(() => {
  // Best-effort: derive public URL on mount if already public
  if (isPublic) {
    fetch(`/api/career/portfolios/showcase/${portfolio.id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isPublic: true }),
    }).then((r) => r.json()).then((d) => setPublicUrl(d.publicUrl ?? null));
  }
}, [portfolio.id, isPublic]);

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

function copyPublicUrl() {
  if (!publicUrl) return;
  navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`);
}
```

Render an action bar above `<Template ... />`:

```tsx
<main className="relative flex-1 overflow-y-auto bg-slate-50">
  <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur">
    <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
      <input type="checkbox" checked={isPublic} onChange={togglePublish} />
      공개
    </label>
    {publicUrl && (
      <>
        <button type="button" onClick={copyPublicUrl} className="rounded border border-slate-300 px-2 py-1 text-xs font-bold hover:bg-slate-50">URL 복사</button>
        <a href={publicUrl} target="_blank" rel="noreferrer" className="rounded border border-slate-300 px-2 py-1 text-xs font-bold hover:bg-slate-50">새 탭으로 열기 ↗</a>
        <span className="ml-auto truncate text-xs text-slate-500" title={publicUrl}>{publicUrl}</span>
      </>
    )}
  </div>
  <div className="origin-top">
    <Template content={content} tokens={tokens} />
  </div>
</main>
```

- [ ] **Step 2: Verify**

Toggle the "공개" checkbox. Expected: API responds with publicUrl populated; the row in DB now has `is_public = true`.

```bash
cd /Users/junghwan/buc_Capstone_DEMO/web && npx tsx -e "import prisma from './lib/prisma'; (async()=>{const r=await prisma.showcase_portfolios.findFirst({where:{is_public:true}});console.log(r?.slug,r?.is_public,r?.published_at);process.exit(0);})()"
```
Expected: row found, `is_public=true`, `published_at` non-null.

- [ ] **Step 3: Commit**

```bash
git add web/components/features/career/portfolio-showcase/editor/showcase-editor-client.tsx
git commit -m "feat(showcase): editor top action bar — publish/copy URL/open"
```

**Success criteria:** Toggle persists `is_public`. Copy URL writes to clipboard. Open opens public page (Task 17).

---

## Phase 5 — Public Page (Parallel with Phase 4)

### Task 17: Public page `/p/[handle]/[slug]`

**Goal:** Anonymous-accessible page that renders the published showcase portfolio.

**Files:**
- Create: `web/app/p/[handle]/[slug]/page.tsx`

**Dependencies:** Task 6 (registry), Task 8 (data shape consistency).

- [ ] **Step 1: Write the page**

```tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { showcasePortfolioDelegate } from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";
import { getShowcaseTemplate } from "@/components/features/career/portfolio-showcase/templates/registry";

export const dynamic = "force-dynamic";

export default async function PublicShowcasePage({
  params,
}: {
  params: { handle: string; slug: string };
}) {
  const handle = decodeURIComponent(params.handle || "").toLowerCase();
  const slug = decodeURIComponent(params.slug || "");
  if (!handle || !slug) notFound();

  const profile = await prisma.profiles.findUnique({
    where: { handle },
    select: { id: true },
  });
  if (!profile) notFound();

  const row = await showcasePortfolioDelegate().findFirst({
    where: { user_id: profile.id, slug, is_public: true },
  });
  if (!row) notFound();

  const template = getShowcaseTemplate(row.template_id);
  const Template = template.Component;

  // Parse with safeParse to tolerate older saved rows.
  const content = template.contentSchema.safeParse(row.content_payload).data
    ?? template.createDefaultContent({ name: "PORTFOLIO" });
  const tokens = template.tokensSchema.safeParse(row.tokens_payload).data
    ?? template.createDefaultTokens();

  return <Template content={content} tokens={tokens} />;
}
```

- [ ] **Step 2: Verify**

After Task 16's publish toggle, open the URL in a logged-out tab (or use incognito / fetch with no cookie):

```
preview_eval: window.location.assign('http://localhost:3000/p/<handle>/<slug>?v=' + Date.now())
[wait 3500ms]
preview_eval: JSON.stringify({ url: location.href, status: document.title, hero: document.querySelectorAll('.hero-line .word').length, isNotFound: document.title.includes('404') || document.body.innerText.includes('Not Found') })
```
Expected for a published row: `hero >= 2`, `isNotFound === false`.

For a non-existent slug:
```
preview_eval: fetch('/p/<handle>/does-not-exist').then(r => r.status)
```
Expected: `404`.

- [ ] **Step 3: Commit**

```bash
git add web/app/p/\[handle\]/\[slug\]/page.tsx
git commit -m "feat(showcase): public page /p/[handle]/[slug]"
```

**Success criteria:** Published row renders fully (hero + works); non-existent/non-public returns 404.

---

## Phase 6 — Wiring entry point

### Task 18: Add third option to the format selection modal

**Goal:** Add "디자인 템플릿 포트폴리오" option to the format dialog in `project-archive-screen.tsx`. Clicking it navigates to `/career/portfolios/showcase/new?projectIds=<csv>` rather than calling the 갈래 A POST.

**Files:**
- Modify: `web/components/features/career/project-archive/project-archive-screen.tsx`

**Dependencies:** Task 11 (the `/new` page must exist).

- [ ] **Step 1: Locate the dialog grid and current import block**

The grid is at [project-archive-screen.tsx:199-233](web/components/features/career/project-archive/project-archive-screen.tsx#L199). Currently `grid sm:grid-cols-2`. We need 3 buttons → keep `sm:grid-cols-3`. Also import `useRouter` if not already present (check existing imports first; `next/navigation`'s `useRouter` is the right one).

- [ ] **Step 2: Add a handler in the component body**

Locate where `handlePortfolioFormatSelect` is defined (line ~67). Just above or below it, add:

```tsx
const router = useRouter();  // import { useRouter } from "next/navigation";

const handleShowcaseSelect = () => {
  setIsFormatDialogOpen(false);
  const csv = selectedIds.filter(Boolean).join(",");
  router.push(`/career/portfolios/showcase/new?projectIds=${encodeURIComponent(csv)}`);
};
```

- [ ] **Step 3: Add the third button + change the grid columns**

Update line 199's grid class from `sm:grid-cols-2` → `sm:grid-cols-3`. Then immediately before the closing `</div>` of `.grid` (line 233), add:

```tsx
<button
  type="button"
  onClick={handleShowcaseSelect}
  disabled={isCreatingPortfolio}
  className="rounded-lg border border-emerald-400/40 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
>
  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
    <Sparkles className="h-5 w-5" />
  </span>
  <span className="mt-4 block text-base font-black text-slate-950">
    디자인 템플릿 (베타)
  </span>
  <span className="mt-2 block text-sm font-medium leading-6 text-slate-500">
    GSAP 인터랙션이 살아 있는 단일 페이지 포트폴리오 + 공개 URL
  </span>
</button>
```

Also add `Sparkles` to the lucide imports at the top of the file (alongside `Globe2, Presentation, X` etc.). Look at the existing import line for lucide-react and append `Sparkles`.

- [ ] **Step 4: Verify**

```
preview_eval: window.location.assign('http://localhost:3000/career/projects?v=' + Date.now())
[wait 2000ms]
preview_eval: 'Open the portfolioMode and select a few projects manually, click 포트폴리오 생성, then count buttons in the format modal.'
```

Or programmatically (assuming user has projects):

```
preview_eval: (() => {
  // Open the format modal logic depends on UI state; manual test recommended.
  // Visual check: after opening modal, expect 3 option buttons.
  return document.querySelectorAll('.fixed.inset-0 button[type="button"]').length;
})()
```

After clicking the third option: URL changes to `/career/portfolios/showcase/new?projectIds=<csv>`.

- [ ] **Step 5: Commit**

```bash
git add web/components/features/career/project-archive/project-archive-screen.tsx
git commit -m "feat(showcase): wire third option into project-archive format modal"
```

**Success criteria:** Format modal shows 3 options in a 3-column grid; clicking the third routes to `/career/portfolios/showcase/new?projectIds=...`; the existing two options keep working exactly as before.

---

## Phase 7 — End-to-end smoke + cleanup

### Task 19: End-to-end dogfood + cleanup

**Goal:** Walk through the full happy path end-to-end and clean up the temp test page.

**Files:**
- Delete: `web/app/_test/neon-editorial/` (created in Task 5)

**Dependencies:** Tasks 1–18.

- [ ] **Step 1: End-to-end walkthrough**

In a logged-in browser session (preview tools or manual):

1. Navigate to `/career/projects`.
2. Turn on portfolio mode (existing UX).
3. Select 2–4 project cards.
4. Click "선택한 프로젝트로 포트폴리오 생성".
5. In the format modal, click "디자인 템플릿 (베타)".
6. Expect redirect to `/career/portfolios/showcase/<id>/edit`.
7. Verify preview shows the user's actual projects.
8. Type into the bio field — preview updates live.
9. Click accent preset → color changes.
10. Drag to reorder a project card — works section reorders.
11. Toggle "공개" → URL appears.
12. Click "URL 복사", then open in a new tab. Expect public page renders fully with no auth.
13. From `/career/portfolios/showcase`, verify the row appears with "공개 페이지" link.

- [ ] **Step 2: Programmatic checks (preview tools)**

```
preview_eval: fetch('/api/career/portfolios/showcase').then(r => r.json())
```
Expected: `items` array with at least the row created above.

```
preview_eval: fetch('/p/<handle>/<slug>').then(r => r.status)
```
Expected: `200`.

```
preview_eval: fetch('/p/<handle>/does-not-exist').then(r => r.status)
```
Expected: `404`.

- [ ] **Step 3: Delete temp test page**

```bash
rm -rf /Users/junghwan/buc_Capstone_DEMO/web/app/_test
```

- [ ] **Step 4: Confirm 갈래 A still works**

```
preview_eval: window.location.assign('http://localhost:3000/career/portfolios?v=' + Date.now())
[wait 2000ms]
preview_eval: JSON.stringify({ url: location.href, h1: document.querySelector('h1')?.textContent })
```
Expected: original 갈래 A list page loads normally. Create one 갈래 A portfolio to confirm flow is untouched.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(showcase): remove temp test page after dogfood"
```

- [ ] **Step 6: Final branch hygiene**

```bash
git log --oneline develop..HEAD | head -25
git status
```
Verify:
- Currently on `feat/workspace-portfolio`
- main is untouched (`git rev-parse main` vs `origin/main` if available — no changes attributed to this work)
- Series of small commits, each on a single task

**Do NOT** merge into `develop` automatically. Report status to the user and let them decide.

**Success criteria:**
- All 13 walkthrough steps complete without errors
- 갈래 A unaffected
- Temp test page removed
- All commits on `feat/workspace-portfolio` only
- main is untouched

---

## Self-Review (run before declaring this plan ready)

### Spec coverage map

| Spec requirement | Task(s) |
|---|---|
| §2 In scope — new routes | T10, T11, T12, T17, T7, T8, T9, T15 (timeline-source) |
| §2 In scope — `showcase_portfolios` table + migration | T1 |
| §2 In scope — NeonEditorial template (visual sibling of demo) | T4, T5 |
| §2 In scope — WYSIWYG editor | T12, T13, T14, T15, T16 |
| §2 In scope — public URL, no auth | T17 |
| §2 In scope — entry point modification | T18 |
| §4 Data model — `showcase_portfolios` with content/tokens JSON | T1 |
| §4 Data model — snapshot semantics (no timeline reference) | T3 (`pickProjectSnapshotsByIds` with `structuredClone`) |
| §4 Data model — snapshot timing rules | T11 (POST), T15 (import-from-timeline) |
| §5 UX Flow — modal third option | T18 |
| §5 UX Flow — new page (template picker + create + redirect) | T11 |
| §5 UX Flow — editor URL pattern | T12 |
| §5 UX Flow — public URL pattern `/p/[handle]/[slug]` | T17 |
| §6 Editor — left panel 3 tabs | T12, T13, T14, T15 |
| §6 Editor — right live preview | T12 |
| §6 Editor — top action bar | T16 |
| §7 Template system — registry shape | T6 |
| §7 Template system — first template = port of demo | T4, T5 |
| §7 Template system — content schema | T2 |
| §9 Isolation — 갈래 A untouched | All file paths checked; only T18 modifies an existing file (project-archive-screen.tsx), and only adds — never alters existing button handlers |

No gaps found.

### Placeholder scan
- No "TBD", "TODO", "implement later", "add appropriate X", or "similar to Task N" present.
- All code blocks contain actual code, not pseudocode.
- All commands have expected output.

### Type consistency
- `NeonEditorialContent`, `NeonEditorialTokens` — declared in T2, consumed in T4/T5/T6/T12/T13/T14/T15/T17.
- `ProjectSnapshot` — declared in T2 (shared), consumed in T3/T15.
- `showcasePortfolioDelegate` — declared in T3, consumed in T7/T8/T9/T10/T11/T12/T17.
- `getShowcaseTemplate`, `isShowcaseTemplateId`, `SHOWCASE_TEMPLATES` — declared in T6, consumed in T7/T8/T11/T12/T17.
- API request/response shapes match across server (T7-T9) and client (T12 PUT body shape, T16 publish body shape).
- `mapShowcaseRow` is only in T7; T8/T9 return raw rows — acceptable, but documented.

No inconsistencies.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-17-workspace-portfolio-showcase.md`. Two execution options:

**1. Subagent-Driven (recommended)** — main session dispatches a fresh subagent per task (or per wave for parallel waves), reviews each subagent's output before moving on, fast iteration. Aligns with user's "멀티 에이전트 + goal-driven" request: each subagent receives one task's "Goal" + "Success criteria" as its mission.

**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

Which approach?
