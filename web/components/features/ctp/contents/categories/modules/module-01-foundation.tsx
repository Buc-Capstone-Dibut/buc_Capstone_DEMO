"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { ProblemBankController } from "@/components/features/ctp/problem-bank";
import { module01Problems } from "@/data/ctp/problems";
import { ChapterOverview } from "./shared/chapter-overview";
import {
  createInteractiveTemplateModules,
} from "./shared/module-utils";
import type { CTPModule } from "@/components/features/ctp/common/types";

import { AlgoOverviewVisualizer, useAlgoOverviewSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/algo-overview";
import { ConditionLoopVisualizer, useConditionLoopSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/condition-loop";
import { FlowTracingVisualizer, useFlowTracingSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/flow-tracing";

import { DsCompareVisualizer, useDsCompareSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/ds-compare";
import { OneDArrayVisualizer, use1DArraySim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/1d-array";
import { TwoDArrayVisualizer, use2DArraySim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/2d-array";
import { ArrayPrimeVisualizer, useArrayPrimeSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/array-number-prime";

import { ProblemKeyVisualizer, useProblemKeySim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/search-problem-key";
import { LinearSearchVisualizer, useLinearSearchSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/linear-search";
import {
  LinearSearchTraceVisualizer,
  useLinearSearchTraceSim,
  LINEAR_SEARCH_TRACE_STARTER_CODE,
} from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/linear-search-trace";
import { BasicBinarySearchVisualizer, useBasicBinarySearchSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/basic-binary-search";
import { HashCollisionVisualizer, useHashCollisionSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/hash-collision";

// Supplementary Visualizers
import { AlgoOverviewSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/supp/algo-overview-supp";
import { ConditionLoopSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/supp/condition-loop-supp";
import { FlowTracingSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/supp/flow-tracing-supp";
import { DsCompareSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/supp/ds-compare-supp";
import { OneDArraySupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/supp/1d-array-supp";
import { TwoDArraySupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/supp/2d-array-supp";
import { ArrayPrimeSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/supp/array-number-prime-supp";
import { ProblemKeySupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/supp/search-problem-key-supp";
import { LinearSearchSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/supp/linear-search-supp";
import { BinarySearchSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/supp/basic-binary-search-supp";
import { HashCollisionSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/supp/hash-collision-supp";

const FOUNDATION_ALGO_BASICS_MODULES = createInteractiveTemplateModules([
  {
    id: "algo-overview",
    title: "01-1 알고리즘 개요",
    description: "알고리즘의 정의, 입력/출력 모델, 시간복잡도의 의미를 학습합니다.",
    sampleData: [1, 4, 2, 8, 5],
    useSim: useAlgoOverviewSim,
    Visualizer: AlgoOverviewVisualizer,
    story: {
      problem: "코드가 에러 없이 돌아가는 것과 실제 서비스 환경에서 안정적으로 동작하는 것은 다릅니다. 수백만 명이 동시에 요청을 보내거나, 배달 앱에서 반경 2km 내 식당 10만 개를 0.1초 안에 필터링해야 하는 상황에서는 작성 방식에 따라 응답 시간 차이가 극단적으로 벌어집니다.\n\n입력 크기가 커져도 예측 가능하게 동작하는 '절차의 설계도'를 그리는 훈련이 필요합니다.",
      definition: "**알고리즘(Algorithm)** 은 입력(Input)을 정해진 출력(Output)으로 변환하는 명확한 절차입니다. 좋은 알고리즘은 세 가지 조건을 충족합니다.\n* **명확성**: 각 단계가 모호하지 않고 독립적으로 실행 가능해야 합니다.\n* **유한성**: 정해진 시간 안에 반드시 종료되어야 하며, 무한 루프에 빠지지 않아야 합니다.\n* **효율성**: 자원(CPU 시간·메모리 공간)을 분석하고, 입력이 커질 때 어떻게 증가하는지(시간복잡도·공간복잡도)를 따집니다.",
      analogy: "주방 레시피와 비슷합니다. '물'과 '라면'이라는 같은 재료(입력)로도 결과에 도달하는 과정은 다양합니다.\n* **느린 레시피**: 냄비를 찾고, 물이 끓는지 1초마다 열어 확인하며 불필요한 동작을 반복합니다.\n* **잘 정돈된 레시피**: 동선이 정해진 주방에서 타이머를 맞추고, 일정한 화력으로 같은 결과를 안정적으로 만들어냅니다.\n\n같은 데이터를 다루더라도 절차 설계가 처리 시간과 안정성을 결정합니다."
    },
    features: [
      {
        title: "입력과 출력의 정의",
        description: "알고리즘은 정의된 입력을 받아 약속된 출력으로 변환합니다. 시뮬레이터에서 배열 데이터가 단계별로 어떻게 가공되는지 관찰합니다.",
        SupplementaryVisualizer: AlgoOverviewSupplementaryOptions[0]
      },
      {
        title: "결정론적 특성 관찰",
        description: "동일한 입력은 항상 동일한 결과를 반환해야 합니다. 데이터를 바꿔가며 결과가 규칙대로만 변하는지 확인합니다.",
        SupplementaryVisualizer: AlgoOverviewSupplementaryOptions[1]
      },
      {
        title: "시간복잡도 고민",
        description: "입력 크기 N이 커질 때 연산 횟수가 어떻게 증가하는지(O(N), O(N²) 등) 분석하는 감각이 알고리즘 설계의 핵심입니다.",
        SupplementaryVisualizer: AlgoOverviewSupplementaryOptions[2]
      },
      {
        title: "Big-O 복잡도 비교",
        description: "O(1), O(N), O(N²) 세 가지 대표 복잡도를 그래프로 비교해, 입력이 커질수록 성능 차이가 어떻게 벌어지는지 확인합니다.",
        SupplementaryVisualizer: AlgoOverviewSupplementaryOptions[3]
      }
    ]
  },
  {
    id: "condition-loop",
    title: "01-2 조건문과 반복문",
    description: "분기와 반복을 조합해 절차를 구성하는 기본 패턴을 익힙니다.",
    sampleData: [3, 9, 2, 6, 1],
    useSim: useConditionLoopSim,
    Visualizer: ConditionLoopVisualizer,
    story: {
      problem: "코드가 입력 순서대로만 위에서 아래로 흐른다면, 사용자의 비밀번호 검증이나 1부터 1만까지의 누적합 같은 작업을 한 줄 한 줄 손으로 작성해야 합니다.\n\n외부 입력값에 따라 실행 경로를 바꾸고, 반복 작업을 기계에 위임하기 위해서는 절차를 통제하는 코드 뼈대가 필요합니다.",
      definition: "**조건문(Condition)** 과 **반복문(Loop)** 은 프로그램의 실행 흐름을 통제하는 제어 구조(Control Flow)입니다.\n* **조건문 (`if/else/switch`)**: 변수의 상태를 논리 연산자(True/False)로 평가해, 이번에 실행할 코드 경로를 분기합니다.\n* **반복문 (`for/while`)**: 지정한 조건이 유지되는 동안, 혹은 컬렉션의 끝까지 동일한 코드 블록을 반복 실행합니다. 수백 줄의 작업을 짧은 루프로 압축할 수 있습니다.",
      analogy: "자율주행 자동차의 교차로 통과를 떠올려 봅니다.\n* **조건문**: 카메라가 '빨간불'을 인식하면 브레이크 경로를, '초록불'이면 가속 경로를 선택합니다.\n* **반복문**: 출발지에서 목적지까지 가는 동안 '신호 인식 → 판단 → 제어'라는 한 사이클을 도착할 때까지 반복합니다.\n\n조건문은 선택, 반복문은 누적입니다."
    },
    features: [
      {
        title: "제어 흐름 분기",
        description: "`if / else` 조건문은 데이터 상태(State)에 따라 실행할 코드 경로를 선택합니다. 조건 검사 후 어느 경로가 활성화되는지 따라가 봅니다.",
        SupplementaryVisualizer: ConditionLoopSupplementaryOptions[0]
      },
      {
        title: "상태의 누적과 반복",
        description: "`for / while` 반복문은 종료 조건이 만족될 때까지 같은 작업을 반복합니다. 인덱스 `i`가 어떻게 이동하며 조건을 갱신하는지 관찰합니다.",
        SupplementaryVisualizer: ConditionLoopSupplementaryOptions[1]
      },
      {
        title: "흐름 결합 패턴",
        description: "기초 알고리즘은 반복문 안에 조건문을 중첩한 형태가 많습니다. 배열 순회 중 특정 요소를 찾거나(조건), 합을 누적(반복)하는 패턴을 정리합니다.",
        SupplementaryVisualizer: ConditionLoopSupplementaryOptions[2]
      },
      {
        title: "중첩 흐름 실전 코드",
        description: "반복문 안에 조건문을 넣어 배열을 필터링하는 'for + if' 구조를 코드 블록 시각화로 확인합니다. 실전에서 가장 자주 등장하는 패턴입니다.",
        SupplementaryVisualizer: ConditionLoopSupplementaryOptions[3]
      }
    ]
  },
  {
    id: "flow-tracing",
    title: "01-3 순서도와 흐름 추적",
    description: "순서도 기반으로 상태 변화를 추적하고 디버깅 사고를 훈련합니다.",
    sampleData: [7, 2, 11, 4, 5],
    useSim: useFlowTracingSim,
    Visualizer: FlowTracingVisualizer,
    story: {
      problem: "코드를 실행했을 때 에러 메시지가 출력되거나 예상과 다른 결과가 나오는 상황은 흔합니다. 이중 반복문과 조건문이 얽힌 코드에서 '왜 이렇게 동작하는지 모르겠다'는 상태에 멈춰 있으면 디버깅이 진행되지 않습니다.\n\n프로그램이 한 줄씩 실행될 때 변수 값을 어떻게 바꾸는지 단계별로 따라갈 수 있는 추적 시선이 필요합니다.",
      definition: "**흐름 추적(Flow Tracing)** 은 순서도(Flowchart)와 디버깅 기법으로 프로그램의 실행 경로를 한 단계씩 관찰하는 방법입니다.\n* **변수 테이블 작성**: 코드 한 줄이 실행될 때마다 변수 `i`, `sum`, `arr[i]`의 값을 표(Table)로 기록합니다.\n* **경계 조건 검증**: 버그는 대부분 루프의 시작·종료 경계(Boundary)에서 발생하므로, 종료 조건이 정확한지 확인합니다.\n* **오류 원점 역추적**: 크래시 지점(스택 트레이스)을 역추적해, 상태가 처음 잘못된 위치를 찾습니다.",
      analogy: "탐정의 사건 재구성과 비슷합니다. 이미 발생한 사건(에러)에서 가능성이 큰 용의자(코드)는 여럿입니다. 현장 단서(변수 중간값)를 시간 순서대로 타임라인에 기록합니다.\n'루프 3회차에서 변수 A가 0으로 바뀌었음 → 여기서 상태가 오염됨' 식으로 증거 기반으로 한 단계씩 짚어가면, 복잡하게 얽힌 버그도 안정적으로 찾을 수 있습니다."
    },
    features: [
      {
        title: "시각적 디버깅",
        description: "순서도(Flowchart)의 노드 흐름을 따라가며 변수 값이 단계별로 어떻게 변하는지 추적합니다. 머릿속 추측 대신 표 기반으로 확인하는 습관을 만듭니다.",
        SupplementaryVisualizer: FlowTracingSupplementaryOptions[0]
      },
      {
        title: "종료 조건 식별",
        description: "무한 루프를 방지하기 위해 반복문이나 재귀가 끝나는 조건(Base/Exit Case)을 순서도에서 어디에 배치할지 학습합니다.",
        SupplementaryVisualizer: FlowTracingSupplementaryOptions[1]
      },
      {
        title: "엣지 케이스 시뮬레이션",
        description: "데이터가 비어 있거나 음수 같은 예상치 못한 값이 들어왔을 때, 순서도의 어느 경로로 예외 처리가 이뤄지는지 확인합니다.",
        SupplementaryVisualizer: FlowTracingSupplementaryOptions[2]
      },
      {
        title: "변수 상태 타임라인",
        description: "코드 한 줄이 실행될 때마다 변수 값이 어떻게 바뀌는지 타임라인 표로 추적합니다. 변수 상태 기록 습관이 디버깅의 핵심입니다.",
        SupplementaryVisualizer: FlowTracingSupplementaryOptions[3]
      }
    ]
  },
]);

const FOUNDATION_BASIC_DS_ARRAY_MODULES = createInteractiveTemplateModules([
  {
    id: "ds-compare",
    title: "02-1 자료구조 비교 (배열/리스트/튜플)",
    description: "자료구조별 접근/수정/확장 비용과 사용 맥락을 비교합니다.",
    useSim: useDsCompareSim,
    Visualizer: DsCompareVisualizer,
    story: {
      problem: "알고리즘 문제를 풀 때 '어떤 자료구조에 데이터를 담을까'를 정하는 것이 첫 단계입니다.\n\n배열, 리스트, 튜플 중 특성에 맞지 않는 것을 고르면 데이터 추가나 탐색 비용이 누적되어 시스템 병목으로 이어집니다.",
      definition: "**자료구조(Data Structure)** 는 데이터를 효율적으로 저장·수정·탐색하기 위한 구조적 방법론입니다.\n* **배열 (Array)**: 크기가 고정된 대신 인덱스로 임의 접근 비용이 `O(1)`입니다.\n* **연결 리스트 (Linked List)**: 크기가 동적이고 중간 삽입/삭제가 유연하지만, 특정 위치를 찾으려면 처음부터 순차 탐색(`O(N)`)해야 합니다.\n* **튜플 (Tuple)**: 생성 후 수정되지 않는 불변성(Immutability)을 가져, 동시성 처리에서 무결성을 보장하기 쉽습니다.",
      analogy: "택배 보관함을 고르는 것과 비슷합니다. 칸마다 번호가 매겨져 있어 번호만 알면 즉시 열 수 있는 무인 보관함이 배열이라면, 사람들이 서로 손을 잡고 이어진 줄에서 다음 사람의 위치만 알고 있어 맨 앞부터 따라가야 하는 구조가 연결 리스트입니다.\n\n같은 데이터라도 자료구조에 따라 접근 비용이 달라집니다."
    },
    features: [
      {
        title: "연속 메모리와 임의 접근",
        description: "배열은 메모리상에 연속 배치되므로 인덱스를 통한 원소 접근이 `O(1)`로 보장됩니다. 이 특성을 시각화로 확인합니다.",
        SupplementaryVisualizer: DsCompareSupplementaryOptions[0]
      },
      {
        title: "크기 확장 제약 (Static vs Dynamic)",
        description: "정적 배열은 초기 크기에 묶이고, 동적 배열은 공간이 부족할 때 내부 복사 비용(Overhead)이 발생합니다. 두 방식의 차이를 비교합니다.",
        SupplementaryVisualizer: DsCompareSupplementaryOptions[1]
      },
      {
        title: "불변성 (Immutability)",
        description: "튜플처럼 생성 후 변형되지 않는 자료구조가 값 비교와 동시성 처리에서 어떤 장점을 주는지 학습합니다.",
        SupplementaryVisualizer: DsCompareSupplementaryOptions[2]
      },
      {
        title: "연산별 비용 비교표",
        description: "배열과 연결 리스트의 접근·삽입·삭제·검색 비용을 나란히 비교해, 상황별로 어떤 자료구조가 유리한지 판단 감각을 기릅니다.",
        SupplementaryVisualizer: DsCompareSupplementaryOptions[3]
      }
    ]
  },
  {
    id: "1d-array",
    title: "02-2 배열 인덱스와 슬라이싱",
    description: "인덱스 접근, 부분 구간 선택, 경계 처리 규칙을 실습합니다.",
    useSim: use1DArraySim,
    Visualizer: OneDArrayVisualizer,
    story: {
      problem: "알고리즘 문제 구현 대부분은 배열 처리에서 시작됩니다.\n\n루프 범위를 잘못 설정해 존재하지 않는 인덱스에 접근하는 '배열 범위 초과(Out Of Bounds)' 에러는 가장 자주 발생하는 논리 버그입니다.",
      definition: "**1차원 배열(1D Array)** 은 동일한 타입의 데이터가 메모리에 연속적으로 배치된 기본 구조입니다.\n* **0-based 인덱싱**: 첫 데이터의 오프셋(Offset)이 배열 시작 주소와 같으므로, 인덱스는 `0`부터 시작합니다.\n* **슬라이싱 (Slicing)**: 전체 배열에서 특정 구간(`Start ~ End-1`)만 잘라내 부분 배열(Sub-array)로 다룹니다.\n* **경계 조건 (Boundary)**: 인덱스가 항상 `0` 이상 `N-1` 이하 범위 안에 머물도록 통제해야 합니다.",
      analogy: "기차 객차의 줄과 비슷합니다. 1호차(오프셋 0)부터 N호차까지 차례로 연결되어 있고, 중간 몇 칸만 떼어내(슬라이스) 별도 편성으로 운영할 수 있습니다.\n존재하지 않는 'N+1호차'의 문을 여는 시도가 곧 범위 초과 오류입니다."
    },
    features: [
      {
        title: "0-based 인덱싱",
        description: "메모리 오프셋(Offset)에서 출발한 0-based 인덱싱을 이해하고, off-by-one 오류를 방지하는 감각을 기릅니다.",
        SupplementaryVisualizer: OneDArraySupplementaryOptions[0]
      },
      {
        title: "배열 순회와 경계 조건",
        description: "반복문으로 배열을 처음부터 끝까지 순회할 때, 시작 조건과 종료 조건(`i < n`)을 정확히 쓰는 패턴을 실습합니다.",
        SupplementaryVisualizer: OneDArraySupplementaryOptions[1]
      },
      {
        title: "슬라이싱과 부분 배열",
        description: "전체 배열에서 특정 인덱스 범위만 잘라내 부분 배열로 다루는 방법을 학습합니다.",
        SupplementaryVisualizer: OneDArraySupplementaryOptions[2]
      },
      {
        title: "배열 범위 초과 오류",
        description: "가장 자주 발생하는 `IndexError`(범위 초과) 상황을 시각화하고, `range(len(arr))` 패턴으로 안전하게 순회하는 방법을 확인합니다.",
        SupplementaryVisualizer: OneDArraySupplementaryOptions[3]
      }
    ]
  },
  {
    id: "2d-array",
    title: "02-3 배열 기본 문제 (최댓값/역순 정렬)",
    description: "반복문 기반 배열 순회와 기초 문제 해결 흐름을 학습합니다.",
    useSim: use2DArraySim,
    Visualizer: TwoDArrayVisualizer,
    story: {
      problem: "바둑판이나 체스판, 영상 픽셀, 내비게이션의 격자 맵 등 현실의 많은 데이터는 1차원 선이 아닌 2차원 면(행렬) 구조입니다.\n\n다차원 데이터를 코드로 빠짐없이 탐색하려면 사고를 평면으로 확장해야 합니다.",
      definition: "**2차원 배열(2D Array)** 은 1차원 배열을 또 다른 배열의 원소로 가진 '배열의 배열' 구조입니다.\n* **이중 순회 (Nested Loop)**: 외부 반복문은 행(Row)을, 내부 반복문은 열(Col)을 훑어 격자 전체를 완전 탐색합니다.\n* **메모리의 선형 변환**: 물리 메모리는 1차원이므로, 2차원 좌표 `(row, col)`이 1차원 주소로 변환되는 규칙(Row-major 등)을 이해해야 합니다.\n* **그리드 탐색 패턴**: 가로·세로 외에도 대각선(Diagonal)이나 상하좌우 네 방향 탐색이 BFS·그래프 알고리즘의 기초가 됩니다.",
      analogy: "아파트 단지의 우편 배달 동선과 비슷합니다. 배달부는 '101동(행)'의 1층부터 꼭대기 층(열)까지 모든 세대를 돈 뒤 '102동(다음 행)'으로 이동합니다. 이중 루프의 동작 순서가 그대로입니다."
    },
    features: [
      {
        title: "다차원 데이터의 선형 변환",
        description: "2차원 배열이 메모리상에서 1차원으로 펼쳐지는 방식(Row-major 등)과 이중 반복문과의 대응 관계를 시각화합니다.",
        SupplementaryVisualizer: TwoDArraySupplementaryOptions[0]
      },
      {
        title: "이중 루프 제어",
        description: "바깥 루프(행)와 안쪽 루프(열)가 격자를 어떻게 완전 탐색하는지 실행 흐름을 분석합니다.",
        SupplementaryVisualizer: TwoDArraySupplementaryOptions[1]
      },
      {
        title: "효율적 탐색 패턴",
        description: "전체 영역 탐색, 대각선 탐색, 인접 요소 탐색 등 2차원 배열에서 자주 등장하는 탐색 기법을 학습합니다.",
        SupplementaryVisualizer: TwoDArraySupplementaryOptions[2]
      },
      {
        title: "Row-Major 메모리 배치",
        description: "2D 논리 좌표가 실제 메모리의 1차원 주소로 변환되는 규칙(Row-major)을 시각화하며 `arr[r][c] = base + r×cols + c` 공식을 확인합니다.",
        SupplementaryVisualizer: TwoDArraySupplementaryOptions[3]
      }
    ]
  },
  {
    id: "array-number-prime",
    title: "02-4 배열 응용 (n진수/소수)",
    description: "배열을 이용한 진법 변환과 소수 판정/생성 패턴을 다룹니다.",
    useSim: useArrayPrimeSim,
    Visualizer: ArrayPrimeVisualizer,
    story: {
      problem: "데이터를 그대로 모두 계산하면 단순하지만 시스템에 큰 부하가 걸립니다.\n\nN까지의 약수나 소수(Prime)를 하나씩 차례대로 나눗셈으로 검사하면 타임아웃(Time Limit Exceeded)이 발생합니다. 계산 공간의 부담을 줄이는 응용 패턴이 필요합니다.",
      definition: "배열 형식을 단순한 데이터 수납장을 넘어 **계산 과정의 최적화 도구** 로 효과적으로 활용하는 특수 응용 패턴입니다.\n\n* **소수 판별 (에라토스테네스의 체)**: `2`부터 시작해, 진짜 소수들의 배수 위치(인덱스)를 False로 표시(Sieve)함으로써, `O(N log log N)`이라는 효율적인 속도로 소수만 남겨 추려냅니다.\n* **진법의 배열 기록**: 정수를 목표 진수 N으로 나눈 나머지 조각들을 배열에 순서대로 기록(Push)해 둔 뒤, 나중에 역순으로 읽음(Pop/Reverse)으로써 다른 진법의 숫자로 조립합니다.\n* **캐싱 (Caching)**: 복잡한 로직으로 한 번 계산된 결과표를 배열에 저장해 두고, 나중에는 표만 참조하여 중복 연산을 건너뛰는 메모이제이션(Memoization)의 기초가 됩니다.",
      analogy: "**그림 영역에서 불필요한 부분을 단계적으로 지워나가기**와 같습니다.\n\n1부터 10만까지의 수첩에서 페이지를 하나씩 넘기며 소수 여부를 반복 나눗셈으로 검사하는 대신, 맨 첫 장부터 `2`의 배수에 X 표시를 일괄 적용하고, 남은 `3`의 배수들을 찾아 X 표시를 추가하는 방식(체로 거르기)으로, 직관적이고 빠른 속도로 '소수만' 추려내는 수학적 응용 패턴입니다."
    },
    features: [
      {
        title: "에라토스테네스의 체 시각화",
        description: "소수 판별 시 각 배양수들을 지워나가는(Sieve) 과정을 배열 시각화를 통해 직관적으로 관찰하며 O(N log log N) 최적화의 원리를 느낍니다.",
        SupplementaryVisualizer: ArrayPrimeSupplementaryOptions[0]
      },
      {
        title: "배열을 활용한 진법 변환 저장",
        description: "정수를 N으로 나눈 나머지를 배열에 순서대로 기록(Push)한 뒤, 역순으로 읽어내어(Pop/Reverse) 다른 진법의 숫자로 변환하는 과정을 실습합니다.",
        SupplementaryVisualizer: ArrayPrimeSupplementaryOptions[1]
      },
      {
        title: "공간과 시간의 트레이드오프",
        description: "계산된 결과를 배열에 저장(캐싱)하여 중복 연산을 방지하는 메모이제이션(Memoization)의 기초적인 아이디어를 경험합니다.",
        SupplementaryVisualizer: ArrayPrimeSupplementaryOptions[2]
      },
      {
        title: "메모이제이션 캐시 비교",
        description: "같은 피보나치 계산을 캐시 없이 중복 실행하는 경우와 캐시를 활용해 재활용하는 경우를 나란히 비교하며 메모이제이션의 효과를 직관적으로 확인합니다.",
        SupplementaryVisualizer: ArrayPrimeSupplementaryOptions[3]
      }
    ]
  },
]);

const FOUNDATION_BASIC_SEARCH_MODULES = createInteractiveTemplateModules([
  {
    id: "search-problem-key",
    title: "03-1 검색 알고리즘과 키(Key)",
    description: "검색 대상/키 정의와 비교 기준을 문제 유형별로 정리합니다.",
    useSim: useProblemKeySim,
    Visualizer: ProblemKeyVisualizer,
    story: {
      problem: "수많은 데이터 속에서 내가 원하는 단 하나의 정보('타겟')를 찾아내는 것은 애플리케이션의 핵심 기능입니다.\n\n하지만 무턱대고 아무 기준 없이 찾으려고 하면, 엉뚱한 데이터를 가져오거나 시간만 낭비하게 됩니다. 시스템에 '무엇'을 '어떤 기준'으로 찾으라고 명령해야 할까요?",
      definition: "**검색(Search)** 은 주어진 데이터 집합에서 특정 조건을 가장 빠르고 정확하게 찾아내는 작업입니다.\n\n* **검색 공간 (Search Space)**: 탐색의 대상이 되는 전체 데이터 집합(예: 배열, 리스트, 트리)입니다.\n* **키 (Key)**: 검색의 '기준'이 되는 핵심 단서입니다. 학번, 이메일, 닉네임 등 데이터 레코드를 유일하게 식별할 수 있는 핵심 속성이 키가 됩니다.\n* **성공과 실패**: 조건에 일치하는 데이터를 찾은 경우를 성공(Success), 전체를 탐색했으나 찾지 못하고 종료된 상태를 실패(Failure)로 명확히 정의해야 합니다.",
      analogy: "**거대한 도서관에서 특정 책 찾기**와 같습니다.\n\n'빨간색 표지'라는 모호한 조건만으로 책을 찾는다면 시간이 많이 걸립니다. 하지만 '도서 분류 번호 800번대'라는 정확한 키를 들고 정해진 규칙대로 찾으면 짧은 시간 안에 원하는 책을 찾을 수 있습니다."
    },
    features: [
      {
        title: "검색 가능한 데이터 구조 식별",
        description: "데이터가 정렬되어 있는지, 해시 테이블로 매핑되어 있는지에 따라 사용할 수 있는 검색 알고리즘의 한계와 가능성을 판단합니다.",
        SupplementaryVisualizer: ProblemKeySupplementaryOptions[0]
      },
      {
        title: "검색 키(Search Key)의 매칭 기준",
        description: "단순한 정수 비교부터 복잡한 객체 속성 비교까지, 검색을 수행할 때 참/거짓을 판별하는 '키 기준'을 설정하는 방법을 배웁니다.",
        SupplementaryVisualizer: ProblemKeySupplementaryOptions[1]
      },
      {
        title: "실패 조건 정의의 중요성",
        description: "원하는 데이터를 찾았을 때(성공)뿐만 아니라, 데이터가 없음을 확인하고 안전하게 종료(실패)하는 로직의 완결성을 고민합니다.",
        SupplementaryVisualizer: ProblemKeySupplementaryOptions[2]
      },
      {
        title: "검색 성공·실패 결과 상태",
        description: "검색 결과를 성공(인덱스·값 반환)과 실패(-1·None 반환) 두 가지 상태로 구분하고, 반환값을 검증하지 않을 때 발생하는 런타임 오류를 예방하는 습관을 기릅니다.",
        SupplementaryVisualizer: ProblemKeySupplementaryOptions[3]
      }
    ]
  },
  {
    id: "linear-search",
    title: "03-2 선형 검색 (보초법)",
    description: "정렬되지 않은 데이터에서의 선형 탐색 패턴과 보초법 최적화를 실습합니다.",
    useSim: useLinearSearchSim,
    Visualizer: LinearSearchVisualizer,
    story: {
      problem: "정렬되지 않은 데이터 더미에서 특정 항목을 찾아야 할 때가 있습니다.\n\n무질서한 환경에서는 수학적 최적화를 적용할 여지가 없어 처음부터 끝까지 차례로 확인하는 방법뿐입니다. 이 기본 방법을 조금이라도 효율적으로 개선할 수 있을까요?",
      definition: "**선형 검색(Linear Search)** 은 배열의 첫 번째 요소부터 마지막 요소까지 순서대로 하나씩 키(Key) 값과 비교해가며 타겟을 찾는 가장 기본적이고 확실한 알고리즘입니다.\n\n* **시간 복잡도 `O(N)`**: 운이 좋으면 맨 처음에 찾지만, 최악의 경우 N개의 데이터를 모두 검사해야 합니다.\n* **종료 조건 검사 비용**: 기본 탐색의 루프 안에는 매번 '찾았는가?'와 더불어 '배열 끝에 도달했는가?'를 동시에 묻는 이중 검사 비용이 내재되어 있습니다.\n* **보초법(Sentinel) 최적화**: 찾고자 하는 키를 배열의 맨 마지막 위치에 추가하여(보초 추가), '배열이 끝났는가?'라는 추가 조건 검사를 제거함으로써 연산 속도를 효율적으로 끌어올리는 실무 기법입니다.",
      analogy: "**섞여 있는 카드 더미에서 특정 카드 찾기**를 생각해 보세요.\n\n카드가 무작위로 섞여 있으면 맨 위부터 한 장씩 차례대로 뒤집는 방법뿐입니다. 이때 '가짜 타겟(보초)'을 카드 맨 밑에 미리 깔아둔다면, '더 이상 뒤집을 카드가 남아있나?' 검사 없이 순차적으로 뒤집기만 해도 보초 또는 진짜 타겟이 반드시 나오므로 탐색 효율이 올라갑니다."
    },
    features: [
      {
        title: "O(N) 순차 탐색의 이해",
        description: "검색 대상이 아무런 규칙 없이 배치되어 있을 때, 최악의 경우 모든 요소를 다 확인해야 하는 선형 검색의 구조와 한계를 시각화합니다.",
        SupplementaryVisualizer: LinearSearchSupplementaryOptions[0]
      },
      {
        title: "종료 조건 최적화: 보초법(Sentinel)",
        description: "배열의 끝에 찾고자 하는 키를 임의로 덧붙여(보초) 반복문 내의 '배열 범위 초과 확인' 조건을 제거함으로써 연산 비용을 절반으로 줄이는 테크닉을 배웁니다.",
        SupplementaryVisualizer: LinearSearchSupplementaryOptions[1]
      },
      {
        title: "실무에서의 활용 시점 식별",
        description: "데이터의 크기가 아주 작거나, 정렬하는 데 드는 비용이 검색 비용보다 클 때는 오히려 단순한 선형 탐색이 효율적일 수 있음을 논의합니다.",
        SupplementaryVisualizer: LinearSearchSupplementaryOptions[2]
      },
      {
        title: "선형 vs 이진 탐색 성능 비교",
        description: "N=16, 1,000, 1,000,000 세 가지 데이터 크기에서 선형 탐색과 이진 탐색의 비교 횟수를 나란히 보며 규모가 커질수록 격차가 얼마나 벌어지는지 체감합니다.",
        SupplementaryVisualizer: LinearSearchSupplementaryOptions[3]
      }
    ]
  },
  {
    id: "basic-binary-search",
    title: "03-3 이진 검색 기초",
    description: "경계 이동 규칙과 불변식을 유지하는 이진 탐색 코드 구조를 학습합니다.",
    useSim: useBasicBinarySearchSim,
    Visualizer: BasicBinarySearchVisualizer,
    story: {
      problem: "전 세계 사람의 전화번호가 담긴 책(수십억 개)에서 특정 사람의 번호를 찾을 때, 첫 장부터 한 장씩 선형으로 넘긴다면 사실상 끝낼 수 없습니다.\n\n데이터 양이 커질수록 선형 검색의 `O(N)` 비용은 실시간 응답 한계를 넘어 시스템 전체의 지연 요인이 됩니다.",
      definition: "**이진 검색(Binary Search)** 은 정렬된 배열에서 탐색 범위를 매 회차마다 절반씩 줄여나가는 알고리즘입니다.\n* **로그 시간 복잡도 `O(log N)`**: 데이터가 10억 개라도 약 30번의 비교만으로 대상을 찾을 수 있습니다.\n* **탐색 범위 포인터 (L, R, M)**: 후보 구간의 양 끝단 Left(L)와 Right(R), 그리고 중간 위치 Mid(M)의 갱신 규칙이 핵심입니다.\n* **전제조건의 트레이드오프**: 이진 검색의 속도를 얻으려면 배열이 미리 정렬(`O(N log N)`)되어 있어야 합니다.",
      analogy: "**두꺼운 영한사전에서 영단어 찾기**와 같은 원리입니다.\n\n'school'을 찾기 위해 사전을 처음부터 한 장씩 넘기지는 않습니다. 가운데를 펼쳐서 'money'가 나오면 'school'은 그 뒤쪽에 있다는 사실을 알 수 있으므로 앞쪽 절반은 탐색에서 제외합니다(탐색 공간 절반 축소). 이런 절반 단위의 범위 축소가 이진 검색의 핵심입니다."
    },
    features: [
      {
        title: "탐색 범위의 O(log N) 축소",
        description: "사전 정렬된 데이터에서 중간값(`Mid`)과 타겟을 비교해 탐색 범위를 매 회차 절반씩 줄여나가는 과정을 시각적으로 확인합니다. 데이터 크기가 커질수록 비교 횟수의 절감 효과가 분명해집니다.",
        SupplementaryVisualizer: BinarySearchSupplementaryOptions[0]
      },
      {
        title: "경계값(Left, Right) 갱신 규칙 정립",
        description: "`Left <= Right` 반복 조건 내에서 `Left = Mid + 1`, `Right = Mid - 1`로 포인터가 교차하며 종료되는 불변식(Invariant)을 확인합니다. 경계 갱신 한 줄 차이가 무한 루프와 정상 종료를 가른다는 점을 점검합니다.",
        SupplementaryVisualizer: BinarySearchSupplementaryOptions[1]
      },
      {
        title: "이진 탐색의 한계: 정렬 비용 트레이드오프",
        description: "이진 탐색의 로그 시간 속도를 얻기 위해 먼저 배열을 정렬(`O(N log N)`)해야 한다는 점을 짚습니다. 삽입/삭제가 빈번할 때는 정렬 비용이 누적되어 이득이 상쇄될 수 있음을 함께 고찰합니다.",
        SupplementaryVisualizer: BinarySearchSupplementaryOptions[2]
      },
      {
        title: "정렬 선행 조건과 사용 판단",
        description: "이진 탐색의 전제 조건(정렬된 배열)으로 인한 초기 비용과 반복 탐색 시 얻는 이득을 장단점 비교표로 확인합니다. 데이터 갱신 빈도와 탐색 빈도의 비율로 실전 적용 기준을 세웁니다.",
        SupplementaryVisualizer: BinarySearchSupplementaryOptions[3]
      }
    ]
  },
  {
    id: "hash-collision",
    title: "03-4 해시법과 충돌 해결",
    description: "해시 충돌 발생 유형과 체이닝/개방주소법 해결 아이디어를 시각화합니다.",
    useSim: useHashCollisionSim,
    Visualizer: HashCollisionVisualizer,
    story: {
      problem: "이진 검색의 `O(log N)`도 충분히 빠르지만, 대규모 금융 트랜잭션이나 실시간 게임 서버에서는 데이터 양과 무관하게 한 번의 접근으로 값을 찾아내는 `O(1)` 수준의 응답이 요구됩니다.\n\n이런 환경에서는 비교 횟수 자체를 데이터 크기에 묶지 않는 새로운 매핑 방식이 필요합니다.",
      definition: "**해시(Hashing)** 는 임의의 길이를 가진 데이터를 해시 함수에 통과시켜 배열 인덱스로 변환하는 매핑 기술입니다.\n* **해시 함수(Hash Function)**: 불규칙한 데이터를 고정된 길이의 숫자(메모리 주소)로 변환합니다.\n* **충돌(Collision)**: 서로 다른 데이터가 같은 인덱스로 매핑되는 현상이 발생할 수 있습니다.\n* **체이닝(Chaining)**: 충돌이 발생한 버킷에 연결 리스트(Linked List)를 이어 붙여 여러 데이터를 함께 보관하는 방식입니다.",
      analogy: "**놀이공원 물품 보관함의 자동 발급기**와 같은 원리입니다.\n\n손님이 멤버십 카드를 리더기에 대면 기계가 정해진 규칙으로 '7번 보관함'을 즉시 지정해 줍니다(상수 시간 접근). 만약 뒤에 온 손님 카드도 동일하게 '7번'으로 계산된다면(해시 충돌), 7번 보관함 뒤쪽에 보조 칸을 이어 붙여 두 손님의 짐을 함께 보관하도록 처리합니다(체이닝)."
    },
    features: [
      {
        title: "단번에 찾기: 해시 함수의 동작",
        description: "데이터의 값을 해시 함수에 통과시켜 배열 인덱스로 변환하는 과정을 관찰합니다. 데이터 크기와 무관하게 `O(1)` 시간에 접근하는 기본 원리를 확인합니다.",
        SupplementaryVisualizer: HashCollisionSupplementaryOptions[0]
      },
      {
        title: "충돌 처리의 시각화",
        description: "서로 다른 데이터가 같은 해시값을 받아 충돌하는 현상을 애니메이션으로 확인합니다. 충돌이 누적될 경우 탐색 비용이 어떻게 증가하는지 점검합니다.",
        SupplementaryVisualizer: HashCollisionSupplementaryOptions[1]
      },
      {
        title: "체이닝(Chaining) 방식의 해결",
        description: "충돌이 일어난 인덱스에 연결 리스트를 이어 붙여 데이터를 보존하고 탐색하는 기법을 실습합니다. 같은 버킷에 누적되는 데이터의 순회 비용을 함께 살펴봅니다.",
        SupplementaryVisualizer: HashCollisionSupplementaryOptions[2]
      },
      {
        title: "개방 주소법(Open Addressing)",
        description: "충돌 발생 시 연결 리스트 대신 배열 내의 다음 빈 슬롯으로 이동해 저장하는 선형 탐사(Linear Probing) 방식을 다룹니다. 체이닝과 비교하며 메모리 사용 패턴과 군집(clustering) 측면의 트레이드오프를 이해합니다.",
        SupplementaryVisualizer: HashCollisionSupplementaryOptions[3]
      }
    ]
  },
]);

// Phase 4 PoC — Skulpt trace 기반 code 모드 모듈 (interactive 자동 래핑 우회).
const LINEAR_SEARCH_TRACE_MODULE: CTPModule = {
  config: {
    id: "linear-search-trace",
    title: "03-2.1 선형 검색 (코드 실행)",
    description: "Skulpt 인터프리터로 Python 코드를 직접 실행하고 변수 변화를 자동 시각화합니다.",
    mode: "code",
    tags: ["Code", "Trace", "Skulpt"],
    initialCode: { python: LINEAR_SEARCH_TRACE_STARTER_CODE },
    story: {
      problem: "기존 선형 검색 시각화는 미리 만든 시나리오를 재생합니다. 사용자가 코드를 바꿔도 시각화는 동일하죠. 코드 실행 결과가 직접 시각화에 반영되면 어떻게 될까요? 학습자가 직접 코드를 수정하며 그 결과를 바로 눈으로 확인할 수 있다면, 추상적인 알고리즘 동작이 구체적인 경험으로 바뀝니다.",
      definition: "linear-search-trace는 Skulpt 인터프리터로 사용자 Python 코드를 실제로 실행하며 step별 변수 상태를 캡처해 자동 시각화하는 모드입니다.\n- 사용자 코드 → Web Worker(Skulpt) 실행\n- 매 라인마다 변수 snapshot (captureGlobals)\n- arr/i/current 등 변수를 GenericArrayVisualizer가 자동 매핑",
      analogy: "이전 visualizer가 정해진 시나리오로 영화를 재생하는 것이었다면, trace 모드는 사용자가 직접 감독이 되어 코드를 수정하며 그 결과를 실시간으로 화면에 띄우는 것과 같습니다. 코드와 시각화가 양방향으로 묶여 있어 학습 효과가 강화됩니다.",
    },
    features: [
      {
        title: "코드 직접 실행",
        description: "Skulpt 인터프리터가 Python 코드를 브라우저에서 그대로 실행합니다. 서버 호출 0건으로 즉시 응답이 옵니다.",
      },
      {
        title: "변수 자동 추적",
        description: "captureGlobals가 매 라인마다 모든 변수의 snapshot을 저장합니다. arr/i/target 등이 자동으로 시각화에 전달됩니다.",
      },
      {
        title: "Generic Visualizer",
        description: "별도 visualizer 작성 없이 GenericArrayVisualizer가 알려진 변수명을 자동 매핑합니다. 알려진 포인터(i/current/L/R/M)는 색상별 화살표로 표시됩니다.",
      },
      {
        title: "안전한 격리",
        description: "Web Worker 격리 + 30s timeout + MAX_STEPS 10000으로 무한 루프와 메모리 폭주를 차단합니다. 사용자 코드가 메인 스레드에 영향을 주지 않습니다.",
      },
    ],
  },
  useSim: useLinearSearchTraceSim,
  Visualizer: LinearSearchTraceVisualizer,
};

const FOUNDATION_BASIC_SEARCH_MODULES_WITH_TRACE = {
  ...FOUNDATION_BASIC_SEARCH_MODULES,
  "linear-search-trace": LINEAR_SEARCH_TRACE_MODULE,
};

export function FoundationAlgorithmBasicsContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 01. Foundation"
        modules={FOUNDATION_ALGO_BASICS_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 01. Foundation"
            chapterTitle="01 알고리즘 기초"
            chapterDescription="알고리즘 학습의 시작점인 절차적 사고와 흐름 추적 능력을 다집니다."
            whyLearn="코드를 '돌아가게' 만드는 수준을 넘어, 입력이 커져도 안정적으로 동작하는 문제 해결 절차를 설계하기 위해 배웁니다."
            quickFlow={[
              "알고리즘의 입력/출력과 기본 개념을 먼저 잡습니다.",
              "조건문·반복문으로 제어 흐름을 구성해 봅니다.",
              "순서도/흐름 추적으로 실행 과정을 검증합니다.",
            ]}
            guideItems={[
              "모든 레슨은 참여형 인터랙티브로 구성됩니다.",
              "Peek/Push/Pop/Reset 순서로 상태 변화를 관찰하세요.",
              "각 동작 이후 로그를 읽고 규칙을 정리하세요.",
            ]}
            items={[
              {
                id: "algo-overview",
                title: "01-1 알고리즘 개요",
                description: "알고리즘의 역할과 분석 관점을 정리합니다.",
                previewVisualizers: AlgoOverviewSupplementaryOptions.slice(0, 4),
                previewLabels: ["입력/출력", "실생활 비유", "복잡도 사고", "Big-O 비교"],
              },
              {
                id: "condition-loop",
                title: "01-2 조건문과 반복문",
                description: "분기/반복 조합으로 문제 해결 절차를 구성합니다.",
                previewVisualizers: ConditionLoopSupplementaryOptions.slice(0, 4),
                previewLabels: ["분기 제어", "반복 누적", "중첩 패턴", "실전 코드"],
              },
              {
                id: "flow-tracing",
                title: "01-3 순서도와 흐름 추적",
                description: "실행 경로를 추적하고 오류를 찾는 방법을 훈련합니다.",
                previewVisualizers: FlowTracingSupplementaryOptions.slice(0, 4),
                previewLabels: ["시각 디버깅", "종료 조건", "엣지 케이스", "상태 타임라인"],
              },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function FoundationBasicDsArrayContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 01. Foundation"
        modules={FOUNDATION_BASIC_DS_ARRAY_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 01. Foundation"
            chapterTitle="02 기본 자료구조와 배열"
            chapterDescription="배열 중심 문제 해결력과 자료구조 선택 기준을 동시에 익힙니다."
            whyLearn="문제에 맞는 자료구조를 선택하지 못하면 성능이 급격히 떨어지므로, 배열 중심으로 접근/수정/탐색의 비용 감각을 익히기 위해 배웁니다."
            quickFlow={[
              "자료구조별 특성과 선택 기준을 비교합니다.",
              "1차원/2차원 배열의 인덱스·반복 패턴을 익힙니다.",
              "진법/소수 같은 응용 문제로 확장합니다.",
            ]}
            guideItems={[
              "각 자료구조 상황을 인터랙티브 조작으로 체험하세요.",
              "같은 데이터에서 연산 순서를 바꿔 결과 차이를 확인하세요.",
              "요약 로그를 바탕으로 구조 선택 기준을 정리하세요.",
            ]}
            items={[
              {
                id: "ds-compare",
                title: "02-1 자료구조 비교 (배열/리스트/튜플)",
                description: "구조별 장단점과 사용 맥락을 비교합니다.",
                previewVisualizers: DsCompareSupplementaryOptions.slice(0, 4),
                previewLabels: ["접근 비용", "확장 비용", "불변성", "구조 비교"],
              },
              {
                id: "1d-array",
                title: "02-2 배열 인덱스와 슬라이싱",
                description: "배열 접근과 부분 구간 처리 규칙을 실습합니다.",
                previewVisualizers: OneDArraySupplementaryOptions.slice(0, 4),
                previewLabels: ["인덱스 접근", "슬라이싱", "경계 조건", "탐색 흐름"],
              },
              {
                id: "2d-array",
                title: "02-3 배열 기본 문제 (최댓값/역순 정렬)",
                description: "기초 배열 문제를 통해 반복/조건 패턴을 익힙니다.",
                previewVisualizers: TwoDArraySupplementaryOptions.slice(0, 4),
                previewLabels: ["2D 구조", "이중 반복", "탐색 패턴", "메모리 배치"],
              },
              {
                id: "array-number-prime",
                title: "02-4 배열 응용 (n진수/소수)",
                description: "배열을 활용한 진법/소수 문제로 확장합니다.",
                previewVisualizers: ArrayPrimeSupplementaryOptions.slice(0, 4),
                previewLabels: ["체 알고리즘", "진법 변환", "캐싱", "메모이제이션"],
              },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function FoundationSearchAlgorithmsContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 01. Foundation"
        modules={FOUNDATION_BASIC_SEARCH_MODULES_WITH_TRACE}
        overview={
          <ChapterOverview
            moduleLabel="Module 01. Foundation"
            chapterTitle="03 검색 알고리즘"
            chapterDescription="선형 탐색에서 이진 탐색, 해시 충돌 해결까지 검색 전략을 체계화합니다."
            whyLearn="동일한 데이터를 찾더라도 전략에 따라 속도 차이가 매우 크기 때문에, 상황에 맞는 검색 알고리즘을 선택하는 기준을 만들기 위해 배웁니다."
            quickFlow={[
              "검색 대상과 키(Key) 기준을 먼저 정의합니다.",
              "선형 검색과 이진 검색의 경계/비용 차이를 비교합니다.",
              "해시 충돌 처리까지 포함해 실전 전략으로 연결합니다.",
            ]}
            guideItems={[
              "이 챕터는 사용자 참여형(인터랙티브)으로 구성됩니다.",
              "연산 버튼을 누르며 검색 전략의 흐름을 비교하세요.",
              "각 동작 로그를 읽고 어떤 전략이 유리한지 판단하세요.",
            ]}
            items={[
              {
                id: "search-problem-key",
                title: "03-1 검색 문제와 키",
                description: "검색 대상과 키 설계 기준을 정의합니다.",
                previewVisualizers: ProblemKeySupplementaryOptions.slice(0, 4),
                previewLabels: ["검색 구조", "키 매칭", "실패 처리", "결과 상태"],
              },
              {
                id: "linear-search",
                title: "03-2 선형 검색",
                description: "단순 탐색의 구현과 최적화 포인트를 익힙니다.",
                previewVisualizers: LinearSearchSupplementaryOptions.slice(0, 4),
                previewLabels: ["순차 탐색", "보초법", "적용 시점", "성능 비교"],
              },
              {
                id: "linear-search-trace",
                title: "03-2.1 선형 검색 (코드 실행)",
                description: "Skulpt로 Python 코드 직접 실행 + 자동 시각화 PoC.",
                previewVisualizers: LinearSearchSupplementaryOptions.slice(0, 4),
                previewLabels: ["코드 실행", "변수 추적", "Generic Viz", "Worker 격리"],
              },
              {
                id: "basic-binary-search",
                title: "03-3 이진 검색",
                description: "경계 이동 기반의 로그 탐색을 실습합니다.",
                previewVisualizers: BinarySearchSupplementaryOptions.slice(0, 4),
                previewLabels: ["반절 탐색", "경계 갱신", "정렬 조건", "적용 판단"],
              },
              {
                id: "hash-collision",
                title: "03-4 해시법과 충돌 해결",
                description: "충돌 대응 전략과 트레이드오프를 학습합니다.",
                previewVisualizers: HashCollisionSupplementaryOptions.slice(0, 4),
                previewLabels: ["해시 함수", "충돌", "체이닝", "개방 주소"],
              },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function FoundationIntegrationContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <ProblemBankController
        moduleLabel="Module 01. Foundation"
        chapterTitle="알고리즘 기초/자료구조·검색 개념 심화 및 적용"
        chapterDescription="Problem Bank에서 Foundation 통합 문제를 풀이하고 자동 채점을 확인하세요."
        problems={module01Problems}
      />
    </Suspense>
  );
}
