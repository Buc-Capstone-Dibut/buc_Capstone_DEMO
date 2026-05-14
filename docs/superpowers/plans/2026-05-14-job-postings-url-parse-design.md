# 채용공고: URL 파싱·기술 검색·캘린더 모달·디자인 — 구현 계획

> 본 plan은 `2026-05-14-job-postings-ux-expansion.md`의 후속이다. 4개 작업을 병렬 에이전트로 진행한다.

**Goal:**
1. 등록 다이얼로그의 "공고 URL"에서 회사명/직무/기술/책임/우대 등을 자동 추출 prefill
2. 기술스택 입력을 사전 기반 검색형 multi-select (Combobox)로 교체
3. 캘린더 날짜 클릭 시 해당 날짜의 일정 목록 모달
4. 페이지 디자인 강화 + Dibut 마스코트 기반 3D-look 아이콘/일러스트 삽입

## Task A: URL 자동 파싱

**대상**: `web/components/features/job-postings/job-posting-form-dialog.tsx`

- 공고 URL 입력 옆에 "URL에서 가져오기" 버튼 추가 (lucide `Sparkles` 또는 `Wand2`).
- 사용자가 URL 입력 → 버튼 클릭 → `POST /api/interview/parse-job` `{ url }` 호출.
- 응답 필드 → form state 매핑 (빈 필드만 채움):
  - `title` → roleTitle
  - `company` → companyName
  - `description` → companyDescription
  - `responsibilities` → responsibilities (배열)
  - `requirements` → requirements (배열)
  - `preferred` → preferred (배열)
  - `techStack` → techStack (배열)
  - `culture` → teamCulture (배열)
- 로딩 인디케이터, 에러 toast, "내 자료에서 가져오기"와 동일한 prefill 정책 (빈 값만 채움) 적용.

## Task B: 기술스택 Combobox

**신규 컴포넌트**: `web/components/features/job-postings/tech-stack-combobox.tsx`

- props: `{ value: string[], onChange(next: string[]), placeholder? }`.
- 데이터 소스: `TECH_LOGO_BY_KEY` (`web/lib/interview/tech-logos.ts`)에서 distinct label 목록 + 기존 value 중 사전에 없는 값.
- UI: shadcn `Command` 또는 직접 구현 (Input + 필터링된 dropdown).
  - Input 포커스 → 후보 목록 펼침
  - 입력에 따라 substring 필터링
  - Enter 또는 클릭 → 추가
  - 사전에 없는 자유 입력도 그대로 추가 가능 (Enter)
  - 칩 형태로 선택된 값 표시, 각 칩 ×버튼으로 제거
  - 칩에 tech-logos.ts 의 로고도 보여주면 보너스
- 다이얼로그(form-dialog)의 기존 techStack input을 이 컴포넌트로 교체.

## Task C: 캘린더 날짜 클릭 모달

**신규 컴포넌트**: `web/components/features/job-postings/calendar-day-modal.tsx`

- props: `{ open, onOpenChange, date: Date | null, events: CalendarEvent[] }`.
- 해당 date의 events 필터링 (start의 같은 날) 후 카드 리스트로 표시.
- 각 이벤트:
  - 시간(HH:mm 또는 종일), kind 배지, 회사명·직무, "상세 보기" 버튼 → `/my/job-postings/[jobPostingId]`로 이동.
- 일정이 없는 날 클릭 시 "이 날짜에 일정이 없습니다 + 등록하기" CTA.

**`job-posting-calendar.tsx` 수정**: 기존 `onDateClick` 콜백을 그대로 활용 (이미 정의됨). 부모(client)에서 modal state 관리.

**`job-postings-client.tsx`**: 캘린더에 `onDateClick={setSelectedDate}`, 모달 마운트.

## Task D: 디자인 강화 + 3D 아이콘

**범위:**
1. **페이지 헤더 일러스트**: Dibut 마스코트(`public/interview/avatar/dibut-idle.svg`)를 페이지 상단 우측 또는 빈 상태에 배경처럼 배치. CSS gradient + drop-shadow로 3D-look.
2. **3D-look 아이콘 SVG 신규 제작**: 기존 lucide 아이콘 위에 gradient + shadow + highlight 추가한 wrapping 컴포넌트:
   - `web/components/features/job-postings/icons/glossy-icon.tsx` — children(아이콘)에 `linearGradient` + drop-shadow filter를 SVG 래핑.
   - 별표(즐겨찾기), 캘린더, 회사 빌딩, 면접(스파클) 아이콘에 적용.
3. **빈 상태 일러스트**: 공고 0개 시 Dibut 마스코트 + "첫 공고를 등록해보세요" 메시지. `job-posting-list.tsx`의 emptyMessage 영역 강화 (props로 illustration 받기).
4. **카드 디자인 다듬기**:
   - hover 시 `translate-y-[-2px] shadow-lg` 트랜지션
   - 즐겨찾기 카드는 좌측 border-l-4 primary 강조
   - 상태 배지 그라데이션 적용
5. **컬러 토큰 일관화**: `STATUS_TONE`, `KIND_COLOR`, 칩 색상을 한 곳(`web/lib/job-postings/visual-tokens.ts`)으로 분리. 라이트/다크 모드 모두 대응.

## Wave 분배

- Wave 1 (병렬): A, B, C, D
- Wave 2 (host): 빌드 검증

각 에이전트는 자기 영역만 수정. `job-postings-client.tsx`만 A·C가 동시에 건드릴 수 있어 — C는 modal state만 추가, A는 form-dialog만 수정으로 분리. 안전.
