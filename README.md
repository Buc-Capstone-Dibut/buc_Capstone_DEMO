# Dibut Capstone Demo

부천대학교 캡스톤 프로젝트 `Dibut(Buddy for Developers)` 모노레포입니다.

- AI 면접(텍스트/음성)
- 실시간 워크스페이스(화이트보드/문서/채팅)
- 기술 블로그/개발 이벤트 수집

## 프로젝트 한눈에 보기

```mermaid
flowchart LR
    U[User Browser] --> W[web / Next.js]
    W -->|REST| A[ai-interview / FastAPI]
    W -->|WSS| S[workspace-server / Node]
    A --> DB[(Supabase Postgres)]
    S --> DB
    A --> G[Google Gemini]
    A --> O[OpenAI STT/TTS]
    C[crawler / Python] --> DB
```

## 모노레포 구성

| 디렉토리 | 역할 | 기본 포트 | 배포 |
|---|---|---:|---|
| `web/` | Next.js 프론트 + BFF API | 3000 | Vercel |
| `ai-interview/` | 면접 엔진 FastAPI | 8001 | Render |
| `workspace-server/` | Socket.IO + Yjs 서버 | 4000 | Render |
| `crawler/` | RSS/이벤트 수집기 | - | Cron/수동 |
| `docs/` | 설계/운영 문서 | - | - |

## 로컬 실행 순서

### 1) 환경변수 파일 준비

```bash
cp web/.env.example web/.env.local
cp ai-interview/.env.example ai-interview/.env
cp workspace-server/.env.example workspace-server/.env
cp crawler/.env.example crawler/.env
```

### 2) 서버 실행

```bash
# web
cd web && pnpm install && pnpm dev

# ai-interview
cd ai-interview && uv sync && uv run uvicorn app.main:app --reload --port 8001

# workspace-server
cd workspace-server && npm install && npm run dev

# crawler (필요 시)
cd crawler && uv sync
```

## 배포 구조

```mermaid
flowchart TB
    V[Vercel - web] --> R1[Render - ai-interview]
    V --> R2[Render - workspace-server]
    R1 --> DB[(Supabase)]
    R2 --> DB
```

현재 Render 서비스 URL 예시:

- `https://ai-interview-9p40.onrender.com`
- `https://dibut-workspace-server.onrender.com`

웹 배포 시 주요 env:

- `AI_INTERVIEW_BASE_URL=https://ai-interview-9p40.onrender.com`
- `NEXT_PUBLIC_AI_WS_URL=wss://ai-interview-9p40.onrender.com/v1/interview/ws/client`
- `NEXT_PUBLIC_WS_URL=wss://dibut-workspace-server.onrender.com`
- `NEXT_PUBLIC_SOCKET_URL=wss://dibut-workspace-server.onrender.com`

## 문서 바로가기

- 웹: [web/README.md](web/README.md)
- AI 면접 서버: [ai-interview/README.md](ai-interview/README.md)
- 워크스페이스 서버: [workspace-server/README.md](workspace-server/README.md)
- 크롤러: [crawler/README.md](crawler/README.md)
