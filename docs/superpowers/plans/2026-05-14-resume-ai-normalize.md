# 이력서 AI 정렬 (한국식 A4 fit) — 구현 계획

## Goal
사용자의 이력서/자소서/포트폴리오/프로젝트 데이터를 한국식 A4 이력서 양식에 알맞게 AI(Gemini)로 가공한다. 사용자가 톤·길이·강조·타겟 직무 등 다양한 옵션을 직접 선택해 자기 맞춤형 결과를 얻는다.

## Architecture

### 데이터 흐름
```
ResumeEditor "AI로 정리하기" 버튼
   ↓ (옵션 다이얼로그)
POST /api/career/resumes/normalize { payload, options }
   ↓ (BFF → FastAPI)
POST {AI_INTERVIEW_BASE_URL}/v1/resume/normalize
   ↓ (Gemini call)
{ data: ResumePayload }  ← 가공된 payload
   ↓
ResumeEditor.onChange(newPayload) + Undo toast (5초)
```

### 옵션 정의 (사용자 입력)
- **톤 (tone)**: `formal | casual | impact | custom`
- **길이 (length)**: `concise (1p) | standard (2p) | detailed (3p+)`
- **강조 영역 (highlights)**: 멀티 — `skills | experience | projects | selfIntro | education`
- **타겟 직무 (targetRole)**: 텍스트, 선택
- **자기소개 스타일 (selfIntroStyle)**: `growth | challenge | collaboration | achievement | custom`
- **가공 강도 (strength)**: `polish (가볍게 다듬기) | enhance (표현 보강) | rewrite (전면 재작성)`
- **사용자 메모 (notes)**: 텍스트, 자유 입력

### Gemini 시스템 프롬프트 (한국식 A4 ruleset)
- A4 1-3페이지 분량
- 회사명·직무명 한 줄 헤더, 기간 우측 정렬
- 경력은 "회사 · 직책 · 기간 / 핵심 성과 3-5줄 bullet"
- 프로젝트는 "이름 · 기간 / 한 줄 설명 / 기술스택 / 성과 bullet"
- 자기소개는 200-400자, 한 문단 또는 STAR 구조
- 이모지·과한 강조 금지, 격식체 또는 사용자 톤 옵션 준수
- 모든 필드는 비어있어도 무방 (사용자 옵션으로 결정)

## Tasks

### Task A — FastAPI 측 (`/v1/resume/normalize`)
**파일**: `ai-interview/app/api/interview.py` 또는 별도 모듈
- 입력 schema: `payload: ResumePayload`, `options: NormalizeOptions`
- Gemini 호출 (기존 `gemini.py` 헬퍼 활용 — `parse_job_from_text` 등의 패턴 모방)
- 응답: `{ data: ResumePayload }` (Pydantic 검증)
- 한국어 시스템 프롬프트 작성: 한국식 이력서 양식 + 사용자 옵션 반영
- 응답 JSON 형식 강제: `response_mime_type="application/json"`

### Task B — Web BFF (`/api/career/resumes/normalize`)
**파일**: `web/app/api/career/resumes/normalize/route.ts`
- POST 핸들러: Supabase 인증 → FastAPI 프록시
- 입력 validation: payload 객체 + options
- 응답: `{ success: true, data: ResumePayload }`
- 30초 timeout
- 기존 `/api/interview/parse-job` 패턴 모방

### Task C — UI 다이얼로그
**파일**: `web/components/features/resume/resume-ai-tune-dialog.tsx`
- shadcn `Dialog` (max-w-2xl)
- 폼 필드: 톤(radio 4) · 길이(radio 3) · 강조(checkbox 5) · 타겟 직무(input) · 자기소개 스타일(radio 5) · 가공 강도(radio 3) · 사용자 메모(textarea)
- "추천 프리셋" 3개: 신입 (concise/growth/polish) · 경력 (standard/achievement/enhance) · 도전 직무 (detailed/challenge/rewrite)
- 푸터: 취소 / "AI로 가공하기" (로딩 시 spinner)
- props: `{ open, onOpenChange, currentPayload, onApply(newPayload) }`

### Task D — ResumeEditor 통합
**파일**: `web/app/my/[handle]/tabs/resume-editor.tsx`
- 상단 배너 (`File parsing banner` 영역)에 "AI로 정리하기" 버튼 추가
- 클릭 → 다이얼로그 open
- onApply: 이전 payload를 ref에 보관 → `onChange(newPayload)` → toast with "원본 복원" action
- 토스트 5초 내 액션 → `onChange(previousPayload)` (Undo)

## 멀티에이전트 분배
- Wave 1 (병렬): Agent A (FastAPI + 시스템 프롬프트), Agent B (BFF route)
- Wave 2: Agent C (UI 다이얼로그)
- Wave 3 (host): Task D 통합

## 검증
- POST 호출 시 5-15초 내 응답 (Gemini 처리 시간)
- 응답 payload가 ResumePayload shape 준수
- 빈 옵션으로 호출 시에도 자연스러운 한국식 양식 생성
- 토스트의 Undo로 원본 복원 가능
