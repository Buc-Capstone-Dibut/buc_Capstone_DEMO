"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { ProblemBankController } from "@/components/features/ctp/problem-bank";
import { module02Problems } from "@/data/ctp/problems";
import { ChapterOverview } from "./shared/chapter-overview";
import {
  createCodeTemplateModules,
  createInteractiveTemplateModules,
} from "./shared/module-utils";

// Supplementary Visualizers
import { LifoBasicsSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/supp/lifo-basics-supp";
import { QueueOverviewSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/supp/queue-overview-supp";
import { LinearQueueSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/supp/linear-queue-supp";
import { CircularQueueSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/supp/circular-queue-supp";
import { RecursionBasicsSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/supp/recursion-basics-supp";
import { RecursionAnalysisSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/supp/recursion-analysis-supp";
import { TowerOfHanoiSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/supp/tower-of-hanoi-supp";
import { IterativeRecursionSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/supp/iterative-recursion-supp";
import { QueenBacktrackingSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/supp/queen-backtracking-supp";

// Main Interactive Visualizers
import { useLifoBasicsSim, LifoBasicsVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/lifo-basics";
import { useQueueOverviewSim, QueueOverviewVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/queue-overview";
import { useLinearQueueSim, LinearQueueVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/linear-queue";
import { useCircularQueueSim, CircularQueueVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/circular-queue";
import { useRecursionBasicsSim, RecursionBasicsVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/recursion-basics";
import { useRecursionAnalysisSim, RecursionAnalysisVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/recursion-analysis";
import { useTowerOfHanoiSim, TowerOfHanoiVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/tower-of-hanoi";
import { useIterativeRecursionSim, IterativeRecursionVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/iterative-recursion";
import { useQueenBacktrackingSim, QueenBacktrackingVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-02/queen-backtracking";

const STACK_QUEUE_MODULES = createInteractiveTemplateModules([
  {
    id: "lifo-basics",
    title: "04-1 스택 개요",
    description: "LIFO 구조의 핵심 불변식과 연산 비용, 대표 사용 사례를 학습합니다.",
    sampleData: [3, 6, 9, 12],
    story: {
      problem:
        "텍스트 에디터의 Undo, 웹 브라우저 뒤로가기, 함수 호출 복귀 순서처럼 최근에 발생한 작업부터 되돌려야 하는 상황은 현실에서 매우 자주 등장합니다. 이런 문제를 단순 배열 순회로 처리하면 복구 순서가 꼬이거나 상태 일관성이 깨지는 치명적 버그가 발생합니다.",
      definition:
        "**스택(Stack)** 은 마지막에 들어온 데이터가 가장 먼저 나가는 **LIFO(Last In, First Out)** 원칙을 따르는 선형 자료구조입니다. 핵심 연산은 `push`, `pop`, `peek`이며, 일반적으로 끝 지점(top)에서만 작업해 연산이 `O(1)`로 안정적입니다. 호출 스택(Call Stack), 되돌리기 이력, 괄호 검증 같은 문제의 기본 토대가 됩니다.",
      analogy:
        "접시를 차곡차곡 쌓아두는 선반을 떠올리면 이해가 쉽습니다. 가장 위에 올린 접시만 가장 먼저 꺼낼 수 있고, 중간 접시를 바로 빼려 하면 전체 구조가 무너집니다. 스택의 핵심은 '중간 접근 금지'와 'top 집중 제어'입니다.",
    },
    features: [
      {
        title: "LIFO 불변식 체득",
        description:
          "연속 `push` 이후 `pop`을 실행해 입력 역순으로 데이터가 반환되는지를 확인하고, 스택의 가장 중요한 규칙이 항상 유지되는지 검증합니다.",
        SupplementaryVisualizer: LifoBasicsSupplementaryOptions[0]
      },
      {
        title: "핵심 연산의 시간복잡도",
        description:
          "`push/pop/peek`가 왜 상수 시간(`O(1)`)인지 top 포인터 이동 관점에서 이해하고, 중간 삽입/탐색이 비효율적인 이유를 비교합니다.",
        SupplementaryVisualizer: LifoBasicsSupplementaryOptions[1]
      },
      {
        title: "언더플로/오버플로 경계 처리",
        description:
          "비어 있는 스택에서 `pop`할 때의 언더플로, 고정 크기 스택에서 `push`할 때의 오버플로 상황을 점검하며 예외 처리 기준을 정리합니다.",
        SupplementaryVisualizer: LifoBasicsSupplementaryOptions[2]
      },
      {
        title: "실무 사용 패턴 매핑",
        description:
          "괄호 짝 검사, 실행 취소 기록, DFS 탐색처럼 '최근 상태를 우선 회수'해야 하는 문제에 스택이 왜 정답인지 연결해 봅니다.",
        SupplementaryVisualizer: LifoBasicsSupplementaryOptions[3]
      },
    ],
    useSim: useLifoBasicsSim,
    Visualizer: LifoBasicsVisualizer,
  },
  {
    id: "queue-overview",
    title: "04-2 큐 개요",
    description: "FIFO 처리 철학과 대기열 시스템에서의 공정성/처리량 균형을 학습합니다.",
    sampleData: [4, 8, 2, 10],
    story: {
      problem:
        "서버 요청, 프린터 작업, 고객 상담 대기열처럼 먼저 도착한 작업을 먼저 처리하지 않으면 시스템 신뢰도가 급격히 떨어집니다. 최신 요청만 우대하면 오래 기다린 작업이 굶주리는 Starvation이 발생하고, 전체 사용자 경험이 붕괴합니다.",
      definition:
        "**큐(Queue)** 는 먼저 들어온 데이터가 먼저 나가는 **FIFO(First In, First Out)** 원칙을 따릅니다. 입력은 `enqueue`, 출력은 `dequeue`, 관찰은 `front`로 표현하며, 스케줄링/버퍼링/레벨 단위 탐색(BFS)의 핵심 구조입니다. 큐는 '순서 보존'이 최우선인 상황에서 가장 강력합니다.",
      analogy:
        "놀이공원 입장 줄과 같습니다. 먼저 줄 선 사람이 먼저 입장해야 시스템이 공정하게 유지됩니다. 줄 중간에 끼어들거나 뒤에서 온 사람을 먼저 넣으면 전체 질서가 깨집니다.",
    },
    features: [
      {
        title: "FIFO 공정성 확인",
        description:
          "`enqueue` 순서와 `dequeue` 순서가 항상 동일한지 추적하며, 대기열 기반 처리 시스템의 기본 신뢰 조건을 확인합니다.",
        SupplementaryVisualizer: QueueOverviewSupplementaryOptions[0]
      },
      {
        title: "Front/Rear 역할 분리",
        description:
          "입력은 rear, 출력은 front에서 일어난다는 역할 분리를 통해 데이터 흐름이 왜 단순하고 예측 가능한지 이해합니다.",
        SupplementaryVisualizer: QueueOverviewSupplementaryOptions[1]
      },
      {
        title: "처리량과 지연 시간의 균형",
        description:
          "큐 길이가 길어질수록 평균 대기시간이 증가하는 패턴을 관찰하고, 시스템이 감당 가능한 처리율(throughput) 설계 감각을 익힙니다.",
        SupplementaryVisualizer: QueueOverviewSupplementaryOptions[2]
      },
      {
        title: "대표 적용 문제 연결",
        description:
          "BFS, 작업 스케줄러, 비동기 메시지 버퍼 등 FIFO가 본질인 문제를 큐 연산으로 직접 대응하는 방법을 정리합니다.",
        SupplementaryVisualizer: QueueOverviewSupplementaryOptions[3]
      },
    ],
    useSim: useQueueOverviewSim,
    Visualizer: QueueOverviewVisualizer,
  },
  {
    id: "linear-queue",
    title: "04-3 배열 기반 큐",
    description: "Front/Rear 포인터와 빈 슬롯 누적 문제를 포함한 배열 큐 구현의 현실 제약을 학습합니다.",
    sampleData: [1, 5, 7, 11],
    story: {
      problem:
        "배열 한 칸씩만 믿고 큐를 구현하면 `dequeue` 이후 앞쪽 빈 공간이 계속 남아도 rear가 끝에 도달해 '더 이상 못 넣는 것처럼 보이는 가짜 포화(False Overflow)'가 생깁니다. 자료구조 개념은 맞는데 구현이 망가지는 전형적인 케이스입니다.",
      definition:
        "**배열 기반 선형 큐(Linear Queue)** 는 `front`, `rear` 인덱스를 사용해 배열 안에서 입력/출력을 관리합니다. 단순 구현은 이해하기 쉽지만, 공간 재활용이 제한되어 장시간 운영 시 비효율이 누적됩니다. 따라서 상태 판별(`isEmpty`, `isFull`)과 포인터 이동 규칙을 정확히 정의해야 합니다.",
      analogy:
        "한 방향 통행만 가능한 좁은 주차장과 비슷합니다. 앞 차가 빠져 빈 칸이 생겨도 뒤쪽 차량은 끝칸만 향하므로, 실제 공간이 남아 있어도 새 차를 받지 못하는 순간이 생깁니다.",
    },
    features: [
      {
        title: "포인터 상태 전이 추적",
        description:
          "각 연산 후 `front/rear`가 어떻게 이동하는지 단계별로 기록해 off-by-one 오류와 경계값 오류를 예방합니다.",
        SupplementaryVisualizer: LinearQueueSupplementaryOptions[0]
      },
      {
        title: "가짜 포화(False Overflow) 이해",
        description:
          "앞쪽 슬롯이 비어도 rear가 배열 끝에 닿아 삽입 실패가 발생하는 구조적 한계를 시각적으로 확인합니다.",
        SupplementaryVisualizer: LinearQueueSupplementaryOptions[1]
      },
      {
        title: "상태 판별 규칙 정교화",
        description:
          "`front > rear`, `front === rear + 1` 등 구현 방식별 빈 큐 판별 기준을 비교하며 안정적인 조건식을 설계합니다.",
        SupplementaryVisualizer: LinearQueueSupplementaryOptions[2]
      },
      {
        title: "개선 방향 예고",
        description:
          "선형 큐의 공간 낭비 문제가 왜 원형 큐(Circular Queue)로 이어지는지 자연스럽게 연결해 자료구조 진화 흐름을 이해합니다.",
        SupplementaryVisualizer: LinearQueueSupplementaryOptions[3]
      },
    ],
    useSim: useLinearQueueSim,
    Visualizer: LinearQueueVisualizer,
  },
  {
    id: "circular-queue",
    title: "04-4 링 버퍼 큐",
    description: "모듈러 인덱싱으로 고정 배열을 재활용하는 원형 큐 설계를 학습합니다.",
    sampleData: [2, 4, 6, 8],
    story: {
      problem:
        "실시간 로그 처리, 오디오 버퍼, 네트워크 패킷 큐처럼 일정 메모리 안에서 계속 데이터를 받고 내보내야 하는 시스템은 선형 큐의 공간 낭비를 허용할 수 없습니다. 메모리 재할당이 잦아지면 지연 시간이 튀고 안정성이 떨어집니다.",
      definition:
        "**원형 큐(Circular Queue)** 는 배열의 끝과 시작을 이어 붙여 고리처럼 사용하는 큐입니다. 인덱스 이동은 `(index + 1) % capacity`로 처리해 앞쪽 빈 공간을 자동 재활용합니다. 고정 메모리로 일정한 처리 시간을 유지하는 링 버퍼(Ring Buffer)의 핵심 원리입니다.",
      analogy:
        "시계판 위를 도는 초침처럼, 마지막 칸에 도달하면 다시 0번 칸으로 자연스럽게 돌아옵니다. 중요한 것은 현재 칸 번호가 아니라 '고리 위에서의 상대적 순서'입니다.",
    },
    features: [
      {
        title: "모듈러 연산 기반 포인터 이동",
        description:
          "`(rear + 1) % size` 규칙으로 인덱스가 순환하는 구조를 연습하며, 배열 끝 경계에서 발생하는 예외를 제거합니다.",
        SupplementaryVisualizer: CircularQueueSupplementaryOptions[0]
      },
      {
        title: "Full/Empty 판별 전략",
        description:
          "`front === rear` 충돌 문제를 해결하기 위해 `count`를 두거나 한 칸 비워두는 설계 전략을 비교합니다.",
        SupplementaryVisualizer: CircularQueueSupplementaryOptions[1]
      },
      {
        title: "고정 메모리 시스템 최적화",
        description:
          "재할당 없이 안정적으로 동작해야 하는 임베디드/실시간 환경에서 원형 큐가 선호되는 이유를 성능 관점에서 파악합니다.",
        SupplementaryVisualizer: CircularQueueSupplementaryOptions[2]
      },
      {
        title: "디버깅 불변식",
        description:
          "연산 전후 `(rear - front + size) % size` 값과 보관 원소 수가 일치하는지 확인하는 검증 습관을 학습합니다.",
        SupplementaryVisualizer: CircularQueueSupplementaryOptions[3]
      },
    ],
    useSim: useCircularQueueSim,
    Visualizer: CircularQueueVisualizer,
  },
]);

const RECURSION_MODULES = createInteractiveTemplateModules([
  {
    id: "recursion-basics",
    title: "05-1 재귀 기본",
    description: "기저 조건, 문제 축소, 호출 스택 프레임 관점에서 재귀의 작동 원리를 학습합니다.",
    sampleData: [5, 1, 4, 2],
    story: {
      problem:
        "복잡한 문제를 한 번에 해결하려 하면 로직이 비대해지고 예외 케이스가 폭증합니다. 특히 트리 순회, 분할 정복, 조합 탐색처럼 동일 구조가 반복되는 문제는 반복문만으로 표현할 때 코드 의도가 흐려지기 쉽습니다.",
      definition:
        "**재귀(Recursion)** 는 함수가 자기 자신을 다시 호출해 문제를 더 작은 하위 문제로 분해하는 기법입니다. 핵심은 반드시 종료되는 **기저 조건(Base Case)** 과, 입력을 점점 단순화하는 **재귀 단계(Recursive Case)** 를 동시에 설계하는 것입니다. 함수 호출마다 독립 스택 프레임이 생성되며, 복귀 시점에 결과가 결합됩니다.",
      analogy:
        "같은 형태의 상자가 계속 들어 있는 러시아 인형(Matryoshka)과 유사합니다. 가장 작은 인형(기저 조건)에 도달하면 그때부터 역순으로 하나씩 닫히며 전체 구조가 완성됩니다.",
    },
    features: [
      {
        title: "Base Case 설계",
        description:
          "'언제 멈출 것인가'를 먼저 정의하는 습관을 통해 무한 재귀를 원천 차단하고 알고리즘의 종료 가능성을 확보합니다.",
        SupplementaryVisualizer: RecursionBasicsSupplementaryOptions[0]
      },
      {
        title: "문제 축소 규칙 확인",
        description:
          "호출마다 입력 크기(`n`, 인덱스 범위 등)가 단조 감소하는지 검증해 재귀가 실제로 수렴하는지 점검합니다.",
        SupplementaryVisualizer: RecursionBasicsSupplementaryOptions[1]
      },
      {
        title: "호출 스택 프레임 이해",
        description:
          "지역 변수와 반환 주소가 프레임 단위로 분리되는 구조를 확인하며, 재귀 함수에서 상태가 꼬이는 이유를 분석합니다.",
        SupplementaryVisualizer: RecursionBasicsSupplementaryOptions[2]
      },
      {
        title: "반복문 대비 표현력",
        description:
          "재귀가 더 자연스러운 문제(트리/그래프/분할 정복)와 반복문이 더 안전한 문제를 구분하는 기준을 학습합니다.",
        SupplementaryVisualizer: RecursionBasicsSupplementaryOptions[3]
      },
    ],
    useSim: useRecursionBasicsSim,
    Visualizer: RecursionBasicsVisualizer,
  },
  {
    id: "recursion-analysis",
    title: "05-2 재귀 분석",
    description: "호출 트리, 점화식, 스택 메모리 관점으로 재귀 알고리즘의 비용을 정량 분석합니다.",
    sampleData: [7, 3, 9, 1],
    story: {
      problem:
        "재귀 코드는 짧고 우아해 보여도 실제 실행 비용은 종종 직관과 다릅니다. 피보나치처럼 중복 호출이 많은 함수는 작은 입력에서도 실행 시간이 폭증하고, 깊은 호출은 스택 메모리를 빠르게 소모합니다.",
      definition:
        "재귀 분석은 **점화식(Recurrence)**, **호출 트리(Recursion Tree)**, **깊이(Depth)** 를 함께 보는 작업입니다. 예를 들어 `T(n) = 2T(n/2) + O(n)` 형태는 분할/병합 비용을 분리해 해석하며, 최대 호출 깊이는 공간복잡도(`O(h)`)와 직결됩니다. 시간과 공간을 분리해 보는 시각이 핵심입니다.",
      analogy:
        "프로젝트 예산 트리를 계산하는 것과 비슷합니다. 상위 부서 예산은 하위 부서 예산의 합과 관리비로 구성되며, 트리 전체를 펼쳐 봐야 총비용을 정확히 알 수 있습니다.",
    },
    features: [
      {
        title: "호출 트리 전개",
        description:
          "재귀 호출을 트리로 펼쳐 중복 계산 노드가 어디서 발생하는지 시각적으로 확인합니다.",
        SupplementaryVisualizer: RecursionAnalysisSupplementaryOptions[0]
      },
      {
        title: "점화식 기반 시간복잡도",
        description:
          "`T(n)` 형태로 알고리즘을 수식화해 점근적 시간복잡도(예: `O(log n)`, `O(n log n)`, `O(2^n)`)를 도출합니다.",
        SupplementaryVisualizer: RecursionAnalysisSupplementaryOptions[1]
      },
      {
        title: "공간복잡도와 최대 깊이",
        description:
          "동시 활성 프레임 수가 최대 깊이와 같다는 점을 이용해 스택 사용량을 추정하고 Stack Overflow 위험 구간을 파악합니다.",
        SupplementaryVisualizer: RecursionAnalysisSupplementaryOptions[2]
      },
      {
        title: "중복 하위 문제 최적화",
        description:
          "메모이제이션/DP 전환이 필요한 신호를 식별해, 재귀 성능을 구조적으로 개선하는 기준을 익힙니다.",
        SupplementaryVisualizer: RecursionAnalysisSupplementaryOptions[3]
      },
    ],
    useSim: useRecursionAnalysisSim,
    Visualizer: RecursionAnalysisVisualizer,
  },
  {
    id: "tower-of-hanoi",
    title: "05-3 하노이의 탑",
    description: "재귀 분해 규칙과 최소 이동 횟수 증명을 통해 분할 정복 사고를 훈련합니다.",
    sampleData: [3, 2, 1],
    story: {
      problem:
        "하노이의 탑은 규칙이 단순해 보이지만, 원판 수가 조금만 늘어도 이동 횟수가 폭발적으로 증가합니다. 단순 시행착오로는 최적 해법을 찾기 어렵고, 명확한 재귀 분해 없이는 문제를 안정적으로 풀 수 없습니다.",
      definition:
        "핵심 전략은 `n-1`개를 보조 기둥으로 옮기고, 가장 큰 원판 1개를 목적지로 이동한 뒤, 다시 `n-1`개를 목적지로 옮기는 3단계 분할입니다. 점화식은 `T(n) = 2T(n-1) + 1`, 최소 이동 횟수는 `2^n - 1`입니다. 재귀의 구조적 사고를 가장 선명하게 보여주는 고전 문제입니다.",
      analogy:
        "무거운 장비를 이동할 때 큰 장비를 먼저 옮기고 싶어도 주변 장비를 먼저 치워야 하는 공정과 유사합니다. 한 번에 해결하려 하지 않고, 동일 패턴을 더 작은 단위로 반복해 전체를 완성합니다.",
    },
    features: [
      {
        title: "규칙 기반 상태 제약",
        description:
          "큰 원판을 작은 원판 위에 놓을 수 없다는 불변식을 유지하면서 가능한 이동만 생성하는 방법을 익힙니다.",
        SupplementaryVisualizer: TowerOfHanoiSupplementaryOptions[0]
      },
      {
        title: "3단계 분해 템플릿",
        description:
          "`move(n-1) -> move(1) -> move(n-1)` 패턴을 템플릿화해 다른 재귀 분할 문제에도 재사용할 수 있게 만듭니다.",
        SupplementaryVisualizer: TowerOfHanoiSupplementaryOptions[1]
      },
      {
        title: "점화식과 최소 해 증명",
        description:
          "점화식 유도 과정을 통해 왜 `2^n - 1`이 최소인지 설명하고, '정답의 필요충분성'을 사고합니다.",
        SupplementaryVisualizer: TowerOfHanoiSupplementaryOptions[2]
      },
      {
        title: "성장 속도 체감",
        description:
          "`n` 증가에 따른 이동 횟수 증가를 비교해 지수 복잡도의 위험성을 실제 숫자로 체감합니다.",
        SupplementaryVisualizer: TowerOfHanoiSupplementaryOptions[3]
      },
    ],
    useSim: useTowerOfHanoiSim,
    Visualizer: TowerOfHanoiVisualizer,
  },
  {
    id: "iterative-recursion",
    title: "05-4 비재귀적 표현",
    description: "명시적 스택 프레임을 설계해 재귀 로직을 반복문으로 치환하는 방법을 학습합니다.",
    sampleData: [6, 2, 5, 1],
    story: {
      problem:
        "재귀는 직관적이지만 런타임 스택 한계에 걸리거나 디버깅이 어려운 경우가 많습니다. 특히 입력 크기가 큰 실전 환경에서는 재귀 깊이 제한과 예외 처리 비용 때문에 반복 기반 구현이 더 안전할 때가 있습니다.",
      definition:
        "비재귀적 표현은 재귀가 암묵적으로 사용하는 호출 스택을 **명시적 스택 자료구조**로 드러내는 기법입니다. 프레임에는 현재 상태(파라미터, 처리 단계, 복귀 지점)를 저장하고, `while` 루프에서 push/pop으로 실행 흐름을 재현합니다. 즉, 재귀의 본질을 잃지 않고 제어권만 개발자가 직접 갖는 방식입니다.",
      analogy:
        "자동 재생 영화 대신 장면 카드(스택)를 직접 넘겨가며 상영 순서를 제어하는 편집실과 같습니다. 어떤 장면을 먼저 처리하고 어디로 복귀할지 명확히 통제할 수 있습니다.",
    },
    features: [
      {
        title: "스택 프레임 데이터 모델링",
        description:
          "재귀 함수의 지역 상태를 어떤 필드로 저장해야 동일 동작을 보장할 수 있는지 프레임 스키마를 설계합니다.",
        SupplementaryVisualizer: IterativeRecursionSupplementaryOptions[0]
      },
      {
        title: "전개/복귀 순서 재현",
        description:
          "재귀 호출(전개)과 반환(복귀) 순서를 push/pop 이벤트로 치환해 흐름 동등성을 검증합니다.",
        SupplementaryVisualizer: IterativeRecursionSupplementaryOptions[1]
      },
      {
        title: "대규모 입력 안정성",
        description:
          "재귀 깊이 제한 문제를 회피해야 하는 환경에서 반복 + 명시적 스택이 갖는 실무적 장점을 이해합니다.",
        SupplementaryVisualizer: IterativeRecursionSupplementaryOptions[2]
      },
      {
        title: "가독성 vs 제어성 트레이드오프",
        description:
          "재귀 코드의 간결성과 반복 코드의 제어 가능성 사이에서 문제 특성에 맞는 구현 방식을 선택하는 기준을 학습합니다.",
        SupplementaryVisualizer: IterativeRecursionSupplementaryOptions[3]
      },
    ],
    useSim: useIterativeRecursionSim,
    Visualizer: IterativeRecursionVisualizer,
  },
  {
    id: "queen-backtracking",
    title: "05-5 백트래킹 (퀸 배치)",
    description: "유망한 경로만 확장하는 가지치기 전략으로 탐색 공간을 줄이는 백트래킹을 학습합니다.",
    sampleData: [1, 3, 5, 7],
    story: {
      problem:
        "N-Queen 문제를 무식하게 완전탐색하면 경우의 수가 폭발해 현실적으로 계산이 불가능해집니다. 정답 후보를 끝까지 만든 뒤 실패를 확인하는 방식은 시간과 메모리를 동시에 낭비합니다.",
      definition:
        "**백트래킹(Backtracking)** 은 DFS 기반 탐색에서 현재 선택이 유효하지 않으면 즉시 되돌아가 다음 선택지를 시도하는 전략입니다. 핵심은 '현재 상태가 미래에 정답이 될 가능성'을 빠르게 판별하는 **가지치기(Pruning)** 입니다. N-Queen에서는 같은 열/대각선 충돌을 즉시 차단해 탐색 트리를 크게 줄입니다.",
      analogy:
        "미로를 탐색할 때 막다른 길임이 보이면 끝까지 가지 않고 즉시 돌아서 다른 갈림길을 선택하는 방식과 같습니다. 백트래킹의 성능은 빨리 포기하는 능력에서 나옵니다.",
    },
    features: [
      {
        title: "상태 표현 설계",
        description:
          "열/주대각/부대각 점유 정보를 배열 또는 비트마스크로 관리해 충돌 검사를 상수 시간으로 최적화하는 방법을 학습합니다.",
        SupplementaryVisualizer: QueenBacktrackingSupplementaryOptions[0]
      },
      {
        title: "유망성 검사(Feasibility Check)",
        description:
          "현재 선택이 제약조건을 만족하는지 즉시 판별해 불필요한 하위 트리 확장을 차단합니다.",
        SupplementaryVisualizer: QueenBacktrackingSupplementaryOptions[1]
      },
      {
        title: "탐색 트리 크기 절감",
        description:
          "가지치기 전후 방문 노드 수를 비교해 백트래킹이 실질적으로 얼마나 큰 성능 차이를 만드는지 체감합니다.",
        SupplementaryVisualizer: QueenBacktrackingSupplementaryOptions[2]
      },
      {
        title: "디버깅 체크리스트",
        description:
          "선택 -> 재귀 호출 -> 상태 복원(undo) 순서가 정확한지 확인하며, 백트래킹 구현의 대표 버그를 예방합니다.",
        SupplementaryVisualizer: QueenBacktrackingSupplementaryOptions[3]
      }
    ],
    useSim: useQueenBacktrackingSim,
    Visualizer: QueenBacktrackingVisualizer,
  },
]);

// Requirement: keep this chapter as code simulator
const STACK_RECURSION_INTEGRATION_MODULES = createCodeTemplateModules([
  {
    id: "stack-recursion-integrated-1",
    title: "통합 문제 1: 스택으로 재귀 대체",
    description: "재귀 호출 흐름을 명시적 스택 프레임으로 치환하는 실전 문제를 풉니다.",
    sampleData: [10, 6, 2, 9, 1],
    story: {
      problem:
        "재귀 알고리즘을 그대로 서비스 코드에 넣었다가 깊은 입력에서 런타임 오류가 발생하는 경우가 많습니다. 알고리즘 아이디어는 맞지만 구현 전략이 환경 제약을 반영하지 못한 상황입니다.",
      definition:
        "이 통합 문제는 재귀 함수의 호출/복귀 상태를 스택에 저장해 동일 로직을 반복문으로 재현하는 과정을 다룹니다. 핵심은 '무엇을 프레임에 저장해야 원본 재귀와 완전히 같은 결과가 나오는가'입니다.",
      analogy:
        "자동 변속기(재귀)를 수동 변속기(명시적 스택)로 전환해도 주행 경로와 목적지는 같아야 하는 상황과 같습니다.",
    },
    features: [
      {
        title: "호출 상태 캡슐화",
        description:
          "파라미터, 현재 단계, 임시 결과를 프레임에 묶어 저장하는 패턴을 익힙니다.",
      },
      {
        title: "동등성 검증",
        description:
          "재귀 버전과 반복 버전의 출력/연산 순서가 일치하는지 테스트 케이스로 교차 검증합니다.",
      },
      {
        title: "예외 안전성 확보",
        description:
          "대규모 입력에서도 스택 오버플로 없이 안정적으로 동작하도록 구현을 다듬습니다.",
      },
    ],
  },
  {
    id: "stack-recursion-integrated-2",
    title: "통합 문제 2: 큐/스택 선택 문제",
    description: "문제 요구사항에서 처리 순서를 해석해 스택과 큐 중 최적 구조를 선택합니다.",
    sampleData: [4, 12, 8, 3, 7],
    story: {
      problem:
        "많은 풀이가 구현부터 시작해서 자료구조 선택을 뒤늦게 바꾸느라 시간을 낭비합니다. 순서 제약을 먼저 읽지 않으면 정답 알고리즘을 알고도 틀린 자료구조를 선택하게 됩니다.",
      definition:
        "핵심은 문제를 '최근 상태 우선 회수(LIFO)인가, 도착 순서 보존(FIFO)인가'로 번역하는 것입니다. 스택/큐 선택은 구현 디테일이 아니라 문제 모델링의 본질적 결정입니다.",
      analogy:
        "응급실 트리아지(우선순위)와 번호표 창구(선착순)는 모두 줄서기처럼 보이지만 운영 규칙이 전혀 다릅니다. 규칙을 먼저 읽어야 도구가 정해집니다.",
    },
    features: [
      {
        title: "요구사항 문장 해석",
        description:
          "문제 설명 속 키워드(최근, 되돌리기, 선착순, 레벨순)를 자료구조 선택 신호로 추출하는 훈련을 합니다.",
      },
      {
        title: "선택 근거 명문화",
        description:
          "왜 스택인지, 왜 큐인지를 연산 시나리오와 복잡도 근거로 설명하는 답안 품질을 강화합니다.",
      },
      {
        title: "오선택 리팩터링",
        description:
          "틀린 자료구조로 시작한 코드를 요구사항 중심으로 재설계해 정답 구조로 전환하는 과정을 실습합니다.",
      },
    ],
  },
  {
    id: "stack-recursion-integrated-3",
    title: "통합 문제 3: 분기 탐색 실전",
    description: "백트래킹 탐색에서 상태 복원과 가지치기를 결합해 성능을 개선합니다.",
    sampleData: [5, 9, 1, 6, 2],
    story: {
      problem:
        "분기형 문제를 완전탐색으로만 풀면 정답은 맞아도 제한 시간 안에 통과하지 못하는 경우가 많습니다. 특히 상태 복원이 어긋나면 일부 케이스만 틀리는 난해한 버그가 생깁니다.",
      definition:
        "이 문제는 DFS + 백트래킹 골격에 제약 검사와 가지치기를 결합해 탐색 공간을 줄이는 실전 훈련입니다. 선택-탐색-복원의 루프를 안정적으로 유지하는 것이 정답률과 성능을 동시에 좌우합니다.",
      analogy:
        "여러 갈래 산길에서 지도에 없는 막다른 길을 만나면 즉시 돌아와 다음 길을 고르는 등산 전략과 같습니다. 끝까지 가보는 것이 아니라, 빨리 포기하고 유망 경로에 집중해야 합니다.",
    },
    features: [
      {
        title: "분기 트리 설계",
        description:
          "현재 상태에서 생성 가능한 다음 후보를 체계적으로 열거하고, 탐색 순서를 설계합니다.",
      },
      {
        title: "가지치기 규칙 정교화",
        description:
          "정답 가능성이 없는 노드를 조기에 탈락시키는 조건식을 설계해 탐색량을 줄입니다.",
      },
      {
        title: "상태 복원 안정성",
        description:
          "재귀 복귀 시 변경한 상태를 정확히 되돌려 케이스 누락/중복 방문 버그를 방지합니다.",
      },
    ],
  },
]);

export function StackQueueContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 02. Stack & Recursion"
        modules={STACK_QUEUE_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 02. Stack & Recursion"
            chapterTitle="04 스택과 큐"
            chapterDescription="LIFO/FIFO의 본질을 연산 시뮬레이션으로 검증하고, 포인터/메모리 관점까지 확장해 자료구조 선택 감각을 만듭니다."
            whyLearn="실무의 대기열·실행취소·스케줄링 문제는 순서 규칙이 핵심이라, 스택/큐를 정확히 이해하지 못하면 상태 버그와 성능 병목이 동시에 발생합니다."
            quickFlow={[
              "LIFO/FIFO 규칙을 조작하면서 출력 순서를 비교합니다.",
              "front/rear/top 포인터와 경계 조건을 점검합니다.",
              "선형 큐 한계를 원형 큐 설계로 해결합니다.",
            ]}
            guideItems={[
              "같은 입력 데이터로 스택과 큐를 번갈아 조작해 출력 순서 차이를 기록하세요.",
              "각 단계에서 Front/Rear/Top 상태를 노트에 적어 경계 조건을 명확히 확인하세요.",
              "오버플로·언더플로 상황을 일부러 만들어 방어 로직이 올바르게 동작하는지 점검하세요.",
              "실전 문제 문장을 보고 어떤 구조가 맞는지 먼저 판단한 뒤 구현을 시작하세요.",
            ]}
            items={[
              {
                id: "lifo-basics",
                title: "04-1 스택 개요",
                description: "LIFO 불변식과 핵심 연산 비용을 이해합니다.",
                previewVisualizers: LifoBasicsSupplementaryOptions.slice(0, 4),
                previewLabels: ["LIFO 규칙", "연산 복잡도", "경계 처리", "실무 패턴"],
              },
              {
                id: "queue-overview",
                title: "04-2 큐 개요",
                description: "FIFO 공정성과 처리 흐름 모델을 학습합니다.",
                previewVisualizers: QueueOverviewSupplementaryOptions.slice(0, 4),
                previewLabels: ["FIFO 공정성", "front/rear", "처리량 균형", "적용 문제"],
              },
              {
                id: "linear-queue",
                title: "04-3 배열 기반 큐",
                description: "포인터 이동과 가짜 포화 문제를 실습합니다.",
                previewVisualizers: LinearQueueSupplementaryOptions.slice(0, 4),
                previewLabels: ["포인터 전이", "False Overflow", "상태 판별", "개선 방향"],
              },
              {
                id: "circular-queue",
                title: "04-4 링 버퍼 큐",
                description: "원형 인덱싱 기반 공간 재활용을 익힙니다.",
                previewVisualizers: CircularQueueSupplementaryOptions.slice(0, 4),
                previewLabels: ["모듈러 이동", "Full/Empty 규칙", "고정 메모리", "검증 불변식"],
              },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function RecursionContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 02. Stack & Recursion"
        modules={RECURSION_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 02. Stack & Recursion"
            chapterTitle="05 재귀 알고리즘"
            chapterDescription="재귀 호출의 구조를 스택 프레임 관점으로 해부하고, 분석-치환-백트래킹까지 연결해 고난도 탐색 문제 대응력을 강화합니다."
            whyLearn="트리/분할정복/백트래킹 문제는 재귀 사고 없이 풀면 코드가 복잡해지고 오류가 커지므로, 종료 조건과 상태 복원 규칙을 체계적으로 익혀야 합니다."
            quickFlow={[
              "Base Case와 Recursive Case를 먼저 분리합니다.",
              "호출 트리/점화식으로 시간·공간 비용을 분석합니다.",
              "반복 치환과 백트래킹으로 확장해 실전에 적용합니다.",
            ]}
            guideItems={[
              "각 레슨에서 Base Case와 Recursive Case를 먼저 분리해 사고하세요.",
              "호출 트리를 그려 중복 계산 노드를 찾고 최적화 가능성을 점검하세요.",
              "재귀 버전을 반복 + 스택 버전으로 바꿔 동등성을 비교해 보세요.",
              "백트래킹에서는 선택-호출-복원 3단계가 깨지지 않는지 로그로 검증하세요.",
            ]}
            items={[
              {
                id: "recursion-basics",
                title: "05-1 재귀 기본",
                description: "기저 조건과 호출 스택 프레임을 학습합니다.",
                previewVisualizers: RecursionBasicsSupplementaryOptions.slice(0, 4),
                previewLabels: ["Base Case", "문제 축소", "스택 프레임", "표현력 비교"],
              },
              {
                id: "recursion-analysis",
                title: "05-2 재귀 분석",
                description: "호출 트리/점화식으로 비용을 정량화합니다.",
                previewVisualizers: RecursionAnalysisSupplementaryOptions.slice(0, 4),
                previewLabels: ["호출 트리", "점화식", "깊이/공간", "최적화 포인트"],
              },
              {
                id: "tower-of-hanoi",
                title: "05-3 하노이의 탑",
                description: "재귀 분할 템플릿과 최소 이동 규칙을 체득합니다.",
                previewVisualizers: TowerOfHanoiSupplementaryOptions.slice(0, 4),
                previewLabels: ["분할 규칙", "이동 순서", "기저 도달", "최소 이동"],
              },
              {
                id: "iterative-recursion",
                title: "05-4 비재귀적 표현",
                description: "명시적 스택으로 재귀를 반복문으로 치환합니다.",
                previewVisualizers: IterativeRecursionSupplementaryOptions.slice(0, 4),
                previewLabels: ["재귀 치환", "명시적 스택", "상태 전이", "동등성 확인"],
              },
              {
                id: "queen-backtracking",
                title: "05-5 백트래킹 (퀸 배치)",
                description: "가지치기 기반 분기 탐색 성능을 개선합니다.",
                previewVisualizers: QueenBacktrackingSupplementaryOptions.slice(0, 4),
                previewLabels: ["후보 생성", "제약 검사", "가지치기", "상태 복원"],
              },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function StackRecursionIntegrationContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <ProblemBankController
        moduleLabel="Module 02. Stack & Recursion"
        chapterTitle="스택·큐/재귀 알고리즘 개념 심화 및 적용"
        chapterDescription="Problem Bank에서 Stack/Recursion 통합 문제를 풀이하며 자료구조 선택, 재귀 치환, 백트래킹 최적화 사고를 실전 수준으로 고도화하세요."
        problems={module02Problems}
      />
    </Suspense>
  );
}
