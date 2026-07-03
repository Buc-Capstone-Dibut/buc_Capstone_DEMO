# Dibut Capstone Demo

부천대학교 캡스톤 프로젝트 `Dibut(Buddy for Developers)` 모노레포입니다.

- AI 면접(텍스트/음성)
- 실시간 워크스페이스(화이트보드/문서/채팅)
- 기술 블로그/개발 이벤트 수집

## 아키텍처 & 인프라

<p align="center">
  <img src="docs/images/dibut-architecture.png" alt="Dibut Architecture & Infrastructure" width="840">
</p>

사용자 트래픽은 **Vercel**에 배포된 `web`(Next.js)으로 들어오고, REST/WSS로 **Render**의 두 백엔드와 통신합니다 — 면접 엔진 `ai-interview`(FastAPI)와 실시간 협업 `workspace-server`(Node). 데이터와 인증은 **Supabase**(Postgres + Auth)가 맡습니다. 면접·생성 파이프라인은 Gemini·OpenAI·LiveKit·GitHub API·Socket.IO 등 외부 서비스를 사용하며, `crawler`(Python)는 수집 결과를 Postgres에 JSON 캐시로 적재합니다.

> 실측 참고(2026-07 지식그래프 분석): `web/app/api`의 BFF 라우트 100개 중 **84개는 Prisma/Supabase/Gemini를 직접 호출하는 실구현**이고, FastAPI로 프록시하는 것은 면접 도메인 14개뿐입니다. 즉 `web`은 프론트엔드이자 **제품의 최대 백엔드**이며, `ai-interview`는 AI 면접 전문 엔진입니다. 상세: [지식그래프 분석 보고서](docs/architecture/2026-07-03-knowledge-graph-analysis.md)

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

## 배포 & CI/CD

<p align="center">
  <img src="docs/images/dibut-backend-cicd.png" alt="Dibut BackEnd CI / CD" width="840">
</p>

개발자가 GitHub 레포에 푸시하면 연동된 Git Hook이 각 플랫폼의 빌드를 트리거합니다. `web`은 **Vercel Git Hook**으로, `ai-interview`/`workspace-server`는 **Render Git Hook**으로 자동 배포됩니다. 빌드 시 Vercel은 백엔드 API/WSS URL을, Render 서비스들은 `DATABASE_URL`과 외부 API 키(Gemini·OpenAI·LiveKit·Socket.IO)를 환경변수로 주입받습니다.

현재 Render 서비스 URL 예시:

- `https://ai-interview-9p40.onrender.com`
- `https://dibut-workspace-server.onrender.com`

웹 배포 시 주요 env:

- `AI_INTERVIEW_BASE_URL=https://ai-interview-9p40.onrender.com`
- `NEXT_PUBLIC_AI_WS_URL=wss://ai-interview-9p40.onrender.com/v1/interview/ws/client`
- `NEXT_PUBLIC_WS_URL=wss://dibut-workspace-server.onrender.com`
- `NEXT_PUBLIC_SOCKET_URL=wss://dibut-workspace-server.onrender.com`

## 코드베이스 지식그래프 (팀 온보딩)

전체 코드베이스(896파일)를 노드 2,501개의 인터랙티브 지식그래프로 분석해 두었습니다. 그래프 데이터는 `.understand-anything/`에 커밋되어 있으므로, 팀원은 뷰어만 설치하면 됩니다:

```
/plugin marketplace add Egonex-AI/Understand-Anything   # Claude Code에서
/plugin install understand-anything
/understand-dashboard                                    # 대시보드 실행
```

10개 레이어 지도, 파일별 한국어 요약, 14단계 아키텍처 가이드 투어를 제공합니다. 설치 상세·수동 실행법·분석 결과는 [지식그래프 분석 보고서](docs/architecture/2026-07-03-knowledge-graph-analysis.md) 참고. 코드 변경 후에는 `/understand`로 증분 갱신하세요.

## 문서 바로가기

- 웹: [web/README.md](web/README.md)
- AI 면접 서버: [ai-interview/README.md](ai-interview/README.md)
- 워크스페이스 서버: [workspace-server/README.md](workspace-server/README.md)
- 크롤러: [crawler/README.md](crawler/README.md)
- **코드베이스 지식그래프 분석(2026-07-03)**: [docs/architecture/2026-07-03-knowledge-graph-analysis.md](docs/architecture/2026-07-03-knowledge-graph-analysis.md)
- 기술 인수인계 문서: [PROJECT_HANDOVER_KR.md](PROJECT_HANDOVER_KR.md)
- 성능 최적화·QA 검증 보고서: [docs/reports/2026-06-03-performance-optimization-report.md](docs/reports/2026-06-03-performance-optimization-report.md)
- 회귀 테스트 계획서: [docs/qa/2026-06-03-regression-test-plan.md](docs/qa/2026-06-03-regression-test-plan.md)
