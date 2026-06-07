# Dibut 전수조사 — 성능 · 캐싱 · 최적화 · 포워딩(BFF) 감사 보고서

> **작성일**: 2026-06-02
> **범위**: `web/` (Next.js 14.2.14 App Router) + `ai-interview/` (FastAPI) 전체
> **방법**: 7개 차원 병렬 심층 감사(각 opus, 증거 기반 file:line) → 48개 findings 수집 → 핵심 10건 직접 교차검증
> **기준**: Vercel React/Next.js 성능 규칙 45종 + FastAPI async 모범사례

---

## 0. 한눈에 보기 (Executive Summary)

코드베이스는 **두 얼굴**을 가지고 있다. WebSocket/음성 런타임(`session_engine.py`, `service_adapter.py`)과 CTP 플레이그라운드/워크스페이스 탭은 **모범적으로 잘 설계**되어 있다(`asyncio.to_thread` 오프로딩, `next/dynamic` + `ssr:false` 코드 스플리팅). 반면 **REST 레이어, 루트 레이아웃, 공개 페이지, 정적 자산**은 같은 패턴을 적용하지 않아 비용이 집중된다.

48개 findings는 **4개의 근본 원인 테마**로 수렴한다. 특히 A·F 에이전트가 **독립적으로 같은 "이벤트 루프 블로킹"을 지목**했고, 직접 검증에서도 확인되어 신뢰도가 매우 높다.

| 심각도 | 건수 | 대표 항목 |
|--------|------|-----------|
| 🔴 Critical | 6 (중복 제거 시 4) | FastAPI 이벤트루프 블로킹, LiveKit 전역 번들, 영상룸 1초 리렌더, Zustand 전체구독, 이미지 최적화 OFF |
| 🟠 High | 18 | 프록시 타임아웃 부재, 공개페이지 force-dynamic, 미사용 deps, 폰트 CDN 블로킹, DB 풀 부재 |
| 🟡 Medium | 16 | 요청 워터폴, per-request 클라이언트, 캐시 헤더 공백, dead config |
| ⚪ Low | 8 | edge 런타임 기회, 중복 init, raw `<img>` |

### 4대 근본 원인 테마

1. **🔴 FastAPI REST 레이어가 자기 이벤트 루프를 막는다** — 동기 Gemini SDK + 동기 psycopg + 동기 httpx가 `async def` 위에서 `to_thread` 없이 실행. **전체 백엔드 동시성을 직렬화**. (WS 런타임은 올바른데 REST만 안 됨)
2. **🟠 무거운 라이브러리·자산이 핫/익명 경로에서 즉시 로드** — LiveKit이 모든 라우트에, FullCalendar가 워크스페이스에, Recharts가 공개 포트폴리오에, 13.8MB GLB·109MB 이미지(최적화 OFF), 폰트는 렌더 블로킹 CDN, ~33MB 고아 자산, ~90MB 미사용 deps.
3. **🟡 서버 캐싱 사실상 전무 + 반사적 force-dynamic + 커넥션 처닝** — `unstable_cache`=0, 작동하는 `React.cache`=0(1개는 버그), force-dynamic 54개(다수 불필요), 공개 페이지가 방문마다 Postgres 재조회.
4. **🟡 거대 단일 클라이언트 컴포넌트의 리렌더 핫스팟** — 영상룸 1초 타이머, Zustand 전체구독(500카드), 포트폴리오 에디터 드래그, docs-view 2초/5초 폴링.

> ⚠️ **검증 정정 (신뢰성 고지)**: B·G 차원의 "Prisma 싱글톤이 프로덕션에서 비활성화되어 요청마다 새 클라이언트 생성" 주장은 **과장**이다. `lib/prisma.ts:17`의 `NODE_ENV !== "production"` 가드는 **Prisma 공식 권장 패턴**이며, 프로덕션에서는 Node 모듈 캐싱으로 람다당 1회만 인스턴스화된다. 실제 잔존 리스크는 *서버리스 `connection_limit` 미설정 + `@prisma/adapter-pg` 미연결*뿐 → **High에서 Medium으로 강등**했다.
>
> 📏 **추정치 고지**: 번들 KB 수치는 정적 import 체인 추적 기반 **예측**이다(`npm run analyze` 미실행). 수정 후 analyzer로 확정 권장.

---

## 1. 우선순위 매트릭스 (의사결정 도구)

### 🚀 즉시 착수 — Quick Wins (높은 효과 × 낮은 노력, 대부분 1일 내)

| # | 조치 | 효과 | 노력 | 위치 |
|---|------|------|------|------|
| 1 | **FastAPI `parse_job`/`parse_resume`/`analyze_public_repo`를 `async def`→`def` (또는 `await asyncio.to_thread`)** | 🔴 백엔드 동시성 직렬화 해소 — 최대 런타임 이득 | S~M | `ai-interview/app/api/interview.py:64,96,347` |
| 2 | **미사용 deps 제거** (puppeteer/firebase-admin/tldraw/pixi.js/pixi-live2d/@mediapipe/dagre) | 🟠 설치 시 Chromium ~170MB 다운로드 제거, node_modules ~90MB↓ | S | `web/package.json` |
| 3 | **고아 자산 ~33MB 삭제** (GLB 3개 21.7MB + ai_interview.png 7.5MB + ogImage.png 1.4MB + raw/originals/flows) | 🟠 배포 슬러그·git clone 경량화 | S | `web/public/**` |
| 4 | **프록시 라우트에 AbortController 타임아웃 추가** | 🟠 백엔드 행 → 함수 무한 점유 방지 | S | `web/app/api/interview/**/route.ts` (7개) |
| 5 | **`community/sidebar`에 `unstable_cache(revalidate:300)`** | 🟠 300행 스캔을 매 마운트→윈도우당 1회 | S | `web/app/api/community/sidebar/route.ts` |
| 6 | **반사적 force-dynamic 제거** (matrix, squad/write 등) | 🟡 CDN 캐싱 활성화 | S | `web/app/my/job-postings/matrix/page.tsx` 외 |
| 7 | **FullCalendar `next/dynamic({ssr:false})`** | 🟠 워크스페이스 첫 페인트에서 ~250KB 제거 | S | `web/components/features/workspace/detail/dashboard-overview.tsx` |
| 8 | **깨진 `React.cache()` 모듈 스코프로 hoist** | 🟡 요청 내 중복 파싱 실제 제거 | S | `web/lib/server/squads.ts:78,134` |
| 9 | **dead `vercel.json` 함수 + 깨진 npm 스크립트 6개 정리** | 🟡 유지보수 함정·CI 실패 제거 | S | `web/vercel.json`, `web/package.json` |
| 10 | **중복 락파일 1개 삭제** (`pnpm-lock.yaml`, vercel은 npm) | 🟡 배포-로컬 버전 드리프트 방지 | S | `web/pnpm-lock.yaml` |

### 🟠 다음 스프린트 — 큰 효과, 중간 노력

| 조치 | 효과 | 노력 | 위치 |
|------|------|------|------|
| **LiveKit를 루트 레이아웃에서 분리**(call active 시에만 `next/dynamic` 마운트) | 🔴 모든 라우트 공유 청크에서 ~150-250KB WebRTC 제거 | M | `web/components/features/workspace/voice/voice-manager.tsx` |
| **`images.unoptimized` 제거 또는 빌드시 WebP 사전압축** | 🔴 64px 썸네일에 1MB PNG 전송 → ~90-98%↓ | M | `web/next.config.mjs:16-18` |
| **Zustand 16개 호출부를 셀렉터로 + TaskCard `React.memo`** | 🔴 카드 클릭 시 500카드 전체 리렌더 제거 | M | `web/components/features/workspace/**` |
| **영상룸 타이머를 leaf 컴포넌트로 격리 + 아바타/카메라 `memo`** | 🔴 초당 1409줄+WebGL 재조정 → `<span>` 1개 | M | `web/app/interview/room/video/page.tsx:846` |
| **FastAPI 커넥션 풀 도입**(`psycopg_pool`) + REST 핸들러 `to_thread` | 🟠 매 쿼리 TCP+TLS 핸드셰이크 제거 | M | `ai-interview/app/db/database.py` |
| **공개 포트폴리오/쇼케이스를 ISR로**(`revalidate`) | 🟠 공유 링크가 방문마다 Postgres 2회 → CDN | M | `web/app/p/[handle]/[slug]/page.tsx` 외 |
| **폰트를 `next/font`로 자가호스팅** | 🟠 렌더 블로킹 third-party 제거 | M | `web/app/layout.tsx:57-66` |
| **13.8MB GLB 압축**(Draco/meshopt) + 사무실 배경 PNG 최적화 | 🟠 핫 경로 ~11s 다운로드↓ | M | `web/public/interview/avatar/*.glb` |

### 🔵 백로그 — 큰 노력, 또는 낮은 빈도

- 포트폴리오 에디터 드래그 리렌더 경계 재설계(`CanvasElementView` memo) — **L**
- 면접 결과 리포트를 Server Component + Suspense 스트리밍으로 — **L**
- BFF 프록시 보일러플레이트를 단일 `proxyToInterviewBackend()` 헬퍼로 통합 — **M**
- `tsc --noEmit` + `next lint`를 별도 CI 게이트로 분리 — **M**

---

## 2. 차원별 상세 findings

각 항목: **[심각도]** 제목 · 근거(file:line) · 문제 · 권고 · 노력 · 신뢰도. ✅ = 직접 검증 완료.

### A. BFF 포워딩 / 프록시 레이어 (`web/app/api/**` → FastAPI)

> **요약**: 프록시는 얇은 복붙 핸들러 집합. **좋은 소식**: LLM 핫 패스는 버퍼링되지 않음 — interview/portfolio chat 프록시는 410-disabled, 라이브 LLM 스트리밍은 WebSocket 직결, 직접-Gemini 라우트(site-helper, cover-letters/generate 등)는 `toTextStreamResponse()`로 올바르게 스트리밍. 따라서 최악 등급인 "버퍼링된 LLM 프록시"는 **존재하지 않음**.

**A1. 🔴✅ FastAPI 업스트림이 동기 Gemini/httpx 호출로 자기 이벤트 루프를 막아 BFF-프록시 AI 요청을 직렬화**
→ **F1과 동일 근본 원인 (교차 확인됨).** 상세는 F1 참조.
- 근거: `ai-interview/app/api/interview.py:64` (`async def parse_job` → :71 동기 `fetch_url_text`, :72 동기 `parse_job_from_text`), `:96` parse_resume, `:347` analyze_public_repo / `app/services/llm_gemini.py:191` 동기 `GenerativeModel`, `:202` 동기 `httpx.Client`, `:238` 동기 `generate_content`(retry 루프 내 최대 3회).
- BFF가 타임아웃 없이 await → 2개 동시 요청이면 지연 2배 누적.
- 권고: 핸들러를 `def`로 바꾸거나 각 블로킹 호출을 `await asyncio.to_thread(...)`로. (WS 런타임 `ws_runtime.py:693`이 이미 이 패턴 사용) · **S** · high

**A2. 🟠✅ 대부분의 프록시가 업스트림 타임아웃/AbortController 미설정 — 백엔드 행 시 함수가 플랫폼 한계까지 점유**
- 근거: `parse-resume/route.ts:33,43`, `parse-job/route.ts:24`, `sessions/[id]/complete/route.ts:16`(느린 리포트 생성 트리거), `retry-report/route.ts:16`, `portfolio/analyze-public-repo/route.ts:14` 모두 signal 없음. 대조: `session/start/route.ts:15-16` 등 3곳만 AbortController.
- 권고: `session/start`의 AbortController+setTimeout 패턴을 모든 프록시에 적용. 리포트 라우트는 30-60s, parse-* 는 8-15s. · **S** · high

**A3. 🟡 BFF→FastAPI / Supabase 호출에 keep-alive 커넥션 풀 전무**
- 근거: `keepAlive|new Agent|undici|setGlobalDispatcher` grep 0건. 모든 프록시가 bare `fetch()`. → 매 요청 TCP(+TLS) 핸드셰이크.
- 권고: FastAPI base URL용 공유 undici `Agent({keepAlive})` 구성. · **M** · medium

**A4. 🟡 Supabase 클라이언트 + `getSession()`을 ~90개 라우트에서 요청마다 재구성, dedup 없음**
- 근거: `createRouteHandlerClient` 90파일, `auth.getSession()` 89파일. `parse-job`/`parse-resume`는 각자 로컬 `getUserIdFromSession()` 중복 정의.
- 권고: `React.cache()`로 요청당 1회 빌드하는 헬퍼로 통합(interview는 이미 `getInterviewRouteUserId`로 중앙화 — 전 프로젝트로 확장). · **M** · medium

**A5. ⚪ ~10배 복붙된 프록시 보일러플레이트** (`AI_BASE_URL` 상수 10파일 중복, 동일 error-map/abort 텍스트)
- 권고: `proxyToInterviewBackend(path, {method, body, userId, timeoutMs})` 단일 헬퍼로 — A2/A3 수정을 한 줄로 만들어줌. · **M** · high

### B. 서버 사이드 캐싱 & 데이터 페칭

> **요약**: 교차 요청 서버 캐싱 사실상 전무(`unstable_cache`=0, 유일한 `React.cache`는 버그로 dead, `revalidate`/`force-static` 각 1). 일부 핫 경로(`my/[handle]`, `api/workspaces`)는 `Promise.all`+raw SQL로 훌륭히 배치된 반면, 공개 페이지는 불필요한 직렬 워터폴. **진짜 N+1 루프는 없음**(의심 루프는 배치 `IN` 위 in-memory 그룹핑).

**B1. 🟠✅ 공개 발행 포트폴리오가 force-dynamic — 방문마다 Postgres 재조회 (ISR 대신)**
- 근거: `app/p/[handle]/[slug]/page.tsx:6` force-dynamic + `:17-26` 2회 직렬 prisma read(`is_public:true`). `app/my/[handle]/portfolio/[slug]/page.tsx:10` 동일.
- 문제: 공유 링크가 N명에게 N번 DB 히트 — 소유자 재발행 시에만 바뀌는 콘텐츠에 순수 낭비. 게다가 직렬 await 2회로 첫 페인트 지연.
- 권고: force-dynamic 제거 → `export const revalidate = 300` + 발행 라우트에서 `revalidatePath`. profile+portfolio read를 `cache()`로 dedup. · **M** · high

**B2. 🟠✅ `api/community/sidebar`가 매 렌더 최대 300행 스캔, 완전 공개·비개인화인데 무캐시**
- 근거: `route.ts:4` force-dynamic, `:99-110` posts.findMany take:300(최근7일), `:130-138` fallback 2차 300행 스캔.
- 권고: `unstable_cache([...], {revalidate:300, tags:['community-sidebar']})`. 전역 동일 결과를 윈도우당 1회 계산해 공유. · **S** · high

**B3. 🟡 반사적 force-dynamic** (auth/cookies/per-user 데이터 없는 페이지)
- 근거: `app/my/job-postings/matrix/page.tsx:3`(클라이언트 셸만 렌더), `app/community/squad/write/page.tsx:3`(정적 폼), `app/insights/activities/[id]/page.tsx:11`(JSON 파일+공개 스쿼드).
- 권고: matrix/squad-write는 force-dynamic 제거(정적화), activities/[id]는 `revalidate=300`. 나머지 ~40개 page-level force-dynamic을 같은 기준으로 감사. · **S** · high

**B4. 🟡✅ (정정됨) Prisma 서버리스 커넥션 압박 — 단, "프로덕션 비활성화" 주장은 과장**
- ✅ 검증 결과: `lib/prisma.ts:13,17`의 `NODE_ENV !== "production"` 가드는 **Prisma 공식 패턴**. 프로덕션에서 Node 모듈 캐싱으로 람다당 1회 인스턴스화 — **요청당 누수 없음**.
- **진짜 잔존 이슈**: `new PrismaClient()`에 `connection_limit` 미설정 + 스키마의 `driverAdapters` preview & `@prisma/adapter-pg` 의존성이 **연결되지 않음**. 다수 동시 람다 × 기본 풀 크기 → Supabase 커넥션 한계 압박 가능.
- 권고: 풀드 `DATABASE_URL`에 `?connection_limit=1&pgbouncer=true` 설정 또는 adapter-pg 실제 연결. `directUrl`은 마이그레이션 전용 확인. · **M** · medium (High에서 강등)

**B5. 🟡 `createAdminSupabaseClient()`를 asset 라우트마다 새로 생성 (싱글톤 없음)**
- 근거: `lib/supabase/admin.ts:5-19` 무메모이제이션, ~12 호출부(한 파일은 2회: `.../[assetId]/route.ts:49,86`).
- 권고: 모듈 스코프 lazy getter(`let _admin; ... _admin ??= createClient(...)`)로 재사용. · **S** · high

**B6. 🟡✅ 요청 워터폴 — 독립 await가 병렬 대신 직렬**
- 근거: `app/insights/activities/page.tsx:42-51`(4 직렬 await), `app/community/squad/[id]/page.tsx:130-228`(~7 직렬), `app/career/resumes/page.tsx`(attachmentRows·coverLetters 독립인데 직렬).
- 권고: 독립 read를 `Promise.all`로(`my/[handle]/page.tsx`가 올바른 모범). · **M** · high

**B7. 🟡✅ 유일한 `React.cache()` 사용이 버그 — 함수 내부 생성으로 dedup 안 됨 (실효 서버 캐싱 0)**
- 근거: `lib/server/squads.ts:78` `cache(async()=>...)`를 `fetchSquads` **내부**에 선언, `:134` 동일 반복. 매 호출마다 새 wrapper → 메모 즉시 폐기.
- 권고: wrapper를 모듈 스코프로 hoist. 더 큰 효과: `export const getSessionUser = cache(...)`로 171회 auth read를 요청당 dedup. · **S** · high

**B8. ⚪ Over-fetching** — `include:{profiles:true}`가 leader/member 전체 행을 클라이언트로 전송 (`lib/server/community.ts:149-184`). 인접 코드는 scoped `select` 사용 → 불일치. `select`로 교체. · **S**

**B9. ⚪ 파일 캐싱 불일치 + dead code** — `dev-events.ts`는 60s TTL 캐시, `recruit.ts:37-38`는 매 호출 34KB 재파싱(무캐시) **그리고 importer 0 → dead code**. 삭제 또는 TTL 패턴 이식. · **S**

### C. 번들 크기 & 코드 스플리팅

> **요약**: CTP 플레이그라운드·워크스페이스 탭은 잘 분할됨(monaco/excalidraw/jspdf 등 `ssr:false` lazy). 문제는 **루트 레이아웃**. `optimizePackageImports`는 커버 범위 내에서 올바름.

**C1. 🔴✅ LiveKit 클라이언트 SDK가 VoiceManager(루트 레이아웃)를 통해 모든 라우트 공유 청크에 번들**
- 근거: `app/layout.tsx:12` VoiceManager import + `:124` 전역 래핑. `voice-manager.tsx:1` "use client", `:13-21` `@livekit/components-react`+`@livekit/components-styles`+`livekit-client` 정적 import. (disk: livekit-client 8.2M, components-react 4.3M)
- 문제: 랜딩/로그인/블로그 등 통화 안 하는 익명 트래픽의 첫 페인트에 ~150-250KB(gzip) WebRTC 런타임. **앱 최대 단일 번들 회귀**, TTI/LCP 직접 악화.
- 권고: 가벼운 `useVoice` 컨텍스트는 유지, 무거운 LiveKit 렌더링 표면을 `next/dynamic({ssr:false})` 자식으로 분리해 통화 active 시에만 마운트. (`app/workspace/[id]/page.tsx:18-117`이 템플릿) · **M** · high

**C2. 🟠✅ ~10개 무거운 패키지가 dependencies에 있으나 소스 import 0 (설치/서버리스 dead 블로트)**
- 근거(grep로 package.json만 매칭): puppeteer(puppeteer-core 12M), firebase-admin(2.3M), pdf-parse(21M), cheerio(1.8M), xml2js(3.3M), tldraw(18M), pixi.js(12M), pixi-live2d-display(2.2M), @mediapipe/tasks-vision(20M), dagre(타입 shim만). ✅ puppeteer/firebase-admin import 0 직접 확인.
- 문제: puppeteer는 clean install 시 Chromium ~170MB 다운로드, 나머지는 ~90MB node_modules 순수 무게 + 누군가 import하는 순간 폭발할 지뢰.
- 권고: 진짜 미사용분 제거 후 `npx depcheck` 교차확인. 서버 전용 도구는 최소 devDependencies로 이동. · **S** · high

**C3. 🟠✅ FullCalendar가 정적 `DashboardOverview → DashboardCalendar` 체인으로 워크스페이스 라우트에 즉시 로드**
- 근거: `app/workspace/[id]/page.tsx:12,406` DashboardOverview 정적 import(형제 탭은 :18-117에서 dynamic인데 이것만 정적). `dashboard-overview.tsx:8` → `overview/dashboard-calendar.tsx:3-5` FullCalendar. (disk 3.8M)
- 문제: ScheduleView는 lazy인데 기본 표시 DashboardOverview가 FullCalendar(~200-300KB)를 첫 페인트로 끌어와 의도적 lazy를 무력화.
- 권고: `dashboard-overview.tsx`에서 DashboardCalendar를 `next/dynamic({ssr:false})`로. · **S** · high

**C4. 🟠✅ Recharts가 공개 force-dynamic 포트폴리오 페이지에 정적 PortfolioRenderer로 탑재**
- 근거: `app/my/[handle]/portfolio/[slug]/page.tsx:7,52` PortfolioRenderer 정적. `portfolio-renderer.tsx:13-27` recharts 12개 named import. (disk 5.2M)
- 문제: 익명 방문자용 공유 링크 라우트에 ~90-110KB recharts가 차트 없는 포트폴리오에도 지배적 청크.
- 권고: 차트 부분을 `next/dynamic({ssr:false})`로 — chart/radar 블록 존재 시에만 다운로드. 저작 라우트 `portfolio-editor-client.tsx:51-54`도 동일. · **M** · high

**C5. 🟡✅ Dead Recharts shadcn wrapper** `components/ui/chart.tsx:4` `import * as RechartsPrimitive from "recharts"`(네임스페이스=전체 배럴) consumer 0 → 삭제. · **S**

**C6. 🟡 react-markdown+remark-gfm+micromark 스택이 SiteHelperChat(루트 레이아웃)로 전역 로드**
- 근거: `app/layout.tsx:13,135` 전역 렌더. `site-helper-chat.tsx:5` react-markdown 정적, 기본 `open=false`(:78)인데도 첫 페인트 번들에 ~50-70KB.
- 권고: 마크다운 본문을 `open` 시 마운트되는 `next/dynamic({ssr:false})` 자식으로 분리. · **S** · medium

**C7. ⚪ bundle-analyzer 실행 + 검증** — 설정은 됐으나(`package.json:9`) CI 실행 증거 없음. 예측 지배 청크: ①LiveKit(공유) ②FullCalendar(/workspace) ③Recharts(/portfolio) ④CTP monaco/reactflow(정상 분할됨). `npm run analyze`로 확정. · **S**

### D. 렌더링 전략 & React 리렌더 성능

> **요약**: 클라이언트 중심(413 'use client', `reactStrictMode=false`). 비용은 **정적 마크업과 인터랙티브 섬을 분리하지 않고, 자식을 메모하지 않으며, 고빈도 상태로 전체 트리를 갱신하는** 소수 거대 컴포넌트에 집중.

**D1. 🔴✅ 영상룸: 1초 타이머가 1409줄 트리 전체(+WebGL 아바타+카메라)를 매초 리렌더**
- 근거: `app/interview/room/video/page.tsx:846-863` `setInterval 1000ms → setRuntimeMeta`(elapsedSec 등). `:1205` `<TalkingHeadInterviewer>`, `:1223` `<LocalCameraPreview>` 동일 트리 인라인. 둘 다 `React.memo` 아님(`talking-head-interviewer.tsx:31`, `local-camera-preview.tsx:12`).
- 문제: 제품 핫 패스. 20분 면접 = ~1200회 강제 전체 트리 재조정 + 아바타 자체 rAF 루프와 프레임 예산 경쟁 — UI가 매끄러워야 할 바로 그 순간.
- 권고: 타이머를 `<InterviewTimer>` leaf로 격리(mm:ss 배지만 렌더), 아바타/카메라 `React.memo`. 초당 작업을 "1409줄+아바타 재조정"→"`<span>` 1개"로. · **M** · high

**D2. 🔴✅ 워크스페이스 16개 컴포넌트가 Zustand 전체 스토어 구독(셀렉터 없음); TaskCard가 변경마다 ×N 리렌더**
- 근거: `mock-data.ts:368` 스토어(8개 데이터 배열+activeTaskId 등). `task/card.tsx:56` `useWorkspaceStore()` 셀렉터 없음, TaskCard memo 아님. `kanban-board.tsx:955` 보드 최대 500 태스크. grep: 셀렉터 없는 호출 16 vs 있는 호출 1.
- 문제: 카드 클릭 한 번(`setActiveTaskId`)이나 30초 SWR refresh가 500개 무메모 카드 + 15개 전체구독자를 전부 리렌더. 보드 전체 리페인트.
- 권고: 16개 호출부를 슬라이스 셀렉터로(`useWorkspaceStore(s=>s.tags)`), TaskCard `React.memo`, 다중 필드는 `useShallow`. · **M** · high

**D3. 🟠✅ 포트폴리오 에디터가 드래그 중 매 pointer-move 프레임에 캔버스 materialization 재실행 + recharts 차트 remount**
- 근거: `portfolio-editor-client.tsx:175` 단일 document 객체 상태, `:422,1075` 매 move `setDocument`. `portfolio-renderer.tsx:1782` `useMemo([section, document])`가 document 정체성 변경으로 매 프레임 bust, `:1110/1247/1351` ResponsiveContainer 차트들 무메모.
- 문제: 차트 많은 슬라이드에서 요소 드래그 시 ~60fps마다 전체 슬라이드+recharts SVG 재측정 → 끊김.
- 권고: `CanvasElementView`를 memo 경계로(element+selected 비교), useMemo 의존성을 document→섹션 캔버스 데이터로, 콜백 `useCallback`. 드래그 중 차트는 placeholder. · **L** · high

**D4. 🟠✅ 면접 결과 리포트(1329줄)가 client→BFF→FastAPI 워터폴 + 5초 폴링으로 전부 클라이언트 렌더**
- 근거: `app/interview/result/page.tsx:1` 'use client', `:947-994` mount 후 effect fetch, `:996-1018` `setInterval 5000ms` 전체 세션 재페치, `:1020/1052` 리포트 모델 클라이언트 빌드.
- 문제: 읽기 위주 정적 콘텐츠인데 하이드레이션 후에야 BFF→FastAPI 왕복 → 첫 의미 페인트 지연. 리포트 확정 후에도 5초 폴링 지속.
- 권고: 리포트 셸을 Server Component로 서버 페치 + Suspense 스트리밍, 인터랙티브 탭만 작은 client island. 5초 폴링은 `shouldWaitForOfficialInterviewReport` false 시 중단. · **L** · high

**D5. 🟠✅ docs-view가 active doc 2초 / 목록 5초 폴링, 3484줄 에디터 셸 리렌더**
- 근거: `docs-view.tsx:321-324` refreshInterval 5000, `:442` active doc 2000, `:303` 단일 컴포넌트 ~60 hooks.
- 문제: 사용자가 문서 타이핑 중 2초마다 같은 문서 백그라운드 재페치가 전체 셸 리렌더 → 에디터와 메인 스레드 경쟁. (협업은 이미 y-websocket으로 흐름)
- 권고: 폴링→이벤트 기반 revalidation(`revalidateOnFocus`/write 후 mutate). 사이드바 DocumentList와 에디터 페인 분리. 최소한 active-doc 인터벌 2초↑. · **M** · high

**D6. 🟡✅ 7개 핫 파일 전반 list/canvas 자식 무메모 + 가상화/content-visibility 전무**
- 근거: `portfolio-renderer.tsx:1883`, `kanban-board.tsx:1284`(매 렌더 새 `viewSettings={{...}}`/`:1268` 새 클로저), `result/page.tsx:542/653`, `KoreanResumePreview.tsx:1038→1054`(전 블록 이중 렌더). react-window/virtual/content-visibility grep 0.
- 권고: leaf 항목 `React.memo` + 안정 콜백/props, 긴 리스트에 `content-visibility:auto` 또는 가상화. · **M** · medium

**D7. 🟡✅ 무거운 WebGL 아바타 wrapper가 `next/dynamic` 대신 영상 페이지 client 번들에 정적 import**
- 근거: `video/page.tsx:9` `TalkingHeadInterviewer` 정적(내부 엔진은 `:56` `await import`로 lazy하나 wrapper는 초기 청크).
- 권고: wrapper를 `next/dynamic(()=>import(...), {ssr:false})`로 connected 게이트 뒤에. · **S** · medium

### E. 이미지 · 폰트 · 정적 자산 · CDN/헤더

> **요약**: 이 차원이 **가장 나쁘고 가장 싼 회복처**. `images.unoptimized:true` + 109MB public/(87개 PNG 풀해상도, GLB 4개). 폰트는 렌더 블로킹 CDN `<link>`(자가호스팅·preconnect 없음).

**E1. 🔴✅ `images.unoptimized=true`가 모든 PNG를 풀 소스 해상도로 전송 (resize/WebP/srcset 없음)**
- 근거: `next.config.mjs:16-18`. `app/interview/analysis/page.tsx:59-65`(sizes="64px"인데 풀 PNG)+`:710-725`(16개 타입 이미지 그리드). `public/images/interview/types/product-thinking.png=1,032,815B` 외 16개 ~640KB-1MB.
- 문제: `sizes`/`width`는 CSS 레이아웃에만 영향, 바이트엔 무영향. analysis 허브 한 페이지가 64-176px 썸네일에 ~13MB 아트워크 전송. WebP+resize 시 90-98%↓.
- 권고: `images.unoptimized` 제거(Vercel 최적화) 또는 비용 회피라면 빌드시 sharp로 표시 크기 WebP 사전압축(<50KB). · **M** · high

**E2. 🟠✅ ~33MB 커밋된 public 자산이 고아 (소스 참조 0)**
- 근거✅: `public/images/ai_interview.png=7.5MB`(참조 0), 미사용 GLB 3개 `avatarsdk.glb 11.7M`+`dibut-interviewer.glb 4.5M`+`talkinghead-brunette.glb 4.5M`(=20.7M, `talkinghead-avaturn.glb`만 `interviewer-avatar-config.ts:21`에서 참조), `ogImage.png=1.4MB`(openGraph에 images 미정의), `types/raw 20M`+`originals 3.7M`+`flows 5.6M` 소스아트 디렉터리.
- 권고: 미사용 GLB 3개·ai_interview.png·ogImage.png·raw/originals/flows 삭제(작업 아트는 비배포 위치로). grep 재확인 후 삭제. · **S** · high

**E3. 🟠✅ 13.8MB GLB 아바타가 `/interview/room/video` mount 시 즉시 다운로드 (lazy 게이트 없음)**
- 근거: `video/page.tsx:1205-1208` 무조건 mount, `talking-head-interviewer.tsx:56,84` mount effect서 즉시 `showAvatar`. `talkinghead-avaturn.glb=13,823,336B` + 배경 `interview-office-room.png=1,346,924B`(CSS background PNG).
- 문제: 코어 기능 핫 패스에서 ~13.8MB GLB+1.35MB PNG가 아바타 사용 전 다운로드. 10Mbps에서 ~11s. 긴 캐시 헤더도 없음.
- 권고: GLB를 Draco/meshopt+텍스처 다운스케일(13MB→2-4MB), 배경을 최적화 WebP, `/interview/avatar/*` immutable 헤더, mic/camera 체크 후 `showAvatar` 지연. · **M** · high

**E4. 🟠✅ 폰트가 `next/font` 대신 렌더 블로킹 third-party CDN `<link>` (FOUT + 임계경로 의존)**
- 근거: `layout.tsx:57-62` jsdelivr Pretendard, `:63-66` Google Noto Sans KR(4 weight). `next/font` grep 0, preconnect 없음. 전체 UI 폰트 스택이 두 외부 CDN 해석에 의존.
- 권고: `next/font/local`(Pretendard woff2)+`next/font/google`(Noto, 실사용 weight만), tailwind 변수 연결. 단기엔 최소 `preconnect`. · **M** · high

**E5. 🟡✅ 대용량 public 자산이 기본 짧은 캐시만 — headers()는 /libs·/workers만 immutable**
- 근거: `next.config.mjs:36-62`. 13.8MB GLB(`/interview/avatar/*`)·1.35MB 배경·`/data/*.json` 미커버. (✅ public 109MB 확인)
- 권고: 안정 바이너리 경로(`/interview/avatar/:path*`, `/images/:path*`, `/interview/backgrounds/:path*`)에 `max-age=31536000, immutable` 추가. · **S** · high

**E6. ⚪ raw `<img>` 4곳 중 2곳 intrinsic 치수 없음(CLS)** — `parser-test/page.tsx:81`(dev), `neon-editorial/index.tsx:473`(width/height 없음). neon-editorial에 치수/aspect-ratio 추가. · **S**

### F. FastAPI / AI 백엔드

> **요약**: 날카로운 2계층 분리. **WS/음성 런타임은 잘 설계**(모든 동기 psycopg를 `asyncio.to_thread`, Gemini는 native-audio async aio.live, 세션당 캐시). **REST/admin HTTP 레이어는 정반대** — 모든 `async def`가 동기 SDK/드라이버를 직접 호출.

**F1. 🔴✅ 동기 Gemini SDK 호출이 async REST 핸들러 내부에서 이벤트 루프를 막음**
- 근거: `llm_gemini.py:191` 동기 `GenerativeModel`, `:238,528,808,1062,1371,1451,1511,1608` 동기 `generate_content`. `api/interview.py:64-72` parse_job, `:345-348` analyze_public_repo, `api/resume.py:62-82` normalize_resume 모두 await/to_thread 없음.
- 문제: Uvicorn 단일 이벤트 루프 — parse-resume/analyze-repo 1건이 헬스체크·음성 WS 핸드셰이크 포함 **모든 동시 요청을 2-10s 동결**. 2-3명만 동시 사용해도 전체 백엔드 직렬화. async 클라이언트(`generate_content_async`)는 `gemini_live_voice_service.py:472`에 이미 있으나 이 경로엔 미적용.
- 권고: (a) 핸들러에서 `await asyncio.to_thread(gemini.<method>, ...)` 또는 (b) async 클라이언트로 전환. (a)가 최소 외과적. · **M** · high

**F2. 🟠✅ 동기 psycopg DB 접근이 async REST/admin 핸들러 내부에서 루프 차단**
- 근거: `db/database.py:16` 동기 `psycopg.connect`, `interview_service.py:168-202` 등 ~20개 동기 메서드. `api/interview.py:150,203,217,297` + `api/admin.py:52,58,63`가 직접 호출(WS는 `service_adapter.py:57,65,76,84`로 올바르게 오프로드하는데 REST만 안 함). `get_session_detail`은 3 직렬 쿼리, admin `list_sessions(200)`은 200세션 스캔+조인.
- 권고: REST/admin 핸들러의 모든 `service.*`를 `await asyncio.to_thread(...)`로(RuntimeServiceAdapter 패턴 재사용). · **M** · high

**F3. 🟠✅ DB 커넥션 풀 전무 — 쿼리마다 새 psycopg 연결 open/close**
- 근거: `db/database.py:11-20` 매 호출 `psycopg.connect`+`conn.close()`. pool/ConnectionPool grep 0. `psycopg_pool` 미의존. ~30 호출부.
- 문제: 매 쿼리 TCP+TLS+Postgres auth 핸드셰이크(Supabase 원격, 종종 pgbouncer) → 쿼리당 수십 ms + 동시성 처리량 급감. `get_session_detail`(3쿼리)·`append_turn`(3문)은 요청당 여러 번 지불.
- 권고: FastAPI startup에 프로세스 전역 `psycopg_pool.ConnectionPool` 생성, `get_connection()`이 checkout. · **M** · high

**F4. 🟡✅ 리포트 에이전트가 1초마다 새 연결로 Postgres 폴링 — idle에도 ~86k 연결/일 처닝**
- 근거: `reporting/agent.py:51-56` 무조건 1Hz 폴 + `time.sleep(1.0)`, `repository.py:130-164`가 매 폴 새 연결. `main.py:69` startup.
- 문제: 큐 빈 정상 상태에도 ~86,400 연결/일 + 매초 `SELECT ... FOR UPDATE SKIP LOCKED`. (F3 풀 도입 시 크게 완화)
- 권고: 큐 빌 때 백오프(지수, 5-10s) 또는 LISTEN/NOTIFY. 최소한 공유 풀 경유. · **S** · high

**F5. 🟡✅ 동기 `httpx.Client`를 호출마다 생성 (새 TCP/TLS) — URL파싱·repo분석 경로**
- 근거: `llm_gemini.py:202` fetch_url_text, `:1297,1318,1328` analyze_public_repo가 같은 호스트(api.github.com)에 3개 독립 Client로 **직렬** 호출(metadata→README→tree).
- 권고: 같은 호스트 3요청에 단일 client 재사용(keep-alive). async 전환 시 `httpx.AsyncClient`+`asyncio.gather`(README·tree 독립). · **S** · high

**F6. ⚪ 모듈 레벨 서비스/SDK 초기화 중복 + import 시점 실행** — `InterviewService`가 interview.py·admin.py에서 2회 인스턴스화, admin.py가 import 시 STT/TTS(각 genai.Client) 생성. 단일 인스턴스 공유 + lazy 빌드. · **S**

### G. 빌드 / 배포 / Vercel

> **요약**: 기능적이나 실비용 다수 + 제거된 RSS/푸시 서브시스템 dead config 클러스터. S5가 이미 한 것: bundle-analyzer 배선, optimizePackageImports, /libs+/workers immutable 헤더, 소스맵 억제, CTP 1페이지 SSG.

**G1. 🟠✅ 미사용 puppeteer + firebase-admin 제거 (import 0, 막대한 설치 비용)**
- 근거✅: `package.json:105,121`, 전체 소스 grep 0(firebase 히트는 tech-logo 문자열뿐). `.npmrc`/`PUPPETEER_SKIP_DOWNLOAD` 없음 → clean install 시 Chromium ~170MB.
- 권고: 둘 다 제거 후 lockfile 재생성. 향후 서버 PDF 필요 시 `@sparticuz/chromium`+`puppeteer-core`를 전용 라우트에. · **S** · high

**G2. 🟠✅ 빌드가 모든 타입/린트 에러 억제 — 깨진 코드가 green으로 배포**
- 근거: `next.config.mjs:10-12` `eslint.ignoreDuringBuilds:true`, `:13-15` `typescript.ignoreBuildErrors:true`, `:32` `reactStrictMode:false`.
- 문제: 타입 에러는 종종 실제 perf/correctness 함정(잘못된 async 타입, 누락 await) 인코딩 → 미탐지 배포. green deploy가 거짓 확신.
- 권고: `tsc --noEmit`+`next lint`를 **별도 필수 CI 게이트**로 분리(빌드는 관대해도 신호 보존). 백로그 해소 후 false로. · **M** · high

**G3. 🟠✅ `images.unoptimized=true`가 109MB raw public/ 이미지 전송 (>500KB 52개, 7.5MB PNG 1개)**
→ **E1과 동일.** `app/page.tsx:250-257` 랜딩이 올바른 `sizes`/`priority`를 줘도 unoptimized로 무시됨. · **M** · high

**G4. 🟡✅ 공개 쇼케이스가 force-dynamic — 방문마다 Postgres 재조회 (ISR 대신)**
→ **B1과 동일 패밀리.** 전 레포 통틀어 정적 생성 페이지 1개뿐. · **M** · high

**G5. 🟡✅ Dead `vercel.json` 함수 오버라이드 + 깨진 npm 스크립트 6개 (제거된 RSS/푸시 잔재)**
- 근거✅: `vercel.json` `functions:{"app/api/cron/rss-crawler/route.ts":...}` — 해당 라우트 미존재, `crons` 배열도 없음. `package.json`이 존재하지 않는 `scripts/validate-rss.js`/`rss-crawler.js`/`test-push-notification.js`/`rss-stats.js`/`backfill-tags.js` 참조.
- 권고: vercel.json dead 항목 제거, 깨진 스크립트 삭제, 고아 deps(cheerio/xml2js/fast-xml-parser/rss-parser) 정리. · **S** · high

**G6. 🟡✅ 락파일 2개 커밋 (`package-lock.json`+`pnpm-lock.yaml`) — 패키지 매니저 모호성**
- 근거✅: 둘 다 git 추적. `vercel.json:installCommand="npm install"`.
- 문제: 독립 해석된 의존성 트리가 시간이 지나며 드리프트 → "로컬은 되는데 배포 깨짐".
- 권고: vercel이 npm 핀이므로 `pnpm-lock.yaml` 삭제 + .gitignore. · **S** · high

**G7. ⚪ Edge 런타임 기회** — `app/api/interview/livekit/token/route.ts`는 prisma/cookies 없는 순수 토큰 생성기(edge 후보)인데 기본 Node. 84/118 라우트가 prisma(node query engine)로 묶임, adapter-pg 미연결. 저우선 폴리시. · **M**

**G8. ⚪ 캐시 헤더가 /libs·/workers만 커버** → **E5와 동일.** 안정 public 폴더에 immutable 추가 + 기본 보안 헤더. · **S**

---

## 3. 중복 제거 — 교차 차원 확증 맵

여러 에이전트가 독립적으로 같은 이슈를 지목한 항목(신뢰도 ↑):

| 근본 이슈 | 확증한 차원 | 통합 심각도 |
|-----------|-------------|-------------|
| FastAPI async 핸들러 이벤트 루프 블로킹 | **A1 + F1 + F2** | 🔴 Critical |
| 미사용 deps (puppeteer/firebase-admin 등) | **C2 + G1** | 🟠 High |
| `images.unoptimized` 전역 | **E1 + G3** | 🔴 Critical |
| 공개 페이지 force-dynamic (ISR 미적용) | **B1 + B3 + G4** | 🟠 High |
| 캐시 헤더 /libs·/workers만 | **E5 + G8** | 🟡 Medium |
| 커넥션 수명(풀/keep-alive/per-request 클라이언트) | **A3 + A4 + B4 + B5 + F3** | 🟠 High (테마) |
| 13.8MB GLB / 무거운 아바타 즉시 로드 | **C(talkinghead) + D7 + E3** | 🟠 High |

---

## 4. 권장 실행 시퀀스 (단계별)

### Phase 1 — Quick Wins (1주, 거의 S 노력, 회귀 위험 낮음)
1. **FastAPI 블로킹 해소** (F1/F2): `parse_job`/`parse_resume`/`normalize_resume`/`analyze_public_repo`를 `def`로 또는 `to_thread` 래핑 → **단일 최대 런타임 이득**
2. **미사용 deps 제거** (C2/G1) + dead config 정리 (G5) + 중복 락파일 삭제 (G6)
3. **고아 자산 ~33MB 삭제** (E2)
4. **프록시 타임아웃** (A2) + **community/sidebar 캐싱** (B2) + **반사적 force-dynamic 제거** (B3)
5. **FullCalendar dynamic** (C3) + **dead chart.tsx 삭제** (C5) + **React.cache hoist** (B7)

### Phase 2 — 큰 효과 구조 개선 (2-3주, M 노력)
6. **LiveKit 루트 레이아웃 분리** (C1) — 익명 트래픽 TTI 최대 개선
7. **이미지 최적화** (E1/G3): unoptimized 제거 또는 sharp 사전압축 파이프라인
8. **Zustand 셀렉터 전환 + TaskCard memo** (D2) + **영상룸 타이머 격리** (D1)
9. **FastAPI 커넥션 풀** (F3) + **리포트 에이전트 백오프** (F4)
10. **공개 페이지 ISR** (B1/G4) + **폰트 next/font** (E4) + **GLB 압축·immutable 헤더** (E3/E5)

### Phase 3 — 심층 리팩토링 (백로그, L 노력)
11. 포트폴리오 에디터 드래그 리렌더 경계 (D3)
12. 면접 결과 Server Component + Suspense (D4) + docs-view 폴링→이벤트 (D5)
13. BFF 프록시 단일 헬퍼 통합 (A5) + 요청-레벨 auth dedup (A4)
14. `tsc`/`lint` CI 게이트 (G2)

---

## 5. 부록 — S5가 이미 처리한 것 (재권고 금지)

`perf(deploy-S5)` 커밋(4fb6c86)이 처리:
- `@next/bundle-analyzer` 배선 (`npm run analyze`)
- `optimizePackageImports` = lucide-react, framer-motion, date-fns, @radix-ui/react-icons (커버 범위 내 올바름)
- `/libs/*`, `/workers/*` immutable 헤더 (Skulpt 런타임)
- `productionBrowserSourceMaps: false`
- CTP 1개 페이지 SSG (`app/insights/ctp/[categoryId]/[conceptId]`)

**S5가 남긴 공백** (이 감사의 대상): dead deps, 이미지 스토리 전체, 광범위 ISR, dead vercel.json/스크립트, edge 기회, FastAPI 전체.

---

*7개 차원 병렬 감사(opus) · 712,915 subagent 토큰 · 236 tool calls · 342s · 핵심 10건 직접 교차검증 완료*
