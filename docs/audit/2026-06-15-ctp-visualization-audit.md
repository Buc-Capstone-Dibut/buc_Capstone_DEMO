# CTP(코딩테스트 준비) 전수조사 보고서 — 시각화 · 인터랙티브 플레이그라운드 · 코딩문제/채점

> 작성일: 2026-06-15 · 범위: `web/app/insights/ctp/**`, `web/components/features/ctp/**`, `web/lib/ctp-*`, `web/data/ctp/**`
> 방법: 멀티에이전트 전수조사(8 agents) + 핵심 P0 주장 메인 검증(직접 코드 확인). ✅ = 직접 읽어 확정한 항목.

---

## 0. 검증 스탬프 (메인이 직접 확인)

| 주장 | 검증 | 근거 |
|---|---|---|
| 문제 풀어도 점수 미반영 | ✅ 확정 | `ProblemEditor.tsx:43-52` 로컬 state만, API/DB/스토리지 0건 |
| M03 문자열검색 3개 렌더 차단 | ✅ 확정(정확 메커니즘) | `module-utils.tsx:160-164` + `kmp-search.tsx:149` + `CTPModuleLoader.tsx:127,135,138` |
| 48문제 데이터 실재 | ✅ 확정 | `web/data/ctp/problems/module-01~04-problems.ts` |
| 개념 스펙 계약 존재 | ✅ 확정(신규 발견) | `web/data/ctp/specs/*.json` + `concept-spec.ts` + `concept-spec.test.ts` |
| tier-system이 CTP 점수 약속 | ⚠️ **정정** | tier-system은 **커뮤니티 활동** 기반 점수제 — CTP와 무관(미연동 기회이지 깨진 약속 아님) |

---

## 1. 핵심 요약

### 규모
| 항목 | 수량 |
|---|---|
| 모듈 | 4 (M01 Foundation / M02 Stack·Recursion / M03 Sorting·String / M04 List·Tree·Final) |
| 개념(conceptId) | 13 (서브개념 34 + 통합/문제은행 파트 4) |
| 비주얼라이저 인벤토리 | **102개** (main 44 · supp 42 · shared 2 · graph 2 · primitives 12) — **import 고아 0** |
| 코딩 문제 | **48** (모듈당 12) · `web/data/ctp/problems/` |
| 라이브 코드실행 시각화 | **1** (`linear-search-trace`만 사용자 Python을 Skulpt로 실제 실행) |

### 가장 중요한 발견 5
1. **[치명·확정] 문제를 AC 받아도 점수·진행도가 사이트 어디에도 저장·반영되지 않는다.** 채점은 100% 브라우저 Skulpt 워커, 결과는 React `useState`에만 담겨 새로고침 시 휘발. 영속화 경로(localStorage/Supabase/API/zustand persist) **전무**.
2. **[치명·확정] M03 문자열검색 3개(brute-force/KMP/Boyer-Moore)가 화면에 표시되지 않는다.** 팩토리가 `mode:'interactive'`를 강제하는데 넘긴 `useSim`이 레거시 계약(`{state,controls,progress,isFinished}`)을 반환 → `CTPModuleLoader`가 "아직 인터랙티브 시뮬레이션이 준비되지 않았습니다" 폴백을 렌더. KMP의 LPS 테이블·BM의 두 점프 규칙 등 핵심 개념이 사용자에게 **도달 불가**.
3. **[구조·확정] '인터랙티브 플레이그라운드'가 실제 코드 실행과 분리.** 43개 시각화 중 사용자 코드를 실행해 그림을 만드는 건 `linear-search-trace` **1개뿐**. 나머지는 JS로 미리 구운 스텝 시퀀스 재생 → Monaco에 Python이 보여도 '실행'은 사실상 no-op(교육적 착시).
4. **[설계·정정] CTP 풀이 결과가 사이트 티어 점수와 미연동.** `tier-system`은 커뮤니티 활동(질문/답변채택/협업/태스크) 기반 실재 점수제이나 CTP 코딩테스트 풀이는 그 입력에 연결돼 있지 않음 → **연동 기회**(깨진 약속 아님).
5. **[오해 소지] FC-4 '미니 코딩테스트(타이머형)'는 비기능 SVG 데모.** 타이머는 step 비례 계산값(실제 카운트다운 아님), 코드 제출·테스트케이스·채점·기록 전무, 'AC'는 step===4 하드코딩.

**총평:** 시각화 자산 커버리지(고아 0)와 다수 비주얼라이저의 개념 정합성은 우수. 그러나 **(a) 학습 결과 영속화·점수반영 계층 전무**, **(b) 인터랙티브가 실제 코드실행과 분리**, **(c) M03 문자열검색 3개 렌더 차단**이 구조적 결함.

---

## 2. "문제를 풀면 사이트 점수에 반영되는가?" → **아니오 (영속화 경로 부재)** ✅

### 근거
| 근거 | 위치 | 내용 |
|---|---|---|
| 결과를 로컬 state에만 | `problem-bank/ProblemEditor.tsx:31,43-52` | `setResult(judgeResult)` 뿐 — fetch/insert/저장 0 |
| 채점이 부작용 없이 return | `playground/browser-judge/BrowserJudge.ts:119-163` | `run()`이 JudgeResult return만, 네트워크/스토리지 0 |
| 결과의 유일 소비처가 UI | `problem-bank/JudgeResultPanel.tsx:38` | `result.overall==='AC'` 표시만 |
| 스토어에 점수 필드 없음 | `store/use-ctp-store.ts:18-78` | score/progress/solved 없음, persist 없음 |
| 백엔드 라우트 부재 | `app/api/**` | ctp/problem/judge/score 라우트 **0건** |
| 개념 페이지 순수 SSG | `app/insights/ctp/[categoryId]/[conceptId]/page.tsx:30-31` | `dynamic='force-static'` |

### 영속화 계층 검증
| 계층 | 결과 |
|---|---|
| localStorage / sessionStorage | CTP 풀이 결과 미사용(세션스토리지는 사이드바 열림 상태만) |
| Supabase / lib / api | CTP 관련 호출 0건 |
| zustand(`use-ctp-store`) | score/progress/solved·persist 없음 → 휘발 |
| tier-system / 프로필 진행도 | CTP 풀이 데이터 기록 경로 없음 |

### FC-4 타이머 기록: **없음.** `svg-animations/module-04/fc-4.tsx` — 타이머는 `elapsed=(step/(MAX-1))*0.7*TOTAL` 계산값, 제출/채점/기록 전무.

> 구조적 함의: 채점이 100% 클라이언트라 **결과 위변조 방지·서버 검증 불가**. 점수 반영을 추가하려면 서버 채점/기록 계층을 신설해야 함(현재 부분 구현조차 없음).

---

## 3. 페이지·챕터·개념별 커버리지 매트릭스

> 품질 1~5(5=최상). 인터랙티브 = 코드에디터+실행형 여부(버튼식 비주얼라이저는 ✕).

### M01 — Foundation
| 서브개념 | 주SVG | supp | 인터랙티브 | kind | 품질 | 핵심결함 |
|---|:--:|:--:|:--:|---|:--:|---|
| 01-1 algo-overview | O | O | ✕ | animated | 4 | Big-O 정의가 supp에 분리, push/pop 보일러플레이트 |
| 01-2 condition-loop | O | O | ✕ | animated | 5 | 순서도 좌표 하드코딩(반응형 위험) |
| 01-3 flow-tracing | O | O | ✕ | animated | 5 | 변수 타임라인 누적 없이 현재값만 |
| 02-1 ds-compare | O | O | ✕ | animated | 4 | 제목 3종(배열/리스트/튜플) 중 메인은 2종만(튜플 supp만) |
| 02-2 1d-array | O | O | ✕ | animated | 5 | 버튼/로그 라벨 불일치 |
| 02-3 2d-array | O | O | ✕ | animated | **3** | 제목 '최댓값/역순정렬' 중 역순정렬 부재 |
| 02-4 array-number-prime | O | O | ✕ | animated | 4 | 'n진수' 메인 누락(supp만) |
| 03-1 search-problem-key | O | O | ✕ | animated | 4 | 실패(-1/None) 종료 경로 미시연 |
| 03-2 linear-search | O | O | ✕ | animated | **3** | 제목 '보초법' 메인 누락(supp만) |
| 03-2.1 linear-search-trace | O(generic) | ✕ | **O** | **interactive** | 5 | **유일 라이브 Skulpt 트레이스**, 전용 메타포 없이 GenericArrayVisualizer 위임 |
| 03-3 basic-binary-search | O | O | ✕ | animated | 5 | 성공경로만(L>R 교차 실패 미시연) |
| 03-4 hash-collision | O | O | ✕ | animated | 4 | 체이닝만(개방주소법 supp), get 시나리오 없음 |
| foundation-integration | ✕ | ✕ | **O** | problem-bank | 4 | 의도된 ProblemBank(12문제), 개념↔문제 교차링크 없음 |

### M02 — Stack & Recursion (커버리지 최건강)
| 서브개념 | 주SVG | supp | 인터랙티브 | kind | 품질 | 핵심결함 |
|---|:--:|:--:|:--:|---|:--:|---|
| 04-1 lifo-basics | O | O | ✕ | interactive | 5 | 버튼식만, maxSize=6/push값 random 하드코딩 |
| 04-2 queue-overview | O | O | ✕ | interactive | 5 | 버튼 'Push/Pop'이 큐 용어와 불일치 |
| 04-3 linear-queue | O | O | ✕ | interactive | 5 | False Overflow 자동 시연 부재 |
| 04-4 circular-queue | O | O | ✕ | interactive | 5 | 모듈러 불변식 수치 미표시 |
| 05-1 recursion-basics | O | O | ✕ | interactive | 5 | Peek 단일버튼(되감기 없음), factorial(4) 고정 |
| 05-2 recursion-analysis | O | O | ✕ | interactive | 4 | 점화식↔트리 연동 약함, 메모이제이션 토글 없음 |
| 05-3 tower-of-hanoi | O | O | ✕ | interactive | 4 | N=3 하드코딩(2ⁿ-1 지수성장 체감 불가) |
| 05-4 iterative-recursion | O | O | ✕ | interactive | 4 | 재귀↔반복 코드 실행비교 최적 주제인데 Skulpt 미연결 |
| 05-5 queen-backtracking | O | O | ✕ | interactive | 5 | N 고정(가지치기 효과 N변경 불가) |
| stack-recursion-integration | ✕ | ✕ | **O** | problem-bank | 5 | 의도된 ProblemBank(12문제) |

*M02 공통: 9개 전부 main+supp 완비. 단 전부 버튼식(CTPInteractiveModule), 코드에디터+Skulpt형은 통합 ProblemBank에만. 재귀군은 슬라이더/오토플레이 미렌더, 수동 Peek만 동작.*

### M03 — Sorting & String
| 서브개념 | 주SVG | supp | 인터랙티브 | kind | 품질 | 핵심결함 |
|---|:--:|:--:|:--:|---|:--:|---|
| 06-1 sorting-overview | O | O | O | animated | 4 | currentStep/maxSteps 미반환 → 슬라이더 미표시 |
| 06-2 bubble-sort | O | O | O | interactive | 5 | sampleData(5)와 기본데이터(10) 불일치 |
| 06-3 selection-sort | O | O | O | interactive | 5 | 불안정성 메인 강조 약함 |
| 06-4 insertion-sort | O | O | O | interactive | 5 | Best Case 토글 없음 |
| 06-5 shell-sort | O | O | O | interactive | 5 | gap 수열 선택 UI 없음 |
| 06-6 quick-sort | O | O | O | interactive | 4 | 재귀 호출트리 동반표현 약함, 최악 O(N²) 프리셋 없음 |
| 06-7 merge-sort | O | O | O | interactive | 5 | 보조배열 O(N) 메모리 강조 약함 |
| 06-8 heap-sort | O | O | O | interactive | 5 | 배열↔완전이진트리 동시강조 약함 |
| 06-9 counting-sort | O | O | O | interactive | 5 | 안정성·큰 K 프리셋 없음 |
| **07-1 brute-force-search** | O | O | ✕ | **차단** | **2** | **[P0·확정] 폴백 메시지로 대체 — 메인 SVG 미표시** |
| **07-2 kmp-search** | O | O | ✕ | **차단** | **2** | **[P0·확정] LPS 테이블(핵심) 미도달** |
| **07-3 boyer-moore-search** | O | O | ✕ | **차단** | **2** | **[P0·확정] Bad Char/Good Suffix 미도달** |
| sorting-string-integration | ✕ | ✕ | **O** | problem-bank | 4 | 의도된 ProblemBank(12문제) |

### M04 — List, Tree & Final
| 서브개념 | 주SVG | supp | 인터랙티브 | kind | 품질 | 핵심결함 |
|---|:--:|:--:|:--:|---|:--:|---|
| 08-1 singly | O | O | O | interactive | 4 | 자동재생 무동작, 전이 애니메이션 없음, 5슬롯 하드코딩 |
| 08-2 doubly | O | O | O | interactive | 4 | 4포인터 한 프레임 점프, head/tail 라벨 근접 |
| 08-3 cursor-linked-list | O | O | O | interactive | 5 | free 체인 next 링크 미표시 |
| 08-4 circular | O | O | O | interactive | 5 | prev(역방향) 엣지 미표시('이중' 누락) |
| 09-1 tree-basics | O | O | O | interactive | 4 | 순회 4종 약속하나 전위·후위 2종만(중위/레벨 부재) |
| 09-2 bst | O | O | O | interactive | 4 | 3노드 하드코딩, 균형붕괴/중위순회 데모 없음 |
| list-tree-integration | ✕ | ✕ | O | problem-bank | 4 | 의도된 ProblemBank(12문제) |
| FC-1 기초·검색 종합 | O | O | O | interactive | 5 | 비교횟수 라이브 카운터 없음(M04 최고품질) |
| FC-2 스택·재귀·정렬 종합 | O | O | O | interactive | 4 | 중앙 pane 라벨 혼재, 최대 스택깊이 미표시 |
| FC-3 문자열·리스트·트리 종합 | O | O | O | interactive | **3** | **코드 데드로직** `slidePos = step===1?7:7`(삼항 양쪽 7) |
| FC-4 미니 코딩테스트 | O | O | O | interactive | **3** | **가짜 타이머**·하드코딩 AC·BrowserJudge 미연결 |

*M04 공통: ①애니메이션 없이 step-driven 정적 재렌더, ②Play/자동재생이 존재하지 않는 handler 호출 → 10개 전부 자동재생 무동작, ③push/pop config가 핸들러 부재로 dead.*

---

## 4. 고아/미사용 비주얼라이저 및 누락 개념

- **import 고아: 0** (102개 전부 연결)
- **wiredButUnused(연결됐으나 렌더 차단): 3건, 전부 치명** — M03 brute-force/kmp/boyer-moore (§3 P0)
- **개념-시각 정합성 결함**: 02-3(역순정렬 부재), 03-2(보초법 부재), 02-1(튜플 부재), 02-4(n진수 부재), 09-1(중위/레벨 순회 부재), FC-3(slidePos 데드로직)
- **채점 가능 문제 누락**: FC-1~FC-4는 시각화/개념 항목일 뿐 `testCases`를 가진 ProblemBankItem 0개. FC-4 타이머 미니테스트는 비기능 SVG.
- **신규 발견 — 스펙 계약 미충족 가능성**: `web/data/ctp/specs/*.json` + `concept-spec.ts`가 개념별 storyboard/learningOutcomes/visualizer 타입을 정의하나, 실제 비주얼라이저가 이 스펙을 충족하는지 검증 루프는 미확인. 보강 시 스펙을 단일 기준으로 활용 가능.

---

## 5. 인터랙티브 플레이그라운드 아키텍처 진단

### 데이터 흐름
중심은 Zustand `use-ctp-store.ts`(steps/currentStepIndex/playState). `CTPModuleLoader`가 `useSim()`의 `{runSimulation, interactive}`와 `config.mode`로 6개 셸 중 하나로 분기:
| 셸 | 대응 |
|---|---|
| CTPInteractiveModule | mode:'interactive' + sim이 `interactive` 반환 시 |
| CTPInteractivePlayground | 순수 push/pop/peek 폴백 |
| CTPSorting/Heap/MergeSortPlayground | 정렬 전용 래퍼(내부 CTPPlayground) |
| CTPPlayground(기본) | 표준모드 + linear-search-trace |
| (폴백 div) | mode:'interactive'인데 sim·components 둘 다 불충족 → **M03 문자열 3개가 여기 걸림** |

### 실행 엔진 (실재)
`web/public/workers/skulpt.worker.js`(라인별 스텝 트레이싱) — 소비자 단 2곳: ① `BrowserJudge.ts`(문제 채점, stdout만), ② `lib/ctp/skulpt-runner.ts`의 `runWithTrace`(VisualStep 생성 — **linear-search-trace 1개에서만**).
> 워커의 일시정지 경로(NEXT_STEP)는 'NO PAUSE 연속 실행'이라 **죽은 코드**. 재생은 일괄 캡처 후 setInterval 사후재생.

### "보이는 시각화"의 실체
| 구분 | 수량 |
|---|---:|
| 라이브 Skulpt 트레이싱 | **1** (linear-search-trace) |
| JS 프리베이크드 스텝 재생 | **42** (runSimulation no-op) |
| 사용자 Python 실제 실행 | 2경로(문제채점=그림없음, trace 데모 1건) |

### 아키텍처 결함
1. **'인터랙티브'와 Python 실행 분리** — 43개 중 1개만 실제 실행(교육적 착시).
2. **데이터 흐름 이원화** — 전역 store.steps vs 각 useXxxSim 로컬 state. 표준모드 정렬 runSimulation이 no-op이라 store.steps 미충전 → 헤더 칩 '-' 위험.
3. **죽은 코드** — 워커 일시정지, M04 push/pop dead config, FC-3 slidePos.
4. **휴리스틱 의존** — findArrayVariable/extractPointers가 변수명(arr/nums/i/j/k)에 의존 → 다른 변수명 쓰면 자동 시각화 침묵.
5. **3중 코드 중복** — 스택 구현이 ctp-interactive-playground·useInteractiveTemplateSimulation·useXxxSim에 중복.

---

## 6. 보강 백로그 (우선순위)

### P0 — 치명/기능 차단
| # | 대상 | 작업 | 근거 |
|---|---|---|---|
| P0-1 | M03 07-1/07-2/07-3 | `useBruteForceSearchSim`/`useKmpSearchSim`/`useBoyerMooreSearchSim`을 정렬과 동일한 `{runSimulation, interactive:{visualData, logs, handlers, currentStep, maxSteps, setStep}}` 계약으로 리팩터(또는 self-contained Visualizer용 mode 분기 신설) | 3개 메인 SVG가 폴백으로 차단(확정) |
| P0-2 | 점수/진행도 영속화 | (설계) `app/api/ctp/judge` + Supabase `ctp_submissions`(user_id, problem_id, verdict, passed/total, ts) + `ProblemEditor.handleSubmit` 성공 시 insert + zustand solved Set/persist | AC 받아도 새로고침 시 초기화 |
| P0-3 | M03 문자열 sampleData | 숫자배열(`[2,5,2,5,2]` 등)을 실제 텍스트/패턴 문자열로 교체 | 문자열 검색 개념과 무관 |

### P1 — 개념 정합성/핵심 UX
| # | 대상 | 작업 |
|---|---|---|
| P1-1 | M01 02-3 2d-array | 1D 역순정렬 step 추가 또는 제목/스토리 정정 |
| P1-2 | M01 03-2 linear-search | '기본 vs 보초법' 토글 + 비교횟수 카운터 메인 추가 |
| P1-3 | M04 10개 | Play 핸들러를 명시적 advance로 일반화, dead push/pop config 정리 |
| P1-4 | M04 FC-3 | slidePos 데드 삼항 제거, 실제 검색 step 구현 |
| P1-5 | tier-system 연동 | CTP submissions를 티어 점수 입력으로 연결(또는 비연동 명시) |
| P1-6 | FC-4 | 실제 setInterval 카운트다운 + submit을 BrowserJudge 연결, 또는 '데모' 라벨 명시 |
| P1-7 | M04 09-1 tree-basics | 중위·레벨 순회 step(또는 토글) 추가 |
| P1-8 | sorting-overview | useSim에 currentStep/maxSteps/setStep 추가 → 슬라이더 양방향 |

### P2 — 심화/일관성/정리
| # | 대상 | 작업 |
|---|---|---|
| P2-1 | 데이터 흐름 이원화 | store.steps vs useXxxSim 로컬 state 단일화, 정렬 runSimulation 실충전 |
| P2-2 | trace 확장 | 라이브 코드실행을 flow-tracing·iterative-recursion 등으로 확장 |
| P2-3 | 개념↔문제 교차링크 | ProblemBank 문제에 관련 비주얼라이저 딥링크, 통과 후 trace 시각화 |
| P2-4 | 큐 용어 정합성 | M02 큐 버튼 라벨 Enqueue/Dequeue |
| P2-5 | 하드코딩 일반화 | hanoi(N)·bst(노드)·singly(슬롯) 입력 선택 노출 |
| P2-6 | 죽은 코드 정리 | 워커 일시정지·M04 dead config·FC-3 삼항 |
| P2-7 | 좌표 안정화 | condition-loop·hash-collision 픽셀 좌표 → viewBox 기반 동적 |
| P2-8 | 스택 3중복 통합 | ctp-interactive-playground·template·useXxxSim |

---

## 부록 — 핵심 파일
- 채점 엔진: `web/public/workers/skulpt.worker.js`
- 채점 진입: `web/components/features/ctp/playground/browser-judge/BrowserJudge.ts`
- 결과 표시(영속화 없음): `web/components/features/ctp/problem-bank/ProblemEditor.tsx`, `JudgeResultPanel.tsx`
- 스토어(persist 없음): `web/components/features/ctp/store/use-ctp-store.ts`
- 셸 분기: `web/components/features/ctp/common/CTPModuleLoader.tsx`
- 인터랙티브 팩토리(P0 원인): `web/components/features/ctp/contents/categories/modules/shared/module-utils.tsx`
- P0 차단 3건: `web/components/features/ctp/playground/visualizers/svg-animations/module-03/{brute-force-search,kmp-search,boyer-moore-search}.tsx`
- 트레이스 러너(유일 라이브): `web/lib/ctp/skulpt-runner.ts`
- 문제 데이터: `web/data/ctp/problems/`
- 개념 스펙 계약: `web/data/ctp/specs/`
- 티어(미연동): `web/app/tier-system/page.tsx`
