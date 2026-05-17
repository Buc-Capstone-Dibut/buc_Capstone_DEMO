# Workspace Portfolio Showcase — Design

작성일: 2026-05-17
작업 브랜치: `feat/workspace-portfolio` (off `develop`)
범위: 기존 갈래 A(`user_portfolios` + React 블록 에디터)와 격리된 신규 트랙 1개 추가

---

## 1. Background

기존 갈래 A의 결과물(React 블록 + 3-stage Gemini 파이프라인 출력)은 채용 시장이 기대하는 비주얼 임팩트(거대 디스플레이 타이포, GSAP 애니메이션, 다크 모드 + 네온 어센트, 매그네틱 인터랙션 등)에 못 미친다. 사용자가 첨부한 외부 프롬프트(Pretendard + GSAP + ScrollTrigger 단일 HTML 사양)를 기준으로 [데모를 만들어보니](../../../web/public/portfolio-demo-neon/index.html) 결과물의 임팩트 차이가 명확함.

갈래 A는 데이터 모델·UX·AI 파이프라인 전반이 React 블록 기반으로 굳혀져 있어, 같은 코드 위에서 비주얼 퀄리티를 끌어올리는 비용이 크다. 따라서 **갈래 A는 보존하고, 두 번째 트랙(Showcase)을 추가**한다.

---

## 2. Scope

### In scope
- 새 라우트 묶음: `/career/portfolios/showcase/*`, `/p/[handle]/[slug]`, `/api/career/portfolios/showcase/*`
- 새 데이터 모델: `showcase_portfolios` 테이블 1개 (+ Prisma 마이그레이션)
- 첫 템플릿 1개 (`neon-editorial`) — React 컴포넌트, props = `{ content, tokens }`
- WYSIWYG 에디터 — 좌측 콘텐츠/디자인/프로젝트 탭 + 우측 live preview
- 공개 URL — no auth, 발행 시점 스냅샷 기반 정적 렌더
- 진입점 한 곳 수정 — 기존 프로젝트 보관함 형식 선택 모달에 세 번째 옵션 추가

### Out of scope (deferred)
- 두 번째 이상 템플릿 (1차 출시 후 결정)
- timeline 변경의 포트폴리오 자동 동기화 (수동 재생성으로 대응)
- AI 텍스트 가공 (Gemini 호출 없이 시작)
- 비공개 보호된 공유(특정 사람만 보기 등)
- PPTX/PDF 내보내기 (갈래 A에 이미 있음)
- 갈래 A 코드 수정/리팩토링

---

## 3. Architecture

### 한 줄 요약
갈래 A는 그대로, 같은 `resume_payload.timeline` 데이터를 **read-only 소스**로 쓰는 두 번째 트랙. 출력은 React 컴포넌트 템플릿. 편집은 콘텐츠 + 디자인 토큰 WYSIWYG. 결과물은 공개 URL.

### 디렉토리 트리

```
web/app/career/portfolios/showcase/
  page.tsx                    showcase 포트폴리오 목록
  new/page.tsx                템플릿 picker + 새 행 생성 → /edit 리다이렉트
  [id]/edit/page.tsx          에디터

web/app/p/[handle]/[slug]/page.tsx     공개 페이지 (no auth)

web/app/api/career/portfolios/showcase/
  route.ts                    POST(new), GET(list)
  [id]/route.ts               GET / PUT / DELETE
  [id]/publish/route.ts       POST is_public toggle

web/components/features/career/portfolio-showcase/
  templates/
    neon-editorial/
      index.tsx               (props: { content, tokens }) => JSX
      types.ts                Content / Tokens / 슬롯 스키마
    registry.ts               templateId → { Component, defaults, schema, preview }
  editor/
    showcase-editor.tsx       좌측 패널 + 우측 preview 컨테이너
    panels/
      content-panel.tsx       Hero/카드 inline 편집/KPI
      tokens-panel.tsx        accent/bg/font/density
      sections-panel.tsx      카드 순서 DnD + import/제거
  shared/
    template-picker.tsx
```

---

## 4. Data Model

```prisma
model showcase_portfolios {
  id              String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  user_id         String   @db.Uuid
  slug            String                          // /p/[handle]/[slug]
  title           String                          // 예: "Frontend Portfolio"
  template_id     String                          // "neon-editorial"

  content_payload Json                            // 콘텐츠 스냅샷 - hero, projects(전체 데이터), contact 등
  tokens_payload  Json                            // accent, bg, font, density 등 디자인 토큰

  is_public       Boolean  @default(false)
  published_at    DateTime?

  created_at      DateTime @default(now())  @db.Timestamptz(6)
  updated_at      DateTime @default(now())  @updatedAt @db.Timestamptz(6)

  profiles        profiles @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, slug])
  @@index([user_id, updated_at(sort: Desc)])
  @@index([is_public, published_at(sort: Desc)])
  @@schema("public")
}
```

### 핵심 의사결정: 스냅샷
- `content_payload.projects[]`는 **timeline에서 가져온 시점의 project 전체 데이터를 통째로 박은 스냅샷**. timeline id 참조 ❌
- 의도: timeline 수정 영향 받지 않음, "이 버전이 채용 담당자에게 보낸 그 버전"이라는 확실성, 공개 페이지 렌더는 DB 한 번 조회
- 사용자가 timeline 수정 후 새 버전 원하면: 같은 흐름으로 새 포트폴리오 생성. "프로젝트 데이터 새로고침" 버튼은 deferred.

### 스냅샷 시점 (모호함 제거)
- **POST `/api/career/portfolios/showcase` (신규)**: 선택된 timeline project들을 그 시점에 fresh copy → `content_payload.projects[]`에 저장
- **에디터에서 사용자가 카드 추가 import**: 그 시점의 timeline에서 fresh copy → 기존 projects 배열에 append
- **에디터에서 카드 inline 텍스트 편집**: 해당 카드의 `content_payload.projects[i]` 필드 직접 수정 (override 분리 없음, 그냥 덮어씀)
- **publish 토글**: 단지 `is_public` 플래그. 콘텐츠는 안 건드림.

---

## 5. UX Flow

```
[프로젝트 보관함 /career/projects] (existing — ProjectArchiveScreen)
   ↓ portfolioMode ON → 카드 복수 선택 → selectedIds
[포트폴리오 형식 선택 모달] (existing)
   ├ HTML 웹 페이지                  → 갈래 A site   (existing)
   ├ 슬라이드 편집기                → 갈래 A slide  (existing)
   └ ✨ 디자인 템플릿 포트폴리오     → 신규 분기     (이 작업)
        ↓
[/career/portfolios/showcase/new?projectIds=...]
   - 템플릿 picker (1차 출시: neon-editorial 1개)
   - 사용자 templateId 선택
   ↓ POST /api/career/portfolios/showcase
     { selectedProjectIds, templateId, title }
[/career/portfolios/showcase/[id]/edit]
   - 좌측 콘텐츠/디자인/프로젝트 탭
   - 우측 live preview
   ↓ 발행 토글
[/p/[handle]/[slug]]
   - 외부 공유 가능한 공개 URL
   - no auth, 발행된 row만 200, 비공개/미존재 404
```

진입점에서 수정되는 파일: 단 한 곳
- [web/components/features/career/project-archive/project-archive-screen.tsx](../../../web/components/features/career/project-archive/project-archive-screen.tsx) — 형식 선택 모달에 세 번째 옵션 추가

---

## 6. Editor

### 좌측 패널 (~360px, 3 탭)

**🔤 콘텐츠**
- Hero: 이름, 한 줄 소개, job title, year
- 프로젝트 카드: 카드별 inline 편집 (title, role, period, body, KPI)
- Contact: 이메일, 소셜 링크

**🎨 디자인 (토큰)**
- `accent`: 컬러 picker (기본 `#39FF14`)
- `bg`: dark | light (`neon-editorial` 1차에서는 dark 고정 가능)
- `fontPair`: pretendard (1차에는 1개)
- `density`: spacious | balanced | compact

**📦 프로젝트**
- timeline에서 카드 추가 import (스냅샷 추가)
- 카드 순서 DnD
- 카드 제거

### 우측 패널 (flex-1)
- `<TemplateComponent content={content_payload} tokens={tokens_payload} />` live preview
- 모바일 / 태블릿 / 데스크탑 뷰포트 토글

### 상단 액션바
- 저장 (autosave 또는 수동, 1차에는 수동)
- 발행 토글 (`is_public`)
- 공개 URL 복사
- 새 탭으로 열기
- 템플릿 변경 (1차에 1개라 비활성, 두 번째 템플릿 추가 시 활성)

---

## 7. Template System

### Registry

```ts
// web/components/features/career/portfolio-showcase/templates/registry.ts
import { NeonEditorialTemplate, NeonEditorialContentSchema } from "./neon-editorial";

export const SHOWCASE_TEMPLATES = {
  "neon-editorial": {
    Component: NeonEditorialTemplate,
    defaultTokens: {
      accent: "#39FF14",
      bg: "dark",
      fontPair: "pretendard",
      density: "spacious",
    },
    contentSchema: NeonEditorialContentSchema,                 // zod
    previewImage: "/portfolio-template-previews/neon-editorial.png",
    label: "Neon Editorial",
    description: "거대 디스플레이 타이포 + 네온 어센트 + GSAP 인터랙션",
  },
} as const;

export type ShowcaseTemplateId = keyof typeof SHOWCASE_TEMPLATES;
```

새 템플릿 추가 절차:
1. `templates/<id>/index.tsx`에 React 컴포넌트 작성 (props = `{ content, tokens }`)
2. `templates/<id>/types.ts`에 Content / Tokens schema 정의
3. `registry.ts`에 entry 1줄 추가
4. preview 이미지 1장 `/public/portfolio-template-previews/<id>.png` 등록

### 첫 템플릿: NeonEditorial

[web/public/portfolio-demo-neon/index.html](../../../web/public/portfolio-demo-neon/index.html)을 React 컴포넌트로 컨버트. **시각적 사양 100% 유지**.

- 스타일: styled-jsx 또는 CSS module로 그대로 옮김. CSS 변수(`--accent` 등)는 `tokens` props에서 inline `style={{ "--accent": tokens.accent }}`로 주입
- 애니메이션: GSAP/ScrollTrigger를 `useEffect`에서 1회 등록. content/tokens 변경 시 `ScrollTrigger.refresh()`
- 콘텐츠: 데모의 하드코딩 데이터 → `content` props 슬롯으로 분해
- 동적 N개 프로젝트 카드 / EXPERIENCE 행 / 소셜 링크 지원
- 첫 출시 후 데모 HTML 파일 deprecate (디자인 레퍼런스 의미로 보존하거나 제거)

### Content schema (NeonEditorial 예시)

```ts
{
  hero: {
    name: string,                  // "DOYOON KIM" — 2-3 줄로 split 표시
    headlineLines: string[],       // ["DOYOON", "KIM", "PORTFOLIO."]
    jobTitle: string,              // 예: "PRODUCT ENGINEER"
    year: string,                  // 예: "2026"
    bio: string                    // 한 줄 소개
  },
  marqueeKeywords: string[],       // 8개 기술 키워드
  about: {
    quote: string,
    paragraphs: string[],
    strengths: { num: string, title: string, body: string }[]  // 4개
  },
  projects: ProjectSnapshot[],     // timeline에서 박은 스냅샷, 순서대로
  kpis: { num: number, suffix: string, label: string }[],     // 3개
  experience: TimelineRow[],
  education: TimelineRow[],
  contact: { email: string, socials: { label: string, url: string }[] }
}
```

`ProjectSnapshot` 타입은 timeline의 `ResumePayload["timeline"][number]`와 동등하게 정의(또는 그 타입을 그대로 import). timeline 스키마가 바뀌어도 스냅샷은 그 시점 형태를 그대로 들고 있음.

---

## 8. Public Page Rendering

`/p/[handle]/[slug]/page.tsx`:

```ts
1. 서버 컴포넌트, no auth
2. profiles.handle = handle 찾기 → user_id
3. showcase_portfolios where user_id, slug, is_public=true → row 1개
4. 없거나 비공개 → notFound() (404)
5. registry[row.template_id].Component 찾기
6. <Component content={row.content_payload} tokens={row.tokens_payload} />
7. head: OG meta (title, description, og:image = previewImage or 별도 thumbnail)
```

ISR/캐시: 1차에는 `dynamic = "force-dynamic"`으로 시작. 성능 이슈 보이면 그때 캐시 전략 결정 (스냅샷이라 캐시 친화적).

---

## 9. Isolation from 갈래 A

**무수정 파일/리소스 목록** (이 작업에서 절대 안 건드림):
- `user_portfolios`, `user_portfolio_assets` 테이블 + 마이그레이션
- `web/lib/career-portfolios.ts`
- `web/lib/server/career-portfolios.ts`
- `web/app/api/career/portfolios/route.ts` (목록 + POST)
- `web/app/api/career/portfolios/[id]/route.ts`
- `web/app/api/career/portfolios/[id]/generate/route.ts` (3-stage Gemini)
- `web/app/api/career/portfolios/ai/route.ts` (refine-section/caption)
- `web/app/api/career/portfolios/[id]/publish/route.ts`
- `web/app/api/career/portfolios/[id]/export/pptx/route.ts`
- `web/app/api/career/portfolios/[id]/assets/*`
- `web/app/career/portfolios/page.tsx`
- `web/app/career/portfolios/client.tsx`
- `web/app/career/portfolios/[id]/edit/page.tsx`
- `web/components/features/career/portfolio-editor/`
- `web/components/features/career/portfolio-site/`
- `web/app/my/[handle]/portfolio/[slug]/page.tsx`

**공유**: `getPortfolioSourceData(userId)` 또는 동등한 timeline 읽기 헬퍼만 read-only 호출. 갈래 A의 헬퍼는 그대로 사용하거나, 동등 함수를 새로 분리해도 됨(이 결정은 plan 단계에서).

**진입점 1곳 수정**: [project-archive-screen.tsx](../../../web/components/features/career/project-archive/project-archive-screen.tsx) — 형식 선택 모달에 옵션 1개 추가. 기존 두 옵션 동작은 무변경.

---

## 10. Open Questions (deferred)

1. "Showcase"라는 코드명을 한국어 UI에서 어떻게 표기할지 (예: "디자인 포트폴리오", "쇼케이스", "프리미엄 포트폴리오") — 첫 화면 만들면서 정하면 됨
2. 두 번째 템플릿 추가 시점과 디자인 — YAGNI
3. timeline 변경 시 포트폴리오에 어떻게 반영할지(자동 vs 수동) — 사용자 행동 보고 결정
4. AI 텍스트 가공 도입 여부 — 데이터 만족도 보고 결정
5. SEO / OG / sitemap 디테일 — 1차 출시 후
6. 발행 후 슬러그 변경 정책 (변경 허용 / 변경 시 리다이렉트) — 1차 출시 후

---

## 11. Implementation Order (대략)

1. Prisma 마이그레이션 — `showcase_portfolios` 테이블
2. 첫 템플릿 React 컴포넌트 — `portfolio-demo-neon/index.html`을 React로 컨버트
3. 템플릿 registry
4. API 라우트 — POST/GET/PUT/DELETE/publish
5. `/career/portfolios/showcase/new` — 템플릿 picker
6. 에디터 — 우측 preview 먼저, 좌측 콘텐츠 패널 → 디자인 토큰 패널 → 프로젝트 패널(DnD) 순서
7. 공개 페이지 `/p/[handle]/[slug]`
8. 프로젝트 보관함 모달에 세 번째 옵션 추가 — 진입점 wiring
9. 통합 흐름 dogfood (샘플 워크스페이스 → 프로젝트 → 포트폴리오 → 공개 URL) + 데모 HTML deprecate

writing-plans 스킬이 이 순서를 더 작은 단위로 쪼개 plan을 만든다.

---

## 12. Success Criteria

- 사용자가 프로젝트 보관함에서 프로젝트 N개 선택 → 5분 이내에 공개 URL 발행 가능
- 발행된 공개 페이지 = `portfolio-demo-neon/index.html` 데모와 시각적으로 동등한 결과물 + 사용자 본인 콘텐츠
- timeline 수정해도 발행된 포트폴리오는 흔들리지 않음
- 갈래 A의 기존 흐름이 무변경 동작
- 새 템플릿 1개 추가가 `templates/<id>/`에 컴포넌트 작성 + registry 한 줄로 가능
