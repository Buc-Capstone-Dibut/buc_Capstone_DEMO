# 자기소개서 문항별 구조화 — 구현 계획

## Goal
사용자가 작성한 자기소개서를 단일 텍스트(`body`)가 아닌 **문항(question) + 답변(answer)** 단위로 보관·import·편집·렌더링한다. 이력서 편집기에서 문항별 입력 폼이 동적으로 생성되고, 미리보기/PDF에도 문항-답변 형식으로 깔끔하게 표시된다.

## 현재 상태 진단
- `user_cover_letters.body`: plain text 단일 컬럼. **문항 구조 손실**.
- `ResumePayload.coverLetters[].questions` 타입은 존재하나 DB에서 가져올 때 손실 (위저드의 프론트 상태에만 살아있음).
- ResumeImportDialog: `body → content`만 매핑 — questions 무시.
- ResumeEditor: 자소서 편집 폼 자체가 없음 (`payload.selfIntroduction` 단일 Textarea만).

## Architecture
```
user_cover_letters
  + questions JSONB  // [{ id, title, answer, maxChars, status, updatedAt }, ...]
       ↑
 cover-letter-wizard (저장 시 questions 포함)

 GET /api/my/cover-letters → { items: [..., questions] }
       ↓
ResumeImportDialog → ResumeEditor (questions 보존)
       ↓
 ResumeEditor: 자소서별 CollapsibleSection + 문항별 동적 입력 폼
       ↓
 KoreanResumePreview / ResumePdfDocument: 문항-답변 박스 렌더링
```

## Tasks

### A. DB + API (questions JSONB)
- Supabase 마이그레이션: `alter table user_cover_letters add column questions jsonb not null default '[]'::jsonb;`
- Prisma schema 동기.
- `GET /api/my/cover-letters` / `/[id]`: questions 응답에 포함.
- `POST /api/my/cover-letters` / `PATCH`: body 검증에 questions array 허용. 각 항목 shape 검증 (id/title/answer/maxChars 등).
- `serializeCoverLetter` (lib/job-postings/serialize.ts): questions 매핑.

### B. 위저드 저장 시 questions 포함
- `web/app/career/cover-letter-wizard/**`: 현재 final save 흐름에 `questions: Question[]` 추가하여 API 호출.
- 기존 자소서 호환: questions 비어있어도 OK (현재처럼 body만 저장 시 questions = [] 으로 유지).

### C. Import + Editor 문항별 폼
- `ResumeImportDialog`: `ensureCoverLetterShape` 에서 questions 전달.
- `ResumeEditor`: 자기소개서 영역을 다음으로 변경:
  - payload.coverLetters[]가 비어있으면 단일 Textarea (자유 자기소개)
  - 1개 이상이면 각 자소서마다 CollapsibleSection (title 헤더 + 회사·직무 메타) + 문항별 입력 폼:
    - 각 question: 제목(text input) + 답변(textarea, maxChars 카운터) + 글자수 표시
    - "+ 문항 추가" / "삭제" 액션
  - "자기소개 자유 입력" 모드와 "문항별 모드" 토글 (한 자소서 안에 둘 다 가능)

### D. 렌더링 (preview + PDF)
- `KoreanResumePreview`: `coverLetters[].questions`가 있으면 문항-답변 박스 (Q. / A. 분리), 없으면 plain content (현재 fallback 유지).
- `resume-pdf-document.tsx`: 자기소개서 섹션 추가
  - 자소서 1개당 페이지 break (선택)
  - 각 문항: 제목 bold + 답변 본문 + 글자수
  - 빈 자소서는 출력 생략

## Wave 분배
- Wave 1: A (host, DB+API)
- Wave 2 (병렬): B (위저드), C (editor + import), D (렌더링)
- Wave 3: 통합 검증

## 검증
- 위저드에서 문항 작성 후 저장 → 새로고침 시 문항 보존
- ResumeImportDialog에서 자소서 import → ResumeEditor에 문항별 폼 자동 생성
- 미리보기와 PDF에서 동일한 문항-답변 박스 렌더
