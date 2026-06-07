# 전체 성능 리팩토링 실행 계획 (Full Perf Refactor)

> **For agentic workers:** 이 계획은 `docs/audit/2026-06-02-performance-forwarding-audit.md`의 48개 findings를 **무회귀(no-regression)** 원칙으로 구현한다. 각 태스크는 원자적 커밋 + 검증 게이트를 가진다.

**Goal:** 감사에서 발견된 성능·캐싱·체감속도 문제를 기능 회귀 0건으로 개선한다.

**Branch:** `develop` (절대 `main` 아님). develop ≡ main 내용 동일(release 머지 커밋만 차이).

**핵심 원칙:**
1. **위험도 오름차순**으로 진행 (죽은 코드 제거 → 설정/캐싱 → 백엔드 → 번들 → 리렌더 → 구조 재작성).
2. **원자적 커밋** — 1 태스크 = 1 커밋, 언제든 `git revert` 가능.
3. **매 태스크 검증 게이트** 통과 후에만 다음으로.
4. **삭제 전 grep 확인** — "미사용"은 추측이 아니라 grep으로 증명.

**검증 게이트 (기준선):**
- 타입: `npx tsc -p web/tsconfig.json --noEmit` → **새 에러 0** (기준선 대비)
- 프론트 단위테스트: `npm --prefix web run test:interview-report` (기준선 16/16 pass) + `test:interview-flow` + `test:ctp-specs`
- 백엔드: `cd ai-interview && pytest` (Phase 3 직전 기준선 측정)
- 빌드: `npm --prefix web run build` (Phase 경계마다)
- 삭제 검증: `grep` 0건 확인

---

## Phase 1 — 죽은 무게 제거 (런타임 위험 ≈ 0)

미사용·죽은 코드/자산만 제거. 기능 동작에 영향 불가(애초에 안 쓰임). **각 항목 grep 0건 확인 후 제거.**

### Task 1.1 — 미사용 npm 의존성 제거 (C2/G1)
- **Files:** `web/package.json`
- 제거 후보(grep 0 확인 필수): `puppeteer`, `firebase-admin`, `tldraw`, `pixi.js`, `pixi-live2d-display`, `@mediapipe/tasks-vision`, `dagre`
- RSS 잔재(개별 확인): `cheerio`, `xml2js`, `fast-xml-parser`, `rss-parser`, `pdf-parse`
- [ ] 각 패키지 import grep → 0건 확인 (사용처 있으면 제외)
- [ ] package.json에서 제거 → `npm --prefix web install` 로 lockfile 재생성
- [ ] **검증:** `tsc` 새 에러 0, `npm run build` 성공
- [ ] 커밋: `chore(perf): remove unused heavy deps (puppeteer/firebase-admin/tldraw/pixi/...)`

### Task 1.2 — 중복 락파일 제거 (G6)
- **Files:** delete `web/pnpm-lock.yaml` (vercel.json이 `npm install` 핀)
- [ ] 삭제 → 커밋 `chore: drop duplicate pnpm-lock (npm is the pinned PM)`

### Task 1.3 — dead vercel.json + 깨진 스크립트 정리 (G5)
- **Files:** `web/vercel.json` (`functions["app/api/cron/rss-crawler/route.ts"]` 제거), `web/package.json` (scripts: `validate-rss`, `validate-rss:verbose`, `test:rss`, `rss-stats`, `crawl-rss`, `backfill-tags`, `test:push` 중 파일 없는 것 제거 — 존재 확인 후)
- [ ] 각 스크립트 대상 파일 존재 확인 → 없는 것만 제거
- [ ] 커밋 `chore: remove dead RSS/push config & broken scripts`

### Task 1.4 — dead code 파일 삭제 (C5/B9)
- **Files:** `web/components/ui/chart.tsx` (0 importer), `web/lib/server/recruit.ts` (0 importer)
- [ ] grep 0건 재확인 → 삭제 → `tsc` 검증 → 커밋

### Task 1.5 — 고아 public 자산 삭제 (E2) ~33MB
- **Files:** `web/public/interview/avatar/{avatarsdk,dibut-interviewer,talkinghead-brunette}.glb`, `web/public/images/ai_interview.png`, `web/public/ogImage.png`, `web/public/images/interview/types/{raw,originals,flows}/`
- **보존:** `talkinghead-avaturn.glb` (interviewer-avatar-config.ts:21에서 사용)
- [ ] 각 파일명 grep 0건 확인 (특히 GLB·png) → 삭제 → 커밋 `chore: delete ~33MB orphaned public assets`

---

## Phase 2 — 설정 & 캐싱 (낮은 위험, 높은 가치)

컴포넌트 로직 변경 없음. 캐싱/설정만.

- **Task 2.1** 캐시 헤더 확장 (E5/G8): `web/next.config.mjs` headers()에 `/interview/avatar/:path*`, `/images/:path*`, `/portfolio-backgrounds/:path*`, `/interview/backgrounds/:path*` immutable 추가. 위험≈0(캐싱만 추가).
- **Task 2.2** `community/sidebar` unstable_cache (B2): `web/app/api/community/sidebar/route.ts` 두 쿼리를 `unstable_cache(..., {revalidate:300, tags:['community-sidebar']})`로. 검증: 응답 shape 동일.
- **Task 2.3** React.cache hoist 수정 (B7): `web/lib/server/squads.ts:78,134`의 `getEventMap`을 모듈 스코프로 이동. 검증: squads 페이지 렌더.
- **Task 2.4** 반사적 force-dynamic 제거 (B3): `app/my/job-postings/matrix/page.tsx:3`, `app/community/squad/write/page.tsx:3` — cookies/auth 없음 재확인 후 제거. 검증: 페이지 렌더.
- **Task 2.5** 공개 페이지 ISR (B1/G4): `app/p/[handle]/[slug]/page.tsx`, `app/my/[handle]/portfolio/[slug]/page.tsx` — force-dynamic→`revalidate=300`. ⚠️ 검증: notFound() 동작, 발행 후 갱신(또는 허용 가능한 staleness). 발행 라우트에 `revalidatePath` 추가 검토.
- **Task 2.6** 이미지 최적화 (E1/G3): `web/next.config.mjs` `images.unoptimized` ⚠️ **신중**. 모든 `next/image` 사용처가 로컬인지 확인, 외부 호스트 있으면 `remotePatterns` 추가 후 `unoptimized:false`. 위험하면 sharp 사전압축 대안. 검증: 이미지 렌더 + 빌드.
- **Task 2.7** 폰트 next/font (E4): `web/app/layout.tsx:57-66` → `next/font/local`(Pretendard) + `next/font/google`(Noto Sans KR). tailwind 변수 연결. ⚠️ 검증: 폰트 렌더 정상. 위험 시 최소 preconnect만.

**Gate:** `tsc` 0 새에러, `build` 성공, 대상 페이지 렌더 확인.

---

## Phase 3 — FastAPI 백엔드 (중간 위험, 최고 런타임 가치)

**동작 보존**(같은 출력, 논블로킹화). 시작 전 `pytest` 기준선 측정.

- **Task 3.1** 이벤트 루프 언블로킹 (F1/F2/A1): `ai-interview/app/api/interview.py`(parse_job:64, parse_resume:96, portfolio_analyze:347), `app/api/resume.py`(normalize:62), admin 핸들러의 블로킹 호출을 `await asyncio.to_thread(...)`로. (WS의 `service_adapter.py` 패턴 복제). 검증: pytest 동일 통과 + 응답 shape 동일.
- **Task 3.2** DB 커넥션 풀 (F3): `ai-interview/app/db/database.py` → `psycopg_pool.ConnectionPool` startup 생성, `get_connection()` checkout. `pyproject.toml`에 `psycopg_pool` 추가. 검증: pytest.
- **Task 3.3** httpx 재사용 (F5): `app/services/llm_gemini.py:1297,1318,1328` 3개 GitHub 호출 단일 client 재사용.
- **Task 3.4** report-agent 백오프 (F4): `app/interview/reporting/agent.py:51-56` 빈 큐 시 지수 백오프(1→5-10s).

**Gate:** `pytest` 기준선과 동일 통과. 엔드포인트 응답 동일.

---

## Phase 4 — 번들 스플리팅 (중간 위험 — lazy 후에도 기능 동작 필수)

각 lazy 컴포넌트는 **트리거 시 여전히 동작**해야 함 — 반드시 개별 검증.

- **Task 4.1** LiveKit 분리 (C1): `web/components/features/workspace/voice/voice-manager.tsx` 무거운 LiveKit 렌더링 표면을 `next/dynamic({ssr:false})` 자식으로, 통화 active 시 마운트. 가벼운 컨텍스트는 유지. ⚠️ 검증: 통화 시작→연결→종료 동작.
- **Task 4.2** FullCalendar dynamic (C3): `dashboard-overview.tsx`의 DashboardCalendar를 dynamic. 검증: 캘린더 렌더.
- **Task 4.3** Recharts dynamic (C4): `portfolio-renderer.tsx` 차트부 dynamic. 검증: 차트 블록 렌더.
- **Task 4.4** react-markdown dynamic (C6): `site-helper-chat.tsx` open 시 마운트. 검증: 챗 열기→마크다운 렌더.
- **Task 4.5** 아바타 wrapper dynamic (D7): `video/page.tsx:9` TalkingHeadInterviewer dynamic. 검증: 면접룸 아바타 표시.

**Gate:** 각 기능 트리거 동작 확인 + `build` 성공 + `npm run analyze`로 청크 축소 확인.

---

## Phase 5 — 리렌더 & 체감 속도 (동작 민감)

- **Task 5.1** Zustand 셀렉터 (D2): 16개 `useWorkspaceStore()` 호출부를 슬라이스 셀렉터로, TaskCard `React.memo`. 검증: 보드 상호작용(카드 클릭/이동/모달) 동작.
- **Task 5.2** 영상룸 타이머 격리 (D1): `video/page.tsx:846` 타이머를 `<InterviewTimer>` leaf로, 아바타/카메라 memo. 검증: 타이머 카운트 + 면접 동작.
- **Task 5.3** docs-view 폴링 (D5): 2s/5s 폴링→이벤트 기반 revalidation. 검증: 문서 편집/목록 동작.
- **Task 5.4** **체감 속도** (사용자 요청): 무거운 로드 지점에 Suspense + 스켈레톤 추가(포트폴리오/결과/영상룸 로딩 상태), 안전한 곳에 낙관적 UI. 검증: 로딩 중 스켈레톤 표시, 최종 콘텐츠 동일.

**Gate:** 상호작용 정상, 상태 정확, 렌더 깨짐 없음.

---

## Phase 6 — 구조 재작성 (높은 위험, L-effort) — 신중/후순위

Phase 1-5 안정 확인 후 진행. 각자 충분한 검증 + 별도 커밋.

- **Task 6.1** 포트폴리오 에디터 드래그 리렌더 경계 재설계 (D3): `CanvasElementView` memo 경계, useMemo 의존성 축소.
- **Task 6.2** 결과 페이지 Server Component + Suspense 스트리밍 (D4).
- **Task 6.3** BFF 프록시 단일 헬퍼 통합 + per-route 타임아웃 + auth dedup (A2/A4/A5).

**Gate:** 각 기능 end-to-end 동작 + 단위테스트.

---

## 진행 방식
- Phase 1 → 2 → 3 → 4 → 5 → 6 순서. 각 Phase 완료 시 사용자에게 검증 리포트.
- 각 태스크 원자적 커밋. Phase 경계에서 `develop`에 push(사용자 확인 후).
- 위험 태스크(2.5/2.6/2.7, Phase 4 전체, Phase 6)는 추가 검증 + 필요시 사용자 확인.
