# 마이페이지 채용공고 일정 관리 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dibut 마이페이지에 사용자가 직접 등록한 채용공고를 한국식 캘린더 + 카드 리스트로 관리하고, 이력서·자소서·포트폴리오를 연결하여 곧바로 AI 모의면접 플로우로 진입할 수 있는 기능을 추가한다.

**Architecture:** Supabase에 3개 신규 테이블(`user_job_postings`, `user_job_posting_schedules`, `user_job_posting_attachments`)을 마이그레이션으로 추가한 뒤 RLS로 사용자별 데이터를 격리한다. Next.js BFF가 `/api/my/job-postings/**` CRUD 및 calendar/interview-prefill 엔드포인트를 노출하고, `/my/job-postings` 신규 페이지에서 FullCalendar(이미 설치)와 shadcn 카드 UI로 시각화한다. AI 모의면접 진입은 `InterviewSetupFlow`의 prefill useEffect 분기를 확장(`?import=job_posting&postingId=…`)하여 통합한다.

**Tech Stack:** Next.js 14 App Router · Supabase Postgres + Auth · Prisma ORM · FullCalendar (`@fullcalendar/react`) · shadcn/ui · Tailwind · Zustand · React Query (선택, 없으면 fetch 래퍼).

**병렬 실행 전략:** Task 1 → 2 (DB/Prisma 직렬), 이후 Task 3-5 (API), Task 6-10 (UI), Task 11 (면접 통합)은 멀티에이전트로 병렬화 가능. Task 12-13 (진입점 + 검증)은 마지막에 직렬.

---

## Task 1: Supabase 마이그레이션 — 채용공고 테이블 3종

**Files:**
- Create: `web/prisma/migrations/2026-05-14_job_postings/migration.sql` (참조용 백업)
- Apply via: Supabase MCP `apply_migration`

- [ ] **Step 1: 프로젝트 ID 확인**

Supabase MCP `list_projects` 로 활성 프로젝트 id 확인. (CLAUDE.md의 DB가 Supabase임을 기억)

- [ ] **Step 2: 마이그레이션 SQL 작성**

다음 SQL을 `apply_migration`의 `query` 인자로 전달. name = `job_postings_init`.

```sql
-- user_job_postings: 사용자 등록 채용공고
create table if not exists public.user_job_postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  role_title text not null,
  posting_url text,
  tech_stack text[] not null default '{}',
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  preferred text[] not null default '{}',
  company_description text,
  team_culture text[] not null default '{}',
  memo text,
  status text not null default 'active'
    check (status in ('active','applied','interviewing','closed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_job_postings_user_status_idx
  on public.user_job_postings (user_id, status, created_at desc);

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_job_postings_set_updated_at on public.user_job_postings;
create trigger user_job_postings_set_updated_at
  before update on public.user_job_postings
  for each row execute function public.set_updated_at();

-- user_job_posting_schedules: 채용공고 일정
create table if not exists public.user_job_posting_schedules (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.user_job_postings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null
    check (kind in ('deadline','document_due','interview','other')),
  title text,
  start_at timestamptz not null,
  end_at timestamptz,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists user_job_posting_schedules_user_idx
  on public.user_job_posting_schedules (user_id, start_at);
create index if not exists user_job_posting_schedules_posting_idx
  on public.user_job_posting_schedules (job_posting_id, start_at);

-- user_job_posting_attachments: 자료 연결
create table if not exists public.user_job_posting_attachments (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.user_job_postings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attachment_type text not null
    check (attachment_type in ('resume','cover_letter','portfolio')),
  resume_id uuid,
  cover_letter_index integer,
  cover_letter_label text,
  portfolio_id uuid,
  created_at timestamptz not null default now(),
  constraint user_job_posting_attachments_resume_unique
    unique nulls not distinct (job_posting_id, attachment_type, resume_id, cover_letter_index, portfolio_id)
);

create index if not exists user_job_posting_attachments_posting_idx
  on public.user_job_posting_attachments (job_posting_id);

-- RLS 활성화
alter table public.user_job_postings enable row level security;
alter table public.user_job_posting_schedules enable row level security;
alter table public.user_job_posting_attachments enable row level security;

-- 정책: 본인 데이터만 접근
create policy "job_postings_owner_select" on public.user_job_postings
  for select using (auth.uid() = user_id);
create policy "job_postings_owner_insert" on public.user_job_postings
  for insert with check (auth.uid() = user_id);
create policy "job_postings_owner_update" on public.user_job_postings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "job_postings_owner_delete" on public.user_job_postings
  for delete using (auth.uid() = user_id);

create policy "schedules_owner_select" on public.user_job_posting_schedules
  for select using (auth.uid() = user_id);
create policy "schedules_owner_insert" on public.user_job_posting_schedules
  for insert with check (auth.uid() = user_id);
create policy "schedules_owner_update" on public.user_job_posting_schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "schedules_owner_delete" on public.user_job_posting_schedules
  for delete using (auth.uid() = user_id);

create policy "attachments_owner_select" on public.user_job_posting_attachments
  for select using (auth.uid() = user_id);
create policy "attachments_owner_insert" on public.user_job_posting_attachments
  for insert with check (auth.uid() = user_id);
create policy "attachments_owner_update" on public.user_job_posting_attachments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "attachments_owner_delete" on public.user_job_posting_attachments
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 3: MCP apply_migration 호출**

Tool: `mcp__7f2d07da-…__apply_migration`
- `project_id`: list_projects에서 확인된 id
- `name`: `job_postings_init`
- `query`: 위 SQL

- [ ] **Step 4: 적용 검증**

Tool: `mcp__7f2d07da-…__list_tables`로 `user_job_postings`, `user_job_posting_schedules`, `user_job_posting_attachments` 존재 확인.

또는 `execute_sql`:
```sql
select tablename from pg_tables where schemaname = 'public' and tablename like 'user_job_posting%';
```
Expected: 3 rows.

- [ ] **Step 5: 백업 SQL 파일 작성**

`web/prisma/migrations/2026-05-14_job_postings/migration.sql` 에 위 SQL 그대로 저장 (Prisma migration 디렉토리 컨벤션과 일치하면 좋음, 그렇지 않다면 `docs/db/migrations/2026-05-14-job-postings.sql` 사용).

- [ ] **Step 6: Commit**

```bash
git add web/prisma/migrations/2026-05-14_job_postings/migration.sql
git commit -m "db: add job postings, schedules, attachments tables with RLS"
```

---

## Task 2: Prisma 스키마 동기화

**Files:**
- Modify: `web/prisma/schema.prisma`

- [ ] **Step 1: 모델 추가**

`schema.prisma`의 다른 user_* 모델 근처에 추가:

```prisma
model user_job_postings {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id             String   @db.Uuid
  company_name        String
  role_title          String
  posting_url         String?
  tech_stack          String[] @default([])
  responsibilities    String[] @default([])
  requirements        String[] @default([])
  preferred           String[] @default([])
  company_description String?
  team_culture        String[] @default([])
  memo                String?
  status              String   @default("active")
  created_at          DateTime @default(now()) @db.Timestamptz(6)
  updated_at          DateTime @default(now()) @db.Timestamptz(6)

  schedules   user_job_posting_schedules[]
  attachments user_job_posting_attachments[]

  @@index([user_id, status, created_at(sort: Desc)])
}

model user_job_posting_schedules {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  job_posting_id String    @db.Uuid
  user_id        String    @db.Uuid
  kind           String
  title          String?
  start_at       DateTime  @db.Timestamptz(6)
  end_at         DateTime? @db.Timestamptz(6)
  memo           String?
  created_at     DateTime  @default(now()) @db.Timestamptz(6)

  job_posting user_job_postings @relation(fields: [job_posting_id], references: [id], onDelete: Cascade)

  @@index([user_id, start_at])
  @@index([job_posting_id, start_at])
}

model user_job_posting_attachments {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  job_posting_id      String   @db.Uuid
  user_id             String   @db.Uuid
  attachment_type     String
  resume_id           String?  @db.Uuid
  cover_letter_index  Int?
  cover_letter_label  String?
  portfolio_id        String?  @db.Uuid
  created_at          DateTime @default(now()) @db.Timestamptz(6)

  job_posting user_job_postings @relation(fields: [job_posting_id], references: [id], onDelete: Cascade)

  @@index([job_posting_id])
}
```

- [ ] **Step 2: Prisma 클라이언트 재생성**

```bash
cd web && npx prisma generate
```

Expected: "Generated Prisma Client …" 메시지. 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add web/prisma/schema.prisma
git commit -m "prisma: sync job postings models with supabase migration"
```

---

## Task 3: BFF — 공고 목록/생성 라우트

**Files:**
- Create: `web/app/api/my/job-postings/route.ts`
- Create: `web/lib/job-postings/types.ts` (공유 타입)
- Create: `web/lib/job-postings/validators.ts` (입력 검증)

- [ ] **Step 1: 공유 타입 정의 작성**

`web/lib/job-postings/types.ts`:
```ts
export type JobPostingStatus =
  | "active" | "applied" | "interviewing" | "closed" | "archived";

export type ScheduleKind =
  | "deadline" | "document_due" | "interview" | "other";

export type AttachmentType = "resume" | "cover_letter" | "portfolio";

export interface JobPostingInput {
  companyName: string;
  roleTitle: string;
  postingUrl?: string | null;
  techStack?: string[];
  responsibilities?: string[];
  requirements?: string[];
  preferred?: string[];
  companyDescription?: string | null;
  teamCulture?: string[];
  memo?: string | null;
  status?: JobPostingStatus;
  schedules?: Array<{
    kind: ScheduleKind;
    title?: string | null;
    startAt: string;
    endAt?: string | null;
    memo?: string | null;
  }>;
}

export interface JobPostingRecord {
  id: string;
  userId: string;
  companyName: string;
  roleTitle: string;
  postingUrl: string | null;
  techStack: string[];
  responsibilities: string[];
  requirements: string[];
  preferred: string[];
  companyDescription: string | null;
  teamCulture: string[];
  memo: string | null;
  status: JobPostingStatus;
  createdAt: string;
  updatedAt: string;
  schedules?: ScheduleRecord[];
  attachments?: AttachmentRecord[];
}

export interface ScheduleRecord {
  id: string;
  jobPostingId: string;
  kind: ScheduleKind;
  title: string | null;
  startAt: string;
  endAt: string | null;
  memo: string | null;
}

export interface AttachmentRecord {
  id: string;
  jobPostingId: string;
  attachmentType: AttachmentType;
  resumeId: string | null;
  coverLetterIndex: number | null;
  coverLetterLabel: string | null;
  portfolioId: string | null;
}
```

- [ ] **Step 2: validator 작성**

`web/lib/job-postings/validators.ts`:
```ts
import type { JobPostingInput } from "./types";

const STATUS = new Set(["active","applied","interviewing","closed","archived"]);
const KIND = new Set(["deadline","document_due","interview","other"]);

export function validateJobPostingInput(raw: unknown): { ok: true; value: JobPostingInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid payload" };
  const r = raw as Record<string, unknown>;
  const companyName = typeof r.companyName === "string" ? r.companyName.trim() : "";
  const roleTitle = typeof r.roleTitle === "string" ? r.roleTitle.trim() : "";
  if (!companyName) return { ok: false, error: "회사명은 필수입니다" };
  if (!roleTitle) return { ok: false, error: "직무명은 필수입니다" };

  const status = (r.status as string | undefined) ?? "active";
  if (!STATUS.has(status)) return { ok: false, error: "Invalid status" };

  const arrField = (key: string) =>
    Array.isArray(r[key]) ? (r[key] as unknown[]).filter((x) => typeof x === "string") as string[] : [];

  const schedulesRaw = Array.isArray(r.schedules) ? r.schedules as Array<Record<string, unknown>> : [];
  const schedules: JobPostingInput["schedules"] = [];
  for (const s of schedulesRaw) {
    const kind = s.kind as string;
    if (!KIND.has(kind)) return { ok: false, error: "Invalid schedule kind" };
    if (typeof s.startAt !== "string") return { ok: false, error: "schedule.startAt 필수" };
    schedules.push({
      kind: kind as JobPostingInput["schedules"][number]["kind"],
      title: typeof s.title === "string" ? s.title : null,
      startAt: s.startAt,
      endAt: typeof s.endAt === "string" ? s.endAt : null,
      memo: typeof s.memo === "string" ? s.memo : null,
    });
  }

  return {
    ok: true,
    value: {
      companyName,
      roleTitle,
      postingUrl: typeof r.postingUrl === "string" ? r.postingUrl : null,
      techStack: arrField("techStack"),
      responsibilities: arrField("responsibilities"),
      requirements: arrField("requirements"),
      preferred: arrField("preferred"),
      companyDescription: typeof r.companyDescription === "string" ? r.companyDescription : null,
      teamCulture: arrField("teamCulture"),
      memo: typeof r.memo === "string" ? r.memo : null,
      status: status as JobPostingInput["status"],
      schedules,
    },
  };
}
```

- [ ] **Step 3: 라우트 작성 — GET/POST `/api/my/job-postings`**

`web/app/api/my/job-postings/route.ts`:
```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { prisma } from "@/lib/prisma";
import { validateJobPostingInput } from "@/lib/job-postings/validators";
import type { JobPostingRecord, ScheduleRecord, AttachmentRecord } from "@/lib/job-postings/types";

function toRecord(row: any): JobPostingRecord {
  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name,
    roleTitle: row.role_title,
    postingUrl: row.posting_url,
    techStack: row.tech_stack ?? [],
    responsibilities: row.responsibilities ?? [],
    requirements: row.requirements ?? [],
    preferred: row.preferred ?? [],
    companyDescription: row.company_description,
    teamCulture: row.team_culture ?? [],
    memo: row.memo,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    schedules: (row.schedules ?? []).map((s: any): ScheduleRecord => ({
      id: s.id,
      jobPostingId: s.job_posting_id,
      kind: s.kind,
      title: s.title,
      startAt: s.start_at instanceof Date ? s.start_at.toISOString() : s.start_at,
      endAt: s.end_at instanceof Date ? s.end_at?.toISOString() ?? null : s.end_at,
      memo: s.memo,
    })),
    attachments: (row.attachments ?? []).map((a: any): AttachmentRecord => ({
      id: a.id,
      jobPostingId: a.job_posting_id,
      attachmentType: a.attachment_type,
      resumeId: a.resume_id,
      coverLetterIndex: a.cover_letter_index,
      coverLetterLabel: a.cover_letter_label,
      portfolioId: a.portfolio_id,
    })),
  };
}

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const rows = await prisma.user_job_postings.findMany({
    where: {
      user_id: session.user.id,
      ...(status ? { status } : {}),
    },
    orderBy: { created_at: "desc" },
    include: {
      schedules: { orderBy: { start_at: "asc" } },
      attachments: true,
    },
  });

  return NextResponse.json({ success: true, data: { items: rows.map(toRecord) } });
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = validateJobPostingInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }
  const v = parsed.value;
  const created = await prisma.user_job_postings.create({
    data: {
      user_id: session.user.id,
      company_name: v.companyName,
      role_title: v.roleTitle,
      posting_url: v.postingUrl ?? null,
      tech_stack: v.techStack ?? [],
      responsibilities: v.responsibilities ?? [],
      requirements: v.requirements ?? [],
      preferred: v.preferred ?? [],
      company_description: v.companyDescription ?? null,
      team_culture: v.teamCulture ?? [],
      memo: v.memo ?? null,
      status: v.status ?? "active",
      schedules: v.schedules && v.schedules.length > 0
        ? {
            create: v.schedules.map((s) => ({
              user_id: session.user.id,
              kind: s.kind,
              title: s.title ?? null,
              start_at: new Date(s.startAt),
              end_at: s.endAt ? new Date(s.endAt) : null,
              memo: s.memo ?? null,
            })),
          }
        : undefined,
    },
    include: { schedules: true, attachments: true },
  });
  return NextResponse.json({ success: true, data: toRecord(created) }, { status: 201 });
}
```

- [ ] **Step 4: 빌드/타입체크 확인**

```bash
cd web && npx tsc --noEmit
```
Expected: 새 라우트 관련 오류 없음.

- [ ] **Step 5: Commit**

```bash
git add web/app/api/my/job-postings/route.ts web/lib/job-postings/
git commit -m "feat(api): list and create user job postings with schedules"
```

---

## Task 4: BFF — 단일 공고 + 일정 라우트

**Files:**
- Create: `web/app/api/my/job-postings/[id]/route.ts`
- Create: `web/app/api/my/job-postings/[id]/schedules/route.ts`
- Create: `web/app/api/my/job-postings/[id]/schedules/[scheduleId]/route.ts`

- [ ] **Step 1: 단일 공고 핸들러 작성**

`web/app/api/my/job-postings/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { prisma } from "@/lib/prisma";
import { validateJobPostingInput } from "@/lib/job-postings/validators";

async function authUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const userId = await authUser();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const row = await prisma.user_job_postings.findFirst({
    where: { id: ctx.params.id, user_id: userId },
    include: { schedules: { orderBy: { start_at: "asc" } }, attachments: true },
  });
  if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  // toRecord 함수 재사용 — 같은 모듈에 inline 작성하거나 lib로 추출
  const { toRecord } = await import("@/lib/job-postings/serialize");
  return NextResponse.json({ success: true, data: toRecord(row) });
}

export async function PATCH(request: Request, ctx: { params: { id: string } }) {
  const userId = await authUser();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = validateJobPostingInput(body);
  if (!parsed.ok) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

  const v = parsed.value;
  const updated = await prisma.user_job_postings.updateMany({
    where: { id: ctx.params.id, user_id: userId },
    data: {
      company_name: v.companyName,
      role_title: v.roleTitle,
      posting_url: v.postingUrl ?? null,
      tech_stack: v.techStack ?? [],
      responsibilities: v.responsibilities ?? [],
      requirements: v.requirements ?? [],
      preferred: v.preferred ?? [],
      company_description: v.companyDescription ?? null,
      team_culture: v.teamCulture ?? [],
      memo: v.memo ?? null,
      status: v.status ?? "active",
    },
  });
  if (updated.count === 0) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  const userId = await authUser();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const r = await prisma.user_job_postings.deleteMany({
    where: { id: ctx.params.id, user_id: userId },
  });
  if (r.count === 0) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: serialize 모듈 추출**

`web/lib/job-postings/serialize.ts` 작성. Task 3 Step 3의 `toRecord` 함수를 이 파일로 이동 후 라우트에서 import. Task 3 라우트도 수정해서 동일 모듈을 import 하도록 통일.

- [ ] **Step 3: 일정 추가 핸들러**

`web/app/api/my/job-postings/[id]/schedules/route.ts`:
```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { prisma } from "@/lib/prisma";

const KIND = new Set(["deadline","document_due","interview","other"]);

export async function POST(request: Request, ctx: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as any;
  if (!body || typeof body.startAt !== "string" || !KIND.has(body.kind)) {
    return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
  }
  // 소유 검증
  const own = await prisma.user_job_postings.findFirst({
    where: { id: ctx.params.id, user_id: session.user.id },
    select: { id: true },
  });
  if (!own) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const created = await prisma.user_job_posting_schedules.create({
    data: {
      job_posting_id: ctx.params.id,
      user_id: session.user.id,
      kind: body.kind,
      title: typeof body.title === "string" ? body.title : null,
      start_at: new Date(body.startAt),
      end_at: typeof body.endAt === "string" ? new Date(body.endAt) : null,
      memo: typeof body.memo === "string" ? body.memo : null,
    },
  });
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
```

- [ ] **Step 4: 일정 수정/삭제**

`web/app/api/my/job-postings/[id]/schedules/[scheduleId]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { prisma } from "@/lib/prisma";

const KIND = new Set(["deadline","document_due","interview","other"]);

export async function PATCH(request: Request, ctx: { params: { id: string; scheduleId: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as any;
  const data: any = {};
  if (body.kind && KIND.has(body.kind)) data.kind = body.kind;
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.startAt === "string") data.start_at = new Date(body.startAt);
  if (body.endAt === null) data.end_at = null;
  else if (typeof body.endAt === "string") data.end_at = new Date(body.endAt);
  if (typeof body.memo === "string") data.memo = body.memo;

  const r = await prisma.user_job_posting_schedules.updateMany({
    where: { id: ctx.params.scheduleId, job_posting_id: ctx.params.id, user_id: session.user.id },
    data,
  });
  if (r.count === 0) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_: Request, ctx: { params: { id: string; scheduleId: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const r = await prisma.user_job_posting_schedules.deleteMany({
    where: { id: ctx.params.scheduleId, job_posting_id: ctx.params.id, user_id: session.user.id },
  });
  if (r.count === 0) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: 타입체크**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add web/app/api/my/job-postings web/lib/job-postings/serialize.ts
git commit -m "feat(api): single job posting + schedules CRUD"
```

---

## Task 5: BFF — 자료 첨부 / 캘린더 / 면접 prefill

**Files:**
- Create: `web/app/api/my/job-postings/[id]/attachments/route.ts`
- Create: `web/app/api/my/job-postings/[id]/attachments/[attachmentId]/route.ts`
- Create: `web/app/api/my/job-postings/calendar/route.ts`
- Create: `web/app/api/my/job-postings/[id]/interview-prefill/route.ts`

- [ ] **Step 1: 첨부 추가/삭제**

`web/app/api/my/job-postings/[id]/attachments/route.ts`:
```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { prisma } from "@/lib/prisma";

const TYPES = new Set(["resume","cover_letter","portfolio"]);

export async function POST(request: Request, ctx: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as any;
  if (!body || !TYPES.has(body.attachmentType)) {
    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  }
  const own = await prisma.user_job_postings.findFirst({
    where: { id: ctx.params.id, user_id: session.user.id },
    select: { id: true },
  });
  if (!own) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  // 자료 존재 검증
  if (body.attachmentType === "resume" || body.attachmentType === "cover_letter") {
    if (typeof body.resumeId !== "string") {
      return NextResponse.json({ success: false, error: "resumeId 필수" }, { status: 400 });
    }
    const r = await prisma.user_resumes.findFirst({
      where: { id: body.resumeId, user_id: session.user.id },
      select: { id: true, resume_payload: true },
    });
    if (!r) return NextResponse.json({ success: false, error: "이력서 없음" }, { status: 404 });
    if (body.attachmentType === "cover_letter") {
      if (typeof body.coverLetterIndex !== "number") {
        return NextResponse.json({ success: false, error: "coverLetterIndex 필수" }, { status: 400 });
      }
    }
  } else if (body.attachmentType === "portfolio") {
    if (typeof body.portfolioId !== "string") {
      return NextResponse.json({ success: false, error: "portfolioId 필수" }, { status: 400 });
    }
    const p = await prisma.user_portfolios.findFirst({
      where: { id: body.portfolioId, user_id: session.user.id },
      select: { id: true },
    });
    if (!p) return NextResponse.json({ success: false, error: "포트폴리오 없음" }, { status: 404 });
  }

  const created = await prisma.user_job_posting_attachments.create({
    data: {
      job_posting_id: ctx.params.id,
      user_id: session.user.id,
      attachment_type: body.attachmentType,
      resume_id: body.resumeId ?? null,
      cover_letter_index: typeof body.coverLetterIndex === "number" ? body.coverLetterIndex : null,
      cover_letter_label: typeof body.coverLetterLabel === "string" ? body.coverLetterLabel : null,
      portfolio_id: body.portfolioId ?? null,
    },
  });
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
```

- [ ] **Step 2: 첨부 삭제**

`web/app/api/my/job-postings/[id]/attachments/[attachmentId]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, ctx: { params: { id: string; attachmentId: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const r = await prisma.user_job_posting_attachments.deleteMany({
    where: {
      id: ctx.params.attachmentId,
      job_posting_id: ctx.params.id,
      user_id: session.user.id,
    },
  });
  if (r.count === 0) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: 캘린더 이벤트 페치**

`web/app/api/my/job-postings/calendar/route.ts`:
```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const schedules = await prisma.user_job_posting_schedules.findMany({
    where: {
      user_id: session.user.id,
      ...(from || to
        ? {
            start_at: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      job_posting: { select: { id: true, company_name: true, role_title: true, status: true } },
    },
    orderBy: { start_at: "asc" },
  });

  const events = schedules.map((s) => ({
    id: s.id,
    jobPostingId: s.job_posting_id,
    title: s.title || `${s.job_posting.company_name} · ${labelForKind(s.kind)}`,
    start: s.start_at.toISOString(),
    end: s.end_at?.toISOString() ?? null,
    kind: s.kind,
    company: s.job_posting.company_name,
    role: s.job_posting.role_title,
  }));

  return NextResponse.json({ success: true, data: { events } });
}

function labelForKind(kind: string) {
  switch (kind) {
    case "deadline": return "마감";
    case "document_due": return "서류 마감";
    case "interview": return "면접";
    default: return "일정";
  }
}
```

- [ ] **Step 4: 면접 prefill**

`web/app/api/my/job-postings/[id]/interview-prefill/route.ts`:
```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const posting = await prisma.user_job_postings.findFirst({
    where: { id: ctx.params.id, user_id: session.user.id },
    include: { attachments: true },
  });
  if (!posting) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  // 우선순위: 첨부된 이력서 > 활성 이력서
  let resumeData: { fileName: string; parsedContent: unknown } | null = null;
  let resumePrefillSource: "job_posting_attachment" | "active_resume" | null = null;

  const attachedResumeId = posting.attachments
    .find((a) => a.attachment_type === "resume")?.resume_id ?? null;

  const resume = attachedResumeId
    ? await prisma.user_resumes.findFirst({
        where: { id: attachedResumeId, user_id: session.user.id },
      })
    : await prisma.user_resumes.findFirst({
        where: { user_id: session.user.id, is_active: true },
      });

  if (resume) {
    resumeData = {
      fileName: resume.source_file_name || resume.title || "마이페이지 이력서",
      parsedContent: resume.resume_payload,
    };
    resumePrefillSource = attachedResumeId ? "job_posting_attachment" : "active_resume";
  }

  // 자소서 (resume_payload.coverLetters[index])
  let suggestedCoverLetter: { title: string; body: string } | null = null;
  const coverAttachment = posting.attachments.find((a) => a.attachment_type === "cover_letter");
  if (coverAttachment && coverAttachment.resume_id != null && coverAttachment.cover_letter_index != null) {
    const r = await prisma.user_resumes.findFirst({
      where: { id: coverAttachment.resume_id, user_id: session.user.id },
    });
    const payload = r?.resume_payload as any;
    const cls = Array.isArray(payload?.coverLetters) ? payload.coverLetters : [];
    const picked = cls[coverAttachment.cover_letter_index];
    if (picked) {
      suggestedCoverLetter = {
        title: typeof picked.title === "string" ? picked.title : (coverAttachment.cover_letter_label ?? ""),
        body: typeof picked.body === "string" ? picked.body : "",
      };
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      targetUrl: posting.posting_url ?? "",
      jobData: {
        role: posting.role_title,
        company: posting.company_name,
        techStack: posting.tech_stack ?? [],
        responsibilities: posting.responsibilities ?? [],
        requirements: posting.requirements ?? [],
        preferred: posting.preferred ?? [],
        companyDescription: posting.company_description ?? "",
        teamCulture: posting.team_culture ?? [],
      },
      resumeData,
      resumePrefillSource,
      suggestedCoverLetter,
    },
  });
}
```

- [ ] **Step 5: 타입체크 + Commit**

```bash
cd web && npx tsc --noEmit
git add web/app/api/my/job-postings
git commit -m "feat(api): attachments, calendar, and interview prefill endpoints"
```

---

## Task 6: UI — 캘린더 컴포넌트 (FullCalendar)

**Files:**
- Create: `web/components/features/job-postings/job-posting-calendar.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```tsx
"use client";

import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import koLocale from "@fullcalendar/core/locales/ko";

export type CalendarEvent = {
  id: string;
  jobPostingId: string;
  title: string;
  start: string;
  end: string | null;
  kind: "deadline" | "document_due" | "interview" | "other";
  company: string;
  role: string;
};

const KIND_COLOR: Record<CalendarEvent["kind"], string> = {
  deadline: "#ef4444",
  document_due: "#3b82f6",
  interview: "#f97316",
  other: "#64748b",
};

export function JobPostingCalendar({
  events,
  onEventClick,
  onDateClick,
}: {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}) {
  const fcEvents = useMemo(
    () => events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end ?? undefined,
      backgroundColor: KIND_COLOR[e.kind],
      borderColor: KIND_COLOR[e.kind],
      extendedProps: e,
    })),
    [events]
  );

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={koLocale}
        firstDay={0}
        height="auto"
        headerToolbar={{ start: "prev,next today", center: "title", end: "" }}
        buttonText={{ today: "오늘" }}
        events={fcEvents}
        eventClick={(info) => {
          const ev = info.event.extendedProps as CalendarEvent;
          onEventClick?.(ev);
        }}
        dateClick={(info) => onDateClick?.(info.date)}
        eventDisplay="block"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/features/job-postings/job-posting-calendar.tsx
git commit -m "feat(ui): job posting calendar component with ko locale"
```

---

## Task 7: UI — 카드 / 리스트 컴포넌트

**Files:**
- Create: `web/components/features/job-postings/job-posting-card.tsx`
- Create: `web/components/features/job-postings/job-posting-list.tsx`

- [ ] **Step 1: 카드 컴포넌트**

`job-posting-card.tsx`:
```tsx
"use client";

import Link from "next/link";
import { ExternalLink, Sparkles, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobPostingRecord, ScheduleRecord } from "@/lib/job-postings/types";

const STATUS_LABEL: Record<JobPostingRecord["status"], string> = {
  active: "관심",
  applied: "지원완료",
  interviewing: "면접중",
  closed: "마감",
  archived: "보관",
};

const STATUS_TONE: Record<JobPostingRecord["status"], string> = {
  active: "bg-emerald-100 text-emerald-700",
  applied: "bg-blue-100 text-blue-700",
  interviewing: "bg-orange-100 text-orange-700",
  closed: "bg-slate-200 text-slate-700",
  archived: "bg-slate-100 text-slate-500",
};

function nextSchedule(schedules: ScheduleRecord[] | undefined) {
  if (!schedules?.length) return null;
  const now = Date.now();
  return (
    schedules
      .filter((s) => new Date(s.startAt).getTime() >= now)
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))[0] ?? null
  );
}

function dDay(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

export function JobPostingCard({ posting }: { posting: JobPostingRecord }) {
  const next = nextSchedule(posting.schedules);
  return (
    <Card className="transition hover:shadow-md">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{posting.companyName}</div>
            <div className="truncate text-sm text-muted-foreground">{posting.roleTitle}</div>
          </div>
          <Badge className={STATUS_TONE[posting.status]}>{STATUS_LABEL[posting.status]}</Badge>
        </div>

        {next && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {next.title || (next.kind === "interview" ? "면접" : next.kind === "deadline" ? "마감" : "일정")}
            </span>
            <span className="font-medium">{dDay(next.startAt)}</span>
          </div>
        )}

        {posting.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {posting.techStack.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {t}
              </span>
            ))}
            {posting.techStack.length > 4 && (
              <span className="text-xs text-muted-foreground">+{posting.techStack.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/my/job-postings/${posting.id}`}>상세</Link>
            </Button>
            {posting.postingUrl && (
              <Button asChild size="sm" variant="ghost">
                <a href={posting.postingUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" />원문
                </a>
              </Button>
            )}
          </div>
          <Button asChild size="sm">
            <Link href={`/interview/posting/setup?import=job_posting&postingId=${posting.id}`}>
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              모의면접
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 리스트 컴포넌트**

`job-posting-list.tsx`:
```tsx
"use client";

import { JobPostingCard } from "./job-posting-card";
import type { JobPostingRecord } from "@/lib/job-postings/types";

export function JobPostingList({ postings }: { postings: JobPostingRecord[] }) {
  if (!postings.length) {
    return (
      <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
        등록된 채용공고가 없습니다. 우측 상단 <b>+ 새 공고</b> 버튼으로 첫 공고를 추가해 보세요.
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      {postings.map((p) => <JobPostingCard key={p.id} posting={p} />)}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/components/features/job-postings
git commit -m "feat(ui): job posting card and list components"
```

---

## Task 8: UI — 등록 / 편집 다이얼로그

**Files:**
- Create: `web/components/features/job-postings/job-posting-form-dialog.tsx`

- [ ] **Step 1: 다이얼로그 컴포넌트 작성**

```tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { JobPostingInput, JobPostingStatus, ScheduleKind } from "@/lib/job-postings/types";

const STATUS_OPTIONS: Array<{ value: JobPostingStatus; label: string }> = [
  { value: "active", label: "관심" },
  { value: "applied", label: "지원완료" },
  { value: "interviewing", label: "면접중" },
  { value: "closed", label: "마감" },
  { value: "archived", label: "보관" },
];

const KIND_OPTIONS: Array<{ value: ScheduleKind; label: string }> = [
  { value: "deadline", label: "마감일" },
  { value: "document_due", label: "서류 마감" },
  { value: "interview", label: "면접일" },
  { value: "other", label: "기타" },
];

type ScheduleDraft = {
  kind: ScheduleKind;
  title: string;
  startAt: string;
  endAt: string;
  memo: string;
};

export function JobPostingFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<JobPostingInput>;
  onSubmit: (payload: JobPostingInput) => Promise<void>;
}) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [roleTitle, setRoleTitle] = useState(initial?.roleTitle ?? "");
  const [postingUrl, setPostingUrl] = useState(initial?.postingUrl ?? "");
  const [techStackText, setTechStackText] = useState((initial?.techStack ?? []).join(", "));
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [status, setStatus] = useState<JobPostingStatus>((initial?.status as JobPostingStatus) ?? "active");
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!companyName.trim() || !roleTitle.trim()) {
      setError("회사명과 직무명을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        companyName: companyName.trim(),
        roleTitle: roleTitle.trim(),
        postingUrl: postingUrl.trim() || null,
        techStack: techStackText.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        memo: memo.trim() || null,
        status,
        schedules: schedules
          .filter((s) => s.startAt)
          .map((s) => ({
            kind: s.kind,
            title: s.title || null,
            startAt: new Date(s.startAt).toISOString(),
            endAt: s.endAt ? new Date(s.endAt).toISOString() : null,
            memo: s.memo || null,
          })),
      });
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? "저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>채용공고 등록</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>회사명 *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="예: 카카오" />
            </div>
            <div className="space-y-1">
              <Label>직무명 *</Label>
              <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="예: 백엔드 개발자" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>공고 URL</Label>
            <Input value={postingUrl} onChange={(e) => setPostingUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1">
            <Label>요구 기술 (쉼표로 구분)</Label>
            <Input value={techStackText} onChange={(e) => setTechStackText(e.target.value)} placeholder="React, TypeScript, Node.js" />
          </div>

          <div className="space-y-1">
            <Label>상태</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as JobPostingStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>메모</Label>
            <Textarea rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">일정</div>
              <Button type="button" size="sm" variant="outline" onClick={() =>
                setSchedules((arr) => [...arr, { kind: "deadline", title: "", startAt: "", endAt: "", memo: "" }])
              }>
                <Plus className="mr-1 h-3.5 w-3.5" /> 추가
              </Button>
            </div>
            <div className="space-y-2">
              {schedules.map((s, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <Select value={s.kind} onValueChange={(v) =>
                    setSchedules((arr) => arr.map((it, i) => i === idx ? { ...it, kind: v as ScheduleKind } : it))
                  }>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="col-span-4" type="datetime-local" value={s.startAt}
                    onChange={(e) => setSchedules((arr) => arr.map((it, i) => i === idx ? { ...it, startAt: e.target.value } : it))} />
                  <Input className="col-span-4" placeholder="제목 (선택)" value={s.title}
                    onChange={(e) => setSchedules((arr) => arr.map((it, i) => i === idx ? { ...it, title: e.target.value } : it))} />
                  <Button type="button" size="icon" variant="ghost" className="col-span-1"
                    onClick={() => setSchedules((arr) => arr.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>취소</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "저장 중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/features/job-postings/job-posting-form-dialog.tsx
git commit -m "feat(ui): job posting create/edit dialog"
```

---

## Task 9: UI — 메인 페이지 `/my/job-postings`

**Files:**
- Create: `web/app/my/job-postings/page.tsx`
- Create: `web/app/my/job-postings/job-postings-client.tsx`

- [ ] **Step 1: 서버 컴포넌트 (인증 가드)**

`web/app/my/job-postings/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobPostingsClient } from "./job-postings-client";

export const dynamic = "force-dynamic";

export default async function JobPostingsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login?redirect=/my/job-postings");
  }
  return <JobPostingsClient />;
}
```

> NOTE: `createClient` 경로는 기존 `/my/[handle]/page.tsx`와 동일한 import path 사용. 다를 경우 그쪽을 참조해서 맞춤.

- [ ] **Step 2: 클라이언트 컴포넌트**

`web/app/my/job-postings/job-postings-client.tsx`:
```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobPostingCalendar, type CalendarEvent } from "@/components/features/job-postings/job-posting-calendar";
import { JobPostingList } from "@/components/features/job-postings/job-posting-list";
import { JobPostingFormDialog } from "@/components/features/job-postings/job-posting-form-dialog";
import type { JobPostingInput, JobPostingRecord } from "@/lib/job-postings/types";

export function JobPostingsClient() {
  const [postings, setPostings] = useState<JobPostingRecord[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [postingsRes, calRes] = await Promise.all([
        fetch("/api/my/job-postings", { cache: "no-store" }),
        fetch("/api/my/job-postings/calendar", { cache: "no-store" }),
      ]);
      const pj = await postingsRes.json();
      const cj = await calRes.json();
      if (pj.success) setPostings(pj.data.items);
      if (cj.success) setEvents(cj.data.events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const active = useMemo(
    () => postings.filter((p) => p.status !== "archived" && p.status !== "closed"),
    [postings]
  );
  const inactive = useMemo(
    () => postings.filter((p) => p.status === "archived" || p.status === "closed"),
    [postings]
  );

  const handleCreate = async (payload: JobPostingInput) => {
    const res = await fetch("/api/my/job-postings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "저장 실패");
    await fetchAll();
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 채용공고 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            관심 공고를 등록하고 일정을 캘린더로 관리한 뒤, 바로 모의면접까지 진행하세요.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> 새 공고 등록
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <JobPostingCalendar events={events} />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              활성 공고 ({active.length})
            </h2>
            {loading ? <div className="text-sm text-muted-foreground">불러오는 중…</div> : <JobPostingList postings={active} />}
          </section>
          {inactive.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                보관/마감 ({inactive.length})
              </h2>
              <JobPostingList postings={inactive} />
            </section>
          )}
        </div>
      </div>

      <JobPostingFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreate} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/app/my/job-postings/page.tsx web/app/my/job-postings/job-postings-client.tsx
git commit -m "feat(ui): job postings management page (calendar + list)"
```

---

## Task 10: UI — 상세 페이지 + 자료 연결

**Files:**
- Create: `web/app/my/job-postings/[id]/page.tsx`
- Create: `web/app/my/job-postings/[id]/detail-client.tsx`
- Create: `web/components/features/job-postings/attachment-picker.tsx`

- [ ] **Step 1: 서버 가드**

`web/app/my/job-postings/[id]/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobPostingDetailClient } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function JobPostingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/login?redirect=/my/job-postings/${params.id}`);
  return <JobPostingDetailClient postingId={params.id} />;
}
```

- [ ] **Step 2: 첨부 선택 컴포넌트**

`web/components/features/job-postings/attachment-picker.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ResumeOption = { id: string; title: string; coverLetters: { title: string }[] };
type PortfolioOption = { id: string; title: string };

export function AttachmentPicker({
  postingId,
  onAdded,
}: {
  postingId: string;
  onAdded: () => void;
}) {
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioOption[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [coverIdx, setCoverIdx] = useState("");
  const [portfolioId, setPortfolioId] = useState("");

  useEffect(() => {
    (async () => {
      const [rRes, pRes] = await Promise.all([
        fetch("/api/my/resume", { cache: "no-store" }),
        fetch("/api/career/portfolios", { cache: "no-store" }),
      ]);
      const rj = await rRes.json();
      const pj = await pRes.json();
      const items = (rj?.data?.items ?? []).map((r: any) => ({
        id: r.id,
        title: r.title ?? "이력서",
        coverLetters: Array.isArray(r.resume_payload?.coverLetters)
          ? r.resume_payload.coverLetters.map((c: any) => ({ title: c.title ?? "자기소개서" }))
          : [],
      }));
      setResumes(items);
      setPortfolios((pj?.items ?? []).map((x: any) => ({ id: x.id, title: x.title ?? "포트폴리오" })));
    })();
  }, []);

  const post = async (payload: any) => {
    const res = await fetch(`/api/my/job-postings/${postingId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if ((await res.json()).success) onAdded();
  };

  const selectedResume = resumes.find((r) => r.id === resumeId);

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <div className="mb-1 text-sm font-medium">이력서 연결</div>
        <div className="flex gap-2">
          <Select value={resumeId} onValueChange={setResumeId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="이력서 선택" /></SelectTrigger>
            <SelectContent>
              {resumes.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => resumeId && post({ attachmentType: "resume", resumeId })} disabled={!resumeId}>
            연결
          </Button>
        </div>
      </div>

      {selectedResume && selectedResume.coverLetters.length > 0 && (
        <div>
          <div className="mb-1 text-sm font-medium">자기소개서 연결</div>
          <div className="flex gap-2">
            <Select value={coverIdx} onValueChange={setCoverIdx}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="자소서 선택" /></SelectTrigger>
              <SelectContent>
                {selectedResume.coverLetters.map((c, i) => (
                  <SelectItem key={i} value={String(i)}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => coverIdx && post({
                attachmentType: "cover_letter",
                resumeId,
                coverLetterIndex: Number(coverIdx),
                coverLetterLabel: selectedResume.coverLetters[Number(coverIdx)]?.title ?? null,
              })}
              disabled={!coverIdx}
            >연결</Button>
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 text-sm font-medium">포트폴리오 연결</div>
        <div className="flex gap-2">
          <Select value={portfolioId} onValueChange={setPortfolioId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="포트폴리오 선택" /></SelectTrigger>
            <SelectContent>
              {portfolios.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => portfolioId && post({ attachmentType: "portfolio", portfolioId })} disabled={!portfolioId}>
            연결
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 상세 클라이언트**

`web/app/my/job-postings/[id]/detail-client.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttachmentPicker } from "@/components/features/job-postings/attachment-picker";
import type { JobPostingRecord } from "@/lib/job-postings/types";

export function JobPostingDetailClient({ postingId }: { postingId: string }) {
  const [posting, setPosting] = useState<JobPostingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/my/job-postings/${postingId}`, { cache: "no-store" });
    const json = await res.json();
    if (json.success) setPosting(json.data);
    setLoading(false);
  }, [postingId]);

  useEffect(() => { void load(); }, [load]);

  const removeAttachment = async (attachmentId: string) => {
    await fetch(`/api/my/job-postings/${postingId}/attachments/${attachmentId}`, { method: "DELETE" });
    void load();
  };

  const removeSchedule = async (scheduleId: string) => {
    await fetch(`/api/my/job-postings/${postingId}/schedules/${scheduleId}`, { method: "DELETE" });
    void load();
  };

  const removePosting = async () => {
    if (!confirm("이 공고와 일정/연결 자료를 모두 삭제할까요?")) return;
    await fetch(`/api/my/job-postings/${postingId}`, { method: "DELETE" });
    window.location.href = "/my/job-postings";
  };

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">불러오는 중…</div>;
  if (!posting) return <div className="mx-auto max-w-5xl px-4 py-10">공고를 찾을 수 없습니다.</div>;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/my/job-postings"><ArrowLeft className="mr-1 h-4 w-4" />목록으로</Link>
        </Button>
        <div className="flex gap-2">
          {posting.postingUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={posting.postingUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />원문 공고
              </a>
            </Button>
          )}
          <Button asChild>
            <Link href={`/interview/posting/setup?import=job_posting&postingId=${posting.id}`}>
              <Sparkles className="mr-1 h-4 w-4" />이 공고로 모의면접 시작
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-2 p-6">
          <div className="text-sm text-muted-foreground">{posting.companyName}</div>
          <h1 className="text-2xl font-bold">{posting.roleTitle}</h1>
          <div className="flex flex-wrap gap-1 pt-2">
            {posting.techStack.map((t) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
          </div>
          {posting.memo && (
            <p className="whitespace-pre-line pt-3 text-sm text-foreground">{posting.memo}</p>
          )}
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-base font-semibold">일정</h2>
        {posting.schedules && posting.schedules.length > 0 ? (
          <div className="space-y-2">
            {posting.schedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{s.title || labelKind(s.kind)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.startAt).toLocaleString("ko-KR")}
                    {s.endAt && ` ~ ${new Date(s.endAt).toLocaleString("ko-KR")}`}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeSchedule(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            등록된 일정이 없습니다.
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">연결된 자료</h2>
        <AttachmentPicker postingId={posting.id} onAdded={load} />
        {posting.attachments && posting.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {posting.attachments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                <div className="text-sm">
                  <Badge variant="outline" className="mr-2">{labelType(a.attachmentType)}</Badge>
                  {a.attachmentType === "cover_letter"
                    ? a.coverLetterLabel ?? `자소서 #${(a.coverLetterIndex ?? 0) + 1}`
                    : a.attachmentType === "resume"
                      ? "이력서"
                      : "포트폴리오"}
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeAttachment(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex justify-end pt-4">
        <Button variant="destructive" onClick={removePosting}>공고 삭제</Button>
      </div>
    </div>
  );
}

function labelKind(k: string) {
  return k === "deadline" ? "마감일" : k === "document_due" ? "서류 마감" : k === "interview" ? "면접일" : "기타";
}
function labelType(t: string) {
  return t === "resume" ? "이력서" : t === "cover_letter" ? "자소서" : "포트폴리오";
}
```

- [ ] **Step 4: Commit**

```bash
git add web/app/my/job-postings/[id] web/components/features/job-postings/attachment-picker.tsx
git commit -m "feat(ui): job posting detail page with attachments and schedules"
```

---

## Task 11: 모의면접 진입 통합

**Files:**
- Modify: `web/components/features/interview/setup/interview-setup-flow.tsx`

- [ ] **Step 1: prefill useEffect 분기 확장**

기존 `useEffect`에서 `import === "active_resume"`만 다루므로, `import === "job_posting"` 분기 추가:

기존 흐름 다음에 (또는 별도 useEffect로) 다음 로직 삽입:

```ts
useEffect(() => {
  const importType = searchParams.get("import");
  const postingId = searchParams.get("postingId");
  if (importType !== "job_posting" || !postingId || didImportRef.current) return;
  didImportRef.current = true;

  void (async () => {
    try {
      const res = await fetch(`/api/my/job-postings/${postingId}/interview-prefill`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.success) return;
      const d = json.data;

      if (d.targetUrl) setTargetUrl(d.targetUrl);
      if (d.jobData) setJobData(d.jobData);
      if (d.resumeData) {
        setResumeData(d.resumeData);
        setResumePrefillSource(d.resumePrefillSource ?? null);
      }
      // 자소서 prefill은 후속 phase에서 별도 필드로 처리 가능. 우선 store에 저장하거나 무시.
      setStep("jd-check");
    } catch {
      // ignore — 사용자가 수동으로 진행할 수 있게 둔다
    }
  })();
}, [searchParams, setTargetUrl, setJobData, setResumeData, setResumePrefillSource, setStep]);
```

- [ ] **Step 2: 기존 active_resume 분기와 didImportRef 공유 확인**

`didImportRef`가 둘 다 동시에 트리거되지 않도록 한 번만 set되게 유지. `import === "active_resume"`인 경우만 didImportRef를 true로 set하고 있다면, 그 위에 우리 분기가 먼저 실행될 수 있게 분기 순서 조정. (둘 중 어느 쪽이든 ref가 true가 되면 다른 쪽은 동작 안 함.)

- [ ] **Step 3: 타입체크**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add web/components/features/interview/setup/interview-setup-flow.tsx
git commit -m "feat(interview): prefill setup from job_posting import param"
```

---

## Task 12: 마이페이지 진입점 추가

**Files:**
- Modify: `web/app/my/[handle]/profile-client.tsx` (또는 `tabs/overview` 영역의 적절한 카드 위치)

- [ ] **Step 1: overview 탭에 카드 추가 또는 상단 액션 영역에 링크 추가**

`isOwner === true`일 때만 노출되는 "내 채용공고 관리" 카드를 추가:

```tsx
{isOwner && (
  <Link
    href="/my/job-postings"
    className="group flex items-center justify-between rounded-xl border bg-card p-4 transition hover:border-primary"
  >
    <div>
      <div className="text-sm font-semibold">내 채용공고 관리</div>
      <div className="text-xs text-muted-foreground">캘린더로 일정 관리하고, 곧바로 모의면접까지.</div>
    </div>
    <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
  </Link>
)}
```

> 정확한 삽입 위치: overview 탭의 카드 영역. `profile-client.tsx`의 `isOwner` 변수와 `Link` import가 있는지 확인 후 없으면 추가.

- [ ] **Step 2: 헤더 사용자 메뉴에서도 본인이면 진입할 수 있게** (선택)

기존 헤더 컴포넌트가 사용자 드롭다운을 가진다면 "내 채용공고" 항목 추가. 없으면 skip.

- [ ] **Step 3: Commit**

```bash
git add web/app/my/[handle]/profile-client.tsx
git commit -m "feat(ui): add mypage entry point linking to job postings"
```

---

## Task 13: 빌드 / 통합 검증

- [ ] **Step 1: 타입체크**

```bash
cd web && npx tsc --noEmit
```
Expected: 새 기능 관련 오류 0.

- [ ] **Step 2: lint**

```bash
cd web && npm run lint
```
Expected: 새 파일들 lint 통과 (기존 경고는 무시 가능).

- [ ] **Step 3: 빌드**

```bash
cd web && npm run build
```
Expected: 빌드 성공, 새 라우트들이 라우트 목록에 등장.

- [ ] **Step 4: 수동 스모크 테스트 체크리스트**

다음 시나리오를 dev 서버에서 (또는 사용자 인계 시) 직접 확인:
1. 로그인 → `/my/job-postings` 접근 가능.
2. "+ 새 공고 등록" → 회사명/직무 입력 + 일정 1개 추가 → 저장. 캘린더에 이벤트 표시.
3. 카드 → 상세 페이지 진입. 이력서 연결 후 "이 공고로 모의면접 시작" 클릭.
4. `/interview/posting/setup`이 prefilled 상태로 진입 (companyName, role, techStack, 이력서 자동 채워짐).
5. 상세에서 일정/첨부 삭제 동작. 공고 삭제 시 cascade.

- [ ] **Step 5: 최종 Commit (필요 시 작은 fix들)**

```bash
git add -A && git commit -m "chore: lint/typecheck fixes for job postings feature"
```

---

## Self-Review

- ✅ **Spec coverage**: 캘린더, 카드 리스트, 등록 폼, URL 입력, 이력서/자소서/포트폴리오 연동, 모의면접 진입 모두 task에 포함됨.
- ✅ **No placeholders**: 모든 코드 블록이 실제 사용 가능한 코드. 모든 SQL/타입/경로 명시.
- ✅ **Type consistency**: `JobPostingRecord`/`JobPostingInput`/`ScheduleRecord`/`AttachmentRecord` 명칭이 Task 3-10에서 일관됨. snake_case ↔ camelCase 변환은 `serialize.ts` (Task 4 Step 2)로 단일화.
- ✅ **Scope**: Phase 1 단일 plan으로 적정. 알림/공휴일/parse-job 자동 import는 Phase 2로 분리.

## 멀티에이전트 실행 분배 (Subagent-Driven 실행 시)

| Wave | Tasks | 의존성 |
|---|---|---|
| 1 | Task 1 → Task 2 | DB 먼저 |
| 2 (parallel) | Task 3 / Task 6 / Task 7 / Task 8 | Task 2 완료 후 |
| 3 (parallel) | Task 4 / Task 5 / Task 9 / Task 10 | Wave 2 완료 후 (Task 9-10은 Task 6-8 컴포넌트 사용) |
| 4 | Task 11 | API 완료 후 |
| 5 | Task 12 → Task 13 | 마지막 |
