# Simulation Pipeline

## 현재 실행 모드

현재 전체 52 sub-concept + 4 통합 챕터 기준 운영 중.

### Interactive 모드 (대부분의 컨셉)
- `config.mode === "interactive"` 또는 미지정
- 사용자가 Run/Push/Pop/Peek/Reset 버튼 조작
- `useXxxSim` 훅이 자체 useState로 step 시퀀스를 보유하고 peek()로 한 칸씩 전진
- `CTPInteractiveModule`이 좌측 Visualizer + 우측 Operation Panel + 학습 노트 렌더

### Code 모드 (현재는 통합 챕터 4개에서만 ProblemBank로 사용)
- `config.mode === "code"`
- Monaco 에디터에 사용자 코드 작성 → 제출 → `BrowserJudge.run`이 새 Web Worker(`/workers/skulpt.worker.js`) 생성
- Skulpt 인터프리터가 testCase의 stdin을 받아 stdout 생성
- normalize 후 expected와 비교해 verdict(AC/WA/TLE/RTE/OLE) 산출
- 시각화는 없음. 채점 결과만 표시

### Skulpt Worker 인프라
Skulpt Worker는 trace()/captureGlobals API를 갖췄으나 현재는 **Problem Bank 채점 경로에서만 사용**된다.
시각화 모듈로 연결하는 어댑터는 Phase 4(보류)에서 작성 예정.

핵심 파일:
- 워커: `web/public/workers/skulpt.worker.js`
- 스토어: `web/components/features/ctp/store/use-ctp-store.ts`

## Worker 계약

`skulpt.worker.js` 특징:
- `TRACE_PREAMBLE`로 Python `trace()` 함수 주입
- `Sk.configure({ debugging: true, breakpoints })`로 라인 단위 snapshot 축적
- 각 step: `{ line, variables, stdout, events }`
- 한 번에 `BATCH_STEPS` 전송

주의:
- `MAX_STEPS=10000`, `MAX_EVENTS=2000`
- 객체 직렬화 시 `__id` 기반으로 참조 안정성 유지(연결구조 시각화 필수)

## Store 계약

`VisualStep` (`use-ctp-store.ts`):
- `activeLine`: 코드 하이라이트 라인
- `data`: visualizer payload (배열/2D배열/객체)
- `events`: trace 이벤트
- `variables`: raw globals snapshot

플레이백은 `currentStepIndex` 기반이며, UI는 step 배열을 재생한다.

## 현재 존재하는 Visualizer (실재 컴포넌트만)

| 도메인 | 컴포넌트 | 위치 |
|---|---|---|
| Array | `ArrayGraphVisualizer` | `playground/visualizers/array/graph/array-graph-visualizer.tsx` |
| Stack | `StackGraphVisualizer` | `playground/visualizers/stack/graph/stack-graph-visualizer.tsx` |
| Module-01~03 도메인별 | `<Name>Visualizer` (예: `BasicBinarySearchVisualizer`) | `playground/visualizers/svg-animations/module-XX/<id>.tsx` |
| Phase 1+2 신규 (예정) | `<Name>Visualizer` for module-04 | `playground/visualizers/svg-animations/module-04/<id>.tsx` |

## Interactive Mode 계약

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

## 디버깅 우선순위

1. step이 비어있다
- `useXxxSim` 훅에서 step 시퀀스 생성 로직 확인
- worker 로드 실패 여부 (`/workers/skulpt.worker.js`) 확인 (Problem Bank 채점 경로)

2. 시각화가 안 뜬다
- step payload 타입이 visualizer 계약과 맞는지 확인
- `CTPModuleLoader`에서 `data/edges/rootId` 추출 경로 확인

3. 에디터/라인 하이라이트 이슈
- `code-editor.tsx`의 `setHiddenAreas` runtime guard 확인
- `activeLine`이 `VisualStep.activeLine`으로 정상 세팅되는지 확인

## New Curriculum 메모

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
