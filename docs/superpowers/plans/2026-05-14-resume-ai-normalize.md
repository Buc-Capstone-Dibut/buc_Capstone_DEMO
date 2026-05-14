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

---

## 부속 작업 — KoreanResumePreview 자연스러운 페이지 분기 (브라우저 인쇄 / PDF 저장)

### 배경
사용자가 이력서 페이지(`/resume`)에서 브라우저 인쇄 미리보기(Cmd+P / "PDF로 저장")를 호출하면, 본문이 A4 한 장에 다 들어가지 않을 때 마지막 줄이 잘려서 표시된다 (예: "특히 토스가 사용..."). react-pdf 다운로드(`ResumePdfDownloadButton`)는 자동 페이지 분기가 동작하지만, 브라우저 인쇄 경로에는 페이지 break 규칙이 없어 1페이지를 강제 fitting하다 잘리는 모양이다.

### 요구사항
- 이력서를 1페이지에 강제로 욱여넣지 않는다.
- 길이가 길어지면 자연스럽게 다음 페이지로 이어진다.
- 섹션 헤더(예: "WORK EXPERIENCE")가 페이지 마지막 줄에 외롭게 남지 않게 (`break-after: avoid`).
- 한 entry(경력 1개 / 프로젝트 1개) 가 페이지 경계에서 잘리지 않도록 `break-inside: avoid` (단, entry 자체가 페이지보다 크면 자동 분할).
- A4 사이즈에 맞는 print margin (1cm 또는 사용자 옵션).

### 구현
1. **글로벌 인쇄 CSS**: `web/app/globals.css` 에 인쇄 전용 규칙 추가
   ```css
   @media print {
     @page { size: A4; margin: 12mm; }
     html, body { background: #fff; }
     /* 이력서 카드: 인쇄 시 그림자 제거, 풀 너비 사용 */
     .print-resume { box-shadow: none !important; max-width: none !important; width: auto !important; }
     /* 페이지 분기 보호 */
     .print-resume [data-print-section] { break-inside: avoid; }
     .print-resume [data-print-title] { break-after: avoid; }
     .print-resume [data-print-entry] { break-inside: avoid; page-break-inside: avoid; }
   }
   ```
2. **KoreanResumePreview**에 `data-print-*` 속성과 클래스 부여:
   - 최상위 컨테이너에 `className="print-resume ..."`.
   - `ResumeSection` 컴포넌트 헤더 부분에 `data-print-title`.
   - 각 entry(경력 1개, 프로젝트 1개) 래퍼에 `data-print-entry`.
   - 페이지 분기를 막을 섹션 묶음 (예: TECHNICAL SKILLS 전체)는 `data-print-section`.
3. **인쇄용 hover/cursor/그림자 제거**: 인쇄 시 미리보기-only 시각효과 (e.g. preview의 cursor-pointer)를 `@media print { ... }` 로 무력화.
4. `/resume` 페이지 헤더에 "인쇄(브라우저 PDF로 저장)" 버튼 추가 — `window.print()` 호출. PDF 다운로드 버튼과 분리해서 두 경로 모두 지원.

### 검증
- 브라우저 인쇄 미리보기에서 본문이 길어졌을 때 마지막 라인이 잘리지 않고 다음 페이지로 자연스럽게 넘어가는지 (LongText 시나리오로 테스트).
- 섹션 헤더가 페이지 마지막에 외롭게 남지 않는지.
- 1페이지에 들어가는 짧은 이력서는 그대로 1페이지 출력.
