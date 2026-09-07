# 면접 영상과 전사문 리포트

## Why

현재 영상 구간은 DB 저장 시각으로 추정해 실제 발화와 어긋날 수 있다. 포트폴리오 디펜스 리포트에는 영상 UI가 없고, 저장 실패가 표시되지 않는다.

## Outcome

- 일반 면접과 포트폴리오 디펜스 리포트에 공통 '면접 영상' 탭을 제공한다.
- 질문과 답변의 전사문을 각각 클릭하면 녹화의 해당 시점에서 재생한다.
- PC는 영상 왼쪽/전사문 오른쪽, 모바일은 영상 위/전사문 아래로 배치한다.
- 저장 진행률, 실패와 재시도, 녹화 없음, 재생 오류를 표시한다.

## Boundaries

- `web`은 Vercel UI/BFF, `ai-interview`는 Render 면접 엔진이라는 기존 배포 경계를 유지한다.
- 영상은 서명 URL로 브라우저에서 Supabase Storage에 직접 업로드한다. 로컬 업로드 API는 개발 전용이다.
- 전사 원문은 Render의 기존 전사 이벤트/턴을 사용한다. 브라우저가 실제 음성 재생과 마이크 입력의 상대 시간을 녹화 기준으로 기록한다.
- 시간 정보와 전사 스냅샷은 기존 `interview_recordings.transcript` JSONB에 저장한다. 기존 녹화는 NULL을 허용한다.
- 실패한 완료 녹화는 같은 브라우저의 IndexedDB에 임시 보관하고 업로드 성공 후 삭제한다. 녹화 중 브라우저 강제 종료 복구는 포함하지 않는다.
- 유형별 분석과 기존 리포트 컴포넌트는 유지한다. workspace-server와 crawler는 변경 대상이 아니다.

## Done when

- 지연된 전사 이벤트가 와도 이미 기록한 영상 시각이 바뀌지 않는다.
- 질문/답변 선택, 재생 중 항목 강조, 구간별 피드백이 두 리포트에서 동작한다.
- 저장 실패 후 재시도해 영상과 전사문을 복구한다. 조회 오류와 녹화 없음은 구분한다.
- 웹 타입 검사, 관련 테스트, Render DB 호환성 검사, PC/모바일 브라우저 검증을 수행한다.

## Deployment

1. Supabase migration 또는 Render `ai-interview`의 기존 DB 초기화로 nullable `transcript` 컬럼을 먼저 추가한다.
2. Vercel `web`을 배포한다. DB 미적용 오류는 저장 실패로 표시하고 브라우저 원본을 유지한다.
3. 구버전 녹화는 전체 재생과 기존 추정 구간을 제공하되, 정확한 질문/답변 시간이 없는 상태를 표시한다.

## Verification

2026-09-07 검증: 웹 관련 테스트 79개, 백엔드 테스트 47개, PGlite 마이그레이션 검사, 운영 빌드 및 PC/모바일 Chromium 검증 통과. 전체 TypeScript 검사는 기존 develop의 오류가 그대로 남아 있으며 이번 기능에서 새로 발생한 오류는 없다. 실제 운영 DB 마이그레이션·배포와 실제 기기/네트워크 면접 검증은 수행하지 않았다.

- `web`: `npm run test:interview-recording`, `npm run test:interview-report`, `npm run test:interview-flow`, `npm run test:interview-contracts`.
- `ai-interview`: `uv run python -m unittest tests.test_interview_recordings_ddl tests.test_recording_signals_ddl tests.test_flow_contracts`.
- 브라우저 검증은 실제 MediaRecorder와 IndexedDB를 사용하고, 세션·Storage API는 모킹한다. 실제 Render/Supabase 배포 검증을 대체하지 않는다. 별도 QA 도구는 저장소 밖에 설치할 수 있다.

```bash
# 저장소 web/에서 실행. 웹 서버는 별도 터미널에서 npm run dev -- --port 3100.
QA_TOOLS=/tmp/interview-recording-qa-tools
npm install --prefix "$QA_TOOLS" --no-save --no-package-lock playwright@1.62.1 @electric-sql/pglite@0.5.8
"$QA_TOOLS/node_modules/.bin/playwright" install chromium
NODE_PATH="$QA_TOOLS/node_modules" node scripts/verify-interview-recording.mjs
RECORDING_QA_STORAGE=local NODE_PATH="$QA_TOOLS/node_modules" node scripts/verify-interview-recording.mjs
# ai-interview/.venv가 필요하며, 실제 운영 DB에 접속하지 않는다.
NODE_PATH="$QA_TOOLS/node_modules" node test/interview-recording-migration.mjs
```
