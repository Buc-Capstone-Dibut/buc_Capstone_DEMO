# Dibut 프로젝트 기술 문서 (인수인계용)

> **상태**: 졸업 작품 (Capstone Project)
> **역할**: 메인 개발자 (서준혁)
> **목표**: 개발자 커리어 성장 및 협업을 위한 올인원 플랫폼
> **참고:** 제품의 현재 구조와 운영 기준은 [프로젝트 기준 문서](docs/PROJECT_REFERENCE.md)를 우선합니다. 이 문서는 과거 인수인계 맥락을 보존합니다.

---

## 1. 시스템 개요 (아키텍처)

### **핵심 정체성 (Core Identity)**

"Dibut"는 **정보(Career)**와 **행동(Workspace)** 사이의 간극을 줄이는 플랫폼입니다. 파편화된 커리어 데이터(채용 공고, 개발자 행사)를 한곳에 모으고, 이를 바탕으로 팀이 즉시 협업할 수 있는 통합 워크스페이스를 제공합니다.

### **핵심 기술 스택 (High-Level Tech Stack)**

- **Frontend**: Next.js 14.2 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Zustand
- **Backend**:
  - **Web**: Next.js Server Actions / API Routes — ⚠️ 실측(2026-07): BFF 라우트 100개 중 84개가 Prisma/Supabase/Gemini 직접 호출 실구현. **web이 제품의 최대 백엔드다.**
  - **AI Interview Engine**: FastAPI (`ai-interview/`, Python 3.13) — 면접 세션 엔진·리포트 생성·Gemini Live 음성(STT/TTS)·LiveKit 토큰 발급
  - **Realtime Server**: Custom Node.js (Socket.IO) + Yjs Websocket Server (`workspace-server`)
  - **Database**: Supabase (PostgreSQL 15) - Prisma ORM 5.22로 관리 (web 스키마 61개 모델 + workspace-server 별도 스키마 37개 모델)
- **Data Pipeline**:
  - **Crawler**: Python 3.10+ (`crawler/`) — dev_event(GitHub Raw + Firecrawl/Gemini 심층 크롤링) · tech_blog(RSS 수집 + Gemini 태깅 → Supabase)
  - **Fetching**: Node.js `fs` access + GitHub Raw Content API
- **Real-time Engines**:
  - **Docs**: Yjs (CRDT) + BlockNote
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
  - **전송 계층**: `workspace-server`에서 구동되는 `y-websocket`.
- **칸반 보드**:
  - **라이브러리**: `@dnd-kit` (접근성 높은 Drag-and-Drop).
  - **낙관적 UI (Optimistic UI)**: UI를 즉시 업데이트하고, 백그라운드에서 DB와 동기화합니다.

#### **3. 실시간 커뮤니케이션**

- **채팅**: **Socket.IO** Namespace 사용. 메시지는 비동기적으로 Supabase `workspace_messages` 테이블에 영구 저장됩니다.
- **화상 회의 (Huddle)**: **LiveKit** (WebRTC SFU 아키텍처). P2P 메쉬 방식과 달리 10인 이상의 다자간 통화에서도 확장성이 뛰어납니다.

---

### **Module D: AI 모의면접 엔진 (현재 제품의 핵심)**

> 이 모듈은 초기 인수인계 시점 이후 추가된 **현재 Dibut의 대표 기능**입니다. 별도 FastAPI 서비스(`ai-interview/`, 포트 8001)가 전담합니다.

#### **1. 면접 플로우**

- **셋업 (web)**: 대상 선택(공고/이력서/모드/난이도) → `interview-setup-store`(Zustand)가 셋업 화면·결과 페이지 간 상태 공유 → 이력서까지 매핑된 공고는 최종 점검으로 바로 이동.
- **세션 시작**: BFF `web/app/api/interview/session/start` → FastAPI `POST /v1/interview/session/start` 프록시(x-user-id 헤더 + 타임아웃). 면접 도메인 프록시 라우트는 총 14개.
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
- **포트폴리오**: `web/lib/career-portfolios.ts`(함수 104개)가 도메인 허브. 8종 디자인 템플릿 렌더러 + 인라인 편집 + `ai-edit`(Gemini) + 공개 배포(showcase).

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
- `workspace_docs`: 블록 기반 문서 데이터.
- `workspace_channels` / `workspace_messages`: 채팅 데이터.

### **면접·커리어 도메인 (Interview & Career Domain)** *(2026-07 추가)*

- `interview_sessions` / `interview_reports`: 면접 세션·리포트 (FastAPI가 psycopg로 직접 접근).
- `user_job_postings` (+`user_job_posting_attachments`): 사용자 등록 채용 공고.
- `user_cover_letters`: 자소서. 이력서·포트폴리오 관련 테이블 포함.
- 마이그레이션은 `web/prisma/migrations/**` SQL 21개로 관리.

### **⚠️ 스키마 이원화 주의**

같은 Supabase Postgres를 **두 개의 Prisma 스키마**가 정의합니다 — `web/prisma/schema.prisma`(61개 모델)와 `workspace-server/prisma/schema.prisma`(37개 모델). 마이그레이션을 어느 쪽에서 돌리는지에 따라 충돌 위험이 있으므로, 테이블 소유 경계를 넘는 변경은 반드시 양쪽을 확인하세요.

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
│   ├── src/gateways/         # Socket.IO(채팅·프레즌스) + Yjs 게이트웨이
│   ├── src/services/         # ChatService (Prisma 영속화)
│   └── prisma/               # ⚠️ 별도 스키마 (37개 모델)
│
└── web/                      # Next.js 애플리케이션 (포트 3000)
    ├── app/                  # App Router 페이지 (115개 라우트 파일)
    │   ├── career/           # 채용·이력서·자소서·포트폴리오
    │   ├── interview/        # AI 면접 셋업·진행·리포트
    │   ├── my/               # 마이페이지·공고 관리
    │   ├── community/        # 스쿼드 및 게시판
    │   ├── insights/         # 기술 블로그·이벤트 피드
    │   └── workspace/        # 워크스페이스 상세
    ├── app/api/              # BFF 라우트 100개 (84 직접구현 / 14 FastAPI 프록시)
    ├── components/features/  # 도메인별 UI (career·interview·workspace 등)
    ├── lib/                  # 도메인 로직 (interview·server·job-postings·site-helper…)
    ├── store/                # Zustand (면접 셋업 등)
    └── prisma/               # 메인 스키마 (61개 모델) + 마이그레이션 21개
```

---

## 5. 주요 기술적 의사결정 및 근거 (Key Decisions)

1.  **왜 Raw Content API인가?**: GitHub API의 엄격한 Rate Limit을 우회하고, JSON 페이로드 오버헤드를 줄여 더 빠른 Fetching을 하기 위함입니다.
2.  **왜 Yjs인가?**: 실시간 텍스트 편집 시 중앙(서버) 없이도 일관성을 보장하는 분산 충돌 해결(CRDT)을 구현하기 위함입니다.
3.  **왜 순수 WS 대신 Socket.IO인가?**: 자동 재연결의 신뢰성과 내장된 "Room" 추상화를 통해 개발 생산성을 높이기 위함입니다.
4.  **왜 Selenium 대신 Python Requests인가?**: 브라우저를 띄우지 않고 API를 직접 타격하여 서버 리소스를 절약하고 속도를 10배 이상 향상시키기 위함입니다.

---

**AI 참고**: 향후 작업의 현재 기준은 [프로젝트 기준 문서](docs/PROJECT_REFERENCE.md)와 실제 코드입니다. 이 문서는 과거 인수인계 정보이므로, 배포·API·스키마 변경 전에는 반드시 현재 매니페스트와 소스를 다시 확인하세요.
**경고 (CRITICAL RULE)**: 데이터베이스 리셋(Database Reset)은 절대 금지합니다. 어떠한 경우에도 DB 스키마 삭제(`DROP`)나 초기화를 수행하지 마세요.
