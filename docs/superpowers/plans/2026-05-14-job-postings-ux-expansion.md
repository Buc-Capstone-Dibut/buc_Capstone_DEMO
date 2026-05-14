# 채용공고 관리 UX 확장 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. 본 plan은 이전 plan(`2026-05-14-job-postings-mypage-calendar.md`)의 확장이다. 기존 코드를 수정하는 작업이 많다.

**Goal:** `/my/job-postings` 페이지를 워크스페이스급 컬렉션 UX로 강화한다. 캘린더 on/off 토글, 카드/리스트 뷰 전환, 검색·필터·정렬·페이지네이션·즐겨찾기로 수백 개 채용공고도 다룰 수 있게 한다. 등록 단계는 사용자의 이력서·자소서에서 회사/직무/기술스택을 추출하여 prefill하는 보강 흐름을 추가하고, 추후 다른 import 소스(외부 URL 파서 등)도 쉽게 끼울 수 있는 어댑터 구조로 둔다.

**Architecture:**
- DB: `user_job_postings`에 `is_favorite` 컬럼 + 정렬 인덱스 추가.
- API: GET 목록에 search/sort/page/favorite 쿼리 파라미터 지원. 즐겨찾기 PATCH는 기존 PATCH 라우트로 흡수. 신규 GET `/api/my/job-postings/import-suggestions?source=resume|cover_letter&id=…` → prefill payload 반환.
- UI: 페이지 상태(view, calendarOn, query, filters, sort, page, favoritesOnTop)를 단일 store(클라이언트 reducer)로 모으고 URL 쿼리에 일부 동기화. localStorage로 사용자 기본값 영속.
- Import 어댑터: `web/lib/job-postings/import-sources/{resume,cover-letter}.ts` 형태로 분리. 각 어댑터는 `extractSuggestion(payload) → JobPostingDraft` 시그니처.

**Tech Stack:** 기존 스택 그대로 (Next.js 14 + Supabase + Prisma + shadcn/ui + FullCalendar).

**병렬 실행:** Wave 1 → A(DB+API). Wave 2 (병렬) → B(UI 뷰/필터/즐겨찾기) + C(등록 import).

---

## Task A1: DB — is_favorite 컬럼 추가

**Apply via Supabase MCP `apply_migration`:**

```sql
alter table public.user_job_postings
  add column if not exists is_favorite boolean not null default false;

create index if not exists user_job_postings_user_fav_idx
  on public.user_job_postings (user_id, is_favorite desc, created_at desc);
```

Prisma schema: `is_favorite Boolean @default(false)` 추가, 새 인덱스도 추가. `npx prisma@5.22.0 generate`.

백업: `web/prisma/migrations/2026-05-14_job_postings_favorite/migration.sql`.

---

## Task A2: API — 목록 쿼리 확장

`web/app/api/my/job-postings/route.ts` GET 핸들러 수정:

지원 쿼리:
- `status`: 콤마 구분 다중 선택 (`active,applied`).
- `q`: 검색어 (회사명 OR 직무 substring, case-insensitive).
- `sort`: `created_desc | created_asc | deadline_asc | company_asc`. 기본 `created_desc`.
- `favorites`: `top` (즐겨찾기 상단) 또는 `only`.
- `page`: 1-based 정수. 기본 1.
- `pageSize`: 정수. 기본 20, 최대 100.

응답 추가 필드: `{ items, page, pageSize, total, hasMore }`.

정렬은 Prisma `orderBy` 배열. `deadline_asc`는 `schedules`의 가장 임박한 `start_at`을 기준으로 정렬해야 하므로 다음 중 하나:
- 단순 구현: `created_desc` 등 직접 정렬만 DB에서, `deadline_asc`는 서버에서 `items` 페치 후 in-memory 정렬 (pageSize 만큼만 가져와도 OK).
- 정밀 구현: `user_job_posting_schedules`를 LEFT JOIN해서 min(start_at) 계산. 일단 in-memory 정렬로 시작 (수백~수천 row까지는 충분).

`q` 처리: `where: { OR: [{ company_name: { contains: q, mode: "insensitive" } }, { role_title: { contains: q, mode: "insensitive" } }] }`.

---

## Task A3: API — 즐겨찾기 토글 및 단축 PATCH

기존 `PATCH /api/my/job-postings/[id]`은 전체 본문 검증 후 update. 빠른 즐겨찾기 토글을 위해:

옵션 1 (권장): 동일 PATCH 라우트에서 입력 검증을 완화 — body가 `{ isFavorite: boolean }` 1개 필드만 있으면 `is_favorite`만 업데이트, 그 외 필드 검증 생략.

옵션 2: 별도 `PATCH /api/my/job-postings/[id]/favorite` 라우트.

→ **옵션 1 선택**: validator를 partial-update로 확장.

---

## Task A4: API — import-suggestions

`web/app/api/my/job-postings/import-suggestions/route.ts` (GET):

쿼리: `source=resume|cover_letter`, `id=<row id>` (선택 — 미제공 시 active 항목).

응답: 
```ts
{
  success: true,
  data: {
    companyName?: string;
    roleTitle?: string;
    techStack?: string[];
    responsibilities?: string[];
    requirements?: string[];
    memo?: string;
    suggestedAttachment?: { type: "resume"|"cover_letter", id: string };
    sourceLabel: string; // "이력서: 신입 개발자 이력서" 등
  }
}
```

내부 동작:
1. 인증.
2. source에 따라 user_resumes 또는 user_cover_letters에서 row 조회.
3. `web/lib/job-postings/import-sources/{resume,cover-letter}.ts` 의 `extractSuggestion(row)` 호출하여 변환.
4. 결과 반환.

---

## Task A5: 어댑터 모듈

`web/lib/job-postings/import-sources/types.ts`:
```ts
export interface JobPostingDraft {
  companyName?: string;
  roleTitle?: string;
  techStack?: string[];
  responsibilities?: string[];
  requirements?: string[];
  memo?: string;
}

export interface ImportSourceAdapter<TRow> {
  key: "resume" | "cover_letter";
  extractSuggestion(row: TRow): JobPostingDraft;
}
```

`resume.ts`:
- 입력: user_resumes row.
- `resume_payload.experience[0]` → companyName, roleTitle.
- `resume_payload.skills[]` → techStack.
- `resume_payload.experience[0].responsibilities` → responsibilities (있을 때).
- `resume_payload.title` → memo의 일부.

`cover-letter.ts`:
- 입력: user_cover_letters row.
- title을 회사명/직무 후보로 split (예: "삼성전자 백엔드" → companyName="삼성전자", roleTitle="백엔드"). 단순 휴리스틱: 공백 2분할.
- body 첫 200자 → memo.

---

## Task B1: UI — 페이지 상태 reducer + URL 동기화

`web/app/my/job-postings/use-job-postings-view.ts` 신규 hook:
- state: `{ view: "cards"|"list", calendarVisible: boolean, query: string, statusFilters: Status[], sort: SortKey, favoritesPolicy: "off"|"top"|"only", page: number, pageSize: number }`.
- localStorage key: `dibut.job-postings.view`로 영속.
- URL 쿼리(`?view=list&page=2`) 동기화 (replaceState).
- 변경 시 fetch invalidation.

---

## Task B2: UI — 헤더 컨트롤 바

`web/components/features/job-postings/job-postings-header.tsx`:
- 좌측: 페이지 제목 + 상태 카운터(요약).
- 우측: 검색 input(디바운스 300ms) → 상태 필터 칩(toggle) → 정렬 드롭다운 → 뷰 토글(카드/리스트 ToggleGroup) → 캘린더 ON/OFF 토글(아이콘) → "+ 새 공고" 버튼.

각 컨트롤은 use-job-postings-view 훅의 setter 호출.

---

## Task B3: UI — 리스트 뷰

`web/components/features/job-postings/job-posting-list-view.tsx`:
- shadcn `Table` 사용 (없으면 단순 div grid로 대체).
- 컬럼: ★ / 회사 / 직무 / 상태 배지 / 다음 일정(D-day) / 기술스택(축약) / 액션 메뉴(상세/면접/삭제).
- ★ 클릭 시 즉시 PATCH.

---

## Task B4: UI — 즐겨찾기 카드 변경

`job-posting-card.tsx`에 ★ 토글 추가 (우측 상단). 즐겨찾기 항목은 카드 외곽선 강조 (border-primary/40 등).

---

## Task B5: UI — 페이지네이션

`web/components/features/job-postings/job-postings-pagination.tsx`:
- 단순 `이전 / 1 / 2 / 3 / ... / N / 다음` 형태.
- `total`/`pageSize`에서 페이지 수 계산.
- 페이지 변경 시 use-job-postings-view 훅 setter.

---

## Task B6: UI — 메인 페이지 통합

`web/app/my/job-postings/job-postings-client.tsx` 전면 리팩토링:
- use-job-postings-view 훅 사용.
- 검색/필터/정렬/페이지 변경에 따라 `GET /api/my/job-postings?q=…&status=…&sort=…&page=…&favorites=…` 호출.
- `calendarVisible === true` 면 캘린더를 상단(또는 좌측)에 표시; `false`면 본문이 풀 너비.
- `view === "cards"` → `<JobPostingList>` (그리드), `view === "list"` → `<JobPostingListView>` (테이블).
- 페이지네이션 컴포넌트 하단.
- 상태별 카운터: `?status=...&pageSize=1`로 별도 페치하거나, 전체 합계를 한 번 더 가져오는 가벼운 endpoint 추가 (당장은 메인 fetch 응답의 `total`만 사용 — 향후 확장).

---

## Task C1: 등록 다이얼로그 import 기능

`web/components/features/job-postings/job-posting-form-dialog.tsx` 수정:
- 다이얼로그 상단에 "내 자료에서 가져오기" 컬랩서블 패널.
- 패널 내부:
  - 라디오: "이력서" / "자기소개서".
  - Select: 해당 소스의 항목 목록 (활성 이력서 가져오기는 빠른 진입 버튼으로 별도).
  - "추출하기" 버튼 → `GET /api/my/job-postings/import-suggestions?source=...&id=...` → 받은 draft를 form state에 병합 (사용자가 이미 입력한 값은 덮어쓰지 않게 — 빈 필드만 채움).
  - 체크박스: "등록 후 이 자료를 자동 연결". 체크된 경우, 등록 POST 후 attachments POST를 자동 호출.

---

## Task C2: ImportFromMyDataPanel 컴포넌트

`web/components/features/job-postings/import-from-my-data-panel.tsx` 컴포넌트로 분리:
- props: `onApply(draft: JobPostingDraft, attach?: { type, id })`.
- 폼의 자식으로 임베드.

---

## Task D: 빌드 검증

- `cd web && npx tsc --noEmit` (job-postings 관련 0 에러).
- dev 서버 확인: `/my/job-postings` 로딩 + 검색·필터·정렬·뷰 토글·즐겨찾기·페이지 이동 동작.

---

## 멀티에이전트 분배

| Wave | Agent | Tasks |
|---|---|---|
| 1 | A | A1, A2, A3, A4, A5 |
| 2 | B | B1, B2, B3, B4, B5, B6 |
| 2 | C | C1, C2 |
| 3 | host | D 검증 |
