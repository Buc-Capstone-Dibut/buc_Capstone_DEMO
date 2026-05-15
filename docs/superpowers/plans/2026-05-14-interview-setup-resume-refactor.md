# 면접 셋업 이력서 단계 + 자소서 이동 + 이력서 PDF — 리팩토링 계획

## Goal
1. 면접 셋업의 이력서 단계를 **"내가 만든 이력서 선택(보기뷰)"** 중심으로 재구성. PDF 업로드/직접 입력은 보조 옵션으로.
2. "내 프로젝트로 맞춤형 자소서 생성하기" 인라인 섹션 제거 → 자소서 위저드(`/career/cover-letter-wizard`)로 이동.
3. 이력서 PDF 다운로드(생성) 기능. 내용 길이에 따라 페이지 자동 분기되는 템플릿.

## Architecture
- **이력서 선택**: `GET /api/my/resume` 목록 + 각 이력서의 `resume_payload` 미리보기. 활성 이력서 표시는 배지로만, "자동 불러왔습니다" 토스트 제거.
- **자소서 이동**: 인라인 자소서 생성 UI 삭제 → 자소서 위저드 라우팅 CTA 1개.
- **PDF 생성**: `@react-pdf/renderer` 클라이언트 사이드. 긴 본문은 react-pdf의 자동 페이지 분기 활용. 페이지 헤더/풋터 고정.

## Tasks

### Task A — `resume-input-step.tsx` 전면 재작성 (host)
- 상단 3-탭: **`내 이력서`** | `PDF 업로드` | `직접 입력`
- 기본 탭: 내 이력서
- 내 이력서 탭 레이아웃:
  - 좌측: `GET /api/my/resume` items 리스트 (제목·최종 수정·활성 배지). 빈 상태 시 "이력서 작성하기" CTA → `/career/resumes`.
  - 우측: 선택된 이력서 미리보기 (한국식 폼 톤). 인사·학력·경력·기술·프로젝트 섹션을 표 형태로 압축.
  - 하단: "이 이력서로 진행" 버튼 → store에 `setResumeData({fileName, parsedContent})` + `setResumePrefillSource("user_resume")` (신규 값).
- "마이페이지 활성 이력서가 자동으로 불러와졌습니다" 메시지·자동 import 로직 제거.
- 기존 store의 `resumePrefillSource: "active_resume" | null` 타입을 `"active_resume" | "user_resume" | "job_posting_attachment" | null` 로 확장 (기존 호환).

### Task B — 자소서 인라인 섹션 제거 + 위저드 라우팅 (host)
- `ResumeAiAssistant.tsx` 의 "내 프로젝트로 맞춤형 자소서 생성하기" 인라인 폼 영역 삭제.
- 자리에 단순 CTA 카드: "맞춤형 자기소개서가 필요하신가요? 자소서 생성기로 이동" → `/career/cover-letter-wizard?from=resume&resumeId=...`.

### Task C — 이력서 PDF 생성 (별도 에이전트, 병렬)
- 의존성 추가: `@react-pdf/renderer`. (필요 시 `pnpm add @react-pdf/renderer`).
- 신규 컴포넌트: `web/components/features/resume/resume-pdf-document.tsx` — `<Document><Page>` 기반 템플릿.
  - 페이지 헤더: 이름/연락처 (고정).
  - 섹션: 자기소개 → 경력 → 프로젝트 → 학력 → 기술 스택.
  - 긴 내용은 react-pdf가 자동으로 다음 페이지로 분기 (Wrap 활용). 섹션 제목은 `break={false}` 옵션 등으로 행 분기 회피.
  - 페이지 푸터: 페이지 번호 (`render` prop 사용).
- 신규 유틸: `web/components/features/resume/resume-pdf-download.tsx` — `PDFDownloadLink` 또는 `pdf().toBlob()` 기반 다운로드 버튼. 한국어 폰트(`Noto Sans KR`) Font.register.
- `/career/resumes` 리스트와 `/resume` 편집 페이지에 "PDF 다운로드" 버튼 추가.

### Task D — 검증
- `/interview/posting/setup`, `/interview/role/setup`, `/interview/training/setup` 페이지 모두 200.
- 새 탭에서 이력서 선택 → 다음 단계 진행 가능.
- PDF 다운로드 시 한글 깨짐 없고, 긴 본문이 여러 페이지로 분기.

## 멀티에이전트
- Wave 1: A, B (host 직접). C (별도 에이전트).
- Wave 2: D (host 검증).
