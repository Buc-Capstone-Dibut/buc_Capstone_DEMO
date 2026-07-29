# Debut 프로젝트 기술 문서 (인수인계용)

> **상태**: 졸업 작품 (Capstone Project)
> **역할**: 메인 개발자 (서준혁)
> **목표**: 개발자 커리어 성장 및 협업을 위한 올인원 플랫폼
> **참고:** 제품의 현재 구조와 운영 기준은 [프로젝트 기준 문서](docs/PROJECT_REFERENCE.md)를 우선합니다. 워크스페이스 코드 상세는 [workspace-server/HANDOVER.md](workspace-server/HANDOVER.md)를 참조합니다.

---

## 1. 시스템 개요 (아키텍처)

### **핵심 정체성 (Core Identity)**

`Debut`은 **Dev + 벗(친구)**이라는 이름처럼 개발자의 취업 준비와 팀 협업을 함께하는 플랫폼입니다. **정보(Career)**와 **행동(Workspace)** 사이의 간극을 줄이고, 파편화된 커리어 데이터(채용 공고, 개발자 행사)를 한곳에 모아 팀이 즉시 협업할 수 있는 통합 워크스페이스를 제공합니다.

### **핵심 기술 스택 (High-Level Tech Stack)**

- **Frontend**: Next.js 14.2 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Zustand
- **Backend**:
  - **Web**: Next.js Server Actions / API Routes — 다수 BFF 라우트가 Prisma/Supabase/Gemini를 직접 호출하는 실구현이며, **web이 제품의 최대 백엔드다.**
  - **AI Interview Engine**: FastAPI (`ai-interview/`, Python 3.13) — 면접 세션 엔진·리포트 생성·Gemini Live 음성(STT/TTS)·LiveKit 토큰 발급
  - **Realtime Server**: Custom Node.js (Socket.IO + raw WebSocket/Yjs, 포트 4000, `workspace-server`)
  - **Database**: Supabase (PostgreSQL 15) - `web/prisma/schema.prisma`가 기준이고 `workspace-server/prisma/schema.prisma`는 채팅 런타임용 follower
- **Data Pipeline**:
  - **Crawler**: Python 3.10+ (`crawler/`) — dev_event(GitHub Raw + Firecrawl/Gemini 심층 크롤링) · tech_blog(RSS 수집 + Gemini 태깅 → Supabase)
  - **Fetching**: Node.js `fs` access + GitHub Raw Content API
- **Real-time Engines**:
  - **Docs**: Yjs (CRDT) + BlockNote, BFF 발급 HMAC 협업 토큰
  - **Whiteboard**: Yjs + Excalidraw
  - **Chat**: Socket.IO + Supabase Persistence
  - **Meeting**: LiveKit (WebRTC SFU)
  - **Voice Interview**: Gemini Live (native audio) — `WS /v1/interview/ws/client`

---

## 2. 핵심 모듈 및 구현 로직

### **Module A: 커리어 인텔리전스 (데이터 수집)**

외부 데이터를 집계하여 통합된 UI로 제공하는 모듈입니다.

#### **1. 개발자 행사 (GitHub Open Data)**

- **출처**: [GitHub Dev-Event Repo](https://github.com/brave-people/Dev-Event)
- **구현 방식**:
  - **Fetching**: 공식 API의 Rate Limit을 우회하기 위해 `requests`를 사용하여 `raw.githubusercontent.com/.../README.md`에 직접 접근합니다.
  - **중복 제거 (Deduplication)**: `(Link + Title)` 조합을 기반으로 결정론적(Deterministic)인 **UUID v5**를 생성합니다. 소스 데이터가 업데이트되어도 ID가 변하지 않아 데이터 일관성을 보장합니다.
  - **Serving**: 데이터를 JSON(`public/data/dev-events.json`)으로 캐싱하고, Next.js Server Components에서 `fs`로 읽어와 < 100ms의 LCP(초기 로딩 속도)를 달성합니다.

#### **2. 기술 블로그 (RSS Pipeline)**

- **엔진**: `crawler/src/apps/tech_blog/` — RSS 수집 → 중복 제거 → **Gemini 태깅** → Supabase 적재.
- **Deep Crawl**: `crawler/src/apps/dev_event/`는 GitHub README 파싱 후 **Firecrawl + Gemini**로 상세 페이지를 심층 크롤링합니다 (`FIRECRAWL_API_KEY`).

#### **3. 채용 공고 (사용자 등록형)**

> ⚠️ 과거의 사람인/원티드 내부 API 크롤러(`src/apps/saramin`)는 **제거되었습니다.** 현재 채용 공고는 크롤링이 아니라 사용자 등록 방식입니다.

- **등록**: 사용자가 공고 URL/텍스트를 등록하면 BFF가 FastAPI `POST /v1/interview/parse-job`으로 전달, LLM이 구조화(직무·기술스택·마감일)합니다.
- **저장**: `user_job_postings` 테이블 (+ 첨부 `user_job_posting_attachments`).
- **활용**: 등록된 공고는 AI 면접 셋업(공고 기반 면접)과 이력서 매핑에 사용됩니다.

---

### **Module B: 커뮤니티 & 자동 프로비저닝**

팀 모집부터 워크스페이스 생성까지의 생명주기를 관리합니다.

#### **1. 스쿼드 상태 머신 (Squad State Machine)**

- **상태**: `Recruiting`(모집 중) -> `Closed`(마감/트리거) -> `Active`(활동 중)
- **자동 프로비저닝 로직**:
  - 리더가 **[모집 마감]** 버튼을 클릭하면 트랜잭션이 발생합니다:
    1.  **Clone**: 스쿼드의 메타데이터(제목, 설명)를 복사하여 새로운 `Workspace` 행을 생성합니다.
    2.  **Migrate**: 모든 `SquadMembers`를 `WorkspaceMembers`로 이동시킵니다.
    3.  **Setup**: 기본 칸반 컬럼("할 일", "진행 중", "완료")을 자동으로 생성합니다.
  - **결과**: "팀원 찾기"에서 "협업 시작"으로 끊김 없는(Frictionless) 전환을 제공합니다.

#### **2. 재귀적 댓글 (Recursive Comments)**

- **구조**: `comments` 테이블 내 `parent_id` 자기 참조(Self-reference).
- **UI**: 재귀적 React 컴포넌트를 사용하여 무한 대댓글 구조를 렌더링합니다.

---

### **Module C: 워크스페이스 통합 ("The Bridge")**

Module A(정보)와 Module B(행동)를 연결합니다.

#### **1. ETL 파이프라인 (Scrap to Task)**

- **동작**: 사용자가 채용 공고 카드에서 "스크랩"을 클릭.
- **로직 (DTO Mapping)**:
  - `Job.title`, `Job.deadline`, `Job.link`를 추출합니다.
  - 이를 `Task.title`, `Task.due_date`, `Task.description`으로 매핑합니다.
- **자동 배치 (Auto-Placement)**:
  - 타겟 워크스페이스의 **"할 일(To Do)"** 컬럼을 찾습니다.
  - Prisma를 통해 `max(order) + 1`을 계산합니다.
  - 새로운 태스크 카드를 즉시 삽입합니다.

#### **2. 실시간 협업 ("Google Docs" 경험)**

- **문서 에디터**:
  - **라이브러리**: `BlockNote` (노션 스타일의 블록 기반 에디팅).
  - **동기화**: **Yjs** (CRDT 라이브러리)를 사용하여 다중 사용자 간 충돌 없는 동기화를 처리합니다.
  - **일반/협업 모드**: 일반 편집은 BFF가 `workspace_docs.content`를 저장하고, 협업 모드는 별도 세션·presence와 `doc:<docId>` Yjs 방을 사용합니다.
  - **인가**: BFF가 Supabase 세션·워크스페이스 멤버십·문서 소속을 확인한 뒤 5분 HMAC 토큰을 발급합니다.
  - **영속화**: workspace-server가 Yjs 전체 상태를 BFF 내부 API로 보내면 `workspace_doc_states`와 `workspace_docs.content`가 한 트랜잭션에서 갱신됩니다.
- **아이디어 보드**:
  - **라이브러리**: `Excalidraw`, `y-excalidraw`, Yjs.
  - **동기화**: `whiteboard:<workspaceId>` Yjs 방을 사용하고 `workspace_whiteboards`에 상태를 저장합니다.
- **칸반 보드**:
  - **라이브러리**: `@dnd-kit` (접근성 높은 Drag-and-Drop).
  - **낙관적 UI (Optimistic UI)**: UI를 즉시 업데이트하고, 백그라운드에서 DB와 동기화합니다.

#### **3. 실시간 커뮤니케이션**

- **채팅**: 기본 Socket.IO namespace의 workspace/channel room을 사용합니다. workspace-server의 `ChatService`가 Prisma로 `workspace_channels`, `workspace_messages`, 멘션 `notifications`를 직접 저장합니다.
- **화상 회의 (Huddle)**: **LiveKit** (WebRTC SFU 아키텍처). P2P 메쉬 방식과 달리 10인 이상의 다자간 통화에서도 확장성이 뛰어납니다.
- **workspace-server 역할**: LiveKit 미디어를 중계하지 않고, 음성방 참가자 목록을 다시 읽게 하는 `voice:update` 신호만 전달합니다.

#### **4. 현재 실시간 계층의 제약**

- 문서 공동편집 외 Socket.IO·화이트보드 연결에는 서버 측 사용자 인증과 멤버십 검사가 완성되어 있지 않습니다.
- Socket.IO room, presence, Yjs 문서가 프로세스 메모리에 있어 현재 단일 프로세스를 전제로 합니다.
- Yjs 저장 실패가 클라이언트의 동기화 상태에 전달되지 않고, workspace-server에는 graceful shutdown·자동 테스트가 없습니다.
- 상세 변경 체크리스트는 `workspace-server/HANDOVER.md`를 기준으로 합니다.

---

### **Module D: AI 모의면접 엔진 (현재 제품의 핵심)**

> 이 모듈은 초기 인수인계 시점 이후 추가된 **현재 Debut의 대표 기능**입니다. 별도 FastAPI 서비스(`ai-interview/`, 포트 8001)가 전담합니다.

#### **1. 면접 플로우**

- **셋업 (web)**: 대상 선택(공고/이력서/모드/난이도) → `interview-setup-store`(Zustand)가 셋업 화면·결과 페이지 간 상태 공유 → 이력서까지 매핑된 공고는 최종 점검으로 바로 이동.
- **세션 시작**: BFF `web/app/api/interview/session/start` → FastAPI `POST /v1/interview/session/start` 프록시(x-user-id 헤더 + 타임아웃).
- **음성 면접**: `WS /v1/interview/ws/client` (`ws_runtime.py`) — Gemini Live native-audio 기반 STT/TTS, VAD(무음 감지) 파라미터는 env로 튜닝. 텍스트 채팅 면접은 **폐기**(BFF `interview/chat`은 410 반환).
- **세션 엔진**: `session_engine.py`가 턴 정책·질문 흐름 관리, `llm_gemini.py`(GeminiService)가 질문 생성·분석.
- **리포트**: 완료 후 비동기 생성 — `report-status` 폴링 + `retry-report` 재시도. 리포트는 점수제가 아닌 **보고서/구간 재체험형**.
- **LiveKit**: `POST /v1/interview/livekit/token`으로 토큰 발급 (화상 면접 룸).

#### **2. FastAPI 엔드포인트 지도**

- `/v1/interview`: parse-job · parse-resume · session/start · chat · analyze · sessions(목록/상세) · prepare-opening · report-status · retry-report · complete · health · livekit/token · portfolio/{analyze-public-repo, session/start, chat}
- `/v1/resume/normalize`, `WS /v1/interview/ws/client`, `/admin/*`, `GET /health`
- DB 접근은 psycopg 풀(`database.py`) — **Prisma가 아님** (web과 다른 접근 방식).

#### **3. 세션 조회의 특례**

면접 세션 목록/상세 조회는 FastAPI를 거치지 않고 **BFF가 Supabase admin client로 직접 조회**합니다 (user_id 소유권 검사로 IDOR 방지). 같은 도메인 안에서 쓰기=프록시/읽기=직접이라는 비대칭이 있으니 수정 시 주의.

### **Module E: 커리어 문서 스튜디오**

- **이력서/자소서**: `resume-editor.tsx`(1,252줄), `use-cover-letter-wizard.ts`(1,563줄 훅) — Gemini 기반 생성·첨삭, PDF 스냅샷 내보내기.
- **포트폴리오**: `web/lib/career-portfolios.ts`가 도메인 허브다. 디자인 템플릿 렌더러 + 인라인 편집 + `ai-edit`(Gemini) + 공개 배포(showcase)를 제공한다.

---

## 3. 데이터베이스 스키마 주요 사항 (Prisma)

### **인증 도메인 (Auth Domain)**

- `users`: Supabase Auth 사용자.
- `profiles`: 공개 프로필 데이터 (닉네임, 평판, 티어).

### **커리어 & 커뮤니티 (Career & Community)**

- `squads`: 모집 중인 팀. `activity_id` (FK)를 통해 행사 데이터와 연결됩니다.
- `squad_members`: 다대다(Many-to-Many) 관계 테이블.

### **워크스페이스 도메인 (Workspace Domain)**

- `workspaces`: 최상위 엔티티.
- `kanban_tasks`: 핵심 작업 단위. `kanban_columns`와 연결됩니다.
- `workspace_docs`: 블록 기반 문서 스냅샷.
- `workspace_doc_states`: 문서 공동편집 Yjs 상태.
- `workspace_doc_collab_sessions` / `workspace_doc_live_presence`: 공동편집 세션과 heartbeat.
- `workspace_whiteboards`: 워크스페이스별 화이트보드 Yjs 상태.
- `workspace_channels` / `workspace_messages`: 채팅 데이터.

### **면접·커리어 도메인 (Interview & Career Domain)** *(2026-07 추가)*

- `interview_sessions` / `interview_reports`: 면접 세션·리포트 (FastAPI가 psycopg로 직접 접근).
- `user_job_postings` (+`user_job_posting_attachments`): 사용자 등록 채용 공고.
- `user_cover_letters`: 자소서. 이력서·포트폴리오 관련 테이블 포함.
- 마이그레이션은 `web/prisma/migrations/**` SQL로 관리.

### **⚠️ 기준/추종 스키마 주의**

같은 Supabase Postgres를 두 Prisma 스키마가 참조하지만 동등한 마이그레이션 소스가 아닙니다. `web/prisma/schema.prisma`와 `web/prisma/migrations/**`가 기준이며, `workspace-server/prisma/schema.prisma`는 채팅 런타임에 필요한 모델을 따라가는 follower입니다. DB 변경은 web에서 만들고 검증한 후 workspace-server가 직접 사용하는 모델·필드만 동기화합니다.

---

## 4. 디렉토리 구조 맵 (Directory Structure Map)

```text
/
├── ai-interview/             # FastAPI AI 면접 엔진 (포트 8001, Python 3.13)
│   └── app/
│       ├── api/              # interview·resume·admin·ws 라우터
│       ├── interview/        # session_engine, ws_runtime(음성), 턴 정책
│       └── services/         # llm_gemini, gemini_live_voice, LiveKit
│
├── crawler/                  # Python 수집기 (Python 3.10+)
│   └── src/apps/
│       ├── dev_event/        # GitHub Raw + Firecrawl/Gemini 심층 크롤링
│       └── tech_blog/        # RSS → Gemini 태깅 → Supabase
│
├── workspace-server/         # Node.js 실시간 서버 (포트 4000)
│   ├── src/index.ts           # HTTP + Socket.IO + Yjs 단일 진입점
│   ├── src/config/            # env 로딩
│   ├── src/modules/socket/    # workspace room·presence·voice 갱신
│   ├── src/modules/chat/      # Socket.IO 채팅 + Prisma 영속화
│   ├── src/modules/board/     # Yjs 문서·화이트보드 + 레거시 board relay
│   └── prisma/                # web 기준 스키마의 follower
│
└── web/                      # Next.js 애플리케이션 (포트 3000)
    ├── app/                  # App Router 페이지
    │   ├── career/           # 채용·이력서·자소서·포트폴리오
    │   ├── interview/        # AI 면접 셋업·진행·리포트
    │   ├── my/               # 마이페이지·공고 관리
    │   ├── community/        # 스쿼드 및 게시판
    │   ├── insights/         # 기술 블로그·이벤트 피드
    │   └── workspace/        # 워크스페이스 상세
    ├── app/api/              # 도메인 BFF와 FastAPI 프록시
    ├── components/features/  # 도메인별 UI (career·interview·workspace 등)
    ├── lib/                  # 도메인 로직 (interview·server·job-postings·site-helper…)
    ├── store/                # Zustand (면접 셋업 등)
    └── prisma/               # 기준 스키마 + SQL 마이그레이션
```

---

## 5. 주요 기술적 의사결정 및 근거 (Key Decisions)

1.  **왜 Raw Content API인가?**: GitHub API의 엄격한 Rate Limit을 우회하고, JSON 페이로드 오버헤드를 줄여 더 빠른 Fetching을 하기 위함입니다.
2.  **왜 Yjs인가?**: 문서와 화이트보드 동시 편집의 충돌을 CRDT로 병합하고 연결이 복구될 때 상태를 다시 동기화하기 위함입니다.
3.  **왜 Yjs와 Socket.IO를 함께 쓰는가?**: 문서·화이트보드의 CRDT 프로토콜은 raw WebSocket/Yjs가, 채팅·presence·갱신 이벤트는 room과 acknowledgement가 편리한 Socket.IO가 담당합니다.
4.  **왜 Selenium 대신 Python Requests인가?**: 브라우저를 띄우지 않고 API를 직접 타격하여 서버 리소스를 절약하고 속도를 10배 이상 향상시키기 위함입니다.

---

**AI 참고**: 향후 작업의 현재 기준은 [프로젝트 기준 문서](docs/PROJECT_REFERENCE.md)와 실제 코드입니다. 이 문서는 과거 인수인계 정보이므로, 배포·API·스키마 변경 전에는 반드시 현재 매니페스트와 소스를 다시 확인하세요.
**경고 (CRITICAL RULE)**: 데이터베이스 리셋(Database Reset)은 절대 금지합니다. 어떠한 경우에도 DB 스키마 삭제(`DROP`)나 초기화를 수행하지 마세요.
