"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { ProblemBankController } from "@/components/features/ctp/problem-bank";
import { module03Problems } from "@/data/ctp/problems";
import { ChapterOverview } from "./shared/chapter-overview";
import { createCodeTemplateModules, createInteractiveTemplateModules } from "./shared/module-utils";

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

import { BruteForceVisualizer, useBruteForceSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/brute-force-search";
import { KMPSearchVisualizer, useKMPSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/kmp-search";
import { BoyerMooreSearchVisualizer, useBoyerMooreSim } from "@/components/features/ctp/playground/visualizers/svg-animations/module-03/boyer-moore-search";

const SORTING_MODULES_REFACTORED = createInteractiveTemplateModules([
  {
    id: "sorting-overview",
    title: "06-1 정렬 알고리즘 개요",
    description: "정렬 알고리즘의 안정성/복잡도/메모리 사용 기준을 비교합니다.",
    sampleData: [9, 4, 1, 7, 3],
    story: {
      problem: "수많은 데이터가 뒤죽박죽 섞여 있다면, 그 안에서 원하는 값을 어떻게 빠르게 찾고 최댓값이나 최솟값을 효율적으로 알아낼 수 있을까요?",
      definition: "정렬(Sorting)이란 데이터를 특정한 기준(오름차순 또는 내림차순)에 따라 순서대로 재배열하는 과정입니다.",
      analogy: "도서관에 수만 권의 책이 무작위로 꽂혀있다고 상상해 보세요. 책을 제목이나 작가 순으로 '정렬'해두지 않으면 책을 찾는 것은 불가능에 가깝습니다. 정렬은 데이터를 검색하기 위한 필수적인 '사전 작업'입니다."
    },
    features: [
      { title: "안정 정렬 vs 불안정 정렬", description: "값이 같은 원소들의 원래 순서가 정렬 후에도 유지되는지 여부", SupplementaryVisualizer: SortingOverviewSupplementaryOptions[0] },
      { title: "내부 정렬 vs 외부 정렬", description: "메모리 공간 안에서 해결 가능한지, 추가 메모리가 필요한지 여부", SupplementaryVisualizer: SortingOverviewSupplementaryOptions[1] },
      { title: "시간 복잡도 O(N²)", description: "데이터가 늘어날수록 극적으로 느려지는 기본 정렬 알고리즘", SupplementaryVisualizer: SortingOverviewSupplementaryOptions[2] },
      { title: "O(N log N)과 핵심 연산", description: "효율적인 정렬 알고리즘의 한계와 Compare & Swap 연산 모델", SupplementaryVisualizer: SortingOverviewSupplementaryOptions[3] },
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
    description: "gap 축소 기반 고속화 전략을 학습합니다.",
    sampleData: [10, 3, 7, 1, 9],
    story: {
      problem: "단순한 삽입 정렬은 이미 큰 값이 맨 앞에 있을 때, 맨 뒤로 옮기기 위해 너무 많은 이동이 필요합니다. 한 번에 멀리 이동시킬 순 없을까요?",
      definition: "셸 정렬(Shell Sort)은 삽입 정렬을 보완한 알고리즘으로, 전체 배열을 일정 간격(Gap)의 부분 배열로 나누어 먼저 거칠게 정렬한 후 점차 간격을 줄이는 방식입니다.",
      analogy: "머리를 빗을 때 처음에는 굵은 빗으로 크게 엉킨 곳을 풀고(Gap=4), 다음엔 중간 빗(Gap=2), 마지막엔 촘촘한 참빗(Gap=1)으로 섬세하게 빗어내는 것과 같습니다."
    },
    features: [
      { title: "간격(Gap) 시퀀스의 마법", description: "배열을 N/2, N/4 간격의 여러 그룹으로 논리적으로 나눕니다.", SupplementaryVisualizer: ShellSortSupplementaryOptions[0] },
      { title: "장거리 원소 교환", description: "멀리 떨어진 원소를 단번에 교환하여 데이터 이동 거리를 획기적으로 줄입니다.", SupplementaryVisualizer: ShellSortSupplementaryOptions[1] },
      { title: "간격 축소 (Diminishing Increment)", description: "Gap을 점차 줄여가며, 마지막에는 Gap=1인 삽입 정렬을 수행합니다.", SupplementaryVisualizer: ShellSortSupplementaryOptions[2] },
      { title: "한계를 넘는 최적화", description: "단순 O(N²) 삽입 정렬을 Gap 수열에 따라 O(N^1.5) 등 비약적으로 개선합니다.", SupplementaryVisualizer: ShellSortSupplementaryOptions[3] },
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
    description: "데이터를 직접 비교하지 않고, 각 항목이 몇 번 등장했는지 세어서 정렬하는 선형 시간 O(N+K) 정렬 알고리즘입니다.",
    sampleData: [3, 1, 4, 1, 5, 9, 2, 6, 5],
    story: {
      problem: "O(N log N)의 한계마저 돌파하고 싶습니다. O(N)만에 정렬할 수는 없을까요? 만약 숫자들의 최댓값이 아주 작다는 사실이 보장된다면 무언가 다른 방법이 있지 않을까요?",
      definition: "도수 정렬(Counting Sort)은 수의 범위가 제한적일 때, 데이터가 '몇 번 등장했는지' 도수 표에 기록하고 누적 도수로 변환하여 위치를 찾아주는 비비교 기반 알고리즘입니다.",
      analogy: "100점 만점짜리 시험에서 '90점이 3명, 95점이 5명'이라는 표를 만든 뒤, 점수가 높은 순으로 정수로 좌석을 바로 배치하는 것과 완전히 동일한 원리입니다."
    },
    features: [
      { title: "도수 분포표 생성", description: "입력 데이터의 값을 인덱스로 삼아 출현 빈도를 카운트합니다.", SupplementaryVisualizer: FrequencyArraySVG },
      { title: "누적 도수 분포 계산", description: "이전 값의 빈도를 더해나가 해당 데이터가 자리잡을 '마지막 위치'를 찾습니다.", SupplementaryVisualizer: CumulativeSumSVG },
      { title: "안정적 정렬의 비밀", description: "원본 배열의 뒤에서부터 읽으면서 배치해야 (Stable) 성질이 유지됩니다.", SupplementaryVisualizer: StableSortingSVG },
      { title: "메모리 폭증의 흑역사", description: "[5, 99999] 두 개만 정렬하려 해도 길이 10만짜리 배열이 필요해집니다.", SupplementaryVisualizer: RangeRestrictionSVG },
    ],
    useSim: useCountingSortSim,
    Visualizer: CountingSortVisualizer,
  },
]);

const STRING_SEARCH_MODULES = createInteractiveTemplateModules([
  {
    id: "brute-force-search",
    title: "07-1 브루트 포스",
    description: "모든 시작 위치를 검사하는 기본 문자열 탐색을 실습합니다.",
    sampleData: [2, 5, 2, 5, 2],
    story: {
      problem: "가정 긴 텍스트에서 특정 단어를 찾고 싶습니다. 문자열 검사의 가장 직관적이고 기본적인 방법은 무엇일까요?",
      definition: "브루트 포스(Brute Force) 탐색은 텍스트의 모든 가능한 시작 위치에서 패턴을 하나씩 처음부터 대조해 보는 전체 탐색 방법입니다.",
      analogy: "책에서 특정 문장을 찾을 때, 첫 글자부터 끝까지 한 번도 빠짐없이 모든 글자를 비교해가며 찾는 과정과 같습니다."
    },
    features: [
      { title: "단순 스캔", description: "모든 텍스트 위치에서 패턴을 겹쳐놓고 검사를 시도합니다.", SupplementaryVisualizer: BruteForceScanSVG },
      { title: "두 개의 포인터 (i, j)", description: "텍스트 포인터 i와 패턴 포인터 j가 동시에 전진하며 대조합니다.", SupplementaryVisualizer: TwoPointerMatchingSVG },
      { title: "최악의 시나리오 O(NM)", description: "계속해서 일치하다가 마지막 글자에서 실패하는 경우가 잦으면 매우 느려집니다.", SupplementaryVisualizer: WorstCaseMatchSVG },
      { title: "무자비한 회귀(백트래킹)", description: "실패 시 텍스트 포인터 i가 처음 검사했던 곳의 바로 다음 칸으로 되돌아옵니다.", SupplementaryVisualizer: PatternBacktrackSVG },
    ],
    useSim: useBruteForceSim,
    Visualizer: BruteForceVisualizer,
  },
  {
    id: "kmp-search",
    title: "07-2 KMP (Knuth-Morris-Pratt)",
    description: "LPS 테이블을 활용한 선형 시간 패턴 매칭을 학습합니다.",
    sampleData: [1, 2, 1, 2, 1, 2],
    story: {
      problem: "불일치가 발생할 때마다 텍스트 포인터가 처음으로 되돌아가는 것은 너무 비효율적입니다. 백트래킹 없이 앞으로만 전진하며 답을 찾을 수는 없을까요?",
      definition: "KMP 알고리즘은 패턴의 접두사와 접미사가 일치하는 길이를 미리 계산해 둔 LPS 배열을 바탕으로, 불일치 발생 시 불필요한 비교를 대폭 건너뛰는(Skip) 알고리즘입니다.",
      analogy: "오답 노트(LPS)를 미리 만들어 두고, 다시 틀린(불일치) 문제가 나왔을 때 처음부터 다시 푸는 게 아니라 오답 노트의 핵심 부분부터 이어서 푸는 것과 같습니다."
    },
    features: [
      { title: "접두사와 접미사", description: "패턴 자체가 지닌 반복되는 대칭 구조를 미리 파악하는 것이 핵심입니다.", SupplementaryVisualizer: PrefixSuffixSVG },
      { title: "LPS 테이블 구축", description: "각 길이별 가장 긴 진부분 접미사와 접두사의 일치 길이를 캐싱합니다.", SupplementaryVisualizer: LPSTableSVG },
      { title: "마법 같은 건너뛰기", description: "일치했던 부분만큼 LPS를 참조하여, 패턴을 안전한 위치까지 한 번에 밉니다.", SupplementaryVisualizer: KMPSkipSVG },
      { title: "선형 시간 O(N+M)", description: "텍스트 포인터가 절대 뒤로 돌아가지 않기 때문에 매우 빠른 성능을 보장합니다.", SupplementaryVisualizer: LinearTimeEfficiencySVG },
    ],
    useSim: useKMPSim,
    Visualizer: KMPSearchVisualizer,
  },
  {
    id: "boyer-moore-search",
    title: "07-3 보이어-무어 (Boyer-Moore)",
    description: "bad character / good suffix 규칙으로 점프 탐색을 수행합니다.",
    sampleData: [9, 7, 5, 7, 9],
    story: {
      problem: "텍스트마저 전부 다 읽어야 할까요? 문자열을 한 칸씩이 아니라 여러 칸씩 훌쩍훌쩍 뛰어넘으며 더 빠르게 탐색할 수는 없을까요?",
      definition: "보이어-무어 알고리즘은 텍스트의 앞부분이 아니라 뒷부분부터 비교를 시작하여, 일치하지 않는 나쁜 문자가 나오면 패턴을 과감하게 크게 건너뛰는 최고 성능의 문자열 알고리즘 중 하나입니다.",
      analogy: "긴 터널을 지날 때, 끝부분(뒷문자)만 살짝 보고 전혀 모르는 터널이면 중간을 볼 필요 없이 터널 길이만큼 통째로 점프해 버리는 것과 같습니다."
    },
    features: [
      { title: "뒤에서부터 비교", description: "패턴 자체는 앞에서 뒤로 이동하지만, 개별 비교는 뒤에서 앞 방향으로 수행합니다.", SupplementaryVisualizer: RightToLeftCompareSVG },
      { title: "나쁜 문자(Bad Character) 규칙", description: "불일치한 텍스트 문자가 패턴에 없다면, 패턴 길이만큼 즉시 건너뜁니다.", SupplementaryVisualizer: BadCharacterRuleSVG },
      { title: "패턴과 줄 맞추기", description: "나쁜 문자가 패턴 어딘가에 있다면, 그 문자가 서로 일치하도록 패턴을 당겨줍니다.", SupplementaryVisualizer: AlignBadCharacterSVG },
      { title: "착한 접미사 규칙", description: "이미 끝에서부터 일치했던(Good) 부분을 보존하면서 안전하게 큰 보폭으로 점프합니다.", SupplementaryVisualizer: GoodSuffixRuleSVG },
    ],
    useSim: useBoyerMooreSim,
    Visualizer: BoyerMooreSearchVisualizer,
  },
]);

const SORTING_STRING_INTEGRATION_MODULES = createCodeTemplateModules([
  {
    id: "sorting-string-integrated-1",
    title: "통합 문제 1: 정렬 후 문자열 처리",
    description: "전처리 정렬 + 매칭 조합 문제를 풉니다.",
    sampleData: [8, 2, 6, 3, 9],
  },
  {
    id: "sorting-string-integrated-2",
    title: "통합 문제 2: 패턴 매칭 성능 비교",
    description: "문자열 검색 알고리즘 성능을 데이터별로 비교합니다.",
    sampleData: [4, 4, 1, 7, 1],
  },
  {
    id: "sorting-string-integrated-3",
    title: "통합 문제 3: 비재귀 퀵정렬 응용",
    description: "반복 기반 분할 정복 응용 문제를 풉니다.",
    sampleData: [13, 5, 11, 2, 7],
  },
]);

export function SortingContentRefactored() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 03. Sorting & String"
        modules={SORTING_MODULES_REFACTORED}
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
