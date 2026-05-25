# CTP Architecture

## 1) 전체 흐름 (한 장 요약)

```text
/insights/ctp
  -> web/app/insights/ctp/page.tsx
  -> CTP_DATA 기반 카테고리/컨셉 카드 렌더

/insights/ctp/[categoryId]/[conceptId]?view=[subConceptId]
  -> web/app/insights/ctp/[categoryId]/[conceptId]/page.tsx
  -> getCtpContent(categoryId, conceptId)
  -> 해당 Concept의 index.tsx
  -> CTPContentController
  -> CTPModuleLoader (activeKey=view)
  -> config + useSim + Visualizer 결합 렌더
```

핵심 포인트:
- `concept` 단위: `web/lib/ctp-content-registry.tsx`에서 라우팅
- `subConcept` 단위: 각 concept의 `*-registry.ts`에서 모듈 라우팅 (`?view=`)

## 2) 폴더 책임 분리

| 경로 | 책임 |
|---|---|
| `web/app/insights/ctp/**` | URL 라우팅, 페이지 엔트리 |
| `web/lib/ctp-curriculum.ts` | 카테고리/컨셉/서브컨셉 메타 데이터 |
| `web/lib/ctp-content-registry.tsx` | `(category/concept) -> ContentComponent` 매핑 |
| `web/components/features/ctp/contents/**` | 실제 학습 컨텐츠(overview, config, logic, registry) |
| `web/components/features/ctp/common/**` | 공통 타입, 모듈 로더, 컨트롤러 |
| `web/components/features/ctp/playground/**` | 코드 에디터/플레이백/UI + visualizer |
| `web/components/features/ctp/store/use-ctp-store.ts` | step 기반 실행 상태 전역 관리 |
| `web/public/workers/skulpt.worker.js` | Skulpt 실행/trace 캡처 (현재는 Problem Bank 채점 경로에서만 사용) |

## 3) 컨텐츠 구조 규약

### 컨셉 정의 단위

현재 구조 (2026-02 신규 커리큘럼 도입 후):

- `web/components/features/ctp/contents/categories/modules/module-XX-*.tsx`: 한 모듈당 단일 파일.
  내부에서 `createInteractiveTemplateModules([...])` 호출로 sub-concept 모듈 객체 배열 생성.
- 각 sub-concept은 `useSim` 훅 + `Visualizer` 컴포넌트 1쌍을 가지며, 둘 다 `svg-animations/module-XX/<id>.tsx`에 정의.
- 보조 일러스트(supp)는 `svg-animations/module-XX/supp/<id>-supp.tsx`에 4개 SVG export.

## 4) Layout/Navigation 계약

- 좌측 대분류 사이드바: `web/components/features/ctp/layout/ctp-sidebar.tsx`
- 좌측 서브컨셉 사이드바: `web/components/features/ctp/layout/ctp-sub-sidebar.tsx`
  - `concept.subConcepts` 기반으로 `?view=<subConceptId>` 생성
- 우측 TOC: `web/components/features/ctp/layout/ctp-right-sidebar.tsx`
  - `[data-toc][id]` 속성으로 동적 섹션 수집

## 5) 로더 동작 계약 (중요)

`CTPModuleLoader` (`web/components/features/ctp/common/CTPModuleLoader.tsx`):
- `module.config` + `applyContentExpansion(config, activeKey)` 병합
- `module.useSim()` 실행 결과에서 `runSimulation`, `interactive` 사용
- `mode`에 따라 분기:
  - `interactive`: `CTPInteractiveModule` 또는 `CTPInteractivePlayground`
  - `code/default`: `CTPPlayground` 계열
- 현재 step payload에서 `data/edges/rootId/orientation/events` 추출 후 visualizer 전달

## 6) Known Structural Notes

- `ctp-content-expansion.ts`는 `activeKey` 기준으로 story/features/guide/implementation을 후처리로 확장한다.
  - 따라서 `config.ts`가 간결해도 최종 렌더는 확장된 콘텐츠일 수 있다.

