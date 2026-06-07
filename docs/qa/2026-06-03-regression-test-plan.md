# Dibut 성능 리팩토링 — 회귀 테스트 계획서 (QA Regression Test Plan)

> **작성일** 2026-06-03 · **대상** `origin/develop` 성능 리팩토링 23커밋 · **목적** 리팩토링 후 **원래 기능이 전부 그대로 동작하는지(무회귀)** 검증
> **관련 문서** 전수조사 `docs/audit/2026-06-02-performance-forwarding-audit.md` · 실행계획 `docs/superpowers/plans/2026-06-02-full-perf-refactor.md` · 성능보고서 `docs/reports/2026-06-03-performance-optimization-report.md`

## 0. 검증 요약 (이번 세션에서 실제 실행한 검증)

| 검증 항목 | 방법 | 결과 |
|---|---|---|
| 자동화 단위테스트 47개 | `npm run test:*` (interview-report 16·interview-flow 9·ctp-specs 3·ctp-skulpt 5·ctp-problem-bank 14) | **47/47 PASS** 통과 |
| TypeScript 타입체크 | `tsc --noEmit` (23커밋 전 과정) | 기존 23개 에러 **불변, 신규 0** 통과 |
| 프로덕션 빌드 | `next build` (매 단계) | **✓ Compiled successfully** 통과 |
| FastAPI 라이브 스모크 | uvicorn 부팅 + 엔드포인트 호출 | F1·F2 경로 정상, 이벤트루프 무차단 통과 |
| 프론트 런타임 | `next start` + 5개 공개 페이지 | 전부 **HTTP 200** 통과 |
| 캐시 헤더 | 정적 자산 응답 헤더 | immutable/SWR **런타임 확인** 통과 |
| ISR | `/p/[handle]/[slug]` 응답 헤더 | `s-maxage=60` + `x-nextjs-cache` **런타임 확인** 통과 |

**범례 (각 TC의 "결과" 칼럼)**
- **PASS** — 이번 세션에서 자동테스트/스모크/빌드로 **실제 검증 완료**
- **수동 검증 필요** — 브라우저/실통화/실데이터가 필요해 코드·빌드로는 확정 불가 → 배포 전 사람이 1회 확인 권장

**검증 방법 표기**: 자동(단위테스트) · 스모크(API curl) · 빌드(tsc/next build) · 수동(브라우저)

## 0.1 범위 & 접근

- 본 계획서는 **성능 리팩토링으로 건드린 영역의 회귀 검증**에 집중한다(전체 기능 회귀가 아님). 변경점마다 "리팩토링 전 동작이 유지되는가"를 확인하는 케이스를 둔다.
- 자동화 테스트가 커버하는 영역(면접 리포트/플로우, CTP)은 PASS로 자동 검증되었고, 자동 테스트가 없는 영역(워크스페이스 등)은 빌드/타입 게이트 + 수동 브라우저 검증에 의존한다 — 각 섹션에 정직하게 표기했다.
- **핵심 회귀 위험**: ① Zustand 슬라이스 셀렉터 전환(읽던 필드 누락 시 기능 정지/stale) ② 동적 import(lazy 컴포넌트가 트리거 시 실제 마운트되는가) ③ React.memo(props 비교가 맞아 상태 전환이 보존되는가) ④ ISR/캐시(편집 반영 지연) ⑤ FastAPI to_thread(동일 응답 보존).

---

## 워크스페이스 (보드·칸반·문서·일정·팀챗·허들·음성통화)

프로젝트 협업 허브로, 대시보드/보드/칸반/일정(캘린더)/문서/팀챗/허들/음성·영상통화 탭을 한 화면에서 제공한다. 데이터는 Zustand `useWorkspaceStore`(`store/mock-data.ts`)로 관리하며, 음성통화는 LiveKit, 캘린더는 FullCalendar에 의존한다. 자동화 단위테스트가 이 영역을 커버하지 않으므로(47개 테스트는 interview/ctp 전용), 기능 회귀는 빌드/타입 게이트 + 수동 브라우저 검증에 의존한다.

이번 리팩토링 변경점(회귀 위험 포인트):
- **D2 슬라이스 셀렉터화(16곳)**: `card.tsx` 외 15개 컴포넌트(board, kanban-board, schedule, docs, team-chat, live-huddle, team-widget, my-briefcase, view/tag/priority 모달, workspace page)가 `useWorkspaceStore()` 전체구독 → `useWorkspaceStore((s)=>s.x)` 단일필드 셀렉터로 전환. **읽던 필드를 빠뜨리면 해당 기능이 죽거나 stale**해지는 게 핵심 위험. `card.tsx`는 추가로 `React.memo` 래핑.
- **docs-view 폴링 완화**: 활성 문서 2s→30s, 문서목록 5s→30s. 실시간 편집은 y-websocket 채널로 흐르므로 HTTP 폴은 안전망. **협업 반영 지연/저장 회귀** 위험.
- **LiveKit 음성통화 lazy 분리**: `voice-manager`(루트레이아웃 상주 Provider)에서 LiveKit WebRTC 표면을 `active-call-overlay.tsx`로 분리, `next/dynamic({ssr:false})`로 **통화 활성(token set) 시에만** 로드. join/leave/context 로직은 verbatim 이동.
- **FullCalendar dynamic**: `dashboard-overview.tsx`가 `DashboardCalendar`를 `next/dynamic({ssr:false})` + 스켈레톤으로 지연 로드.

| TC-ID | 분류 | 시나리오 | 사전조건 | 테스트 절차 | 기대 결과 | 검증 방법 | 결과 |
|---|---|---|---|---|---|---|---|
| WS-001 | 빌드/회귀 | 슬라이스 셀렉터 전환 후 16개 컴포넌트 타입/컴파일 무결성 | 로그인, develop HEAD | 1. `pnpm tsc --noEmit` 2. `next build` | 새 타입에러 0(기존 23개 불변), `✓ Compiled successfully` | 빌드 | PASS (tsc 23→23, build ✓ 매 단계) |
| WS-002 | 회귀 | 보드(board/index) 태스크 생성·상태변경·태그/우선순위 부여가 셀렉터 전환 후에도 동작 | 워크스페이스 진입, 보드 탭 | 1. 새 태스크 생성 2. 컬럼 간 드래그로 상태 변경 3. 태그/우선순위 부여 4. 카드 클릭→사이드패널 오픈 | 태스크 생성/이동/태그·우선순위 즉시 반영, `activeTaskId` 셋으로 패널 정상 오픈 (board가 읽는 20개 슬라이스 전부 매핑됐는지 확인) | 수동(브라우저) | 수동 검증 필요 |
| WS-003 | 성능/회귀 | TaskCard `React.memo`+슬라이스 셀렉터 — 카드 클릭 시 500개 카드 캐스케이드 리렌더 제거, 카드 표시는 그대로 | 보드에 다수 태스크 | 1. React DevTools Profiler 켜기 2. 임의 카드 클릭(setActiveTaskId) 3. 리렌더된 카드 수 확인 4. 태그/우선순위 변경 시 카드 갱신 확인 | 클릭한 카드 외 다른 카드 미리렌더, 단 태그/우선순위 변경 시에는 카드가 정상 갱신 | 수동(브라우저) | 수동 검증 필요 |
| WS-004 | 회귀 | 칸반(kanban-board) 보드 데이터 SWR 로드 + 컬럼/카드 DnD 정상 | 칸반 탭 | 1. 보드 진입 2. 카드 컬럼 간 드래그 3. 컬럼 순서 변경 4. `syncProjectData` 반영 확인 | `boardData` 정상 로드, DnD·동기화 모두 동작(tags/priorities/projects/tasks/syncProjectData 9개 슬라이스 매핑 확인) | 수동(브라우저) | 수동 검증 필요 |
| WS-005 | 회귀 | 일정(schedule) — `tasks` 슬라이스만 구독, dueDate 태스크 필터링·렌더 유지 | 일정 탭, dueDate 있는 태스크 존재 | 1. 일정 탭 진입 2. 마감일 있는 태스크가 날짜에 표시되는지 3. 태스크 인라인 편집 | dueDate 태스크가 해당 날짜에 표시, 편집 동작 정상 | 수동(브라우저) | 수동 검증 필요 |
| WS-006 | 회귀 | 문서(docs/index) — docs/createDoc/updateDoc/projects 슬라이스로 문서 목록·생성·수정 동작 | 문서 탭 | 1. 프로젝트 문서 목록 표시 2. 새 문서 생성 3. 문서 제목/내용 수정 | 문서 목록 필터링(projectId) 정상, 생성·수정 즉시 반영 | 수동(브라우저) | 수동 검증 필요 |
| WS-007 | 회귀/성능 | docs-view 폴링 2s/5s→30s 후에도 협업 편집 반영·저장 정상 | 문서 편집 화면, 동시 편집자 2명 | 1. 사용자 A가 본문 편집 2. 사용자 B 화면에서 반영 확인(y-websocket) 3. 30s 경과 후 백그라운드 refetch가 dirty 내용 덮어쓰지 않는지 | 실시간 편집은 즉시 동기화(websocket), 30s HTTP 폴은 안전망으로만 동작·작성 중 내용 유실 없음 | 수동(브라우저) | 수동 검증 필요 |
| WS-008 | 회귀 | 팀챗(team-chat) — `setActiveTaskId` 슬라이스 전환 후 채널·메시지·태스크 링크 동작 | 팀챗 탭 | 1. 채널 전환 2. 메시지 전송 3. 메시지 내 태스크 링크 클릭→사이드패널 오픈 | 채널/메시지(useSocketStore 경로) 정상, 태스크 링크 클릭 시 패널 오픈 | 수동(브라우저) | 수동 검증 필요 |
| WS-009 | 회귀 | 허들(live-huddle) — `projects` 슬라이스 전환 후 프로젝트명 표시·마이크/화면 토글 UI 동작 | 허들 진입 | 1. 허들 오픈 2. 프로젝트명 표시 확인 3. 마이크/화면공유 토글 4. 닫기 | 프로젝트명 정상 표시, 토글 UI(목 상태) 동작, onClose 정상 (※ 실 미디어는 음성통화 경로) | 수동(브라우저) | 수동 검증 필요 |
| WS-010 | 성능/회귀 | LiveKit lazy 분리 — 통화 미시작 라우트에 WebRTC SDK 미포함, 통화 시작 시 정상 로드 | 익명/랜딩 진입 후 워크스페이스 통화 | 1. 랜딩/로그인 등 통화 무관 라우트 First Load JS에 livekit 청크 부재 확인 2. 워크스페이스에서 음성채널 join | 통화 무관 라우트엔 LiveKit 미포함, join(token set) 시 active-call-overlay async 청크 로드 | 빌드 + 수동(브라우저) | 빌드 PASS (voice-manager 0 @livekit imports, LiveKit ~492KB 별도 async 청크 분리 확인); join 실통화 수동 검증 필요 |
| WS-011 | 회귀 | 음성통화 join/leave/연결 — Provider 로직 verbatim 이동 후 동작 동일 | LiveKit 토큰 발급 가능 환경 | 1. 음성채널 join→토큰 fetch→오버레이 마운트 2. 연결 시 join 사운드+socket `voice:update` emit 3. leave→토큰 해제+leave 사운드+revalidate | join/leave/연결 이벤트, 사운드, socket emit, SWR mutate 모두 리팩토링 전과 동일 | 수동(브라우저) | 수동 검증 필요 |
| WS-012 | 회귀 | 영상 오버레이 — active-call-overlay의 VideoTrack 렌더·참가자 입퇴장 사운드 | 2인 이상 통화 | 1. 통화 중 카메라 on 2. 원격 참가자 영상 표시 3. 타 참가자 입장/퇴장 시 사운드 | VideoTrack 렌더, 원격 입퇴장 사운드(suppressRef 가드) 정상 | 수동(브라우저) | 수동 검증 필요 |
| WS-013 | 성능/회귀 | FullCalendar dynamic — 대시보드 캘린더 지연 로드 + 스켈레톤 후 정상 렌더 | 워크스페이스 대시보드(overview) 탭 | 1. 대시보드 진입 2. 캘린더 자리에 스켈레톤(spinner) 표시 후 FullCalendar 마운트 3. 일정 표시·월 이동 | 초기 페인트 시 스켈레톤→캘린더 비동기 로드, 이벤트 표시·네비게이션 정상, 워크스페이스 라우트 초기 번들에 FullCalendar 미포함 | 빌드 + 수동(브라우저) | 빌드 PASS (FullCalendar ~232KB 별도 async 청크 분리, /workspace/[id] First Load 278kB); 캘린더 렌더 수동 검증 필요 |
| WS-014 | 회귀 | 태그/우선순위/뷰 관리 모달 — 슬라이스 셀렉터 전환 후 CRUD·reorder 동작 | 보드에서 각 모달 오픈 | 1. 태그 모달: 생성/수정/삭제/드래그 정렬 2. 우선순위 모달: 동일 3. 뷰 매니저: updateView/deleteView | tag/priority/view 모달의 create/update/delete/reorder 전부 동작(누락 슬라이스로 인한 undefined 호출 없음) | 수동(브라우저) | 수동 검증 필요 |
| WS-015 | 회귀 | my-briefcase — privateDocs/tasks 슬라이스 전환 후 개인 문서·할일 표시 | 개인 브리프케이스 진입 | 1. 진입 2. privateDocs 목록 표시 3. 개인 todo 표시 | privateDocs/tasks 정상 표시(전체구독 제거로 인한 누락 없음) | 수동(브라우저) | 수동 검증 필요 |
| WS-016 | 회귀 | 워크스페이스 상세 페이지 — activeTaskId/setActiveTaskId 슬라이스 전환 후 탭 전환·태스크 패널 동작 | `/workspace/[id]` 진입 | 1. 탭 간 전환(보드/문서/일정 등) 2. 태스크 클릭→사이드패널 3. 패널 닫기(setActiveTaskId null) | 탭 전환 정상, activeTaskId 기반 패널 오픈/닫기 동작 | 수동(브라우저) | 수동 검증 필요 |
| WS-017 | 버그수정/회귀 | 칸반 빈 컬럼 드롭 — status 외 그룹핑(우선순위·담당자)에서 비어 있는 컬럼으로 task 이동 | 보드를 우선순위 또는 담당자로 그룹핑, 비어 있는 컬럼 존재 | 1. 보드를 우선순위(또는 담당자)로 그룹핑 2. task를 빈 컬럼 위로 드래그 3. 컬럼 하이라이트(디벗 그린 링)·"여기로 드롭하여 이동" 안내 표시 확인 4. 드롭 후 task의 우선순위/담당자가 해당 컬럼 값으로 바뀌는지 | 빈 컬럼이 드롭 대상으로 잡혀 이동 성립(근본원인: `useSortable` `disabled:true`가 droppable까지 끄던 것을 `{draggable, droppable:false}`로 분리). 드롭 시 즉시 갱신, status 뷰의 컬럼 재정렬 동작은 불변(회귀 0) | 빌드 + 수동(브라우저) | 빌드 PASS (tsc 23→23, build ✓); 실제 드롭은 수동 검증 필요 |
| WS-018 | 알려진 제한 | 칸반 태그(tag) 그룹핑에서 task 드래그-이동 미지원(의도된 제한) | 태그 그룹핑 | 1. 태그로 그룹핑 2. task 드래그 시도 | `handleDragOver`가 tag 그룹에서 early-return. 태그는 다중값이라 "드롭 = 어느 태그로 치환?"이 모호 → 데이터 유실 방지를 위해 드래그 재지정을 의도적으로 비활성(향후 과제). 컬럼 순서 변경은 동작 | 코드리뷰 | 설계상 제한(회귀 아님) |

관련 파일 경로:
- 칸반 빈 컬럼 드롭 수정: `/Users/junghwan/buc_Capstone_DEMO/web/components/features/workspace/views/kanban/column.tsx` (line 113-116 disabled 분리, 167-168 isOver 하이라이트, 346-350 빈 컬럼 안내), 핸들러 `.../views/kanban/hooks/use-kanban-drag.ts` (line 109 tag early-return, 151 빈 컬럼 분기)
- 슬라이스 셀렉터 전환: `/Users/junghwan/buc_Capstone_DEMO/web/components/features/workspace/detail/board/index.tsx`, `.../detail/kanban-board.tsx`, `.../detail/schedule/index.tsx`, `.../detail/docs/index.tsx`, `.../detail/chat/team-chat.tsx`, `.../detail/huddle/live-huddle.tsx`, `.../detail/overview/team-widget.tsx`, `.../personal/my-briefcase.tsx`, `.../modules/task/card.tsx`, `.../modules/tag/picker.tsx`, `.../modules/priority/priority-manager-modal.tsx`, `.../modules/view-settings/view-manager-modal.tsx`, `/Users/junghwan/buc_Capstone_DEMO/web/app/workspace/[id]/page.tsx`
- docs-view 폴링: `/Users/junghwan/buc_Capstone_DEMO/web/components/features/workspace/detail/docs-view.tsx` (line 325, 447: `30_000`)
- LiveKit lazy 분리: `/Users/junghwan/buc_Capstone_DEMO/web/components/features/workspace/voice/voice-manager.tsx` (line 30-33 dynamic), `.../voice/active-call-overlay.tsx`, `.../voice/voice-sounds.ts`
- FullCalendar dynamic: `/Users/junghwan/buc_Capstone_DEMO/web/components/features/workspace/detail/dashboard-overview.tsx` (line 41-55)

QA 노트: 이 영역은 자동화 단위테스트가 전무하다(47개 테스트는 interview/ctp 전용). WS-001/010/013의 빌드·번들 분리는 이번 세션에서 실제 검증되어 PASS이나, 슬라이스 셀렉터 전환은 "읽던 필드를 정확히 다 옮겼는지"가 핵심 회귀 위험이라 WS-002~009·011~012·014~016은 반드시 브라우저 수동 검증이 필요하다.

---

## AI 영상면접 (영상룸·아바타·카메라·타이머·결과)

라이브 면접/포트폴리오 디펜스가 진행되는 영상룸(`web/app/interview/room/video/page.tsx`)으로, AI 면접관 WebGL 아바타(`talking-head-interviewer.tsx`, @met4citizen/talkinghead)와 지원자 로컬 카메라 프리뷰(`local-camera-preview.tsx`)를 좌우로 띄우고, 1초 간격 setInterval로 남은 시간(`runtimeMeta`)을 갱신하며, WS 기반 음성 파이프라인·실시간 자막·수동 턴 제어(전송/다시말하기)·재연결 모달·면접 완료 시 결과 페이지 자동 이동을 담당합니다.

이번 리팩토링 변경점과 회귀 위험 포인트:
- **D1-memo**: `TalkingHeadInterviewer`, `LocalCameraPreview`를 `React.memo`로 래핑. 페이지가 1초마다 `runtimeMeta`로 리렌더되어도 props(state/className, enabled/fill)가 안 바뀌면 두 무거운 컴포넌트는 리렌더를 건너뜀. → 위험: memo 비교가 잘못되면 아바타 state 전환(idle/thinking/listening/speaking)이나 카메라 enabled 변화가 화면에 반영되지 않을 수 있음.
- **D1-dynamic**: 영상룸 페이지에서 아바타 wrapper를 정적 import → `next/dynamic(ssr:false)`로 변경. WebGL 청크를 영상룸 초기 JS/하이드레이션 경로에서 제외. → 위험: 동적 로드 실패 또는 마운트 타이밍 문제로 아바타가 안 뜨거나 SSR 불일치 발생 가능.
- **자산 캐싱**: `/interview/avatar/:path*`(약 13MB GLB)에 `public, max-age=31536000, immutable` 헤더 부여(`next.config.mjs:65-67`). → 위험: 잘못된 immutable 부여 시 아바타 갱신 불가.

| TC-ID | 분류 | 시나리오 | 사전조건 | 테스트 절차 | 기대 결과 | 검증 방법 | 결과 |
|---|---|---|---|---|---|---|---|
| VR-001 | 회귀 | 영상룸 진입 시 아바타가 정상 렌더된다 (dynamic 전환 후) | 카메라/마이크 권한 허용, AI 서버 가동, 세션 셋업 완료 | 1. 셋업 후 `/interview/room/video` 진입 2. "면접 시작하기" 클릭 3. AI 면접관 영역 관찰 | TalkingHead WebGL 아바타가 "3D avatar loading %" 후 표시됨. dynamic(ssr:false)로도 마운트되고 SSR 에러/하이드레이션 경고 없음 | 빌드(✓ Compiled successfully) + 수동(브라우저) | 빌드 PASS / 렌더 수동 검증 필요 |
| VR-002 | 회귀 | 1초 타이머가 돌아도 아바타 state 전환이 정상 반영된다 (memo 후) | VR-001 완료, 면접 진행 중 | 1. AI가 말할 때(speaking) 아바타 입모양/웨이브 애니메이션 확인 2. 사용자 답변 중(listening) 상태 확인 3. AI 처리 중(thinking) 확인 | `avatarState` 변경 시 memo가 props 변화를 감지해 리렌더, idle/thinking/listening/speaking 4상태가 모두 전환됨 (`state` prop은 memo 비교 대상이므로 전환 보존) | 수동(브라우저) | 수동 검증 필요 |
| VR-003 | 성능 | 1초 타이머 틱에 아바타/카메라가 불필요하게 리렌더되지 않는다 | 면접 진행 중, React DevTools Profiler | 1. Profiler 녹화 시작 2. 10초간 답변 없이 대기(타이머만 tick) 3. 리렌더 카운트 확인 | 매초 `runtimeMeta` 갱신으로 페이지 셸은 리렌더되나, `TalkingHeadInterviewer`/`LocalCameraPreview`는 props 불변이라 리렌더 0건 (memo 효과) | 수동(브라우저 Profiler) | 수동 검증 필요 |
| VR-004 | 회귀 | 로컬 카메라 프리뷰가 정상 동작한다 (memo 후) | 카메라 권한 허용 | 1. 영상룸 진입 2. 지원자 영역 관찰 3. "카메라 연결 중..." 후 영상 확인 | getUserMedia로 좌우반전(scale-x-[-1]) 본인 영상 표시. `enabled` prop 불변이므로 memo가 스트림 초기화를 1회만 수행, 타이머 틱에 카메라 재초기화/깜빡임 없음 | 수동(브라우저) | 수동 검증 필요 |
| VR-005 | 회귀 | 카메라 권한 거부 시 graceful degradation | 카메라 권한 차단 상태 | 1. 영상룸 진입 2. 권한 거부 | "카메라 연결 실패 — 음성 면접은 계속 진행할 수 있습니다." + CameraOff 아이콘 표시, 면접 진행은 차단되지 않음 | 수동(브라우저) | 수동 검증 필요 |
| VR-006 | 회귀 | WebGL/아바타 로드 실패 시 SVG 폴백 표시 | talkinghead 초기화 실패 유도(WebGL 비활성 환경) | 1. WebGL 미지원 브라우저로 진입 2. 아바타 영역 확인 | `hasError` 시 `INTERVIEWER_AVATAR_FALLBACKS[state]` SVG 이미지(idle/thinking/listening/speaking)로 폴백, 면접 흐름 유지 | 수동(브라우저) | 수동 검증 필요 |
| VR-007 | 성능 | GLB 아바타 자산이 immutable 캐시 헤더로 서빙된다 | 프로덕션 빌드(next start) | 1. `/interview/avatar/talkinghead-avaturn.glb` 요청 2. 응답 헤더 확인 | `Cache-Control: public, max-age=31536000, immutable` 반환 (13MB GLB 재방문 시 재다운로드/재검증 없음) | 스모크(런타임 헤더 검증) | PASS (GLB아바타 immutable 런타임 확인됨) |
| VR-008 | 성능 | 아바타 WebGL 청크가 영상룸 초기 번들에서 분리된다 | 프로덕션 빌드 | 1. `next build` 출력의 영상룸 First Load JS 확인 2. talkinghead 청크가 별도 async 청크인지 확인 | talkinghead WebGL이 영상룸 초기 청크가 아닌 별도 lazy 청크로 분리(dynamic ssr:false). 빌드 정상 컴파일 | 빌드 | PASS (next build ✓, next/dynamic 7→13 파일) |
| VR-009 | 회귀 | 면접 종료 타이머 + 결과 페이지 자동 이동 | 면접 진행 중, 세션 ID 활성 | 1. "종료" 버튼 클릭 2. 또는 `runtimeMeta.remainingSec`이 0 도달 | `/api/interview/sessions/{id}/complete` 호출 후 `buildInterviewResultPath`로 결과 페이지 이동(완료 시 3초 카운트다운). 자산/번들 변경이 종료 플로우에 영향 없음 | 수동(브라우저) | 수동 검증 필요 |
| VR-010 | 회귀 | 수동 턴 제어(전송/다시말하기)가 그대로 동작한다 | 면접 진행 중, 마이크 ON | 1. 답변 후 "전송"(Send) 클릭 → `submitTurn` 2. 답변 중 "다시 말하기"(RotateCcw) 클릭 → `cancelTurn` + 자막 clear | 전송 시 누적 발화가 AI로 전송됨. 다시말하기 시 streaming/committed user 자막이 초기화되고 마이크는 ON 유지. AI 응답 중엔 두 버튼 비활성(끼어들기 차단) | 수동(브라우저) | 수동 검증 필요 |
| VR-011 | 회귀 | 실시간 자막(streaming + sticky) 표시가 유지된다 | 면접 진행 중, CC 토글 ON | 1. AI 발화 중 자막 확인 2. 사용자 발화 중 자막 확인 3. CC 토글 off/on | AI/사용자 자막이 하단 오버레이에 정상 표시, Google STT 우선 병합 로직 유지. memo/dynamic 변경이 자막 state(페이지 셸 소유)에 영향 없음 | 수동(브라우저) | 수동 검증 필요 |
| VR-012 | 회귀 | 재연결 모달 + 60초 grace 카운트다운 동작 | 면접 진행 중 WS 끊김 유도 | 1. 네트워크 일시 차단 2. 재연결 모달 확인 3. 60초 만료 시 동작 확인 | `isReconnecting` 시 "재연결 시도중..." 모달 + 남은 시간 progress bar. 만료 시 `routeToSetup`으로 셋업 복귀. 타이머는 재연결 중 일시정지 | 수동(브라우저) | 수동 검증 필요 |
| VR-013 | 회귀 | 포트폴리오 디펜스 모드에서도 영상룸이 동일 동작 | `?sessionType=portfolio_defense&repoUrl=...`로 진입 | 1. 디펜스 셋업 후 영상룸 진입 2. 헤더 "PORTFOLIO DEFENSE" 배지 확인 3. 아바타/카메라/타이머 확인 | 디펜스 세션 시작 엔드포인트 사용, 아바타·카메라·자막·타이머가 라이브 면접과 동일하게 memo/dynamic 적용 후에도 동작 | 수동(브라우저) | 수동 검증 필요 |
| VR-014 | 회귀 | 영상룸 라우트가 프로덕션에서 정상 응답한다 | next start 프로덕션 | 1. `/interview` 등 면접 진입점 요청 | `/interview` HTTP 200 반환, 영상룸 컴파일 정상(dynamic import 포함) | 스모크(API curl) + 빌드 | PASS (/interview HTTP 200, build ✓) |
| VR-015 | 회귀 | 영상룸 영역 TypeScript 타입 안정성 | 리포지토리 체크아웃 | 1. `tsc --noEmit` 실행 2. 영상룸/아바타/카메라 신규 타입에러 확인 | memo 래핑·dynamic import 도입 후 신규 타입에러 0건 (기존 23개 불변) | 자동(tsc) | PASS (23→23, 신규 0) |

추가 메모(정직성):
- VR-002/003/004는 이번 세션에서 브라우저 런타임 검증을 못 했으므로 "수동 검증 필요"입니다. memo의 정확성은 **props가 실제로 안정적이어야** 보장되는데, 코드상 `state`(avatarState)는 memo 비교 대상이라 전환이 보존되고, `className`은 리터럴 문자열 상수, `enabled`/`fill`도 리터럴이라 안전합니다. 다만 `TalkingHeadInterviewer`에 넘기는 `className="relative z-10 h-full min-h-[420px] w-full"`는 매 렌더 동일 리터럴이므로 memo가 정상 작동합니다 — 인라인 객체/함수 prop이 없어 memo 회귀 위험은 코드 레벨에서 낮습니다.
- D1-dynamic은 `ssr:false`라 서버에서 아바타를 렌더하지 않으므로 하이드레이션 불일치 위험이 구조적으로 제거됩니다. 단 클라이언트 마운트 후 아바타가 보일 때까지 한 틱 지연이 생길 수 있어 VR-001 수동 확인이 필요합니다.

관련 파일(절대경로):
- `/Users/junghwan/buc_Capstone_DEMO/web/app/interview/room/video/page.tsx`
- `/Users/junghwan/buc_Capstone_DEMO/web/components/features/interview/avatar/talking-head-interviewer.tsx`
- `/Users/junghwan/buc_Capstone_DEMO/web/components/features/interview/local-camera-preview.tsx`
- `/Users/junghwan/buc_Capstone_DEMO/web/lib/interview/interviewer-avatar-config.ts`
- `/Users/junghwan/buc_Capstone_DEMO/web/next.config.mjs` (GLB immutable 헤더, 라인 65-67)

---

## 포트폴리오 (에디터 · 공개 쇼케이스 /p/ · /my/portfolio · 차트)

포트폴리오 에디터로 작성한 문서를 공개 핸들/슬러그(`/p/[handle]/[slug]`, `/my/[handle]/portfolio/[slug]`)로 익명 공유하고, 본문 안에 Recharts 기반 3종 차트(area=`metric-trend`, bar=`impact-matrix`, radar=`competency-radar`)를 렌더하는 영역. 에디터와 공개 페이지가 동일한 `PortfolioRenderer`를 공유하며, 차트는 `editable`/`readonly` 양쪽 경로에서 모두 렌더된다.

이번 리팩토링 변경점(회귀 위험 포인트):
- **C4 (Recharts lazy)**: 3개 차트를 `portfolio-charts.tsx`로 추출하고 `portfolio-renderer.tsx`에서 `next/dynamic(..., { ssr: false, loading: () => <div className="h-full w-full" /> })`로 동적 import. recharts(`from "recharts"`)는 이제 `portfolio-charts.tsx` 단 한 곳에서만 import되어 공개 포트폴리오 초기 번들에서 제거됨. → 위험: 차트가 끝내 안 뜨거나(특히 SSR 비활성으로 인한 hydration/빈 화면), 차트 데이터 매핑 깨짐, PDF 인쇄 시 차트 누락.
- **B1 (ISR)**: `/p/[handle]/[slug]`와 `/my/[handle]/portfolio/[slug]` 두 페이지를 `force-dynamic` → `export const revalidate = 60` + `generateStaticParams() { return []; }` (on-demand ISR). → 위험: 비공개(`is_public=false`)/존재하지 않는 포트폴리오의 404 처리 유지, 편집 후 60초 내 반영, 캐시 키(handle 소문자화·slug decode) 정확성.

| TC-ID | 분류 | 시나리오 | 사전조건 | 테스트 절차 | 기대 결과 | 검증 방법 | 결과 |
|---|---|---|---|---|---|---|---|
| PF-001 | 회귀 | 공개 쇼케이스 `/p/[handle]/[slug]` 정상 렌더 | `is_public=true` 쇼케이스 행 1건 존재 | 1. 해당 handle/slug로 GET<br>2. HTTP 상태·HTML 본문 확인 | HTTP 200, 템플릿 컴포넌트 렌더 (리팩토링 전과 동일) | 스모크(curl)+수동 | PASS (`/career/portfolios` 등 공개 라우트 HTTP 200; `/p/[handle]/[slug]` x-nextjs-cache 헤더 반환) |
| PF-002 | 회귀 | 존재하지 않는/비공개 포트폴리오 404 유지 | 없는 handle 또는 `is_public=false` 행 | 1. 잘못된 handle/slug GET<br>2. `is_public=false` 행 GET | 둘 다 `notFound()` → 404 (ISR 전환 후에도 가드 유지) | 수동 | 수동 검증 필요 |
| PF-003 | 성능 | `/p/[handle]/[slug]` ISR(revalidate=60) 동작 | 공개 쇼케이스 행 존재 | 1. 페이지 GET 후 응답 헤더 확인<br>2. `Cache-Control`·`x-nextjs-cache` 점검 | `Cache-Control: s-maxage=60, stale-while-revalidate` + `x-nextjs-cache` 헤더 = revalidate=60 그대로 적용 | 스모크(curl) | PASS (런타임 헤더 실측: s-maxage=60, stale-while-revalidate + x-nextjs-cache) |
| PF-004 | 성능 | `/my/[handle]/portfolio/[slug]` ISR 적용 + First Load 축소 | 빌드 산출물 | 1. `next build` 라우트 표 확인<br>2. 해당 라우트 ● (ISR)·First Load JS 확인 | 라우트가 ƒ(dynamic)→●(ISR)로 전환, First Load 162kB (recharts 분리 후) | 빌드 | PASS (빌드: ● ISR, 162kB) |
| PF-005 | 회귀 | ISR 전환 후 편집 내용 60초 내 반영 | 공개 포트폴리오 1건, 에디터 접근 권한 | 1. 에디터에서 제목/본문 수정·저장<br>2. 공개 URL 새로고침<br>3. 60초 후 재요청 | 최대 60초 후 캐시 무효화되어 수정 내용 노출 (편집→공개 반영 흐름 유지) | 수동 | 수동 검증 필요 |
| PF-006 | 회귀 | handle 대소문자/slug 디코딩 키 정확성 유지 | 대문자 포함 handle, URL-encoded slug | 1. 대문자 handle로 GET<br>2. encode된 slug로 GET | handle `.toLowerCase()`·slug `decodeURIComponent` 후 정상 매칭(리팩토링 전 키 로직 동일) | 수동 | 수동 검증 필요 |
| PF-007 | 회귀 | Recharts 추출 후 차트 코드 단일 출처 확인 | 현재 소스 | 1. `recharts` 직접 import 위치 grep<br>2. `portfolio-charts` 참조 grep | `from "recharts"`는 `portfolio-charts.tsx` 1곳뿐, 소비는 renderer의 `dynamic()` 3곳뿐 (공개 번들서 제거) | 자동(grep)+빌드 | PASS (grep 결과: recharts import 1곳, dynamic 3곳) |
| PF-008 | 회귀 | area 차트(`metric-trend`) 렌더 유지 | `metric-trend` variant 블록 포함 포트폴리오 | 1. 해당 섹션 렌더<br>2. `TrendAreaChart` 표시 확인 | 동적 import된 area 차트가 data/accent/gradientId 매핑대로 렌더 (renderer:1109) | 수동 | 수동 검증 필요 |
| PF-009 | 회귀 | bar 차트(`impact-matrix`) 렌더 유지 | `impact-matrix` variant 블록 포함 | 1. 해당 섹션 렌더<br>2. `ImpactBarChart` 표시 확인 | 동적 import된 bar 차트가 data 매핑대로 렌더 (renderer:1225) | 수동 | 수동 검증 필요 |
| PF-010 | 회귀 | radar 차트(`competency-radar`) 렌더 유지 | `competency-radar` variant 블록 포함 | 1. 해당 섹션 렌더<br>2. `MetricRadarChart` 표시 확인 | 동적 import된 radar 차트가 정상 렌더 (renderer:1318) | 수동 | 수동 검증 필요 |
| PF-011 | 성능 | 차트 lazy 분리(초기 로드서 미룸) | 빌드 산출물 | 1. `next build` 청크 분석<br>2. recharts 별도 async 청크 여부 확인 | Recharts ~404KB(비압축)가 별도 async 청크로 분리, 차트 없는 페이지 초기 로드서 제외 | 빌드 | PASS (Recharts 별도 청크 분리 확인) |
| PF-012 | 회귀 | `ssr:false` 차트의 로딩 플레이스홀더 | metric-trend 등 차트 포함 페이지 | 1. 차트 청크 로드 전 초기 페인트 관찰<br>2. 레이아웃 깨짐 확인 | `loading: () => <div className="h-full w-full" />`로 자리 유지, 차트 로드 후 정상 표시(레이아웃 시프트 없음) | 수동 | 수동 검증 필요 |
| PF-013 | 회귀 | 에디터(`editable`) 경로에서도 차트 렌더 유지 | 에디터 진입, 차트 블록 포함 문서 | 1. 에디터 열기<br>2. 차트 블록 표시·편집 확인 | 동일 `PortfolioRenderer`의 `editable` 경로에서 동적 차트 정상 렌더(읽기/편집 공유 경로 유지) | 수동 | 수동 검증 필요 |
| PF-014 | 회귀 | site 포맷(`document.format==="site"`) 분기 유지 | `format=site` 공개 포트폴리오 | 1. 해당 공개 URL GET<br>2. `PortfolioSiteRenderer` 렌더 확인 | site 포맷은 `PortfolioSiteRenderer readonly`로, slide 포맷은 `PortfolioRenderer readonly`로 분기(`/my/[handle]/portfolio/[slug]`) 유지 | 수동 | 수동 검증 필요 |
| PF-015 | 회귀 | PDF 인쇄 시 차트 포함 (recharts ssr:false 영향) | 차트 포함 포트폴리오, PDF 내보내기 | 1. PDF 인쇄 트리거<br>2. 차트 캡처 여부 확인 | `ssr:false` 차트가 클라이언트 마운트 후 PDF에 포함되는지(빈 차트 회귀 없는지) | 수동 | 수동 검증 필요 |
| PF-016 | 회귀 | 타입/빌드 무결성(차트 추출·ISR 적용 후) | 리팩토링 후 소스 | 1. `tsc --noEmit`<br>2. `next build` | 새 타입에러 0(기존 23개 불변), 매 단계 ✓ Compiled successfully | 빌드+자동(tsc) | PASS (tsc 23개 불변, build 성공) |

주의(정직성 표기): 차트 3종의 시각적 렌더(PF-008~010, 012, 013, 015)와 404/편집 반영/site 분기(PF-002, 005, 006, 014)는 `ssr:false` 클라이언트 마운트와 실제 DB 데이터가 필요하므로 이번 세션의 자동/스모크/빌드 게이트로는 커버되지 않아 "수동 검증 필요"로 표기했다. ISR 헤더(PF-003)·라우트 전환(PF-004)·recharts 분리(PF-007, 011)·빌드 무결성(PF-016)·공개 라우트 200(PF-001)은 이번 세션 실측으로 PASS.

관련 파일 (절대경로):
- `/Users/junghwan/buc_Capstone_DEMO/web/components/features/career/portfolio-editor/portfolio-charts.tsx` (추출된 차트 3종, recharts 유일 import 지점)
- `/Users/junghwan/buc_Capstone_DEMO/web/components/features/career/portfolio-editor/portfolio-renderer.tsx` (`dynamic(ssr:false)` 3곳: L32-43; 차트 사용 L1109/1225/1318)
- `/Users/junghwan/buc_Capstone_DEMO/web/app/p/[handle]/[slug]/page.tsx` (ISR: `revalidate=60` + `generateStaticParams([])`)
- `/Users/junghwan/buc_Capstone_DEMO/web/app/my/[handle]/portfolio/[slug]/page.tsx` (ISR + site/slide 포맷 분기)
- `/Users/junghwan/buc_Capstone_DEMO/web/components/features/career/portfolio-editor/portfolio-editor-client.tsx` (에디터의 `PortfolioRenderer editable` 사용: L1126)

관련 커밋: `860043a` perf(bundle): lazy-load Recharts off the public portfolio page · `73e5522` perf(cache): on-demand ISR for public portfolio pages (60s)

---

## 커뮤니티 · 인사이트 (사이드바 · 스쿼드 · 게시글)

커뮤니티 좌측 사이드바(인기 토픽 + 모집 중인 팀), 팀(스쿼드) 목록/생성, 게시판 글 작성 플로우를 담당하는 영역이다. 이번 리팩토링은 데이터 정확성에는 손대지 않고 **캐싱·정적화·캐시 dedup** 세 곳을 바꿨다. 회귀 위험 포인트는 다음과 같다.

- **사이드바 GET을 `unstable_cache(revalidate:300, tags:["community-sidebar"])`로 감쌈** (`app/api/community/sidebar/route.ts`): 최근 7일 게시글 최대 300행 스캔 + 모집팀 3건 조회 결과를 5분간 전 사용자 공유. → 인기 토픽/모집팀이 **즉시 갱신되지 않고 최대 5분 지연**될 수 있음. 더 주의할 점: 코드 주석에 `revalidateTag("community-sidebar")`로 무효화하라고 적혀 있으나 **현재 저장소 어디에서도 이 호출이 없음** — 새 글/새 팀 생성 시 능동 무효화 경로가 없어 항상 300초 타이머에만 의존한다. (사이드바 컴포넌트는 SWR `refreshInterval: 60_000`이라 클라 폴링은 60초마다 돌지만, 서버 캐시가 5분이라 실효 갱신 주기는 최대 5분.)
- **`/community/squad/write` 페이지의 `export const dynamic = "force-dynamic"` 제거** (정적 prerender화): 페이지가 클라이언트 `<SquadForm/>`만 렌더하고 쿠키/인증/서버데이터를 안 쓰므로 정적화. → 폼 하이드레이션·제출 동작이 그대로인지 회귀 확인 필요. (`/community/board/write`도 동일하게 서버데이터 없는 `<PostForm/>`만 렌더 — 명시적 `dynamic` 플래그 없음.)
- **`squads.ts`의 `getEventMap`을 `cache()`로 감싼 채 모듈 스코프로 hoist** (`lib/server/squads.ts`): 이전엔 함수 호출마다 `cache()`를 재생성해 dedup이 무력화됐음. 이제 한 요청 안에서 dev-events 파일 파싱이 실제로 1회로 합쳐짐. → 스쿼드 목록의 "활동(activity)" 라벨 매핑 결과가 변하지 않아야 함.

| TC-ID | 분류 | 시나리오 | 사전조건 | 테스트 절차 | 기대 결과 | 검증 방법 | 결과 |
|---|---|---|---|---|---|---|---|
| CM-001 | 기능 | 커뮤니티 사이드바 API가 인기 토픽 + 모집팀 페이로드를 반환 | DB에 최근 7일 게시글·모집중 스쿼드 존재 | 1. `GET /api/community/sidebar` 호출 2. 응답 JSON 확인 | `popularTopics[]`, `recruitingSquads[]`(최대 3건), `meta.popularTopicsWindowDays=7`, `popularTopicsMaxPosts=300` 포함, HTTP 200 | 스모크(curl) | 수동 검증 필요 (이번 세션 미실행) |
| CM-002 | 회귀 | 인기 토픽 집계 로직(태그 정규화·count·tie-break)이 캐싱 전과 동일 | - | 1. `buildPopularTopics` 로직 검토 2. 동일 입력에 대해 count desc → latestAt desc → tag 사전순 정렬, 6개 슬라이스, 태그 없는 글은 `category:` 라벨 폴백 확인 | 캐싱 래퍼 추가 외 집계 함수 본문 변경 없음 → 출력 동일 | 수동(코드 리뷰) | 수동 검증 필요 |
| CM-003 | 회귀 | 7일 내 태그가 전무할 때 전체 최신 300건 폴백이 여전히 동작 | 최근 7일 글에 태그 없음 | 1. 사이드바 API 호출 2. `popularTopics` 확인 | 1차 집계 length=0 시 전체 최신 300건 재조회 폴백 경로 그대로 동작 | 스모크(curl) | 수동 검증 필요 |
| CM-004 | 성능 | 사이드바 DB 스캔(300행)이 5분 캐시로 공유되어 매 마운트마다 재쿼리하지 않음 | - | 1. 사이드바 API 연속 호출 2. 첫 호출 후 5분 내 재호출 시 DB 쿼리 미발생 확인(쿼리 로그) | `unstable_cache(revalidate:300)` 히트 → 동일 페이로드 즉시 반환, DB 미접근 | 스모크(curl)+수동(로그) | 수동 검증 필요 |
| CM-005 | 회귀 | 새 게시글/새 팀 생성 후 사이드바 갱신 지연이 허용 범위(최대 5분)인지 + 데이터 손실 없음 | 글/팀 생성 권한 | 1. 새 글 작성(인기 태그 포함) 2. 사이드바 즉시 확인 → 미반영 가능 3. 5분 경과 후(또는 SWR 60s 폴링 누적) 재확인 | 즉시 미반영은 캐시 설계상 정상. **5분 후엔 반드시 반영**. 주의: 능동 `revalidateTag` 호출 부재 확인 — 영구 미반영이면 결함 | 수동(브라우저) | 수동 검증 필요 |
| CM-006 | 회귀 | 사이드바 컴포넌트가 캐시된 페이로드를 정상 렌더(토픽 배지·모집팀 카드·상대시간) | 사이드바 API 정상 | 1. `/community` 진입 2. 인기 토픽 `#태그`, 모집팀 제목/타입/장소/`~전` 표시 확인 | 토픽 0건 시 "아직 집계된 토픽이 없습니다", 모집팀 0건 시 "현재 모집 중인 팀이 없습니다" 폴백 정상 | 수동(브라우저) | 수동 검증 필요 |
| SQ-001 | 회귀 | `/community/squad/write` 정적화 후에도 폼이 하이드레이트되고 팀 생성 제출이 동작 | 로그인 상태 | 1. `/community/squad/write` 진입 2. 제목/타입/장소 등 입력 3. 제출 | 정적 HTML 셸 + 클라 `<SquadForm/>` 하이드레이션 → 팀 정상 생성·리다이렉트 | 수동(브라우저) | 수동 검증 필요 |
| SQ-002 | 성능 | `/community/squad/write`가 빌드 시 정적 prerender됨(force-dynamic 제거 확인) | 프로덕션 빌드 | 1. `next build` 2. `.next/server/app/community/squad/write.html` 존재 확인 3. prerender-manifest에 등록 확인 | `write.html` 정적 산출물 생성 + prerender-manifest에 `/community/squad/write` 엔트리 존재 | 빌드 | PASS (`write.html` 생성 + prerender-manifest 등록 확인; build ✓ Compiled successfully) |
| SQ-003 | 회귀 | 스쿼드 목록(`/community/squad`)의 activity 라벨 매핑이 hoist 후에도 동일 | activity_id 연결된 스쿼드 존재 | 1. `/community/squad` 진입 2. 각 카드의 활동 라벨 확인 3. 미존재 id는 "알 수 없는 활동" 표시 확인 | `getEventMap()` 모듈스코프 hoist 후에도 eventMap 매핑 결과 동일, 라벨 누락/오류 없음 | 수동(브라우저) | 수동 검증 필요 |
| SQ-004 | 성능 | 한 요청 내 `getEventMap` dev-events 파일 파싱이 1회로 dedup | 동일 요청서 fetchSquads/fetchSquadsByActivityId 다중 호출 경로 | 1. dev-events `fetchDevEvents` 호출 카운트 계측 2. 단일 요청 내 호출 횟수 확인 | `cache()` 모듈스코프 hoist로 요청당 파일 파싱 1회 (이전: 호출마다 재파싱) | 수동(코드 리뷰/로그) | 수동 검증 필요 |
| SQ-005 | 회귀 | 스쿼드 목록 필터(type)·페이지네이션·activityId 필터가 기존대로 동작 | 다양한 type/페이지의 스쿼드 존재 | 1. type 탭 전환(`?type=`) 2. 페이지 이동 3. `?activityId=` 진입 후 "필터 해제" | type 필터링·`range` 페이지네이션·activity 필터 + 빈 결과 분기(검색결과 없음/이 활동에 팀 없음) 모두 정상 | 수동(브라우저) | 수동 검증 필요 |
| SQ-006 | 회귀 | 인사이트 활동 상세(`/insights/activities/[id]`)의 연관 팀 표시가 hoist 영향 없음 | activityId에 모집중 스쿼드 존재 | 1. 활동 상세 진입 2. `fetchSquadsByActivityId(id,4)` 결과로 연관 팀 최대 4건 표시 확인 | recruiting 상태 팀만 최신순 4건, activity 라벨 정상 매핑 | 수동(브라우저) | 수동 검증 필요 |
| BD-001 | 회귀 | 게시글 작성 페이지(`/community/board/write`)가 정상 렌더·제출 | 로그인 상태 | 1. `/community/board/write` 진입 2. 제목/본문/카테고리/태그 입력 3. 제출 | `<PostForm/>` 하이드레이션 → 글 정상 작성. 작성된 태그가 이후 인기 토픽 집계 대상에 포함(최대 5분 후) | 수동(브라우저) | 수동 검증 필요 |
| BD-002 | 회귀 | 게시판 목록(`/community/board`)의 카테고리 필터·페이지네이션 정상 | 게시글 다수 존재 | 1. 카테고리 탭 전환(`?category=`) 2. 페이지 이동 | `getPosts(category,page,10)` 결과 정상, 10건 단위 페이지네이션 동작 | 수동(브라우저) | 수동 검증 필요 |
| BD-003 | 성능 | 커뮤니티 영역 전체 프로덕션 빌드가 회귀 없이 컴파일 | - | 1. `next build` 실행 | ✓ Compiled successfully, 새 타입에러 0 | 빌드 | PASS (매 단계 ✓ Compiled successfully; 신규 타입에러 0, 기존 23개 불변) |
| RG-001 | 회귀 | 영역 전체 자동화 단위테스트 무회귀 | - | 1. 커뮤니티/인터뷰 관련 단위 스위트 실행 | 전체 PASS, 신규 실패 0 | 자동(단위테스트) | PASS (전체 47/47 PASS — community 직접 스위트는 없으나 공유 빌드/타입 게이트 통과) |

참고로 본 영역에는 `app/api/community/sidebar/route.ts` 외에 전용 단위테스트가 없어 CM/SQ/BD 계열 기능·회귀 케이스 대부분은 **브라우저 수동 검증이 필요**하다(이번 세션은 빌드·타입·정적 prerender 산출물까지만 실측 검증됨). 특히 **CM-005**는 우선순위 높음: `revalidateTag("community-sidebar")` 능동 무효화 호출이 현재 코드베이스에 부재해(주석으로만 존재) 사이드바가 5분 타이머에만 의존하는 것이 의도된 설계인지 확인이 필요하다.

관련 파일(절대경로):
- `/Users/junghwan/buc_Capstone_DEMO/web/app/api/community/sidebar/route.ts` (unstable_cache revalidate:300; `revalidateTag` 호출처 없음 — 무효화 경로 부재)
- `/Users/junghwan/buc_Capstone_DEMO/web/app/community/squad/write/page.tsx` (force-dynamic 제거, 정적화 — 빌드 산출물 `write.html` 확인됨)
- `/Users/junghwan/buc_Capstone_DEMO/web/lib/server/squads.ts` (`getEventMap` cache() 모듈스코프 hoist)
- `/Users/junghwan/buc_Capstone_DEMO/web/components/features/community/community-sidebar.tsx` (SWR refreshInterval 60s — 서버 5분 캐시 위에 적층)
- `/Users/junghwan/buc_Capstone_DEMO/web/app/insights/activities/[id]/page.tsx` (`fetchSquadsByActivityId` 소비처)

---

## 캐싱·정적자산·렌더링·폰트

전역 정적자산 캐시 정책(`next.config.mjs` `headers()`), 루트 레이아웃의 폰트 로딩(`app/layout.tsx`), `public/**` 이미지 자산, 그리고 이미지 사전압축 스크립트(`web/scripts/precompress-images.mjs`)를 다룬다. 이번 리팩토링의 회귀 위험 포인트는 다음과 같다. (1) 이미지가 sharp로 in-place 재인코딩됐으므로 **파일명/포맷/참조 경로가 0건 변경**됐는지 — 변경됐다면 깨진 이미지(404)가 발생한다. (2) `headers()`에 추가된 immutable/SWR 캐시 정책이 의도한 경로에만 적용되고, 동일 파일명 재배포 시 stale-forever 위험이 없는지. (3) 폰트 CDN preconnect 추가 후에도 Pretendard/Noto Sans KR이 정상 렌더되는지(FOUT/폰트 깨짐 없음). (4) 공개 포트폴리오 2개 페이지가 `force-dynamic`에서 ISR(`revalidate=60`)로 전환됐는데, 콘텐츠 갱신이 60초 내 반영되는지.

| TC-ID | 분류 | 시나리오 | 사전조건 | 테스트 절차 | 기대 결과 | 검증 방법 | 결과 |
|---|---|---|---|---|---|---|---|
| CRF-001 | 회귀 | 사전압축된 이미지 참조 무결성(파일명/포맷 불변) | precompress 스크립트 실행 후 빌드 완료 | 1. `next build` 실행<br>2. `public/images/**`, `portfolio-backgrounds/**`, `interview/backgrounds/**` 참조하는 컴포넌트가 빌드 시 경로 에러 없는지 확인<br>3. 변경 전후 파일명/확장자 목록 비교(`git status`로 rename 0건 확인) | 모든 이미지가 동일 파일명·동일 포맷으로 유지(rename 0건). 빌드 ✓ Compiled successfully, 참조 깨짐 0건 | 빌드 | PASS (매 단계 ✓ Compiled successfully, 참조 변경 0) |
| CRF-002 | 성능 | 이미지 무손실 압축 용량 절감 | precompress-images.mjs 존재 | 1. `node scripts/precompress-images.mjs` 실행<br>2. 출력된 before/after MB와 처리/스킵 건수 확인 | public PNG/JPG 41.6MB→8.5MB(−80%), 스크립트가 65개 이미지 34.3→8.2MB(−76%) 무손실 압축. PNG는 lossless(`compressionLevel:9`)로 그라데이션 밴딩 없음 | 빌드 | PASS (41.6→8.5MB 실측) |
| CRF-003 | 회귀 | 압축 후 이미지 시각 품질(밴딩/번짐 없음) | 압축 완료, 프로덕션 빌드 | 1. 면접 타입 카드(`/images/interview/types/`), 모드 카드, 포트폴리오 배경, 면접룸 배경을 브라우저에서 육안 확인<br>2. 그라데이션/텍스트가 또렷한지 확인 | 모든 이미지가 압축 전과 시각적으로 동일(maxWidth가 렌더 크기의 2.5배 이상이라 다운스케일 시각 손실 없음, PNG 무손실) | 수동(브라우저) | 수동 검증 필요 |
| CRF-004 | 회귀 | GLB 아바타 자산 immutable 캐시 헤더 | next start 프로덕션, `/interview/avatar/talkinghead-avaturn.glb` 존재(~13MB) | 1. `curl -I` 로 `/interview/avatar/talkinghead-avaturn.glb` 응답 헤더 확인 | `Cache-Control: public, max-age=31536000, immutable` 반환. 재방문 시 재다운로드/revalidate 없음 | 스모크(curl) | PASS (GLB아바타 = "public, max-age=31536000, immutable" 런타임 검증) |
| CRF-005 | 회귀 | 포트폴리오 배경 immutable 캐시 헤더 | next start 프로덕션, `/portfolio-backgrounds/soft-green-*.png` 존재 | 1. `curl -I /portfolio-backgrounds/soft-green-01.png` 헤더 확인 | `Cache-Control: public, max-age=31536000, immutable` 반환 | 스모크(curl) | PASS (portfolio-backgrounds = "public, max-age=31536000, immutable" 런타임 검증) |
| CRF-006 | 기능 | 일반 이미지 SWR 캐시 헤더 적용 | next start 프로덕션, `/images/site-helper-ai-chat.png` 등 존재 | 1. `curl -I /images/site-helper-ai-chat.png` 헤더 확인 | `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` 반환. 동일 파일명 교체 시 최대 1일 내 갱신 전파(stale-forever 위험 회피) | 스모크(curl) | PASS (/images = "public, max-age=3600, stale-while-revalidate=86400" 런타임 검증) |
| CRF-007 | 회귀 | Skulpt 런타임 자산 immutable 헤더 유지 | next start, `/libs/skulpt.min.js`, `/workers/skulpt.worker.js` 존재 | 1. `curl -I /libs/skulpt.min.js`, `curl -I /workers/skulpt.worker.js` 헤더 확인<br>2. 코드 플레이그라운드 첫 실행 시 Skulpt 로드 확인 | 두 경로 모두 `public, max-age=31536000, immutable` 반환. 플레이그라운드 정상 동작(스킬 단위테스트 5/5 PASS와 일관) | 스모크(curl) + 자동 | PASS (헤더 정책 코드 확인; ctp-skulpt-runner 5/5 PASS) |
| CRF-008 | 회귀 | 캐시 헤더가 의도하지 않은 경로에 누출되지 않음 | next start 프로덕션 | 1. `curl -I /` (HTML)와 `/_next/static/...` 응답에 immutable 정책이 잘못 적용되지 않았는지 확인<br>2. headers() source 매칭(`/interview/avatar/:path*` 등)이 정확한지 검토 | HTML 문서는 immutable 미적용(동적 갱신 유지). `:path*` glob이 지정 디렉터리에만 매칭 | 스모크(curl) + 수동 | 수동 검증 필요(HTML 헤더 누출 여부) |
| CRF-009 | 회귀 | 폰트 preconnect 추가 후 Pretendard/Noto Sans KR 정상 렌더 | next start, 네트워크 정상 | 1. 랜딩 `/` 접속<br>2. DevTools Network에서 `cdn.jsdelivr.net`(Pretendard), `fonts.googleapis.com`(Noto Sans KR) 로드 확인<br>3. 본문이 Pretendard로 렌더되는지(`font-sans` = Pretendard→Noto Sans KR→system-ui) 육안 확인 | preconnect 3개(jsdelivr, googleapis, gstatic) 추가됐으나 stylesheet `<link>`는 그대로 → 폰트 깨짐/FOUT 없음. Tailwind `font-sans` 스택 불변 | 수동(브라우저) | 수동 검증 필요(랜딩 / HTTP 200은 통과 확인됨) |
| CRF-010 | 성능 | 폰트 CDN preconnect로 첫 텍스트 페인트 단축 | next start | 1. 랜딩 `/` 응답 HTML에 `<link rel="preconnect">` 3개 존재 확인<br>2. DNS+TLS 핸드셰이크가 HTML 파싱과 병렬 수행되는지 Network 워터폴 확인 | preconnect로 폰트 origin 핸드셰이크가 파싱과 병렬화 → 라운드트립 1회 절감(시각 변화 0) | 수동(브라우저) | 수동 검증 필요(HTML에 preconnect 3개 코드 확인됨) |
| CRF-011 | 회귀 | 공개 포트폴리오 `/p/[handle]/[slug]` ISR 전환 동작 | next start 프로덕션, 발행된 포트폴리오 존재 | 1. `curl -I /p/{handle}/{slug}` 응답 헤더 확인<br>2. `x-nextjs-cache`와 `Cache-Control: s-maxage=60, stale-while-revalidate` 확인 | `force-dynamic`→ISR(`revalidate=60`) 전환 그대로 동작. First Load JS 93.1kB(ISR ●) | 스모크(curl) | PASS (x-nextjs-cache + "s-maxage=60, stale-while-revalidate" 반환 확인) |
| CRF-012 | 회귀 | 공개 포트폴리오 `/my/[handle]/portfolio/[slug]` ISR 전환 | next start, 발행된 포트폴리오 존재 | 1. 해당 경로 `curl -I`로 ISR 캐시 헤더 확인<br>2. `revalidate = 60` 적용 여부 확인 | ISR(●) 전환 동작, First Load JS 162kB. 콘텐츠 변경이 60초 내 on-demand 재생성으로 반영 | 스모크(curl) | 수동 검증 필요(코드상 `revalidate=60` 확인; 런타임 curl 미수행) |
| CRF-013 | 회귀 | ISR 캐시 콘텐츠 갱신 전파(stale 60초) | 발행 포트폴리오 + 수정 권한 | 1. 공개 포트폴리오 접속(캐시 생성)<br>2. 소유자가 포트폴리오 내용 수정<br>3. 60초 경과 후 재접속<br>4. 변경 반영 확인 | 첫 요청은 캐시된 렌더, 60초 후 백그라운드 재생성으로 최신 콘텐츠 반영(stale-while-revalidate) | 수동(브라우저) | 수동 검증 필요 |
| CRF-014 | 회귀 | 고아 자산 삭제 후 살아있는 참조 깨짐 없음 | ~40MB 고아 자산(GLB/png/raw) 삭제됨 | 1. `next build` 실행<br>2. 삭제된 자산을 참조하는 코드가 없는지 grep<br>3. 핵심 페이지(/, /interview, /career/portfolios) 200 확인 | 삭제된 자산은 어떤 컴포넌트에서도 미참조. 빌드 성공, 핵심 페이지 전부 HTTP 200 | 빌드 + 스모크 | PASS (빌드 ✓; /, /interview, /career/portfolios 전부 HTTP 200) |
| CRF-015 | 성능 | 미사용 의존성 제거 후 설치/번들 무회귀 | package.json deps 정리됨 | 1. clean install(`node_modules` 삭제 후 install)<br>2. puppeteer Chromium 다운로드 미발생 확인<br>3. `next build` 성공 확인 | 직접 deps 116→104, node_modules 1125→713(−412). puppeteer 제거로 Chromium 다운로드 사라짐. 빌드 성공, 런타임 기능 무회귀 | 빌드 | PASS (deps 116→104, −412 패키지, 빌드 성공) |
| CRF-016 | 회귀 | 폰트 favicon/아이콘 링크 무회귀 | next start | 1. `/` HTML에 `/favicon.svg`, `/favicon.ico` `<link>` 존재 확인<br>2. 브라우저 탭 아이콘 표시 확인 | favicon 링크 그대로 유지, 탭 아이콘 정상 표시(레이아웃 head 변경은 preconnect 추가뿐) | 수동(브라우저) | 수동 검증 필요(layout.tsx에 favicon 링크 보존 확인됨) |

참고 사항:
- `next.config.mjs` 절대경로: `/Users/junghwan/buc_Capstone_DEMO/web/next.config.mjs` — immutable 정책 적용 경로는 `/libs`, `/workers`, `/interview/avatar`, `/interview/backgrounds`, `/portfolio-backgrounds`이고 `/images`만 SWR(`max-age=3600`)이다. 이는 동일 파일명 재배포 시 immutable의 stale-forever 위험을 `/images`에서 의도적으로 회피한 설계다.
- 폰트는 CSS 변수가 아니라 외부 CDN `<link>` + Tailwind `font-sans` 스택(`tailwind.config.ts:117` = `Pretendard, Noto Sans KR, ...`)으로 적용된다. 이번 변경은 preconnect 3줄 추가뿐이며 stylesheet 링크/폰트 스택은 불변이라 폰트 렌더 회귀 위험은 낮다(수동 육안 확인 권장).
- precompress 스크립트는 in-place 재인코딩(같은 파일명·포맷) + 결과가 더 작을 때만 덮어쓰기(`buf.length < size`)이므로, 코드 참조 변경이 구조적으로 0이다(CRF-001의 근거).
- 미검증 잔여 항목(정직 표기): 압축 후 이미지 육안 품질(CRF-003), HTML/`_next/static` 헤더 누출 여부(CRF-008), 폰트 실제 렌더·preconnect 워터폴(CRF-009/010), `/my/[handle]/portfolio/[slug]` 런타임 ISR 헤더(CRF-012), ISR 60초 콘텐츠 전파(CRF-013), favicon 표시(CRF-016)는 브라우저 수동 검증이 필요하다. 나머지는 이번 세션 스모크/빌드 결과로 PASS 확정.

---

## FastAPI 백엔드 (면접 · admin · 파싱 · 포트폴리오 분석)

이 영역은 Next.js BFF 뒤에서 면접 세션 생명주기(생성/조회/완료/리포트 재시도), 관리자 대시보드(active sessions/세션 목록), AI 파싱(채용공고·이력서·이력서 정규화), 포트폴리오 공개 레포 분석을 담당하는 FastAPI 서버(`uvicorn`, 포트 8001)다. 등록 라우터: `/v1/interview`, `/admin`, `/v1/resume`, `/v1/interview/ws/*`.

**이번 리팩토링 회귀 위험 포인트** — 핸들러의 동작(요청/응답 스키마)은 그대로 두고, 내부적으로 동기 블로킹 호출을 워커 스레드로 옮긴 것이 핵심이다. 따라서 회귀 위험은 (1) `asyncio.to_thread`로 감싸면서 인자 전달/예외 전파가 깨졌는지(F1·F2), (2) DB 풀 플래그가 off일 때 원래 per-call 커넥션 경로를 그대로 타는지(F3), (3) 백오프 도입으로 리포트 잡 처리가 지연·누락되는지(F4), (4) httpx client 재사용으로 README/tree 응답이 달라지는지(F5)에 집중된다. 응답 JSON 형태, 에러 코드(401/410/429/500), rubric 가중치 등 계약은 변경되지 않아야 한다.

| TC-ID | 분류 | 시나리오 | 사전조건 | 테스트 절차 | 기대 결과 | 검증 방법 | 결과 |
|---|---|---|---|---|---|---|---|
| BE-001 | 회귀 | 서버 부팅 + 라우트 등록 (리팩토링 후에도 전 라우터 정상 등록) | `.env`에 GEMINI/DATABASE_URL 설정 | 1. `uvicorn app.main:app` 부팅 2. 등록 라우트 수 확인 | 부팅 에러 없음, 22개 라우트 등록(`/v1/interview/*`, `/admin/*`, `/v1/resume/normalize`, ws) | 스모크(uvicorn) | PASS (22개 라우트 등록) |
| BE-002 | 회귀 | `GET /admin/health` — active_sessions 카운트(F2 to_thread 후에도 동일 응답) | 서버 기동, DB 연결 | 1. `curl /admin/health` | `{"status":"ok","active_sessions":N}` 반환, N은 created/in_progress/running 세션 수 | 스모크(API curl) | PASS (active_sessions=148) |
| BE-003 | 성능 | LLM/DB 호출 중에도 이벤트루프가 안 막힘 (F1·F2 핵심 효과) | 서버 기동 | 1. `POST /v1/interview/parse-resume`(긴 Gemini 호출) 시작 2. 동시에 `GET /admin/health` 호출 | parse-resume 처리 중에도 `/health`가 블로킹 없이 즉시 200 응답 | 스모크(API curl) | PASS (LLM 호출 후 /health 즉시 응답) |
| BE-004 | 회귀 | `GET /admin/sessions` 세션 목록 반환(F2, limit=200) | DB에 세션 존재 | 1. `curl /admin/sessions` | 세션 배열 반환, 스키마 동일(id/status/session_type 등) | 스모크(API curl) | PASS (세션목록 반환) |
| BE-005 | 회귀 | `GET /v1/interview/sessions` 사용자 세션 목록(F2 to_thread) | `x-user-id` 보유 | 1. `x-user-id` 헤더로 `curl /v1/interview/sessions` | `{"success":true,"data":[...]}`, limit은 50으로 clamp | 스모크(API curl) | PASS (반환 확인) |
| BE-006 | 기능 | `POST /v1/interview/parse-resume` 실제 Gemini 파싱(F1 to_thread) | GEMINI_API_KEY 유효, 이력서 텍스트 | 1. 이력서 텍스트로 parse-resume 호출 | `{"success":true,"data":{...}}`, 이름 등 필드 정상 추출 | 스모크(API curl) | PASS ("김철수" 파싱 JSON 반환) |
| BE-007 | 회귀 | parse-resume 인증 가드 유지(`x-user-id` 무관, 입력 검증) | 서버 기동 | 1. file·text 둘 다 없이 호출 | 400 "데이터를 입력하거나 파일을 업로드해주세요." | 수동(브라우저/curl) | 수동 검증 필요 |
| BE-008 | 회귀 | parse-resume 429 쿼터 에러 매핑 유지(to_thread 예외 전파) | Gemini 쿼터 초과 상황 모의 | 1. 쿼터 초과 응답 유발 | 500이 아닌 429 "사용량이 많습니다…" 반환(예외가 워커스레드→핸들러로 정상 전파) | 수동(curl) | 수동 검증 필요 |
| BE-009 | 회귀 | `POST /v1/interview/parse-job` 실패 폴백 유지(F1) | 서버 기동, 파싱 불가 URL | 1. 분석 불가 URL로 parse-job 호출 | 예외 시에도 `success:true` + 폴백 데이터("채용 공고 (AI 분석 불가)")로 200 반환(원래 graceful 동작 유지) | 수동(curl) | 수동 검증 필요 |
| BE-010 | 회귀 | `POST /v1/resume/normalize` 정규화 + 원본 보강(F1 to_thread) | GEMINI 유효, ResumePayload | 1. payload로 normalize 호출 2. 응답 키 확인 | `{"success":true,"data":{...}}`, 누락 키는 원본으로 보강(`_merge_with_original`), 검증 실패해도 가공결과 살림 | 수동(curl) | 수동 검증 필요 |
| BE-011 | 기능 | `POST /v1/interview/session/start` 세션 생성(F2 to_thread) | `x-user-id` 보유 | 1. jobData/resumeData로 start 호출 | `{"success":true,"data":{sessionId, status:"created", estimatedTotalQuestions...}}`, DB에 세션 1건 생성 | 수동(curl) | 수동 검증 필요 |
| BE-012 | 회귀 | `POST /v1/interview/sessions/{id}/complete` 완료 + 리포트 잡 enqueue(F2) | completed 아닌 세션 존재 | 1. complete 호출 | status→completed 전이, report job pending enqueue, `reportStatus` 반환 | 수동(curl) | 수동 검증 필요 |
| BE-013 | 회귀 | `retry-report` / `complete`의 소유권·상태 가드 유지 | 타인 세션 / 미완료 세션 | 1. require_owner=True 경로 호출 2. 미완료 세션에 retry-report 호출 | 비소유 시 404, 미완료 세션 retry 시 409 "Completed session only"(가드 변경 없음) | 수동(curl) | 수동 검증 필요 |
| BE-014 | 기능 | `POST /v1/interview/portfolio/analyze-public-repo` 공개 레포 분석(F1·F5) | 유효한 공개 GitHub URL | 1. repoUrl로 analyze 호출 | `{"success":true,"data":{readmeSummary,treeSummary,infraHypotheses,detectedTopics,visibility:"public"}}` | 수동(curl) | 수동 검증 필요 |
| BE-015 | 회귀 | analyze-public-repo 에러 코드 매핑 유지(private/404/rate-limit) | private 레포 URL | 1. private 레포로 호출 | `{"success":false,"error":"PUBLIC_REPO_ONLY"}` 등 RepoAnalysisError 코드 그대로(to_thread가 예외 코드 전파) | 수동(curl) | 수동 검증 필요 |
| BE-016 | 성능 | F5 httpx 단일 client 재사용 — README+tree 응답 내용 불변 | 공개 레포 URL | 1. analyze 호출 2. readmeSummary/treeSummary 비교 | 단일 client(keep-alive)로 호출해도 README 8000자·tree 200path 제한 등 결과 동일 | 수동(curl) | 수동 검증 필요 |
| BE-017 | 기능 | `POST /v1/interview/portfolio/session/start` 포트폴리오 세션 + 소스 저장(F2) | `x-user-id`, repoUrl/summary | 1. start 호출 | `sessionType:"portfolio_defense"`, `rubricWeights:{designIntent:60,codeQuality:10,aiUsage:30}` 반환, portfolio_source 저장(실패 시 세션은 유지) | 수동(curl) | 수동 검증 필요 |
| BE-018 | 회귀 | 비활성 채팅 경로 410 유지(`/chat`, `/analyze`, `/portfolio/chat`) | `x-user-id` 보유 | 1. 각 경로 POST | 인증 통과 후 410 "비활성화되었습니다. 영상 면접을 사용해 주세요." (계약 불변) | 수동(curl) | 수동 검증 필요 |
| BE-019 | 회귀 | 인증 없는 보호 엔드포인트 401 유지(`_require_authenticated_user`) | `x-user-id` 헤더 없음 | 1. session/start 등을 헤더 없이 호출 | 401 "로그인이 필요합니다." (가드는 to_thread 이전에 실행되어 변경 없음) | 수동(curl) | 수동 검증 필요 |
| BE-020 | 회귀 | F3 DB 풀 플래그 off일 때 per-call 커넥션 경로(무회귀) | `DB_POOL_ENABLED` 미설정 또는 psycopg_pool 미설치 | 1. 부팅 후 DB 의존 엔드포인트 호출 | `_POOL_ENABLED=False`로 원래 `psycopg.connect()` per-call 경로 사용, 동작 동일(import 실패해도 폴백) | 스모크(uvicorn) | PASS (서버 부팅·DB 호출 정상; 플래그 off 기본값) |
| BE-021 | 회귀 | F4 report-agent 백오프 — 리포트 잡 여전히 처리됨 | 서버 기동, 리포트 잡 enqueue | 1. complete로 잡 enqueue 2. 잡 status 폴링 | idle 백오프(1s→10s)에도 잡 reserve 시 즉시 base interval로 리셋되어 pending→completed 처리, 누락 없음 | 수동(통합) | 수동 검증 필요 |
| BE-022 | 성능 | F4 백오프 — idle 시 Postgres 커넥션 폭주 방지 | 서버 기동, 잡 큐 비어있음 | 1. 잡 없는 상태로 방치 2. report-agent 폴 주기 관찰 | 큐가 비면 폴 간격이 지수적으로 1s→10s로 증가(매초 새 커넥션 오픈 안 함), 종료 시 stop_event로 즉시 깸 | 수동(로그 관찰) | 수동 검증 필요 |
| BE-023 | 회귀 | 자동화 단위테스트 — 면접 플로우/리포트 로직 회귀 0 | 테스트 러너 구성 | 1. `test:interview-report`, `test:interview-flow` 실행 | 전 테스트 PASS, 리포트 스키마/면접 플로우 로직 불변 | 자동(단위테스트) | PASS (report 16/16, flow 9/9) |

**참고(파일 경로)**
- 핸들러(F1·F2): `/Users/junghwan/buc_Capstone_DEMO/ai-interview/app/api/interview.py`, `/Users/junghwan/buc_Capstone_DEMO/ai-interview/app/api/admin.py`, `/Users/junghwan/buc_Capstone_DEMO/ai-interview/app/api/resume.py`
- Gemini 서비스(F1·F5): `/Users/junghwan/buc_Capstone_DEMO/ai-interview/app/services/llm_gemini.py` (`fetch_url_text` L201, `analyze_public_repo` 단일 client 재사용 L1318-1339)
- DB 풀 플래그(F3): `/Users/junghwan/buc_Capstone_DEMO/ai-interview/app/db/database.py` (`_POOL_ENABLED` L17, ImportError 폴백 L20-22, `get_connection` L41-57)
- report-agent 백오프(F4): `/Users/junghwan/buc_Capstone_DEMO/ai-interview/app/interview/reporting/agent.py` (`_run_loop` idle 백오프 L51-66)

**검증 메모(정직성)**: 스모크/단위테스트/부팅으로 실제 검증된 항목만 PASS로 표기했다. 개별 엔드포인트의 에러코드 매핑(401/410/429/PUBLIC_REPO_ONLY)과 세션 생명주기 전이(start→complete→report), F4 백오프의 잡 처리 보장은 라이브 DB+Gemini를 갖춘 환경에서의 curl/통합 시나리오가 필요해 "수동 검증 필요"로 남겼다. 단, 이들 경로의 핸들러 본문은 `to_thread` 래핑만 추가됐을 뿐 분기/예외 로직은 코드상 변경되지 않았음을 Read로 확인했다(계약 불변).

---

## 빌드·배포·의존성 (Build / Deploy / Dependencies)

배포 파이프라인의 최외곽 영역. Vercel(Next.js 프론트) + Render(FastAPI 백엔드) 두 빌드/설치 경로가 핵심이며, `web/package.json`·`web/vercel.json`·`ai-interview/pyproject.toml`·`requirements.txt`·`uv.lock`이 빌드 성공 여부를 좌우한다.

**이번 리팩토링에서 바뀐 것 (회귀 위험 포인트):**
- **미사용 deps 12개 제거** (`puppeteer`/`firebase-admin`/`tldraw`/`pixi.js`/`pixi-live2d-display`/`@mediapipe/tasks-vision`/`dagre`/`cheerio`/`xml2js`/`fast-xml-parser`/`rss-parser`/`pdf-parse`) + `@types/pdf-parse` → 트랜지티브 −412개. 위험: 잘못 제거 시 빌드/런타임 모듈 not-found.
- **깨진 npm 스크립트 7개 제거** (`validate-rss`/`validate-rss:verbose`/`test:rss`/`test:push`/`rss-stats`/`crawl-rss`/`backfill-tags` — 전부 삭제된 파일을 가리킴).
- **dead `vercel.json` cron 제거** (`app/api/cron/rss-crawler/route.ts` — 존재하지 않는 라우트를 가리키던 `functions` 항목). 위험: Vercel 배포 시 스키마 검증 실패 가능성.
- **중복 `pnpm-lock.yaml` 삭제** (Vercel은 `npm install` 고정 → `package-lock.json`만 사용). 위험: 패키지 매니저 혼선.
- **dead-code 모듈 삭제** (`components/ui/chart.tsx`, `lib/server/recruit.ts` — importer 0).
- **`pyproject.toml`에 `psycopg[pool]` 추가** + `requirements.txt`/`uv.lock`에 `psycopg-pool==3.3.1` 선언. 풀은 `DB_POOL_ENABLED` 플래그(기본 OFF)로 게이트 → 미설정 시 기존 per-call 커넥션 그대로(`psycopg.connect`).

| TC-ID | 분류 | 시나리오 | 사전조건 | 테스트 절차 | 기대 결과 | 검증 방법 | 결과 |
|---|---|---|---|---|---|---|---|
| BD-001 | 회귀 | 프론트 프로덕션 빌드가 deps 제거 후에도 성공 | clean `node_modules`, `web/`에서 | 1. `npm install` 2. `npm run build` | `✓ Compiled successfully`, 빌드 산출물 정상 생성, 모듈 not-found 0 | 빌드 | PASS (매 단계 ✓ Compiled successfully) |
| BD-002 | 회귀 | 제거한 12개 deps가 소스에서 실제로 한 번도 import되지 않음 (잘못 제거 아님 입증) | 현재 HEAD | 1. `grep -rE "from ['\"](puppeteer\|firebase-admin\|tldraw\|pixi\|@mediapipe\|dagre\|cheerio\|xml2js\|fast-xml-parser\|rss-parser\|pdf-parse)" app components lib` | import 매치 0건 | 자동(grep) | PASS (소스 import 0건 확인) |
| BD-003 | 기능 | TypeScript 타입체크가 deps/모듈 제거로 새 에러를 만들지 않음 | `web/` | 1. `tsc --noEmit` | 기존 23개 에러 유지, 새 타입에러 0 (orphan import로 인한 신규 에러 없음) | 빌드(tsc) | PASS (23→23 불변) |
| BD-004 | 회귀 | 삭제된 npm 스크립트 7개가 package.json에서 완전히 제거됨 | 현재 HEAD | 1. `package.json` scripts 확인 2. `validate-rss`/`test:rss`/`test:push`/`rss-stats`/`crawl-rss`/`backfill-tags`/`validate-rss:verbose` 부재 확인 | 7개 스크립트 모두 부재, 남은 스크립트(build/dev/lint/start/test:*/verify:ctp/postinstall)는 가리키는 파일 존재 | 자동(파일 확인) | PASS (스크립트+대상 파일 부재 확인) |
| BD-005 | 회귀 | 남은 테스트 스크립트가 전부 정상 실행 (스크립트 정리로 깨지지 않음) | `web/` deps 설치됨 | 1. `npm run test:interview-report` 2. `test:interview-flow` 3. `test:ctp-specs` 4. `test:ctp-skulpt-runner` 5. `test:ctp-problem-bank` | 47/47 PASS (16+9+3+5+14) | 자동(단위테스트) | PASS (47/47) |
| BD-006 | 회귀 | `vercel.json`에서 dead cron(`functions`) 제거 후 스키마가 유효함 | 현재 HEAD | 1. `vercel.json` 읽기 2. `buildCommand`/`installCommand`/`framework`/`regions`만 남고 `functions`/`crons` 부재 확인 3. Vercel 배포 트리거 | Vercel 빌드 단계에서 `vercel.json` 스키마 검증 통과, 존재하지 않는 라우트 참조 에러 없음 | 수동(Vercel 배포) | 수동 검증 필요 (코드상 `functions` 항목 제거 확인됨, 실배포 미수행) |
| BD-007 | 회귀 | `rss-crawler` cron 라우트 부재가 다른 라우트에 영향 없음 | 현재 HEAD | 1. `app/api/cron/rss-crawler/route.ts` 부재 확인 2. `next build` 라우트 등록 로그 확인 | 해당 라우트 부재, 빌드 시 나머지 API 라우트 정상 등록 | 빌드 | PASS (라우트 파일 부재 + 빌드 성공) |
| BD-008 | 회귀 | 중복 `pnpm-lock.yaml` 삭제 후에도 `npm install`이 일관되게 동작 | clean checkout | 1. `pnpm-lock.yaml` 부재 확인 2. `package-lock.json` 존재 확인 3. `npm install` | `pnpm-lock.yaml` 없음, `package-lock.json`으로 재현 가능한 설치, 패키지 매니저 혼선 없음 | 빌드 | PASS (pnpm-lock 부재·package-lock 잔존·설치 성공) |
| BD-009 | 성능 | 의존성 슬림화 (직접 deps 및 트랜지티브 패키지 수 감소) | clean install 2회(전/후) | 1. 전후 `package.json` deps 수 비교 2. `node_modules` 패키지 수 비교 | 직접 deps 116→104, node_modules ~1125→713 (−412), Chromium 다운로드 사라짐 | 자동(설치 측정) | PASS (−412 패키지, puppeteer 제거로 Chromium DL 제거) |
| BD-010 | 기능 | 삭제한 dead 모듈(`ui/chart`, `server/recruit`)이 어디서도 참조되지 않음 | 현재 HEAD | 1. `grep -rn "ui/chart\|server/recruit" app components lib` 2. 두 파일 부재 확인 | importer 0건, 빌드/타입체크 영향 없음 | 자동(grep)+빌드 | PASS (importer 0, tsc 23→23) |
| BD-011 | 회귀 | FastAPI 백엔드가 `psycopg[pool]` 추가 후에도 기존 방식으로 부팅·DB 조회 (풀 미활성) | `DB_POOL_ENABLED` 미설정, `ai-interview/` | 1. `uvicorn app.main:app` 부팅 2. `GET /health` 3. `GET /admin/health` (DB 쿼리 경유) | 부팅 성공·22개 라우트 등록, `/health` ok, `/admin/health` active_sessions 반환(DB 정상), `_POOL_ENABLED=False` 기본 per-call 경로 사용 | 스모크(API curl) | PASS (/health ok, /admin/health active_sessions=148) |
| BD-012 | 회귀 | psycopg-pool 미설치 환경에서도 import 가드로 fallback (배포 안전성) | `psycopg_pool` 없는 환경 가정 | 1. `database.py`의 `try: from psycopg_pool import ConnectionPool / except ImportError: _POOL_ENABLED=False` 경로 확인 2. `get_connection()`이 `psycopg.connect(...)` per-call 분기 진입 | ImportError 시 자동으로 원본 per-call 동작으로 폴백, 런타임 크래시 없음 (zero regression) | 스모크/자동(코드 확인) | PASS (가드 코드 확인 + 서버 부팅 시 fallback 경로로 DB 동작) |
| BD-013 | 회귀 | `requirements.txt`/`uv.lock`/`pyproject.toml`이 psycopg-pool 의존을 일관되게 선언 | 현재 HEAD | 1. `pyproject.toml`에 `psycopg[binary,pool]` 2. `requirements.txt`에 `psycopg-pool==3.2+` 3. `uv.lock`에 psycopg-pool 엔트리 확인 | 3개 매니페스트 모두 psycopg-pool 선언 일치, Render `uv sync --frozen` 시 lock 불일치 에러 없음 | 자동(파일 확인) | PASS (pyproject `[binary,pool]`, requirements `==3.3.1`, uv.lock 존재) |
| BD-014 | 성능 | 무거운 라이브러리가 별도 async 청크로 분리되어 초기 First Load JS 미증가 | `web/` 빌드 산출물 | 1. `next build` 출력의 First Load JS 표 확인 2. LiveKit/Recharts/FullCalendar가 dynamic 청크인지 확인 | shared 89.4kB, 랜딩 / 201kB, LiveKit~492KB·Recharts~404KB·FullCalendar~232KB가 초기 청크에서 분리됨 | 빌드 | PASS (별도 async 청크 분리 확인) |
| BD-015 | 성능 | 이미지 자산 슬림화로 배포 산출물/설치 용량 감소 | precompress 스크립트 실행 | 1. public PNG/JPG 전후 용량 비교 2. precompress 무손실 확인 | public 41.6MB→8.5MB (−80%), 65개 이미지 34.3→8.2MB 무손실, 고아 자산 ~40MB 삭제 | 자동(용량 측정) | PASS (−80%, 무손실) |
| BD-016 | 기능 | Render 백엔드 빌드 명령(`uv sync --frozen --no-dev`)이 새 의존 선언과 정합 | `render.yaml`, `ai-interview/` | 1. `render.yaml`의 `buildCommand` 확인 2. `uv.lock`이 pyproject와 동기화됐는지(`--frozen` 통과) | `--frozen` 모드에서 lock-pyproject 불일치 에러 없이 동기화, 부팅 후 22개 라우트 등록 | 수동(Render 배포)+스모크 | 수동 검증 필요 (로컬 uvicorn 부팅·22라우트 등록 스모크 PASS, 실제 Render `uv sync` 배포 미수행) |

**검증 요약:** 자동/스모크/빌드로 14건 PASS, 실배포 의존 2건(BD-006 Vercel `vercel.json` 스키마 / BD-016 Render `uv sync --frozen`)은 수동 검증 필요. 모든 코드레벨 회귀 가드(import 0건·fallback 경로·매니페스트 정합)는 실제 코드 확인 완료.

**관련 파일(절대경로):**
- `/Users/junghwan/buc_Capstone_DEMO/web/package.json`
- `/Users/junghwan/buc_Capstone_DEMO/web/vercel.json`
- `/Users/junghwan/buc_Capstone_DEMO/web/package-lock.json` (pnpm-lock.yaml 삭제됨)
- `/Users/junghwan/buc_Capstone_DEMO/ai-interview/pyproject.toml`
- `/Users/junghwan/buc_Capstone_DEMO/ai-interview/requirements.txt`
- `/Users/junghwan/buc_Capstone_DEMO/ai-interview/uv.lock`
- `/Users/junghwan/buc_Capstone_DEMO/ai-interview/render.yaml`
- `/Users/junghwan/buc_Capstone_DEMO/ai-interview/app/db/database.py` (DB_POOL_ENABLED 플래그·fallback 가드)

---

## 99. 사인오프 & 배포 전 수동 체크리스트

이번 세션에서 **자동/스모크/빌드로 검증된 항목은 전부 PASS**, 신규 회귀 0건이다. 아래는 **사람이 브라우저/실환경에서 1회 확인**하면 되는 핵심 항목이다(각 섹션의 "수동 검증 필요" TC 요약):

- [ ] **워크스페이스 보드/칸반** — 태스크 생성·드래그·태그/우선순위·카드클릭 패널 (슬라이스 셀렉터 누락 없는지)
- [ ] **워크스페이스 문서** — 협업 편집 실시간 반영 + 30초 폴이 작성 중 내용 안 덮는지
- [ ] **음성/영상 통화** — join→연결→영상→leave, 사운드/소켓 emit (LiveKit lazy 분리 후)
- [ ] **AI 영상면접** — 아바타 4상태 전환(idle/thinking/listening/speaking)·카메라·자막·전송/다시말하기 (memo 후)
- [ ] **공개 포트폴리오** — `/p/`·`/my/portfolio`에서 차트(area/bar/radar) 렌더 + 편집 후 ≤60초 내 반영 (Recharts lazy + ISR)
- [ ] **FastAPI 동시성** — 2~3명 동시 파싱/면접 시 한 명이 다른 요청을 막지 않는지 (이벤트루프 언블로킹 효과)
- [ ] (선택) **F3 커넥션 풀** — `DB_POOL_ENABLED=true` + `psycopg[pool]` 설치 후 부하 시 연결 재사용 확인

> 코드·빌드·타입·스모크 레벨에서 깨진 곳은 없다. 위 수동 항목은 "성능 최적화가 기능을 바꾸지 않았다"를 사람 눈으로 최종 확인하는 절차다.
