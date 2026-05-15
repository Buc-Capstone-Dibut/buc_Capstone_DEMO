# 마이페이지 채용공고 일정 관리 — 설계 명세

- **작성일**: 2026-05-14
- **작성자**: Dibut 팀
- **상태**: Draft
- **관련 문서**: `docs/interview-spec-kit/`

## 1. 배경 / 목적

Dibut 사용자는 본인이 지원하는(혹은 관심 있는) **채용공고**를 한 곳에서 등록·관리하고, 마감일·면접일 같은 **일정**을 캘린더로 한눈에 보고, 등록한 공고에서 곧바로 **AI 모의면접**을 시작할 수 있어야 한다.

현재 플랫폼에는 채용공고 데이터 모델이 없고, 마이페이지에도 일정 관리 기능이 없다. 본 명세는 마이페이지에 채용공고/일정 관리 페이지를 신규로 추가하고, 기존 이력서·자소서·포트폴리오와 유기적으로 연결하며, AI 모의면접 진입 플로우를 통합한다.

## 2. 핵심 가치

1. **수집·관리**: 사용자가 직접 등록한 채용공고의 URL/메모/마감/면접일을 캘린더 + 카드 형태로 관리.
2. **연계**: 각 공고에 본인의 이력서·자소서·포트폴리오를 매핑.
3. **즉시 면접**: 공고 카드에서 "이 공고로 모의면접" 버튼 1클릭으로 AI 면접 플로우 진입(prefill 완료 상태).

## 3. 비범위 (Out of Scope)

- 외부 채용 사이트 크롤링 / 자동 import (이미 `parse-job` 엔드포인트가 있으나 본 기능에서는 사용자 직접 입력을 우선).
- 협업 / 팀 공유 (개인 단위만).
- 푸시 알림, 이메일 알림 (Phase 2).
- 음력 표시 (Phase 2).

## 4. UX / 화면 설계

### 4.1 진입점

- 마이페이지(`/my/[handle]`)의 **NAV_ITEMS**에 신규 탭 추가는 하지 않음 (마이페이지는 퍼블릭 프로필 뷰이므로 본인 전용 페이지로 분리).
- 신규 경로: **`/my/job-postings`** (본인 인증 필요).
- 헤더 사용자 메뉴 또는 `/my/[handle]` 본인 프로필일 때 "내 채용공고 관리" 카드/링크 추가.

### 4.2 메인 페이지 레이아웃 (`/my/job-postings`)

```
┌─────────────────────────────────────────────────────────────┐
│  [헤더] 내 채용공고 관리        [+ 새 공고 등록]            │
├──────────────────────────────────┬──────────────────────────┤
│                                  │  활성 공고 (n개)          │
│                                  │  ┌────────────────────┐  │
│   [FullCalendar — month view]    │  │ [회사 로고/이니셜]  │  │
│   - 한국어 locale                 │  │ 회사명 · 직무       │  │
│   - 마감일 ●(빨강)                │  │ 마감 D-3            │  │
│   - 면접일 ◆(주황)                │  │ [상세] [면접 시작]  │  │
│   - 서류일 ▲(파랑)                │  └────────────────────┘  │
│   - 클릭 시 우측 패널 업데이트     │  ...                     │
│                                  │                          │
│                                  │  보관 공고 ▶ (접힘)       │
└──────────────────────────────────┴──────────────────────────┘
```

- 캘린더: **FullCalendar**(이미 설치된 `@fullcalendar/react`), `locales/ko` 적용.
- 우측 리스트: 카드 박스 형태. 상태(`active`, `applied`, `interviewing`, `closed`, `archived`)로 분류.
- 캘린더 날짜 클릭 → 그 날짜에 일정 있는 공고로 스크롤 또는 강조.
- 카드 클릭 → `/my/job-postings/[id]` 상세 페이지.

### 4.3 등록 / 편집 (Dialog)

- shadcn `Dialog` 사용. 필드:
  - **회사명** (필수, text)
  - **직무명** (필수, text)
  - **공고 URL** (선택, url validation)
  - **요구 기술 스택** (선택, multi-tag)
  - **메모** (선택, textarea)
  - **공고 상태** (active / applied / interviewing / closed / archived)
  - **일정 추가** (반복 가능): `kind = deadline | document_due | interview | other`, `start_at` (필수), `end_at` (선택), `title`(선택), `memo`(선택)
- 저장 시 BFF로 한 번에 POST.

### 4.4 상세 페이지 (`/my/job-postings/[id]`)

탭 또는 섹션 구분:

1. **기본 정보**: 회사명, 직무, URL(외부 링크), 메모, 상태 전환 버튼.
2. **일정**: 일정 추가/삭제, 캘린더 미니 뷰.
3. **연결된 자료** (Attachments):
   - 이력서: 활성 이력서 또는 직접 선택 (`user_resumes` 목록).
   - 자기소개서: 활성 이력서의 `coverLetters[]` 중 선택 (인덱스/제목 저장).
   - 포트폴리오: `user_portfolios` 목록에서 다중 선택.
4. **면접 이력**: 이 공고로 진행한 모의면접 세션 링크 (Phase 1: 단순 카운트만).
5. **상단 CTA**: `이 공고로 AI 모의면접 시작` → `/interview/posting/setup?import=job_posting&postingId=<id>`.

### 4.5 AI 모의면접 통합

- `InterviewSetupFlow`(`web/components/features/interview/setup/interview-setup-flow.tsx`)의 prefill useEffect 확장:
  - `searchParams.get("import") === "job_posting"` & `postingId` 존재 시:
    - `GET /api/my/job-postings/:id/interview-prefill` 호출.
    - 응답 shape:
      ```ts
      {
        targetUrl: string;
        jobData: { role, company, techStack[], responsibilities[], requirements[], preferred[], companyDescription, teamCulture[] };
        resumeData: { fileName, parsedContent } | null;
        resumePrefillSource: "job_posting_attachment" | "active_resume" | null;
        suggestedCoverLetter: { title, body } | null;
      }
      ```
  - prefill 완료 후 `currentStep`을 `resume-check` 또는 `final-check`로 advance (사용자가 검토 후 진행).

## 5. 데이터 모델 (Supabase / Postgres)

신규 테이블 3개 + RLS 정책.

### 5.1 `user_job_postings`

| 컬럼 | 타입 | 제약 | 비고 |
|---|---|---|---|
| `id` | uuid | PK, default gen_random_uuid() | |
| `user_id` | uuid | FK → auth.users(id), NOT NULL | RLS 키 |
| `company_name` | text | NOT NULL | |
| `role_title` | text | NOT NULL | 직무 |
| `posting_url` | text | NULL | 외부 공고 URL |
| `tech_stack` | text[] | default '{}' | |
| `responsibilities` | text[] | default '{}' | |
| `requirements` | text[] | default '{}' | |
| `preferred` | text[] | default '{}' | |
| `company_description` | text | NULL | |
| `team_culture` | text[] | default '{}' | |
| `memo` | text | NULL | 자유 메모 |
| `status` | text | NOT NULL, check (in (active, applied, interviewing, closed, archived)) | default 'active' |
| `created_at` | timestamptz | default now() | |
| `updated_at` | timestamptz | default now() | trigger로 갱신 |

- Indexes: `(user_id, status, created_at desc)`.

### 5.2 `user_job_posting_schedules`

| 컬럼 | 타입 | 제약 | 비고 |
|---|---|---|---|
| `id` | uuid | PK | |
| `job_posting_id` | uuid | FK → user_job_postings(id) on delete cascade, NOT NULL | |
| `user_id` | uuid | FK → auth.users(id), NOT NULL | RLS 단축용 (denormalized) |
| `kind` | text | NOT NULL, check (in (deadline, document_due, interview, other)) | |
| `title` | text | NULL | 사용자 정의 표시명 |
| `start_at` | timestamptz | NOT NULL | |
| `end_at` | timestamptz | NULL | |
| `memo` | text | NULL | |
| `created_at` | timestamptz | default now() | |

- Indexes: `(user_id, start_at)`, `(job_posting_id, start_at)`.

### 5.3 `user_job_posting_attachments`

| 컬럼 | 타입 | 제약 | 비고 |
|---|---|---|---|
| `id` | uuid | PK | |
| `job_posting_id` | uuid | FK → user_job_postings(id) on delete cascade | |
| `user_id` | uuid | FK → auth.users(id), NOT NULL | RLS 단축용 |
| `attachment_type` | text | NOT NULL, check (in (resume, cover_letter, portfolio)) | |
| `resume_id` | uuid | NULL | type=resume / cover_letter일 때 user_resumes.id |
| `cover_letter_index` | integer | NULL | type=cover_letter일 때 resume_payload.coverLetters[] index |
| `cover_letter_label` | text | NULL | UX 편의 (제목 캐싱) |
| `portfolio_id` | uuid | NULL | type=portfolio일 때 user_portfolios.id |
| `created_at` | timestamptz | default now() | |

- Unique 제약: type=resume → (job_posting_id, attachment_type='resume', resume_id) 1개만, type=cover_letter → (job_posting_id, resume_id, cover_letter_index) 유니크, type=portfolio → (job_posting_id, portfolio_id) 유니크.

### 5.4 RLS 정책

- 모든 테이블에 RLS enable.
- `SELECT/INSERT/UPDATE/DELETE` 모두 `auth.uid() = user_id` 조건.

### 5.5 Prisma 모델 동기화

- Supabase 마이그레이션 적용 후 `prisma db pull` 또는 수동으로 `schema.prisma`에 동기 모델 추가. 명세에서는 Prisma 모델 코드를 함께 작성.

## 6. API 설계 (Next.js Route Handlers)

모든 경로는 인증 필수. 응답 포맷은 기존 패턴 따름: `{ success: true, data: ... }` / `{ success: false, error: ... }`.

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/my/job-postings` | 본인 공고 목록 (쿼리: `status`, `from`, `to`) |
| POST | `/api/my/job-postings` | 공고 + 일정/연결자료 묶음 생성 |
| GET | `/api/my/job-postings/[id]` | 공고 상세 (schedules + attachments 포함) |
| PATCH | `/api/my/job-postings/[id]` | 공고 본문 수정 |
| DELETE | `/api/my/job-postings/[id]` | 공고 삭제 (cascade) |
| POST | `/api/my/job-postings/[id]/schedules` | 일정 추가 |
| PATCH | `/api/my/job-postings/[id]/schedules/[scheduleId]` | 일정 수정 |
| DELETE | `/api/my/job-postings/[id]/schedules/[scheduleId]` | 일정 삭제 |
| POST | `/api/my/job-postings/[id]/attachments` | 자료 연결 |
| DELETE | `/api/my/job-postings/[id]/attachments/[attachmentId]` | 연결 해제 |
| GET | `/api/my/job-postings/calendar?from=...&to=...` | 캘린더 이벤트 페치 (FullCalendar용) |
| GET | `/api/my/job-postings/[id]/interview-prefill` | 면접 진입용 prefill payload |

- 인증: `createRouteHandlerClient({ cookies })` → `getSession()` → 미인증 401.
- 입력 검증: `zod` (이미 사용 중인지 확인 후 부재 시 직접 검증).

## 7. UI 컴포넌트 구성

### 7.1 페이지

- `web/app/my/job-postings/page.tsx` (서버 컴포넌트, 인증 가드)
- `web/app/my/job-postings/job-postings-client.tsx` (클라이언트 진입)
- `web/app/my/job-postings/[id]/page.tsx` (상세)
- `web/app/my/job-postings/[id]/detail-client.tsx`

### 7.2 컴포넌트 (`web/components/features/job-postings/`)

- `job-posting-calendar.tsx` — FullCalendar 래퍼, ko locale, 이벤트 색상.
- `job-posting-card.tsx` — 카드 박스 (회사명, 직무, D-day, 액션).
- `job-posting-list.tsx` — 카드 그리드.
- `job-posting-form-dialog.tsx` — 생성/편집 폼.
- `job-posting-schedule-list.tsx` — 일정 추가/관리 mini.
- `job-posting-attachment-picker.tsx` — 이력서/자소서/포트폴리오 선택 드롭다운.
- `start-interview-button.tsx` — 면접 진입 CTA + 사전 검증.

### 7.3 Zustand / 데이터 fetching

- React Query (`@tanstack/react-query`)가 이미 깔려있는지 확인. 부재 시 SWR 또는 fetch + useState.
- 최소 의존성으로 fetch 래퍼 직접 구현 (기존 `/api/my/*` 패턴 따름).

## 8. 모의면접 통합 디테일

`interview-setup-flow.tsx`의 useEffect에 분기 추가:

```ts
const importType = searchParams.get("import");
const postingId = searchParams.get("postingId");

if (importType === "job_posting" && postingId) {
  // 1. GET /api/my/job-postings/{postingId}/interview-prefill
  // 2. setJobData(payload.jobData)
  // 3. setTargetUrl(payload.targetUrl)
  // 4. payload.resumeData → setResumeData + setResumePrefillSource
  // 5. (Optional) attach cover letter content to a future field
  // 6. setCurrentStep("jd-check") 부터 사용자 검토 진행
}
```

- 기존 `import=active_resume` 케이스와 충돌 없게 분기.

## 9. 에러 / 엣지 케이스

- URL 검증 실패: 등록은 허용하되 UI 경고 (URL 없이도 등록 가능).
- 마감일 과거: 등록 시 확인 다이얼로그.
- 이력서 미작성 상태에서 면접 시작: prefill 시 `resumeData=null` 응답, 면접 setup에서 "이력서 작성" 유도 메시지 표시.
- 자료 연결한 이력서/포트폴리오 삭제 시: 첨부는 그대로 두되 조회시 `null`로 노출 (lazy hard delete 또는 soft handling) — Phase 1: 조회 시 join 후 누락 시 무시.

## 10. 테스트 전략 (TDD)

- **마이그레이션 검증**: Supabase MCP `list_tables` + `execute_sql`로 스키마 확인.
- **API**: 각 라우트 핸들러에 대해 통합 테스트 (vitest 또는 jest, 기존 인프라 사용).
- **UI**: 핵심 인터랙션 (등록 → 캘린더 표시 → 면접 시작)을 Playwright (있을 시) 또는 수동 체크리스트.
- 최소 골든 패스 시나리오:
  1. 공고 등록 + 마감일 추가 → 캘린더에 표시.
  2. 이력서 연결 후 "이 공고로 면접 시작" → setup flow가 prefilled 상태로 진입.
  3. 공고 삭제 → 일정·자료도 cascade 삭제.

## 11. 디자인 가이드

- **컬러**: 기존 Dibut 팔레트 사용 (primary, secondary, accent). 일정 종류별 색상:
  - 마감: `red-500`
  - 면접: `orange-500`
  - 서류: `blue-500`
  - 기타: `slate-500`
- **타이포**: 기본 폰트 유지. 카드 제목 `text-base font-semibold`.
- **간격**: shadcn 기본 spacing scale.
- **반응형**: 모바일에서는 캘린더 위, 리스트 아래로 stacked.

## 12. Phase 분할

- **Phase 1 (이번 작업)**: DB 마이그레이션, API, UI(목록/캘린더/등록/상세), 모의면접 진입 통합. 1주 분량.
- **Phase 2 (추후)**: 한국 공휴일 표시, 음력, 알림, parse-job 자동 import.

## 13. 멀티에이전트 실행 계획

병렬화 가능 단위:

| Agent | 작업 |
|---|---|
| Agent A | Supabase 마이그레이션 + Prisma schema 동기 |
| Agent B | BFF API 라우트 (`/api/my/job-postings/**`) |
| Agent C | UI 페이지 + 컴포넌트 (`/my/job-postings/**`) |
| Agent D | 모의면접 prefill 통합 (`interview-setup-flow.tsx` 확장) |

Agent A 완료 → B/C/D 병렬 진행. 마지막에 통합 테스트.

---

## Spec Self-Review 체크

- [x] Placeholder/TBD 없음.
- [x] 모든 섹션이 일관됨 (테이블 ↔ API ↔ UI).
- [x] Scope: Phase 1 단일 implementation plan으로 충분.
- [x] Ambiguity: prefill 분기 명확화, attachment 삭제 처리 명시.
