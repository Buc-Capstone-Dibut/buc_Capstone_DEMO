# CTP Consistency Guidelines

## 목적
- 신규 커리큘럼(`module-01~04`)의 UI/UX와 콘텐츠 톤을 일관되게 유지한다.
- 학습자가 페이지를 바꿔도 같은 조작 규칙, 같은 섹션 구조, 같은 언어 톤을 경험하게 한다.
- 기능 추가 시 "보기 좋은 화면"보다 "예측 가능한 학습 흐름"을 우선한다.

## 적용 범위
- 상세 학습 페이지:
  - `web/app/insights/ctp/[categoryId]/[conceptId]/page.tsx`
- 공통 레이아웃/네비게이션:
  - `web/components/features/ctp/layout/ctp-*.tsx`
- 공통 모듈 렌더러:
  - `web/components/features/ctp/common/CTPContentController.tsx`
  - `web/components/features/ctp/common/CTPModuleLoader.tsx`
- 공통 섹션 컴포넌트:
  - `web/components/features/ctp/contents/shared/*.tsx`
- 신규 아웃라인 모듈:
  - `web/components/features/ctp/contents/categories/modules/*.tsx`
  - `web/components/features/ctp/contents/categories/modules/shared/module-utils.tsx`

## 1) 정보 구조(IA) 고정 규칙
- 레슨 페이지 섹션 순서는 항상 아래 순서를 따른다.
1. `Intro`
2. `Features`
3. `Visualization`
4. `Complexity`
5. `Implementation` (옵션)
6. `Practice` (옵션)
- 섹션을 생략할 수는 있지만, 순서를 바꾸지 않는다.
- 챕터 페이지(`?view` 없음)는 항상 아래 구조를 유지한다.
1. Module 라벨 + Chapter 제목 + 설명
2. 학습 가이드(번호 목록)
3. 레슨 카드 그리드

## 2) 전달 모드 정책(커리큘럼 계약)
- `Code Simulator` 전용 챕터는 아래 4개만 허용한다.
1. `module-01-foundation/foundation-integration`
2. `module-02-stack-recursion/stack-recursion-integration`
3. `module-03-sorting-string/sorting-string-integration`
4. `module-04-list-tree-final/list-tree-integration`
- 위 4개를 제외한 챕터는 `Interactive` 모드만 사용한다.
- 모드 변경 시 `INVENTORY.md`를 함께 갱신한다.

## 3) Intro 서사(Problem/Definition/Analogy) 통일 규칙
- 모든 레슨은 기본적으로 `story`를 가진다.
- `story` 최소 필드:
1. `problem`
2. `definition`
3. `analogy`
- `playgroundDescription`은 선택이지만 권장한다.
- 임시로 `story`를 비워야 하면, 이유와 복구 일정을 PR/커밋 메시지에 명시한다.

## 4) 비주얼 토큰 규칙
- 색상은 우선적으로 semantic token(`bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, `text-primary`)을 사용한다.
- 고정 팔레트(`red-`, `amber-`, `blue-`, `slate-`, `gray-`, `white`) 직접 사용은 아래 경우만 허용한다.
1. 의미 색상(성공/경고/오류) 표현
2. 데이터 시각화 범례 표현
3. 브랜드상 반드시 필요한 강조 표현
- 컴포넌트 간 radius/spacing은 다음 기준을 유지한다.
1. 주요 카드: `rounded-xl`
2. 보조 카드/배지: `rounded-lg` 이하
3. 섹션 간격: `space-y-12`를 기본으로 하되, 공통 컴포넌트 내부 간격은 동일 스케일 유지
- 그림자/애니메이션은 최소화한다. 강조가 필요한 단일 요소에만 적용한다.

## 5) 레이아웃 밀도 규칙
- 상세 페이지는 "좌측 2개 네비 + 본문 + 우측 TOC" 구조를 유지하되, 본문 가독성을 우선한다.
- 사이드바 텍스트는 2줄 이상 줄바꿈을 최소화한다.
- 각 레슨의 플레이그라운드 높이는 공통 기준을 사용한다.
1. 기본 높이 1개만 채택
2. 예외 높이는 근거를 주석 또는 문서에 남긴다
- 툴바 버튼은 "필수 조작" 우선으로 노출한다. 부가 기능은 드롭다운/토글로 이관한다.

## 6) 용어/카피라이팅 규칙
- 기본 언어는 한국어로 통일한다.
- 영어는 알고리즘 고유명 또는 축약어(`KMP`, `BST`, `Run`)에만 제한적으로 사용한다.
- 동일 기능의 명칭은 페이지 전체에서 동일하게 유지한다.
1. `참여형 실습` (interactive)
2. `코드 시뮬레이터` (code simulator)
3. `실행` (Run)
4. `초기화` (Reset)
- 같은 의미를 가진 UI 라벨을 혼용하지 않는다.
1. `Operation Panel` vs `조작 패널` 중 하나만 선택
2. `Console Log` vs `학습 노트` 중 역할 분리 후 고정

## 7) 상호작용(Interaction) 규칙
- 버튼 순서는 의미 순서를 따른다.
1. 조회(`Peek`)
2. 변경(`Push`, `Pop`)
3. 복구(`Reset`)
- 시뮬레이션 로그 포맷을 통일한다.
1. 상태/단계/결과를 같은 순서로 출력
2. 이모지/장식 문자는 기본적으로 사용하지 않는다
- `?view=<lessonId>` 라우팅은 콘텐츠 단일 진입점이다.
- 레슨 전환 시 상태 초기화 정책(`reset`)을 유지한다.

## 8) 접근성/반응형 기준
- 키보드 포커스가 모든 인터랙션 요소에서 시각적으로 보여야 한다.
- 텍스트/배경 대비는 WCAG AA 수준을 목표로 한다.
- 모바일/태블릿에서 불필요한 패널은 숨기고 핵심 학습 영역을 우선한다.
- 스크롤 영역(터미널/로그/가이드)은 항상 독립 스크롤 가능해야 한다.

## 9) 구현 체크리스트 (PR 전 필수)
- 구조:
1. 섹션 순서가 규칙과 일치한다.
2. 챕터 오버뷰 레이아웃이 통일되어 있다.
- 콘텐츠:
1. `story` 3요소(Problem/Definition/Analogy)가 존재한다.
2. guide 문구 톤이 한국어 기준으로 통일되어 있다.
- 비주얼:
1. 불필요한 고정 색상 클래스가 없다.
2. 플레이그라운드 높이/툴바 밀도가 기준과 일치한다.
- 상호작용:
1. 레슨 전환 시 상태가 초기화된다.
2. Run/Reset/로그/상태패널 동작이 정상이다.
- 라우팅:
1. `?view` 없을 때 챕터 오버뷰가 열린다.
2. `?view` 있을 때 해당 레슨만 로드된다.

## 10) 예외 처리
- 예외가 필요한 경우, 아래 2가지를 반드시 남긴다.
1. 왜 가이드라인을 벗어나야 하는지
2. 언제 원상 복구하거나 새 기준으로 승격할지
- 예외 문서는 `docs/CTP/operations/HANDOFF_TEMPLATE.md`의 "남은 이슈 / 리스크"에 기록한다.

## 11) 단계적 적용 우선순위
1. `module-utils.tsx`에 `story` 기본 생성 규칙 추가
2. 공통 컴포넌트의 고정 색상 제거 및 semantic token 정리
3. 플레이그라운드 높이/툴바 컴팩트 정책 통일
4. 한/영 혼용 라벨 정리
5. 섹션별 typography scale 정규화
