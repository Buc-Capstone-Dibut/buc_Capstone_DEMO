# Dibut 프로젝트 기술 문서 (인수인계용)

> **상태**: 졸업 작품 (Capstone Project)
> **역할**: 메인 개발자 (서준혁)
> **목표**: 개발자 커리어 성장 및 협업을 위한 올인원 플랫폼

---

## 1. 시스템 개요 (아키텍처)

### **핵심 정체성 (Core Identity)**

"Dibut"는 **정보(Career)**와 **행동(Workspace)** 사이의 간극을 줄이는 플랫폼입니다. 파편화된 커리어 데이터(채용 공고, 개발자 행사)를 한곳에 모으고, 이를 바탕으로 팀이 즉시 협업할 수 있는 통합 워크스페이스를 제공합니다.

### **핵심 기술 스택 (High-Level Tech Stack)**

- **Frontend**: Next.js 14.2 (App Router), TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**:
  - **Web**: Next.js Server Actions / API Routes
  - **Realtime Server**: Custom Node.js (Socket.IO) + Yjs Websocket Server (`workspace-server`)
  - **Database**: Supabase (PostgreSQL 15) - Prisma ORM 5으로 관리
- **Data Pipeline**:
  - **Crawler**: Python 3.9 + Requests/BeautifulSoup (내부 API 리버싱)
  - **Fetching**: Node.js `fs` access + GitHub Raw Content API
- **Real-time Engines**:
  - **Docs**: Yjs (CRDT) + BlockNote
  - **Chat**: Socket.IO + Supabase Persistence
  - **Meeting**: LiveKit (WebRTC SFU)

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

#### **2. 채용 공고 (Python Crawler)**

- **출처**: 사람인(Saramin), 원티드(Wanted) - 내부 API 타겟팅
- **구현 방식**:
  - **엔진**: Python 스크립트 (`crawler/src/apps/saramin/crawler.py`).
  - **기법**: 내부 API 리버싱 (`get-recruit-list`). 무거운 Selenium/Playwright 대신, 브라우저 헤더를 모방한 HTTP 요청을 내부 엔드포인트로 직접 보냅니다.
  - **Deep Crawl**: 상세 페이지를 방문하여 본문 텍스트와 이미지를 추출, "읽기 모드"를 지원합니다.
  - **Politeness**: 랜덤 지연 시간(1.0~2.5초)과 User-Agent 로테이션을 적용하여 차단을 방지합니다.

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

---

## 4. 디렉토리 구조 맵 (Directory Structure Map)

```text
/
├── crawler/                  # Python 크롤러 엔진
│   ├── src/apps/saramin/     # 채용 공고 크롤링 로직
│   └── src/apps/dev_event/   # GitHub 데이터 Fetching 로직
│
├── workspace-server/         # Node.js 실시간 서버
│   ├── src/modules/board/    # Yjs 게이트웨이
│   └── src/modules/chat/     # Socket.IO 채팅 게이트웨이
│
└── web/                      # Next.js 애플리케이션
    ├── app/                  # App Router 페이지
    │   ├── career/           # 액티비티 및 채용 페이지
    │   ├── community/        # 스쿼드 및 게시판 페이지
    │   └── workspace/        # 워크스페이스 상세 페이지
    │
    ├── components/features/  # 기능별 UI 컴포넌트
    │   ├── career/           # EventCard, JobCard
    │   └── workspace/        # Kanban, DocEditor, Chat
    │
    ├── lib/server/           # 서버 사이드 데이터 Fetchers
    │   ├── dev-events.ts     # JSON 이벤트 리더
    │   └── recruit.ts        # JSON 채용 공고 리더
    │
    └── prisma/               # 데이터베이스 스키마
```

---

## 5. 주요 기술적 의사결정 및 근거 (Key Decisions)

1.  **왜 Raw Content API인가?**: GitHub API의 엄격한 Rate Limit을 우회하고, JSON 페이로드 오버헤드를 줄여 더 빠른 Fetching을 하기 위함입니다.
2.  **왜 Yjs인가?**: 실시간 텍스트 편집 시 중앙(서버) 없이도 일관성을 보장하는 분산 충돌 해결(CRDT)을 구현하기 위함입니다.
3.  **왜 순수 WS 대신 Socket.IO인가?**: 자동 재연결의 신뢰성과 내장된 "Room" 추상화를 통해 개발 생산성을 높이기 위함입니다.
4.  **왜 Selenium 대신 Python Requests인가?**: 브라우저를 띄우지 않고 API를 직접 타격하여 서버 리소스를 절약하고 속도를 10배 이상 향상시키기 위함입니다.

---

**AI 참고**: 향후 작업을 진행할 때 이 문서를 검증된 아키텍처 컨텍스트로 참조하십시오. 모든 주요 데이터 흐름(GitHub -> JSON -> UI -> Workspace DB)은 위 설명대로 구현되어 있습니다.
**경고 (CRITICAL RULE)**: 데이터베이스 리셋(Database Reset)은 절대 금지합니다. 어떠한 경우에도 DB 스키마 삭제(`DROP`)나 초기화를 수행하지 마세요.
