# 커리어 AI 시연 응답

## Why

졸업작품 발표에서 외부 AI 지연·실패·품질 편차 없이 커리어 AI 기능 전체를 시연해야 한다.

## Outcome

모든 계정에서 커리어 AI 기능이 한 명의 페르소나(김정환, 부천대 컴퓨터소프트웨어과 2027.02 졸업예정, SQLD·정보처리산업기사)와 한 개의 공고(㈜아카넷 「2026년 하반기 Acanet 웹개발자 채용 [서울] - 신입」, 대표 URL `https://m.jobkorea.co.kr/info/app_down.asp?Gno=50016735`)를 기준으로 준비된 응답을 돌려준다. 로딩 표시, 생각 중 단계, 타이핑 스트림, 필드 순차 입력 같은 기존 UI 동작은 그대로 유지한다.

## Boundaries

- `CAREER_AI_MODE` 기본값은 `demo`, `live`로 설정하면 기존 AI 경로로 돌아간다(`web/lib/career/demo/job-posting.ts`의 `isCareerDemoEnabled`). URL·계정·프로젝트 ID 게이트는 없다.
- 시연 문구는 `web/lib/career/demo/`에만 둔다(`persona.ts` 공통 사실, `job-posting.ts`, `cover-letter.ts`, `resume.ts`, `portfolio.ts`). 수치는 어디서나 동일하다: 문서 약 1,200건, 근거 일치율 약 87%(150문항 중 131), 평균 응답 3초 이내, 해커톤 10일 MVP·본선 진출.
- 적용 지점
  - 공고 분석 `POST /api/interview/parse-job`: 모든 URL·호출처에 1.5초 후 아카넷 공고(마감 2026-11-06)를 반환한다. `title`은 직무명으로 쓰인다.
  - 자소서 `POST /api/career/cover-letters/generate`: 선택한 프로젝트가 매칭되면 그 근거만, 아니면 세 프로젝트를 모두 쓴다(400 없음). 문항·단계·분량 제한과 `<dibut_state>`/`<dibut_answer>` 프로토콜을 지킨다. 문항 정보가 없는 이력서 AI 도우미 요청에는 프로토콜 없는 4문항 전체 자소서를 스트리밍한다.
  - 이력서 `POST /api/career/resumes/generate`: 4초 후 사용자의 항목 ID·순서를 유지한 채 이름 키워드로 매칭한 경력·프로젝트 문구, 기술, 학력, 한 줄 소개를 덮어쓴다. `selfIntroduction`은 50자 이하로 둔다(자소서 풀 자동 복사 방지).
  - 이력서 코치 `POST /api/resume/ai-coach`: 대화 다듬기·STADRI는 평문 스트림, 강점 분석·문장 교정은 2.5초 후 JSON. Gemini 키가 없어도 실패하지 않는다.
  - 웹 슬라이드 `GET /api/career/portfolios/[id]/generate`: Gemini 없이 선택 프로젝트 기반 결정적 빌더를 쓰고 단계마다 대기(총 약 9초)를 둔다. DB 기록·SSE 이벤트는 동일하다.
  - AI 편집 `POST /api/career/portfolios/[id]/ai-edit`: 2.5초 후 실제 페이지 ID로 만든 편집안(숨김·블록 삭제·지표 추가·흐름 4단계·부제/설명 다듬기)을 라우트의 기존 sanitizer에 통과시켜 반환한다.
  - 쇼케이스 `POST /api/career/portfolios/showcase/[id]/generate`: 6초 후 페르소나 카피를 기존 `mergeIntoContent` 경로로 채운다(학력 포함). 상태·폴링 계약은 그대로다.
  - 워크스페이스 경험 초안 서버 액션, `POST /api/career/portfolios/ai`: Gemini 대신 기존 결정적 폴백을 쓴다.
- 인증·소유권, 실제 편집·저장·재진입, AI 면접 모범답안(`/api/interview/sessions/[id]/model-answer`)은 바꾸지 않는다. DB 마이그레이션·배포·자동 커밋은 범위 밖이다.

## Done when

- `cd web && npx tsx --test lib/career/demo/demo.test.ts`가 통과한다(공고 계약, 프로젝트 선택·폴백, 문항별 분량, 프로토콜 비노출, 스트림 취소, 이력서 병합, AI 편집 패치 안전성, 쇼케이스 글자 수 제한).
- 위 적용 지점이 외부 AI 호출 없이 기존 UI 효과와 함께 동작하고, `CAREER_AI_MODE=live`에서는 기존 경로가 그대로 동작한다.
