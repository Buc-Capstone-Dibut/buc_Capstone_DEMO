"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { ProblemBankController } from "@/components/features/ctp/problem-bank";
import { module01Problems } from "@/data/ctp/problems";
import { ChapterOverview } from "./shared/chapter-overview";
import {
  createCodeTemplateModules,
  createInteractiveTemplateModules,
} from "./shared/module-utils";

import { AlgoOverviewVisualizer, useAlgoOverviewSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/algo-overview";
import { ConditionLoopVisualizer, useConditionLoopSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/condition-loop";
import { FlowTracingVisualizer, useFlowTracingSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/flow-tracing";

import { DsCompareVisualizer, useDsCompareSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/ds-compare";
import { OneDArrayVisualizer, use1DArraySim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/1d-array";
import { TwoDArrayVisualizer, use2DArraySim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/2d-array";
import { ArrayPrimeVisualizer, useArrayPrimeSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/array-number-prime";

import { ProblemKeyVisualizer, useProblemKeySim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/search-problem-key";
import { LinearSearchVisualizer, useLinearSearchSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/linear-search";
import { BinarySearchVisualizer, useBinarySearchSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-01/basic-binary-search";
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
      problem: "개발을 처음 시작할 때 많은 분들이 \"코드만 에러 없이 돌아가면 끝난 것 아닌가?\"라고 착각합니다. 하지만 실제 서비스 환경은 매우 혹독합니다.\n\n수백만 명의 사용자가 동시에 회원가입 버튼을 누르거나, 배달 앱에서 GPS 반경 2km 내의 식당 10만 개를 0.1초 만에 실시간으로 필터링해야 한다면 어떨까요? 주먹구구식으로 작성된 코드는 데이터가 조금만 커져도 서버를 뻗게 만들고, 사용자를 떠나게 만듭니다. 우리는 **'그냥 돌아가는 코드'를 넘어, 어떤 극한의 환경에서도 붕괴하지 않고 예측 가능하게 동작하는 견고한 '설계도'** 를 그리는 훈련이 필요합니다.",
      definition: "**알고리즘(Algorithm)** 은 현실의 복잡한 문제를 컴퓨터가 이해할 수 있도록 명확하게 분해하여, 주어진 **입력(Input)** 을 목표로 하는 **출력(Output)** 으로 변환해 내는 '완벽하게 통제된 수학적 논리 절차'입니다.\n\n위대한 알고리즘은 타협할 수 없는 3가지 까다로운 조건을 반드시 충족해야 합니다:\n* **명확성(Clarity)**: 컴퓨터는 눈치가 없습니다. 애매모호한 지시어 없이, 단 1비트의 오차도 허용하지 않는 명확하고 독립적인 명령어로 각 단계가 구성되어야 합니다.\n* **유한성(Finiteness)**: 아무리 훌륭한 계산이라도 영원히 끝나지 않는다면 가치가 없습니다. 모든 알고리즘은 반드시 무한 루프의 늪을 피하고, 언젠가는 명확한 정답(또는 오류 메시지)을 뱉고 종료되어야 합니다.\n* **효율성(Efficiency)**: 이것이 알고리즘을 배우는 진짜 이유입니다. CPU를 얼마나 적게 혹사시키는지(시간 복잡도), 그리고 메모리 공간을 얼마나 적게 차지하는지(공간 복잡도)를 따져보며, 최소한의 자원으로 최대의 퍼포먼스를 뽑아내야 합니다.",
      analogy: "👩‍🍳 **미슐랭 3스타 레스토랑의 주방 시스템(레시피)** 에 비유해 볼까요?\n\n'물'과 '라면'이라는 똑같은 식재료(입력 데이터)를 던져주어도, 결과물(출력)에 도달하는 방식은 천차만별입니다.\n* **하수(비효율적인 알고리즘)**: 냄비를 찾느라 10분, 가스불을 켜다가 데이고, 물이 끓었는지 1초마다 열어보며(불필요한 연산) 에너지를 낭비하다 30분 만에 퉁퉁 불어터진 라면을 냅니다.\n* **마스터 셰프(최적화된 알고리즘)**: 동선이 완벽하게 계산된 주방에서 타이머를 맞추고, 최적의 화력(연산 최적화)으로 단 5분 만에 최고의 요리를 일관되게 만들어냅니다.\n\n똑같은 재료(데이터)라도, **가장 빠르고 낭비 없는 레시피(알고리즘)** 를 설계하는 것이 바로 여러분이 갖춰야 할 핵심 무기입니다."
    },
    features: [
      {
        title: "입력과 출력의 정의",
        description: "알고리즘은 명확하게 정의된 **입력(Input)** 을 받아 약속된 **출력(Output)** 을 만들어내는 일련의 과정입니다. 이 시뮬레이터에서는 배열 데이터가 어떻게 처리되어 목적에 맞는 결과물로 변하는지 관찰합니다.",
        SupplementaryVisualizer: AlgoOverviewSupplementaryOptions[0]
      },
      {
        title: "결정론적 특성 관찰",
        description: "동일한 상황(입력)과 환경에서는 항상 일관된 결과가 보장되어야 합니다. 데이터 요소를 바꾸어 가며 결과가 정해진 규칙대로만 변하는지 확인해 보세요.",
        SupplementaryVisualizer: AlgoOverviewSupplementaryOptions[1]
      },
      {
        title: "효율성(시간 복잡도) 고민",
        description: "데이터의 양(N)이 커질 때 수행되는 연산의 횟수가 얼마나 가파르게 증가하는지(예: O(N), O(N²))를 분석하는 것이 알고리즘 설계의 핵심입니다.",
        SupplementaryVisualizer: AlgoOverviewSupplementaryOptions[2]
      },
      {
        title: "Big-O 복잡도 비교",
        description: "O(1), O(N), O(N²) 세 가지 대표 복잡도를 그래프로 비교하여 입력 크기가 커질수록 성능 차이가 얼마나 극단적으로 벌어지는지 체감합니다.",
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
      problem: "우리가 타이핑한 코드가 항상 키보드로 입력한 순서대로만 위에서 아래로 순진하게 흘러간다면 어떨까요? 사용자가 비밀번호를 틀렸을 때 경고창을 띄워주지도 못하고, 1부터 1만까지 더하는 작업을 위해 똑같은 덧셈 코드를 만 줄이나 손으로 복사해 붙여넣어야 하는 끔찍한 막노동이 시작될 것입니다.\n\n변화무쌍한 외부 환경(입력값)에 따라 실시간으로 프로그램의 혈투 방향을 틀어버리고, 사람이 감히 상상할 수 없는 횟수의 단순 반복 노동을 단 0.001초 만에 기계에게 떠넘기기 위해서는 어떤 코드의 뼈대가 필요할까요?",
      definition: "프로그래밍 언어의 문법을 넘어, **조건문(Condition)** 과 **반복문(Loop)** 은 컴퓨터의 사고를 통제하는 제어 흐름(Control Flow)의 궁극적 권력입니다.\n\n* **조건문 (`if/else/switch`)**: 직진만 하던 폭주기관차 앞에 놓인 선로 변환기입니다. 현재 메모리에 들고 있는 변수의 상태를 논리 연산자(True/False)로 차갑게 평가하여, 이번에 실행해야 할 파이프라인의 경로를 정밀하게 쪼개고 분기시킵니다.\n* **반복문 (`for/while`)**: 컴퓨터가 인간을 압도하는 유일한 이유입니다. 우리가 정해둔 특정한 조건(예: i가 1만보다 작은가?)이 유지되는 동안, 혹은 배열의 끝에 도달할 때까지 소름 돋을 정도로 동일한 코드 블록을 무한 루프를 돌며 찍어냅니다. 이를 통해 수백 줄의 코드를 단 3줄로 압축하는 기적을 만듭니다.",
      analogy: "🚦 **완벽하게 통제된 자율주행 자동차의 교차로 통과 시스템**을 머릿속에 그려보세요.\n\n자율주행 환경에서 자동차는 수없이 쏟아지는 센서 데이터와 마주합니다.\n* **조건문 발동**: 전방에 교차로가 나타났을 때, 카메라 센서가 '빨간불'을 인식하면 브레이크를 밟는 선로를 타고, '초록불'이면 엑셀을 밟는 선로를 과감히 선택합니다. 단 한 번의 오판도 없이 상황을 가르고 통제하는 힘입니다.\n* **반복문 발동**: 자동차가 서울에서 부산까지 가는 동안, 위에서 언급한 '신호등 스캔 -> 상황 판단 -> 주행 제어'라는 한 사이클의 동작 알고리즘을 목적지에 도착할 때까지 수천만 번 쉬지 않고 맹렬하게 반복합니다. 결코 지치지 않는 이 거대한 쳇바퀴가 바로 반복문입니다."
    },
    features: [
      {
        title: "프로그램의 제어 흐름 분기",
        description: "`if / else` 조건문을 통해 현재 데이터 상태(State)에 따라 **어느 코드를 실행할지 결정**합니다. 시각화에서 조건 검사 시 분기되는 경로를 따라가 보세요.",
        SupplementaryVisualizer: ConditionLoopSupplementaryOptions[0]
      },
      {
        title: "상태의 누적과 반복",
        description: "`for / while` 반복문을 사용해 동일한 작업을 조건이 만족될 때까지 수행합니다. 인덱스 포인터(`i`)가 어떻게 이동하며 조건을 갱신하는지 관찰하는 것이 중요합니다.",
        SupplementaryVisualizer: ConditionLoopSupplementaryOptions[1]
      },
      {
        title: "흐름 결합 패턴 찾기",
        description: "대부분의 기초 알고리즘은 **반복문 안에 조건문이 중첩**되는 형태를 가집니다. 배열 순회 중 특정 요소를 찾거나(조건), 합을 누적(반복)하는 과정을 패턴화하세요.",
        SupplementaryVisualizer: ConditionLoopSupplementaryOptions[2]
      },
      {
        title: "중첩 흐름의 실전 코드 패턴",
        description: "반복문 안에 조건문을 넣어 배열 요소를 필터링하는 가장 흔한 패턴을 코드 블록 시각화로 확인합니다. 실전에서 가장 자주 접하는 'for + if' 구조입니다.",
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
      problem: "수백 줄의 코드를 짜고 당당히 'Run'을 눌렀는데, 터미널이 시뻘건 에러 메시지를 토해내거나 정답이 아닌 이상한 숫자가 튀어나올 때 등골이 서늘해진 적이 있나요?\n\n복잡한 이중 반복문과 이프(If) 문이 미로처럼 얽혀 있는 코드에서, '내가 짠 코드인데 왜 이렇게 도는지 모르겠다'며 멍하니 화면만 바라보고 있다면 위험합니다. 컴퓨터에게 지시를 내렸다면, 컴퓨터가 정확히 1 밀리초 단위로 무슨 생각을 하며 변수 상자 속의 값을 어떻게 바꾸고 있는지 빙의해서 따라갈 수 있는 '기계적인 시선'이 필요합니다.",
      definition: "**흐름 추적(Flow Tracing)** 이란 추상적인 내 머릿속의 상상을 버리고, 순서도(Flowchart)나 디버깅 기법을 통해 프로그램의 잔혹한 실행 경로를 한 땀 한 땀 현미경으로 관찰하는 외과 수술 같은 디버깅 기법입니다.\n\n* **변수 테이블 작성 (상태 추적)**: 코드가 단 한 줄 실행될 때마다 변수 `i`, `sum`, `arr[i]`의 값이 어떻게 엎치락뒤치락 변형되는지 표(Table)로 끈질기게 기록해야 합니다.\n* **종료 조건(Edge Case)의 덫 검증**: 대부분의 버그는 루프가 처음 시작될 때나, 맨 마지막 루프가 종료되는 아슬아슬한 경계선(Boundary)에서 터집니다. 완벽히 설계된 조건문인지 확인합니다.\n* **오류 원점 타격**: 눈으로 코드를 훑는 방식은 백전백패입니다. 프로그램이 크래시가 난 지점(스택 트레이스)을 역추적하여, 최초로 상태가 오염된 '최초 원인 지점'을 저격하는 훈련입니다.",
      analogy: "🕵️‍♂️ **희대의 밀실 살인 사건을 파헤치는 명탐정의 현장 재구성**과 완벽히 일치합니다.\n\n사건(에러)은 이미 터졌고, 용의자(코드)는 너무나 많습니다. 초보 형사처럼 이리저리 뛰어다니며 찔러보는 대신, 범행 현장에 남겨진 지문과 단서(변수들의 중간값)를 칠판에 시간 순서대로 빽빽하게 타임라인으로 그리는 것입니다.\n'새벽 1시 20분(루프 3회차)에 변수 A의 값이 0으로 바뀌었군. 여기서 시스템이 터져버린 거야!'\n직감과 감상을 철저히 버리고, 증거 기반으로 한 스텝씩 밟아나가다 보면 아무리 교묘하게 꼬여있는 악랄한 버그라도 단박에 찾아내어 목덜미를 쥘 수 있습니다."
    },
    features: [
      {
        title: "시각적 디버깅 사고",
        description: "순서도(Flowchart)의 노드 흐름을 직접 따라가면서 변수(Variable)의 값이 매 단계별로 어떻게 변하는지 추적(Tracing)하는 훈련입니다.",
        SupplementaryVisualizer: FlowTracingSupplementaryOptions[0]
      },
      {
        title: "종료 조건(Base/Exit Case) 식별",
        description: "무한 루프에 빠지지 않기 위해 반복문이나 재귀가 끝나는 명확한 조건을 순서도상에서 어디에 배치해야 할지 학습합니다.",
        SupplementaryVisualizer: FlowTracingSupplementaryOptions[1]
      },
      {
        title: "엣지 케이스 시뮬레이션",
        description: "데이터가 비어 있거나 예상치 못한 값(예: 음수)이 들어왔을 때, 순서도의 어느 경로를 타고 예외 처리로 빠지는지 시각적으로 확인하세요.",
        SupplementaryVisualizer: FlowTracingSupplementaryOptions[2]
      },
      {
        title: "변수 상태 타임라인",
        description: "코드가 한 줄 실행될 때마다 변수들의 값이 어떻게 바뀌는지 표(Timeline)로 추적합니다. 디버깅의 핵심인 '변수 상태 기록' 습관을 익힙니다.",
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
      problem: "알고리즘 문제를 풀 때 '어떤 상자에 데이터를 담을까?'는 매우 중요한 첫걸음입니다.\n\n배열, 리스트, 튜플 등 다양한 자료구조가 있지만, 무심코 잘못된 특성의 상자를 고르면 훗날 데이터 추가나 탐색에 엄청난 시간과 메모리가 낭비되며 시스템 병목의 원인이 될 수 있습니다.",
      definition: "**자료구조(Data Structure)** 는 데이터를 효율적으로 저장, 수정, 판별하기 위한 맞춤형 뼈대(구조적 방법론)입니다.\n\n* **배열 (Array)**: 크기가 고정되어 있지만, 인덱스를 통해 타겟 영역에 한 번에 접근(`O(1)`)할 수 있습니다.\n* **연결 리스트 (Linked List)**: 크기가 동적이며 중간 데이터 삽입/삭제가 유연하지만, 특정 위치를 찾으려면 항상 처음부터 순차 탐색(`O(N)`)해야만 합니다.\n* **튜플 (Tuple)**: 데이터가 생성된 후 절대 수정되지 않는 성질(불변성, Immutability)을 가져, 동시성 처리 중 무결성을 보장합니다.",
      analogy: "📦 **각기 다른 택배 보관함**을 선택하는 것과 같습니다.\n\n칸별 고유 번호표가 매겨져 있어 번호만 알면 자물쇠를 즉각 열 수 있는 **'아파트 무인 택배함'(배열)** 과, 사람과 사람이 서로의 손을 잡고 이어지는 위치만 기억하고 있어서 누군가를 찾으려면 항상 맨 앞사람부터 차례차례 물어물어 가야만 하는 **'거대한 인간 사슬'(연결 리스트)** 로 접근 비용을 체감해 보세요."
    },
    features: [
      {
        title: "연속된 메모리와 랜덤 액세스",
        description: "배열(Array)은 메모리상에 연속적으로 배치되므로 인덱스를 통한 원소 접근 비용이 `O(1)`이라는 핵심적 특징을 시각화합니다.",
        SupplementaryVisualizer: DsCompareSupplementaryOptions[0]
      },
      {
        title: "크기 확장의 제약(Static vs Dynamic)",
        description: "크기를 초기에 결정하는 정적 배열과 달리, 리스트(또는 동적 배열)는 공간이 부족할 때 내부적으로 배열 복사가 일어나는 비용(Overhead)을 비교해 봅니다.",
        SupplementaryVisualizer: DsCompareSupplementaryOptions[1]
      },
      {
        title: "불변성(Immutability)",
        description: "튜플(Tuple)처럼 생성 후 형태가 변하지 않는 특성이 값의 불변성과 동시성 프로그래밍(선행/후행 처리)에서 어떤 장점을 주는지 이해합니다.",
        SupplementaryVisualizer: DsCompareSupplementaryOptions[2]
      },
      {
        title: "연산별 비용 비교표",
        description: "배열과 연결 리스트의 접근·삽입·삭제·검색 연산을 나란히 비교하여, 문제 상황에 따라 어떤 자료구조가 유리한지 한눈에 판단하는 감각을 기릅니다.",
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
      problem: "코딩 테스트의 알고리즘 구현 중 90% 이상은 데이터를 다루는 배열에서 시작됩니다.\n\n그러나 루프를 잘못 돌려 존재하지 않는 공간을 찌르는 '배열 범위 초과(Out Of Bounds)' 에러는 노련한 개발자도 흔히 겪는 가장 치명적이고 잦은 논리 버그입니다.",
      definition: "**1차원 배열(1D Array)** 은 동일한 타입의 데이터가 컴퓨터의 메모리 공간에 빈틈없이 연속적으로 나열된 기초 물리 계층입니다.\n\n* **0-based 인덱싱**: 첫 데이터의 위치(Offset)가 배열의 메모리 시작 주소와 완벽히 겹치므로, 물리적 떨어진 거리를 의미하는 `0`부터 인덱싱이 시작됩니다.\n* **슬라이싱 (Slicing)**: 전체 배열에서 목적에 맞는 특정 구간(`Start ~ End-1`)만을 빠르게 잘라내어 독립적인 부분 배열(Sub-array) 상태로 다룹니다.\n* **경계 조건 (Boundary)**: 항상 `0` 이상, `N-1`(배열 전체 길이 - 1) 이하의 안전 영역(Safe Zone) 내에서만 포인터가 돌아다니도록 엄격히 통제해야 합니다.",
      analogy: "🚂 **머리부터 꼬리까지 이어붙은 기차 객실**과 같습니다.\n\n운전석 찰싹 뒤에 붙어있어 이동 거리(Offset)가 '0칸'인 1호차부터 시작해, N호차까지 모든 객실이 물리적으로 차례대로 연결되어 있습니다. 기차 중간의 몇 개 칸만 똑 떼어 분리(슬라이스)하거나, 존재하지도 않는 허공의 'N+1호차' 칸의 문을 열려고 시도(Out of Bounds)할 때 벌어지는 아찔한 붕괴 사고를 막는 훈련입니다."
    },
    features: [
      {
        title: "0-based 인덱싱의 이해",
        description: "메모리 주소의 오프셋(Offset) 개념에서 출발한 0-based 인덱싱 방식을 시각적으로 이해하고 접근 오차(Off-by-one error)를 방지하는 감각을 기릅니다.",
        SupplementaryVisualizer: OneDArraySupplementaryOptions[0]
      },
      {
        title: "배열 순회와 경계 조건",
        description: "반복문을 사용하여 배열의 처음부터 끝까지 순회할 때, 올바른 시작 조건과 종료 조건(`i < n`)을 작성하는 패턴을 실습합니다.",
        SupplementaryVisualizer: OneDArraySupplementaryOptions[1]
      },
      {
        title: "슬라이싱과 부분 배열",
        description: "주어진 인덱스 범위를 통해 전체 배열에서 특정 구간(Sub-array)만을 효율적으로 추출하거나 참조하는 원리를 학습합니다.",
        SupplementaryVisualizer: OneDArraySupplementaryOptions[2]
      },
      {
        title: "배열 범위 초과 오류",
        description: "가장 빈번한 런타임 오류인 `IndexError(Out of Bounds)`가 발생하는 상황을 시각화하고, `range(len(arr))` 패턴으로 안전하게 순회하는 방법을 확인합니다.",
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
      problem: "바둑판이나 체스판, 영상 픽셀, 혹은 내비게이션의 2D 격자 맵 등 현실 속 수많은 데이터는 단순한 1차원 선 형태를 뛰어넘어 2차원의 면(행렬) 모습을 띱니다.\n\n다차원 데이터를 단방향의 코드로 누수 없이 꼼꼼히 훑고 탐색하려면, 시야와 사고력을 평면으로 한 단계 확장해야만 합니다.",
      definition: "**2차원 배열(2D Array)** 은 1차원 배열 자체를 또 다른 배열의 원소로 끌어안아 행(Row)과 열(Col) 형태로 구성한 배열의 배열 구조입니다.\n\n* **이중 순회 (Nested Loop)**: 외부 반복문(바깥쪽 톱니바퀴)은 층수(행)를 훑고, 내부 반복문(안쪽 톱니바퀴)은 각 층의 호수(열)를 치밀하게 관통하며 격자 면적 전체를 완전 탐색합니다.\n* **메모리의 선형 변환**: 실제 컴퓨터의 물리적 메모리는 다차원이 아닌 1차원 구조입니다. 2차원의 논리 좌표 `(row, col)`가 실제 메모리의 1차원 번지수로 영리하게 변환되어 저장되는 규칙성을 이해합니다.\n* **그리드 탐색 패턴**: 단순 가로·세로 훑기를 넘어 대각선(Diagonal)이나 십자 방향(상하좌우 주변 네 방위)을 넘나들며 탐색하는 패턴은 훗날 복잡한 그래프 이론과 BFS 알고리즘의 막강한 뼈대가 됩니다.",
      analogy: "🏢 **거대한 아파트 단지의 동과 호수 배달 규정**을 떠올려 보세요.\n\n우편 배달부(루프 제어자)가 편지를 배달할 때, '101동(행)' 현관에 들어가서 '1층부터 순서대로 꼭대기 층(열)'까지 모든 세대의 우편함을 빠짐없이 다 돈 뒤에야, 비로소 건물 밖으로 나와 '102동(다음 행)'으로 진입하는 철저하고 규칙적인 배달 흐름(이중 루프)과 100% 동일하게 움직입니다."
    },
    features: [
      {
        title: "다차원 데이터의 선형 변환",
        description: "2차원 배열이 실제 메모리상에서는 1차원으로 어떻게 풀어서(Row-major 등) 저장되는지, 이중 반복문과의 관계성을 시각화합니다.",
        SupplementaryVisualizer: TwoDArraySupplementaryOptions[0]
      },
      {
        title: "이중 루프(Nested Loop) 제어",
        description: "바깥쪽 루프(행)와 안쪽 루프(열)가 독립적으로 작동하면서 격자 구조를 어떻게 완전 탐색하는지 실행 흐름을 분석합니다.",
        SupplementaryVisualizer: TwoDArraySupplementaryOptions[1]
      },
      {
        title: "효율적인 탐색 패턴",
        description: "전체 영역 탐색, 대각선 탐색, 인접 요소 탐색 등 2차원 배열에서 자주 등장하는 탐색 기법의 핵심 로직을 학습합니다.",
        SupplementaryVisualizer: TwoDArraySupplementaryOptions[2]
      },
      {
        title: "Row-Major 메모리 배치",
        description: "2D 논리 구조가 실제 메모리에서 어떻게 1차원 주소로 변환되는지(Row-major order) 시각화하며 `arr[r][c] = base + r×cols + c` 공식을 체감합니다.",
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
      problem: "무작정 데이터를 때려 넣고 한 땀 한 땀 무식하게 계산하면 당장은 편하지만, 시스템에 심각한 과부하가 걸립니다.\n\n주어진 엄청난 숫자 N까지의 약수나 소수(Prime)를 일일이 무지성으로 다 나눗셈하며 검사한다면 타임아웃(Time Limit Exceeded)이 발생합니다. 똑똑하게 계산 공간의 부담을 줄이는 트릭이 필요합니다.",
      definition: "배열 형식을 단순한 데이터 수납장을 넘어 **계산 과정의 엔진 오일(최적화 도구)** 로 기발하게 활용하는 특수 응용 패턴입니다.\n\n* **소수 판별 (에라토스테네스의 체)**: `2`부터 시작해, 진짜 소수들의 배수에 해당하는 징검다리 위치(인덱스상)를 '거짓(False)'으로 일괄적으로 지워나감(Sieve)으로써, 수학적 극한 압축인 `O(N log log N)`이라는 획기적인 속도로 소수만 남겨 추려냅니다.\n* **진법의 배열 기록**: 정수를 목표 진수 N으로 나눈 나머지 조각들을 종이에 적듯 배열에 순서대로 기록(Push)해 둔 뒤, 나중에 거꾸로 쭈욱 읽어냄(Pop/Reverse)으로써 다른 진법의 숫자로 조립합니다.\n* **캐싱 (Caching)**: 복잡한 로직으로 한 번 계산된 결과표를 배열의 주머니 속에 저장해 두고, 나중엔 표만 슬쩍 들춰 중복 연산을 건너뛰는 메모이제이션(Memoization) 철학의 기초를 닦습니다.",
      analogy: "🎨 **광활한 밑그림의 쓸데없는 잡초 과감히 지워내기**와 흡사합니다.\n\n1부터 10만까지 쓰여진 수첩에서 하나하나 페이지를 넘기며 소수인지 규칙을 따져보는(고된 나눗셈) 대신, 맨 첫 장부터 `2`의 배수에 모조리 쫙 X 펜라이트를 치고, 그 다음 남은 `3`의 배수들을 찾아 모조리 X 표시를 순식간에 칠해나가는 식(체로 탈탈 거르기)으로, 눈에 가장 직관적이고 맹렬한 속도로 '진정한 정답'만 고립시켜 남겨버리는 고도의 수학적 트릭입니다."
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
      definition: "**검색(Search)** 은 주어진 데이터 집합에서 특정 조건을 가장 빠르고 정확하게 찾아내는 작업입니다.\n\n* **검색 공간 (Search Space)**: 탐색의 대상이 되는 전체 데이터 집합(예: 배열, 리스트, 트리)입니다.\n* **키 (Key)**: 검색의 '기준'이 되는 강력한 단서입니다. 학번, 이메일, 닉네임 등 데이터 레코드를 유일하게 식별할 수 있는 핵심 속성이 키가 됩니다.\n* **성공과 실패**: 조건에 일치하는 데이터를 찾은 경우를 성공(Success), 샅샅이 뒤졌으나 찾지 못하고 탐색이 종료된 상태를 실패(Failure)로 명확히 정의해야 합니다.",
      analogy: "📚 **거대한 도서관에서의 내 책 찾기**와 같습니다.\n\n만약 오직 '빨간색 표지'라는 모호한 단서(조건)만 들고 책을 찾는다면 몇 날 며칠이 걸릴 수 있습니다. 하지만 '도서 분류 번호 800번대'라는 정확한 매칭 기준(고유 키)을 들고 정해진 규칙대로 찾는다면, 눈 깜짝할 새 빙고처럼 원하는 책을 뽑아낼 수 있습니다."
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
      problem: "규칙 없이 마구잡이로 섞여 있는 데이터 더미에서 특정 항목을 찾아야 할 때가 있습니다.\n\n이런 완전한 무질서 환경에서는 아무리 뛰어난 수학적 꼼수를 쓰려 해도 처음부터 끝까지 다 뒤져보는 무식한 방법밖에 없습니다. 이 무식한 방법을 그나마 조금이라도 더 스마트하게 개선할 수 있을까요?",
      definition: "**선형 검색(Linear Search)** 은 배열의 첫 번째 요소부터 마지막 요소까지 순서대로 하나씩 키(Key) 값과 비교해가며 타겟을 찾는 가장 원초적이고 확실한 알고리즘입니다.\n\n* **시간 복잡도 `O(N)`**: 운이 좋으면 맨 처음에 찾지만, 최악의 경우 N개의 데이터를 억울하게 모두 검사해야 합니다.\n* **종료 조건 검사 비용**: 기본 탐색의 루프 안에는 매번 '찾았는가?'와 더불어 '배열 끝에 도달했는가?'를 동시에 묻는 이중 검사 비용이 내재되어 있습니다.\n* **보초법(Sentinel) 최적화**: 찾고자 하는 키를 배열의 맨 마지막 방에 가짜로 덧붙여(보초 투입), '배열이 끝났는가?'라는 비싼 질문을 아예 삭제해 버려 연산 속도를 획기적으로 끌어올리는 진짜 실무 꿀팁입니다.",
      analogy: "🃏 **뒤죽박죽 섞인 카드 더미에서 조커 찾기**를 상상해 보세요.\n\n카드가 엉망으로 섞여 있다면, 맨 윗장부터 땀 뻘뻘 흘리며 한 장씩 뒤집는 게 유일한 통로입니다. 이때 내가 미리 준비한 '가짜 조커(보초)'를 몰래 카드 맨 밑바닥에 슬쩍 깔아둔다면? '더 이상 뒤집을 카드가 남아있나?' 묻지도 따지지도 않고 기계적으로 뒤집기만 해도 무조건 조커가 튀어나오기 때문에(진품이든 가짜든) 탐색 리듬이 두 배로 빨라집니다."
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
    useSim: useBinarySearchSim,
    Visualizer: BinarySearchVisualizer,
    story: {
      problem: "전 세계 사람의 전화번호가 담긴 책(수십억 개)에서 특정 사람의 폰 번호를 찾을 때, 첫 장부터 한 장씩 선형으로 넘긴다면 평생이 걸릴 것입니다.\n\n데이터 양이 우주적으로 막대해질 때, 선형 검색의 참담한 속도 한계를 극복하지 못하면 시스템은 그대로 침몰합니다.",
      definition: "**이진 검색(Binary Search)** 은 '사전에 완벽히 정렬된' 데이터 배열의 마법을 이용하여, 탐색 범위를 매 회차마다 무자비하게 반 토막(Half) 내며 좁혀 들어가는 초속도 탐색 알고리즘입니다.\n\n* **로그 시간 복잡도 `O(log N)`**: 데이터 사이즈가 10억 개라도 단 30번의 질문(비교)만으로 타겟을 저격해내는 압도적인 위력을 자랑합니다.\n* **탐색 범위(L, R, M) 포인터**: 현재 후보 구간의 양 끝단인 Left(L)와 Right(R), 그리고 구간의 심장을 찌르는 Mid(M) 포인터의 숨 막히는 갱신 로직이 핵심입니다.\n* **가혹한 전제조건의 트레이드오프**: 이진 검색의 짜릿한 속력을 맛보려면, 배열이 반드시 미리 정렬(`O(N log N)`)되어 있어야 한다는 가혹한 초기 투자 비용(정렬 시간)을 기꺼이 지불해야 합니다.",
      analogy: "📖 **두꺼운 영한사전에서 영단어 찾기**와 완벽히 똑같습니다.\n\n사전에서 'school'을 찾기 위해 첫 겉표지부터 한 장 한 장 넘기는 사람은 없습니다. 감으로 정가운데를 쫙 펼쳐서 'money'가 나오면, 'school'은 훨씬 더 뒤쪽에 있다는 사실을 단번에 확신하고 앞쪽 절반의 수천 페이지 분량을 차갑게 '통째로 버립니다'(탐색 공간 절반 축소). 이 무자비하고 통쾌한 절단력이 이진 검색의 본질입니다."
    },
    features: [
      {
        title: "탐색 범위의 O(log N) 반전 축소",
        description: "사전 정렬된 데이터에서 중간값(`Mid`)과 타겟을 비교하여 탐색해야 할 범위를 매 회차 절반씩 버려나가는 강력한 속도 향상을 시각적으로 체감합니다.",
        SupplementaryVisualizer: BinarySearchSupplementaryOptions[0]
      },
      {
        title: "경계값(Left, Right) 갱신 규칙정립",
        description: "`Left <= Right` 반복 조건 내에서 `Left = Mid + 1`, `Right = Mid - 1`로 포인터가 정교하게 크로스되며 종료되는 불변식(Invariant)을 완벽히 이해합니다.",
        SupplementaryVisualizer: BinarySearchSupplementaryOptions[1]
      },
      {
        title: "이진 탐색의 한계: 정렬 비용 트레이드오프",
        description: "이진 탐색 로그 스케일의 압도적 검색 속도를 얻기 위해 먼저 배열을 정렬(`O(N log N)`)해야 한다는 점과 삽입/삭제가 빈번할 때의 문제점을 고찰합니다.",
        SupplementaryVisualizer: BinarySearchSupplementaryOptions[2]
      },
      {
        title: "정렬 선행 조건과 사용 판단",
        description: "이진 탐색의 전제 조건(정렬된 배열)으로 인한 초기 비용과, 반복 탐색 시 얻는 이득을 장단점 비교표로 확인하며 실전 적용 기준을 세웁니다.",
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
      problem: "이진 탐색의 `O(log N)` 속도도 훌륭하지만, 거대 금융 트랜잭션이나 초실시간 게임 서버에서는 데이터가 1억 개든 100억 개든 상관없이 '단 한 번의 시도'만에 무조건 정답지에 꽂히는 궁극의 스피드 `O(1)`의 기적이 필요합니다.",
      definition: "**해시(Hashing)** 란 임의의 길이를 가진 텍스트나 데이터를 독특한 수학 공식(해시 함수)에 밀어 넣어 곧바로 배열의 '문 닫힌 인덱스 번호'로 치환해 버리는 궁극적 매핑 기술입니다.\n\n* **해시 함수(Hash Function)**: 불규칙한 데이터 본질을 고정된 길이의 숫자표(메모리 주소)로 바꿔 깔아주는 신비한 지휘관입니다.\n* **필연적 충돌(Collision)**: 비극적이게도 전혀 다른 데이터임에도 우연의 일치로 '똑같은 인덱스 번호표'를 배정받아 한 방(버킷)을 두 번 박차고 들어가려는 충돌 사고가 필연적으로 발생합니다.\n* **구명조끼 체이닝 (Chaining)**: 충돌이 터진 버킷이 폭발하게 두지 않고, 포기하지 않고 그 방에 계속 연결 리스트(Linked List) 밧줄을 쭉쭉 이어 붙여 새 데이터들을 유연하게 대롱대롱 매달아 두는 현명한 충돌 완충 장치입니다.",
      analogy: "🎫 **놀이공원 물품 보관함의 발급기** 원리입니다.\n\n손님이 자신의 '고급 레스토랑 멤버십 카드'를 리더기에 스와이프하면 기계가 수학 공식을 돌려 즉석에서 '당신은 무조건 7번 보관함입니다'라고 지정해 줍니다(탐색 시간 제로). 그런데 우연히 뒤에 온 손님 카드도 계산 결과 '7번 보관함'이 당첨된다면(해시 충돌)? 7번 보관함이 박살나는 대신, 친절한 직원이 재빨리 7번 사물함 뒷구멍에 긴 대형 박스를 테이프로 임시 연장해 주어(체이닝) 두 사람 모두 평화롭게 짐을 넣어둘 수 있도록 시스템이 수습됩니다."
    },
    features: [
      {
        title: "단번에 찾기: 해시 함수의 마법",
        description: "데이터의 값을 해시 함수에 통과시켜 배열의 '인덱스'로 즉시 변환, 데이터 크기에 무관하게 `O(1)`이라는 경이적인 속도로 접근하는 기본 원리를 관찰합니다.",
        SupplementaryVisualizer: HashCollisionSupplementaryOptions[0]
      },
      {
        title: "필연적인 충돌(Collision)의 시각화",
        description: "서로 다른 데이터가 우연히 같은 해시값을 배정받아 충돌하는 현상을 애니메이션으로 확인하고 그 위협성을 다룹니다.",
        SupplementaryVisualizer: HashCollisionSupplementaryOptions[1]
      },
      {
        title: "체이닝(Chaining) 방식의 해결",
        description: "충돌이 일어난 인덱스에 연결 리스트를 만들어 매달아 데이터를 안전하게 보존하고 탐색하는 기법을 실습합니다.",
        SupplementaryVisualizer: HashCollisionSupplementaryOptions[2]
      },
      {
        title: "개방 주소법(Open Addressing)",
        description: "충돌 발생 시 연결 리스트 대신 배열 내의 다음 빈 슬롯으로 이동하여 저장하는 선형 탐사(Linear Probing) 방식을 체이닝과 비교하며 각각의 트레이드오프를 이해합니다.",
        SupplementaryVisualizer: HashCollisionSupplementaryOptions[3]
      }
    ]
  },
]);

// Requirement: keep this chapter as code simulator
const FOUNDATION_INTEGRATION_MODULES = createCodeTemplateModules([
  {
    id: "foundation-integrated-1",
    title: "통합 문제 1: 배열+검색",
    description: "배열 전처리 후 검색 전략을 선택하는 통합 문제를 풉니다.",
    sampleData: [9, 1, 6, 3, 7, 2],
  },
  {
    id: "foundation-integrated-2",
    title: "통합 문제 2: 정렬된 배열 삽입/탐색",
    description: "정렬 상태를 유지하면서 삽입/탐색 비용을 최적화합니다.",
    sampleData: [1, 2, 4, 5, 8, 11],
  },
  {
    id: "foundation-integrated-3",
    title: "통합 문제 3: 해시 충돌 시나리오",
    description: "충돌 상황에서 자료구조 선택과 리해시 전략을 설계합니다.",
    sampleData: [21, 31, 41, 22, 32, 42],
  },
]);

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
        modules={FOUNDATION_BASIC_SEARCH_MODULES}
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
