# Deployment Runbook (Easy)

이 문서는 `web(Next.js)`, `ai-interview(FastAPI)`, `workspace-server(Node WS)`를 운영 배포하는 가장 간단한 절차만 정리합니다.

## 1) 어디에 배포하나

- `web` -> **Vercel**
- `ai-interview` -> **Render Web Service (Python)**
- `workspace-server` -> **Render Web Service (Node)**
- DB/Auth -> **Supabase**

권장 연결 구조:

1. Supabase 준비
2. ai-interview 배포 (Render)
3. workspace-server 배포 (Render)
4. web 배포 (Vercel) + 배포 URL 기준 env 최종 연결

## 2) web (Vercel) 배포

프로젝트 설정:

- Root Directory: `web`
- Build Command: `pnpm build`
- Install Command: `pnpm install`
- Output: Next.js 기본값 사용

필수 Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (Prisma read/write)
- `AI_INTERVIEW_BASE_URL` (예: `https://dibut-ai-interview.onrender.com`)
- `NEXT_PUBLIC_AI_WS_URL` (예: `wss://dibut-ai-interview.onrender.com/v1/interview/ws/client`)
- `NEXT_PUBLIC_AI_ADMIN_BASE_URL` (예: `https://dibut-ai-interview.onrender.com/admin`)
- `NEXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

배포 전 로컬 검증:

```bash
cd web
pnpm build
```

정상 기준: build exit code `0`

## 3) ai-interview (Render) 배포

소스 경로:

- Root Directory: `ai-interview`
- `render.yaml` 사용 가능

필수 Environment Variables:

- `DATABASE_URL` (Supabase Postgres)
- `GEMINI_API_KEY` (질문/분석 LLM)
- `OPENAI_API_KEY` (STT/TTS)
- `CORS_ORIGINS` (Vercel 도메인, 쉼표로 다중 허용)
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Start Command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

헬스체크:

- `GET /health`
- `GET /admin/health`

## 4) workspace-server (Render) 배포

소스 경로:

- Root Directory: `workspace-server`
- `render.yaml` 사용 가능

필수 Environment Variables:

- `DATABASE_URL`
- `PORT` (Render 기본 제공값 사용 권장. 하드코딩 금지)
- (선택) `CORS_ORIGIN` 또는 앱에서 요구하는 추가 WS 설정값

Start Command:

```bash
npm start
```

헬스체크:

- 서버 부팅 로그 확인
- `web`의 워크스페이스 접속 시 WebSocket handshake 성공 확인

## 5) 배포 후 연결 체크리스트

1. `web`에서 로그인 가능 (Supabase OAuth 포함)
2. `/interview/setup` -> `/interview/room/*` 진입 가능
3. `POST /api/interview/session/start` 성공
4. 화상 모드에서 LiveKit 토큰 발급 성공
5. WS 상태가 `Connected`로 유지
6. 결과 페이지(`/interview/result`) 분석 응답 정상
7. `/my/{handle}` 공개 조회 + 본인 편집 권한 분리 확인

## 6) 가장 자주 나는 장애와 즉시 조치

1. 증상: `Unsupported provider` (Google 로그인)
원인: Supabase Auth Provider 미활성 또는 Redirect URL 불일치  
조치: Supabase Dashboard -> Auth -> Providers에서 Google 활성 + Callback URL 일치

2. 증상: 면접 WS 재연결 루프
원인: `NEXT_PUBLIC_AI_WS_URL` 오설정, CORS 미허용, 서버 런타임 예외  
조치: 브라우저 Network WS 코드 확인 + ai-interview 로그에서 예외 추적

3. 증상: LiveKit 토큰 API 500
원인: `LIVEKIT_API_KEY/SECRET/URL` 누락  
조치: Vercel/Render 각각 env 재설정 후 재배포

4. 증상: Prisma DB 에러
원인: `DATABASE_URL` 불일치, 스키마 미반영  
조치: Supabase 연결문자열 재확인 + migration 재적용

## 7) 운영 팁 (MVP)

- 비밀키는 `.env`에만 저장하고 Git에 커밋하지 않습니다.
- 배포는 항상 순서대로: `ai/workspace -> web`
- web 배포 전에 반드시 `pnpm build`를 로컬에서 1회 실행합니다.
