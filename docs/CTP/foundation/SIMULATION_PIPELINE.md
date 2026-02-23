# Simulation Pipeline

## 1) 실행 모드

| 모드 | 기준 | 실행 경로 |
|---|---|---|
| `code` (기본) | `config.mode` 미지정 또는 `"code"` | CodeEditor -> `runSimulation(code)` -> step 재생 |
| `interactive` | `config.mode === "interactive"` | 버튼 핸들러로 local state 변화 (코드 실행 없음 또는 제한) |

현재 전체 56 서브컨셉 기준:
- `code`: 50
- `interactive`: 6

## 2) Code Mode 데이터 흐름

```text
CTPPlayground.handleRun
  -> useSim().runSimulation(code)
  -> useSkulptEngine.run(code)
  -> Worker(RUN_CODE)
  -> breakpoints + globals snapshot + trace events 수집
  -> BATCH_STEPS 반환
  -> use-skulpt-engine에서 dataMapper(adapter) 적용
  -> useCTPStore.setSteps(VisualStep[])
  -> CTPModuleLoader가 currentStepIndex 데이터 추출
  -> Visualizer(data, edges, events...) 렌더
```

핵심 파일:
- 엔진 훅: `web/hooks/use-skulpt-engine.ts`
- 워커: `web/public/workers/skulpt.worker.js`
- 스토어: `web/components/features/ctp/store/use-ctp-store.ts`

## 3) Worker 계약

`skulpt.worker.js` 특징:
- `TRACE_PREAMBLE`로 Python `trace()` 함수 주입
- `Sk.configure({ debugging: true, breakpoints })`로 라인 단위 snapshot 축적
- 각 step: `{ line, variables, stdout, events }`
- 한 번에 `BATCH_STEPS` 전송

주의:
- `MAX_STEPS=10000`, `MAX_EVENTS=2000`
- 객체 직렬화 시 `__id` 기반으로 참조 안정성 유지(연결구조 시각화 필수)

## 4) Store 계약

`VisualStep` (`use-ctp-store.ts`):
- `activeLine`: 코드 하이라이트 라인
- `data`: visualizer payload (배열/2D배열/객체)
- `events`: trace 이벤트
- `variables`: raw globals snapshot

플레이백은 `currentStepIndex` 기반이며, UI는 step 배열을 재생한다.

## 5) Adapter 계약

`useSkulptEngine({ adapterType | dataMapper })`:
- `adapterType` 사용 시 `AdapterFactory` 경유
- `dataMapper`는 커스텀 파서(예: stack array/linked/monotonic)

어댑터 분포(코드형 모듈 기준 주요 사용):
- `graph`: 19
- `array`: 10
- `grid`: 4
- `heap`: 2
- `hash-table`: 2
- `queue`: 2
- `linked-list`: 2
- 기타: `deque`, `doubly-linked-list`, `circular-linked-list`, `merge-sort`, `heap-sort`

## 6) Visualizer 입력 계약 (중요)

| Visualizer | 기대 payload |
|---|---|
| `ArrayGraphVisualizer` | `VisualItem[]` 또는 `VisualItem[][]` |
| `StringGraphVisualizer` | `{id,value,type,address,label,targetAddress}[]` |
| `LinkedListGraphVisualizer` | `LinkedListNode[]` (`nextId`, optional `prevId`) |
| `StackGraphVisualizer` | `VisualItem[]` |
| `TreeGraphVisualizer` | `VisualItem[]` + `edges[]` |
| `GraphSvgVisualizer` | `nodes(data)` + `edges` (+ optional `events`, `layoutMode`) |
| `SortingBarVisualizer` | `VisualItem[]` |
| `MergeSortVisualizer` | `{array,left,right,merged,range,pointers}` |
| `HeapSortVisualizer` | `{array,heapSize,activeIndex,compareIndices,swapIndices}` |

## 7) Interactive Mode 계약

`useSim()` 반환에서 `interactive`를 제공하면 `CTPInteractiveModule` 사용:
- `visualData`
- `edges?`
- `logs?`
- `handlers: Record<string, () => void>`
- `selectedNodeId?` (선택된 노드 ID)
- `selectedSummary?` (우측 정보 카드 표시 텍스트)
- `onNodeSelect?` (노드 클릭 핸들러)

`CTPInteractiveModule` UI 동작(현재):
- 전체화면 토글 지원
- 좌/우 패널 리사이즈 지원
- 우측 내부(조작 패널/학습 노트) 상하 리사이즈 지원

`handlers` alias:
- 버튼 키가 `reset`인데 로직이 `clear`만 제공해도 `CTPInteractiveModule`에서 fallback 처리

특이 케이스:
- `stack/lifo-basics`는 `interactive` runtime을 직접 반환하지 않고, `CTPInteractivePlayground` fallback으로 처리됨

## 8) 디버깅 우선순위

1. step이 비어있다
- `logic.ts`에서 `runSimulation` 호출 경로 확인
- worker 로드 실패 여부 (`/workers/skulpt.worker.js`) 확인

2. 시각화가 안 뜬다
- adapter 출력 타입이 visualizer 계약과 맞는지 확인
- `CTPModuleLoader`에서 `data/edges/rootId` 추출 경로 확인

3. 에디터/라인 하이라이트 이슈
- `code-editor.tsx`의 `setHiddenAreas` runtime guard 확인
- `activeLine`이 `VisualStep.activeLine`으로 정상 세팅되는지 확인

## 9) New Curriculum 메모

- 현재 CTP 주 콘텐츠 구조는 아래 경로를 기준으로 운영한다.
  - 모듈 구현: `web/components/features/ctp/contents/categories/modules/*.tsx`
  - 공용 유틸: `web/components/features/ctp/contents/categories/modules/shared/module-utils.tsx`
  - 챕터 오버뷰: `web/components/features/ctp/contents/categories/modules/shared/chapter-overview.tsx`
- 챕터별 전달 모드 정책:
  - 통합(심화/적용) 챕터 4개는 code simulator
  - 그 외 챕터는 interactive
- 라우팅 연결 기준:
  - `web/lib/ctp-curriculum.ts`의 `moduleId/chapterId/subConceptId`
  - `web/lib/ctp-content-registry.tsx`의 `moduleId/chapterId` 키
