"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { ProblemBankController } from "@/components/features/ctp/problem-bank";
import { module03Problems } from "@/data/ctp/problems";
import { ChapterOverview } from "./shared/chapter-overview";
import { createInteractiveTemplateModules } from "./shared/module-utils";

// Module 03 Main Visualizers & Hooks
import { SortingOverviewVisualizer, useSortingOverviewSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/sorting-overview";
import { BubbleSortVisualizer, useBubbleSortSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/bubble-sort";
import { SelectionSortVisualizer, useSelectionSortSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/selection-sort";
import { InsertionSortVisualizer, useInsertionSortSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/insertion-sort";

// Module 03 Supplementary Visualizers
import { SortingOverviewSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/sorting-overview-supp";
import { BubbleSortSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/bubble-sort-supp";
import { SelectionSortSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/selection-sort-supp";
import { InsertionSortSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/insertion-sort-supp";
import { ShellSortVisualizer, useShellSortSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/shell-sort";
import { QuickSortVisualizer, useQuickSortSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/quick-sort";
import { MergeSortVisualizer, useMergeSortSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/merge-sort";
import { HeapSortVisualizer, useHeapSortSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/heap-sort";
import { CountingSortVisualizer, useCountingSortSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/counting-sort";

import { ShellSortSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/shell-sort-supp";
import { QuickSortSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/quick-sort-supp";
import { MergeSortSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/merge-sort-supp";
import { CompleteBinaryTreeSVG, MaxHeapPropertySVG, HeapifySVG, HeapSortProcessSVG } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/heap-sort-supp";
import { FrequencyArraySVG, CumulativeSumSVG, StableSortingSVG, RangeRestrictionSVG } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/counting-sort-supp";
import { BruteForceScanSVG, TwoPointerMatchingSVG, WorstCaseMatchSVG, PatternBacktrackSVG } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/brute-force-supp";
import { PrefixSuffixSVG, LPSTableSVG, KMPSkipSVG, LinearTimeEfficiencySVG } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/kmp-search-supp";
import { RightToLeftCompareSVG, BadCharacterRuleSVG, AlignBadCharacterSVG, GoodSuffixRuleSVG } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/supp/boyer-moore-supp";

import { BruteForceSearchVisualizer, useBruteForceSearchSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/brute-force-search";
import { KmpSearchVisualizer, useKmpSearchSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/kmp-search";
import { BoyerMooreSearchVisualizer, useBoyerMooreSearchSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/boyer-moore-search";

const SORTING_MODULES = createInteractiveTemplateModules([
  {
    id: "sorting-overview",
    title: "06-1 정렬 알고리즘 개요",
    description: "정렬의 분류 축(안정성·내외부·비교/비비교)과 데이터 특성에 따른 알고리즘 선택 기준을 학습합니다.",
    sampleData: [9, 4, 1, 7, 3],
    story: {
      problem:
        "수만 건의 로그, 학생 명부, 검색 결과처럼 한 번에 다뤄야 할 데이터가 무작위로 섞여 있다면 원하는 값을 빠르게 찾거나 통계를 내기 어렵습니다. 정렬 자체가 목적이 아니더라도, 검색·중복 제거·범위 질의 같은 후속 작업의 효율은 데이터가 미리 정렬되어 있는지에 크게 좌우됩니다.",
      definition:
        "**정렬(Sorting)** 은 데이터를 특정 기준(오름차순·내림차순)으로 재배열하는 알고리즘입니다. 분류 축은 안정성(같은 값 순서 보존 여부), 내부/외부(메모리 적재 여부), 비교/비비교(원소를 직접 비교하는지)입니다. 비교 기반 알고리즘의 시간복잡도 하한은 정보 이론적으로 `O(N log N)`이며, 데이터 크기·메모리 제약·정렬 안정성 요구에 따라 최적 알고리즘이 달라집니다.",
      analogy:
        "학생들이 키 순서대로 한 줄로 서는 장면을 떠올리면 됩니다. 한 명씩 자기 자리를 찾아가는 방법은 여러 가지가 있고(앞 사람과 비교하기, 가장 큰 사람부터 뽑기 등), 같은 키끼리 누가 앞인지 정해 두는 규칙이 있느냐 없느냐에 따라 결과의 의미가 달라집니다. 정렬 알고리즘들은 모두 \"줄 세우는 한 가지 규칙\"을 정형화한 것입니다.",
    },
    features: [
      {
        title: "안정 vs 불안정",
        description:
          "같은 값을 가진 원소의 입력 순서가 출력에서도 보존되면 안정 정렬입니다. 보조 키가 있는 정렬(예: 이름순 정렬 후 나이순 정렬)에서는 안정성이 결과의 의미를 좌우합니다.",
        SupplementaryVisualizer: SortingOverviewSupplementaryOptions[0],
      },
      {
        title: "내부 vs 외부 정렬",
        description:
          "데이터를 모두 메모리에 적재할 수 있는지로 구분합니다. 대용량 로그처럼 메모리에 안 들어가는 데이터는 디스크 분할·병합을 활용하는 외부 정렬이 필수입니다.",
        SupplementaryVisualizer: SortingOverviewSupplementaryOptions[1],
      },
      {
        title: "O(N²) 기본 알고리즘",
        description:
          "버블·선택·삽입 정렬은 단순하지만 N이 커질수록 비교 횟수가 가파르게 증가합니다. 학습용·소규모 데이터·거의 정렬된 데이터에서 의미가 있습니다.",
        SupplementaryVisualizer: SortingOverviewSupplementaryOptions[2],
      },
      {
        title: "O(N log N) 고급 알고리즘",
        description:
          "퀵·병합·힙 정렬은 분할 정복이나 힙 구조를 활용해 효율을 끌어올립니다. 비교 기반 알고리즘의 이론적 한계인 `O(N log N)`에 도달하는 대표 그룹입니다.",
        SupplementaryVisualizer: SortingOverviewSupplementaryOptions[3],
      },
    ],
    useSim: useSortingOverviewSim,
    Visualizer: SortingOverviewVisualizer,
  },
  {
    id: "bubble-sort",
    title: "06-2 버블 정렬",
    description: "인접 교환 기반 정렬을 시각화로 학습합니다.",
    sampleData: [6, 2, 8, 1, 5],
    story: {
      problem: "단순히 인접한 두 원소만 비교해서 가장 큰 원소를 끝으로 밀어내는 방식으로 정렬할 수 있을까요?",
      definition: "버블 정렬(Bubble Sort)은 이웃한 두 원소의 대소 관계를 비교하여 조건에 맞지 않으면 교환하는 과정을 반복하는 알고리즘입니다.",
      analogy: "탄산음료에서 무거운 기포가 바닥에서부터 위로 보글보글(Bubble) 올라오는 모습을 상상해 보세요. 가장 큰 원소(무거운 기포)가 한 번의 루프마다 맨 뒤로 밀려납니다."
    },
    features: [
      { title: "인접 교환 전략", description: "오로지 이웃한 두 원소만을 지독하게 비교하여 자리를 바꿉니다.", SupplementaryVisualizer: BubbleSortSupplementaryOptions[0] },
      { title: "점진적 확정", description: "1회전(Pass)이 끝날 때마다 가장 큰 원소가 맨 뒤에 확정됩니다.", SupplementaryVisualizer: BubbleSortSupplementaryOptions[1] },
      { title: "조기 종료 (Early Exit)", description: "한 번의 Pass 동안 자리 교환이 전혀 없다면, 이미 정렬된 상태입니다!", SupplementaryVisualizer: BubbleSortSupplementaryOptions[2] },
      { title: "O(N²)의 굴레", description: "평균 시간복잡도 O(N²), 데이터가 무작위일수록 교환 횟수가 기하급수적으로 증가합니다.", SupplementaryVisualizer: BubbleSortSupplementaryOptions[3] },
    ],
    useSim: useBubbleSortSim,
    Visualizer: BubbleSortVisualizer,
  },
  {
    id: "selection-sort",
    title: "06-3 선택 정렬",
    description: "최솟값 선택 반복 패턴을 실습합니다.",
    sampleData: [7, 3, 9, 2, 4],
    story: {
      problem: "버블 정렬은 너무 잦은 교환(Swap)이 발생합니다. 교환 횟수를 획기적으로 줄일 방법은 없을까요?",
      definition: "선택 정렬(Selection Sort)은 정렬되지 않은 영역에서 '가장 작은 값'을 찾아, 그 값을 정렬되지 않은 부분의 '맨 앞'과 교환하는 알고리즘입니다.",
      analogy: "카드 게임에서 카드를 정리할 때, 카드를 쭉 훑어보고 가장 작은 카드를 뽑아 맨 앞으로 옮기는 것과 똑같습니다."
    },
    features: [
      { title: "최솟값 탐색", description: "미정렬 구역을 끝까지 스캔하여 가장 작은 값의 '위치'를 기억합니다.", SupplementaryVisualizer: SelectionSortSupplementaryOptions[0] },
      { title: "영역의 분리", description: "배열은 점점 커지는 정렬된 구역과 작아지는 미정렬 구역으로 나뉩니다.", SupplementaryVisualizer: SelectionSortSupplementaryOptions[1] },
      { title: "교환(Swap) 최소화", description: "아무리 데이터가 엉망이어도 1 Pass 당 Swap은 단 1번만 일어납니다.", SupplementaryVisualizer: SelectionSortSupplementaryOptions[2] },
      { title: "불안정 정렬 (Unstable)", description: "멀리 떨어진 원소와 자리를 바꾸기 때문에, 동일한 값의 순서가 뒤집힐 수 있습니다.", SupplementaryVisualizer: SelectionSortSupplementaryOptions[3] },
    ],
    useSim: useSelectionSortSim,
    Visualizer: SelectionSortVisualizer,
  },
  {
    id: "insertion-sort",
    title: "06-4 삽입 정렬",
    description: "정렬된 구간 삽입 패턴을 이해합니다.",
    sampleData: [5, 1, 4, 2, 8],
    story: {
      problem: "배열의 앞부분이 이미 어느 정도 정렬되어 있다면, 처음부터 다시 비교하는 것은 낭비 아닐까요?",
      definition: "삽입 정렬(Insertion Sort)은 아직 정렬되지 않은 임의의 데이터를 이미 정렬된 구역의 올바른 위치에 '삽입'해 나가는 알고리즘입니다.",
      analogy: "새로운 트럼프 카드를 한 장 받았을 때, 이미 손에 쥐고 있는 정렬된 카드들 사이에서 정확한 자기 자리를 찾아 쏙 밀어넣는 과정과 같습니다."
    },
    features: [
      { title: "적절한 위치 탐색", description: "정렬된 구역을 뒤에서부터 거꾸로 스캔하며 내 자리를 찾습니다.", SupplementaryVisualizer: InsertionSortSupplementaryOptions[0] },
      { title: "데이터 밀어내기", description: "자리를 만들기 위해 나보다 큰 원소들은 오른쪽으로 한 칸씩 이동(Shift)시킵니다.", SupplementaryVisualizer: InsertionSortSupplementaryOptions[1] },
      { title: "점진적 확장", description: "왼쪽부터 시작해 정렬된 구역의 너비가 1씩 늘어납니다.", SupplementaryVisualizer: InsertionSortSupplementaryOptions[2] },
      { title: "O(N) Best Case", description: "이미 정렬된 데이터의 경우 비교만 1번씩 수행하고 통과하여 로켓처럼 빠릅니다.", SupplementaryVisualizer: InsertionSortSupplementaryOptions[3] },
    ],
    useSim: useInsertionSortSim,
    Visualizer: InsertionSortVisualizer,
  },
  {
    id: "shell-sort",
    title: "06-5 셸 정렬",
    description: "간격(gap)을 두고 부분 정렬을 반복해 삽입 정렬의 O(N²) 한계를 O(N^1.5)까지 끌어내리는 알고리즘을 학습합니다.",
    sampleData: [10, 3, 7, 1, 9],
    story: {
      problem:
        "삽입 정렬은 거의 정렬된 데이터에서 빠르지만, 큰 값이 맨 앞에 있는 무작위 입력에서는 그 값을 끝까지 한 칸씩 밀어내야 합니다. 한 원소를 N번에 가깝게 이동시키는 비용이 누적되면 전체 시간복잡도가 `O(N²)`에 묶입니다. 한 번에 멀리 이동시키는 방법은 없을까요?",
      definition:
        "**셸 정렬(Shell Sort)** 은 삽입 정렬을 일반화한 알고리즘으로, 일정 간격(`gap`)으로 떨어진 원소끼리 부분 배열을 만들어 정렬한 뒤 `gap`을 점차 줄이는 방식입니다. 같은 `gap`에 속한 부분 배열에 대해 삽입 정렬을 수행하고, `gap` 수열은 시간이 지날수록 감소하다가 마지막에 1이 되어 일반 삽입 정렬로 마무리합니다. 멀리 떨어진 원소를 한 번에 자리 잡게 만들어 평균 시간복잡도를 `O(N^1.5)` 수준까지 끌어내립니다.",
      analogy:
        "엉킨 머리를 빗을 때의 순서와 비슷합니다. 처음부터 촘촘한 빗을 대면 엉킨 부분이 안 풀리고 머리카락만 뜯깁니다. 굵은 빗으로 큰 덩어리를 먼저 풀어내고, 점차 가는 빗으로 바꾸며 마지막에 참빗으로 마무리하면 훨씬 적은 힘으로 매끈하게 빗을 수 있습니다.",
    },
    features: [
      {
        title: "gap 간격 부분 정렬",
        description:
          "전체 배열을 `gap`만큼 떨어진 원소끼리 묶은 부분 배열로 보고 각 부분 배열에 삽입 정렬을 적용합니다. 첫 회차에서 큰 값이 멀리 점프해 자리에 가까워집니다.",
        SupplementaryVisualizer: ShellSortSupplementaryOptions[0],
      },
      {
        title: "장거리 원소 교환",
        description:
          "단순 삽입 정렬에서는 큰 값이 맨 앞에 있으면 끝까지 옮기는 데 N번의 이동이 필요합니다. 셸 정렬은 멀리 떨어진 원소를 한 번에 교환해 이동 거리를 합산해서 줄입니다.",
        SupplementaryVisualizer: ShellSortSupplementaryOptions[1],
      },
      {
        title: "gap 점진 축소",
        description:
          "`gap`을 점차 줄여 마지막에는 `gap=1`인 일반 삽입 정렬로 마무리합니다. 마지막 단계에서는 배열이 이미 거의 정렬된 상태이므로 추가 이동이 매우 적습니다.",
        SupplementaryVisualizer: ShellSortSupplementaryOptions[2],
      },
      {
        title: "gap 수열의 영향",
        description:
          "어떤 `gap` 수열을 선택하느냐에 따라 성능이 크게 달라집니다. Shell의 원래 수열(N/2씩 감소)부터 Hibbard, Sedgewick 같은 잘 알려진 수열을 쓰면 평균 `O(N^4/3)` 수준까지 끌어올 수 있다는 점이 셸 정렬의 흥미로운 특징입니다.",
        SupplementaryVisualizer: ShellSortSupplementaryOptions[3],
      },
    ],
    useSim: useShellSortSim,
    Visualizer: ShellSortVisualizer,
  },
  {
    id: "quick-sort",
    title: "06-6 퀵 정렬",
    description: "분할 정복 정렬의 핵심 패턴을 익힙니다.",
    sampleData: [15, 8, 20, 2, 11],
    story: {
      problem: "정렬 속도를 극대화하려면 어떻게 해야 할까요? 전체를 한 번에 정렬하는 대신 기준을 세워 반으로 뚝 자르면 빠르지 않을까요?",
      definition: "퀵 정렬(Quick Sort)은 기준점(Pivot)을 정해 이보다 작은 값은 왼쪽, 큰 값은 오른쪽으로 모으는 과정을 재귀적으로 반복하는 알고리즘입니다.",
      analogy: "체육시간에 키 순서대로 줄을 설 때, '170cm인 사람 나와!' 라고 한 뒤 170보다 작은 사람은 왼쪽, 큰 사람은 오른쪽으로 모이게 하고, 나뉘어진 무리 안에서 다시 중간 키를 뽑아 똑같이 반복하는 것입니다."
    },
    features: [
      { title: "피벗(Pivot)의 선택", description: "배열의 기준점이 되는 하나의 원소를 잡습니다. 이 피벗이 운명을 결정합니다.", SupplementaryVisualizer: QuickSortSupplementaryOptions[0] },
      { title: "분할 (Partitioning)", description: "피벗을 기준으로 작은 값은 왼쪽, 큰 값은 오른쪽으로 모읍니다.", SupplementaryVisualizer: QuickSortSupplementaryOptions[1] },
      { title: "분할 정복 (Divide & Conquer)", description: "나뉘어진 파티션에 대해 동일한 작업을 쪼갤 수 없을 때까지 재귀적으로 반복합니다.", SupplementaryVisualizer: QuickSortSupplementaryOptions[2] },
      { title: "치명적인 약점 O(N²)", description: "이미 정렬된 상태에서 최솟값/최댓값을 피벗으로 잡으면 트리가 한쪽으로 쏠립니다.", SupplementaryVisualizer: QuickSortSupplementaryOptions[3] },
    ],
    useSim: useQuickSortSim,
    Visualizer: QuickSortVisualizer,
  },
  {
    id: "merge-sort",
    title: "06-7 병합 정렬",
    description: "병합 단계 중심의 안정 정렬을 실습합니다.",
    sampleData: [6, 2, 9, 3, 5],
    story: {
      problem: "퀵 정렬은 최악의 경우 O(N²)로 느려집니다. 어떤 데이터가 들어와도 무조건 빠르고(O(N log N)), 1등과 2등의 순서(안정성)도 유지할 수 없을까요?",
      definition: "병합 정렬(Merge Sort)은 배열을 반으로 계속 쪼개어 원소가 하나가 될 때까지 분할한 뒤, 정렬하면서 하나로 합쳐 나가는(Merge) 알고리즘입니다.",
      analogy: "2권짜리 작은 사전 2개를 하나의 큰 사전으로 합칠 때, 양쪽 사전의 첫 페이지만 비교하면서 더 앞선 알파벳을 새 사전에 넘기는 과정을 반복하는 것과 같습니다."
    },
    features: [
      { title: "무자비한 분할 (Divide)", description: "배열의 크기가 1이 될 때까지 무조건 정확히 반으로 쪼갭니다.", SupplementaryVisualizer: MergeSortSupplementaryOptions[0] },
      { title: "체계적인 병합 (Merge)", description: "정렬된 두 부분 배열의 맨 앞만 비교하며 하나로 합칩니다.", SupplementaryVisualizer: MergeSortSupplementaryOptions[1] },
      { title: "흔들리지 않는 편안함 O(N log N)", description: "초기 상태가 극악이라도 트리의 깊이는 항상 일정합니다.", SupplementaryVisualizer: MergeSortSupplementaryOptions[2] },
      { title: "메모리의 대가 O(N)", description: "데이터를 합칠 때 원래 배열 크기만큼의 추가 도화지(배열)가 반드시 필요합니다.", SupplementaryVisualizer: MergeSortSupplementaryOptions[3] },
    ],
    useSim: useMergeSortSim,
    Visualizer: MergeSortVisualizer,
  },
  {
    id: "heap-sort",
    title: "06-8 힙 정렬",
    description: "우선순위 큐(Max Heap)를 기반으로 하여 항상 O(N log N)의 일정한 성능을 내는 정렬 알고리즘입니다.",
    sampleData: [12, 6, 4, 10, 2],
    story: {
      problem: "가장 큰 값만 지속적으로 빠르게 뽑아내고 싶을 때 매번 O(N)으로 전체를 검색하면 너무 느립니다. 어떻게 해야 O(log N)만에 큰 값을 찾고 유지할 수 있을까요?",
      definition: "힙 정렬(Heap Sort)은 배열을 최대 힙(Max Heap)이라는 완전 이진 트리 형태로 구성한 다음, 가장 큰 값인 루트 노드를 뒤로 빼면서 정렬하는 제자리 정렬(In-place Sort) 기법입니다.",
      analogy: "회사 조직도에서 본부장(루트)이 퇴사(정렬 완료)하면, 말단 직원(배열 끝)이 본부장 자리로 올라간 뒤 자신의 역량에 맞는 계급까지 강등(Heapify)되는 과정과 똑같습니다."
    },
    features: [
      { title: "완전 이진 트리와 배열", description: "부모는 (i-1)/2, 왼쪽 자식은 2i+1, 오른쪽은 2i+2번 인덱스를 갖습니다.", SupplementaryVisualizer: CompleteBinaryTreeSVG },
      { title: "최대 힙 (Max Heap)", description: "부모 노드가 자식 노드보다 항상 커야 한다는 힙의 규칙을 위에서부터 지킵니다.", SupplementaryVisualizer: MaxHeapPropertySVG },
      { title: "Heapify (강등 과정)", description: "위로 올라간 작은 값이 제자리를 찾기 위해 큰 자식과 계속 자리를 바꿉니다.", SupplementaryVisualizer: HeapifySVG },
      { title: "추출과 힙 사이즈 축소", description: "최댓값(루트)을 배열 맨 뒤로 보낸 후, 힙의 논리적 크기를 1 줄입니다.", SupplementaryVisualizer: HeapSortProcessSVG },
    ],
    useSim: useHeapSortSim,
    Visualizer: HeapSortVisualizer,
  },
  {
    id: "counting-sort",
    title: "06-9 도수 정렬",
    description: "비교 없이 도수 분포표와 누적 도수로 위치를 결정해 O(N+K)에 정렬하는 비비교 기반 알고리즘을 학습합니다.",
    sampleData: [3, 1, 4, 1, 5, 9, 2, 6, 5],
    story: {
      problem:
        "비교 기반 정렬은 정보 이론적으로 `O(N log N)`보다 빨라질 수 없다는 한계가 있습니다. 그러나 \"학생 시험 점수(0~100)\", \"투표 결과(후보 ID 10명)\"처럼 값의 범위가 좁고 미리 알려진 데이터를 정렬할 때 매번 비교를 반복하는 것은 비효율로 느껴집니다. 비교를 거치지 않고 곧장 자리를 정할 수는 없을까요?",
      definition:
        "**도수 정렬(Counting Sort)** 은 데이터를 직접 비교하지 않고, 각 값이 몇 번 등장했는지 세어 위치를 결정하는 선형 시간 정렬 알고리즘입니다. 사전 조건은 정수형이고 값의 범위 `[0, K]`를 알고 있어야 한다는 점입니다. 도수 배열 → 누적 도수 → 안정적 배치의 3단계로 구성되고, 시간복잡도 `O(N + K)`, 공간복잡도 `O(N + K)`로 K가 작을 때만 효율적입니다.",
      analogy:
        "시험 점수표나 도수 분포표를 만드는 과정과 같습니다. 90점이 3명, 95점이 5명이라는 빈도표를 먼저 만든 뒤, 점수가 높은 순으로 좌석을 미리 배정해 두면 사람을 일일이 비교하지 않고도 자리 배치를 끝낼 수 있습니다. 핵심은 \"누가 누구보다 큰가\"가 아니라 \"같은 점수가 몇 명인가\"입니다.",
    },
    features: [
      {
        title: "도수 분포표 작성",
        description:
          "입력 배열을 한 번 훑으며 각 값의 등장 횟수를 `count[v]`에 기록합니다. 이 한 번의 패스로 모든 빈도 정보를 손에 넣고, 별도 비교 없이 빈도 분포를 즉시 얻습니다.",
        SupplementaryVisualizer: FrequencyArraySVG,
      },
      {
        title: "누적 도수로 위치 계산",
        description:
          "도수 배열을 누적합으로 변환하면 \"값 v 이하인 원소의 개수\"가 곧 v의 출력 위치가 됩니다. 별도 비교 없이 정확한 자리를 알아낼 수 있습니다.",
        SupplementaryVisualizer: CumulativeSumSVG,
      },
      {
        title: "안정 정렬 보장",
        description:
          "입력을 뒤에서부터 훑으며 `count[v]`를 감소시키는 방식으로 같은 값의 원래 순서를 보존합니다. 보조 키가 있는 데이터에서도 안전하게 사용할 수 있습니다.",
        SupplementaryVisualizer: StableSortingSVG,
      },
      {
        title: "메모리 제약",
        description:
          "값 범위 K가 N에 비해 지나치게 크면 도수 배열이 메모리를 많이 차지하고 대부분이 비어 있게 됩니다. K가 작거나 값이 정수인 경우에 한해 효율적인 선택지가 됩니다.",
        SupplementaryVisualizer: RangeRestrictionSVG,
      },
    ],
    useSim: useCountingSortSim,
    Visualizer: CountingSortVisualizer,
  },
]);

const STRING_SEARCH_MODULES = createInteractiveTemplateModules([
  {
    id: "brute-force-search",
    title: "07-1 브루트 포스",
    description: "텍스트의 모든 시작 위치에서 패턴을 한 글자씩 대조하는 전수 탐색의 흐름과 O(NM) 한계를 학습합니다.",
    sampleData: [2, 5, 2, 5, 2],
    story: {
      problem:
        "긴 글에서 특정 단어를 찾거나, 로그 파일에서 에러 키워드를 추출하는 작업처럼 문자열 안에서 패턴을 찾는 일은 매일 마주치는 기본 과제입니다. 가장 단순하게 떠올릴 수 있는 방법은 \"텍스트의 모든 위치에서 한 글자씩 패턴과 비교한다\"입니다. 이 직관적인 풀이가 어디까지 통하고 어디서 한계를 만나는지 정리할 필요가 있습니다.",
      definition:
        "**브루트 포스(Brute Force)** 문자열 검색은 텍스트의 모든 시작 위치에서 패턴을 한 글자씩 비교하는 전수 탐색 알고리즘입니다. 텍스트 T(길이 N), 패턴 P(길이 M)에 대해 `i=0..N-M` 전 구간을 검사하고, 각 위치마다 `j=0..M-1`로 P를 대조하다가 불일치가 발생하면 `i+1`로 이동해 `j=0`부터 다시 시작합니다. 최선 `O(N)`, 평균과 최악 `O(NM)`의 시간복잡도를 가집니다.",
      analogy:
        "두꺼운 책에서 특정 문장을 찾을 때 첫 글자부터 끝 글자까지 한 글자도 빠뜨리지 않고 모든 시작 위치에서 비교하는 방식과 같습니다. 누구나 이해할 수 있는 방법이지만, 책이 길고 문장이 자주 비슷하게 시작하면 같은 자리를 여러 번 다시 보게 됩니다.",
    },
    features: [
      {
        title: "두 포인터 비교",
        description:
          "텍스트 포인터 `i`와 패턴 포인터 `j`가 함께 전진하며 한 글자씩 대조합니다. 불일치가 발생하면 `i`를 한 칸 뒤로 돌리고 `j`는 0으로 초기화하는 단순한 규칙으로 동작합니다.",
        SupplementaryVisualizer: TwoPointerMatchingSVG,
      },
      {
        title: "모든 시작 위치 검사",
        description:
          "텍스트의 0부터 `N-M`까지 모든 위치를 빠짐없이 검사합니다. 누락이 없다는 보장이 있는 대신 비교 횟수가 입력 크기에 비례해 누적됩니다.",
        SupplementaryVisualizer: BruteForceScanSVG,
      },
      {
        title: "최악 O(NM)의 함정",
        description:
          "거의 일치하다가 마지막 글자에서 실패하는 패턴(`AAAA...B` 형태)이 반복되면 비교 횟수가 NM에 가깝게 늘어납니다. 텍스트와 패턴이 길고 반복 구조가 많을수록 성능 저하가 커집니다.",
        SupplementaryVisualizer: WorstCaseMatchSVG,
      },
      {
        title: "후속 알고리즘의 출발점",
        description:
          "이 단순한 풀이의 비효율 지점을 분석하는 데서 KMP의 LPS 테이블, 보이어-무어의 점프 규칙 같은 고급 아이디어가 출발합니다. 브루트 포스를 정확히 이해하는 것이 다음 단계 학습의 토대입니다.",
        SupplementaryVisualizer: PatternBacktrackSVG,
      },
    ],
    useSim: useBruteForceSearchSim,
    Visualizer: BruteForceSearchVisualizer,
  },
  {
    id: "kmp-search",
    title: "07-2 KMP (Knuth-Morris-Pratt)",
    description: "LPS 테이블로 패턴 내부 접두사·접미사 정보를 활용해 텍스트 포인터를 되돌리지 않고 O(N+M)에 검색합니다.",
    sampleData: [1, 2, 1, 2, 1, 2],
    story: {
      problem:
        "브루트 포스 검색은 불일치가 발생할 때마다 텍스트 포인터 `i`를 다음 칸으로 되돌리고 패턴을 처음부터 다시 비교합니다. 그런데 텍스트와 패턴이 일정 부분 일치한 뒤에 실패한 경우, 그 일치한 부분은 이미 우리가 알고 있는 정보입니다. 이미 비교한 결과를 다음 검사에 활용하지 않으면 같은 위치를 여러 번 비교하는 낭비가 생깁니다.",
      definition:
        "**KMP(Knuth-Morris-Pratt)** 알고리즘은 패턴 내부의 접두사·접미사 일치 정보를 미리 계산한 뒤, 불일치 발생 시 텍스트 포인터를 되돌리지 않고 패턴만 적절히 밀어 검색을 진행하는 알고리즘입니다. **LPS(Longest Prefix Suffix)** 배열은 패턴의 각 위치까지 동일한 접두사와 접미사의 최대 길이를 저장합니다. 불일치 시 `j`는 `LPS[j-1]`로 점프하고 텍스트 포인터 `i`는 그대로 유지되며, 전체 시간복잡도는 `O(N+M)`, 공간복잡도는 `O(M)`입니다.",
      analogy:
        "오답 노트에 비유할 수 있습니다. 같은 유형의 문제를 풀다가 또 틀렸을 때 처음부터 다시 푸는 것이 아니라, 오답 노트(LPS)를 꺼내 \"여기까지는 맞았다\"는 정보를 활용해 다음 풀이를 더 똑똑하게 진행합니다. 일치 구간을 기억해 두는 비용보다 그 정보를 활용해 절약되는 시간이 훨씬 큽니다.",
    },
    features: [
      {
        title: "패턴 자체의 대칭 활용",
        description:
          "패턴 안에서 앞쪽과 뒤쪽이 일치하는 구조를 찾아내는 것이 핵심입니다. 외부 텍스트가 아니라 패턴 자체에서 정보를 끌어내 미리 준비해 둡니다.",
        SupplementaryVisualizer: PrefixSuffixSVG,
      },
      {
        title: "LPS 테이블 구축",
        description:
          "패턴 길이 M에 대해 `O(M)` 시간으로 LPS 테이블을 만들어 둡니다. 한 번 구축한 테이블은 동일 패턴이 등장하는 모든 텍스트에 재사용할 수 있습니다.",
        SupplementaryVisualizer: LPSTableSVG,
      },
      {
        title: "텍스트 포인터 단조 진행",
        description:
          "불일치가 발생해도 텍스트 포인터 `i`는 절대 뒤로 돌아가지 않습니다. 이미 검사한 위치를 다시 비교하지 않으므로 누적 비교 횟수가 텍스트 길이에 비례해 묶입니다.",
        SupplementaryVisualizer: KMPSkipSVG,
      },
      {
        title: "선형 시간 보장",
        description:
          "전체 시간복잡도가 `O(N+M)`으로 묶여 입력 크기가 커도 안정적입니다. 같은 패턴으로 매우 긴 텍스트를 반복 검사하는 응용에서 특히 강점이 큽니다.",
        SupplementaryVisualizer: LinearTimeEfficiencySVG,
      },
    ],
    useSim: useKmpSearchSim,
    Visualizer: KmpSearchVisualizer,
  },
  {
    id: "boyer-moore-search",
    title: "07-3 보이어-무어 (Boyer-Moore)",
    description: "패턴을 뒤에서 앞으로 비교하면서 Bad Character·Good Suffix 규칙으로 큰 보폭의 점프를 수행합니다.",
    sampleData: [9, 7, 5, 7, 9],
    story: {
      problem:
        "KMP는 텍스트를 한 글자도 건너뛰지 않고 모두 읽으면서 선형 시간을 보장합니다. 그러나 실전 환경에서는 \"읽지 않아도 되는 글자는 아예 건너뛰자\"는 더 과감한 발상이 가능합니다. 패턴과 닮지 않은 텍스트 영역을 통째로 건너뛸 수 있다면, 실제 비교 횟수를 더 줄일 여지가 있습니다.",
      definition:
        "**보이어-무어(Boyer-Moore)** 알고리즘은 패턴을 뒤에서 앞으로 비교하면서 불일치 발생 시 큰 보폭으로 점프하는 문자열 검색 알고리즘입니다. **Bad Character 규칙** 은 불일치한 텍스트 문자가 패턴에 없으면 패턴 길이만큼 점프하고, 있으면 두 글자를 맞추도록 끌어당깁니다. **Good Suffix 규칙** 은 이미 일치한 접미사 정보를 활용해 더 큰 점프를 선택합니다. 평균 시간복잡도는 매우 빠르고, 최악은 `O(NM)`이지만 실전 텍스트에서는 거의 발생하지 않습니다.",
      analogy:
        "긴 터널을 지나가는 차량을 검문하는 상황과 비슷합니다. 모든 차량을 처음부터 살피는 대신 차량 뒤쪽 번호판(패턴 끝)만 먼저 확인합니다. 찾는 번호와 전혀 다르면 그 차량을 통째로 통과시키고 다음 차량으로 한 번에 넘어갈 수 있습니다. 자주 일어나는 경우에는 한 번에 여러 차량을 건너뛰는 덕에 전체 검사 시간이 크게 줄어듭니다.",
    },
    features: [
      {
        title: "역방향 비교 시작점",
        description:
          "패턴의 마지막 글자부터 비교하기 때문에 패턴과 매우 다른 텍스트 영역을 첫 비교만으로 판단할 수 있습니다. 한 번 확인으로 큰 영역을 배제하는 구조가 핵심입니다.",
        SupplementaryVisualizer: RightToLeftCompareSVG,
      },
      {
        title: "Bad Character 점프",
        description:
          "불일치한 텍스트 문자가 패턴에 없다면 패턴 길이만큼 즉시 건너뜁니다. 패턴 안에 있다면 두 글자가 정렬되도록 패턴을 적절히 당겨 옵니다.",
        SupplementaryVisualizer: BadCharacterRuleSVG,
      },
      {
        title: "패턴 정렬 점프",
        description:
          "Bad Character가 패턴 어딘가에 있다면, 그 문자가 서로 일치하도록 패턴을 당겨 다음 비교 시작점을 정합니다. 패턴 위치를 정밀하게 끌어와 비교 효율을 높입니다.",
        SupplementaryVisualizer: AlignBadCharacterSVG,
      },
      {
        title: "Good Suffix 점프",
        description:
          "이미 끝에서부터 일치한 접미사가 있다면 그 정보를 활용해 더 멀리 점프할 수 있습니다. Bad Character와 Good Suffix 중 더 큰 점프 거리를 선택해 평균 성능을 끌어올립니다.",
        SupplementaryVisualizer: GoodSuffixRuleSVG,
      },
    ],
    useSim: useBoyerMooreSearchSim,
    Visualizer: BoyerMooreSearchVisualizer,
  },
]);

export function SortingContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 03. Sorting & String"
        modules={SORTING_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 03. Sorting & String"
            chapterTitle="06 정렬 알고리즘"
            chapterDescription="정렬 챕터 전 레슨을 참여형 인터랙티브로 구성했습니다."
            guideItems={[
              "버튼 조작으로 정렬 전/후 상태를 관찰하세요.",
              "입력 데이터가 달라질 때 결과 패턴을 비교하세요.",
              "로그를 통해 어떤 연산이 핵심인지 정리하세요.",
            ]}
            items={[
              { id: "sorting-overview", title: "06-1 정렬 알고리즘 개요", description: "정렬 알고리즘 분류와 선택 기준을 정리합니다." },
              { id: "bubble-sort", title: "06-2 버블 정렬", description: "인접 교환 기반 정렬을 시각화로 학습합니다." },
              { id: "selection-sort", title: "06-3 선택 정렬", description: "최솟값 선택 반복 패턴을 실습합니다." },
              { id: "insertion-sort", title: "06-4 삽입 정렬", description: "정렬된 구간 삽입 패턴을 이해합니다." },
              { id: "shell-sort", title: "06-5 셸 정렬", description: "gap 축소 기반 고속화 전략을 학습합니다." },
              { id: "quick-sort", title: "06-6 퀵 정렬", description: "분할 정복 정렬의 핵심 패턴을 익힙니다." },
              { id: "merge-sort", title: "06-7 병합 정렬", description: "병합 단계 중심의 안정 정렬을 실습합니다." },
              { id: "heap-sort", title: "06-8 힙 정렬", description: "우선순위 큐 기반 정렬을 학습합니다." },
              { id: "counting-sort", title: "06-9 도수 정렬", description: "빈도 배열 기반 선형 정렬을 다룹니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function StringSearchContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 03. Sorting & String"
        modules={STRING_SEARCH_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 03. Sorting & String"
            chapterTitle="07 문자열 검색"
            chapterDescription="문자열 검색 챕터도 참여형 인터랙티브로 전환했습니다."
            guideItems={[
              "동작 버튼으로 탐색 흐름을 반복 체험하세요.",
              "동일 입력에서 전략별 반응을 비교하세요.",
              "각 단계 로그를 근거로 알고리즘 차이를 정리하세요.",
            ]}
            items={[
              { id: "brute-force-search", title: "07-1 브루트 포스", description: "기본 문자열 패턴 매칭을 학습합니다." },
              { id: "kmp-search", title: "07-2 KMP", description: "실패함수 기반 선형 탐색을 익힙니다." },
              { id: "boyer-moore-search", title: "07-3 보이어-무어", description: "점프 전략 기반 고속 탐색을 다룹니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function SortingStringIntegrationContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <ProblemBankController
        moduleLabel="Module 03. Sorting & String"
        chapterTitle="정렬/문자열 검색 알고리즘 개념 심화 및 적용"
        chapterDescription="Problem Bank에서 Sorting/String 통합 문제를 풀이하고 자동 채점을 확인하세요."
        problems={module03Problems}
      />
    </Suspense>
  );
}
