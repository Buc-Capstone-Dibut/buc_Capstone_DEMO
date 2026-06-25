"use client";

import { Suspense } from "react";
import { CTPContentController } from "@/components/features/ctp/common/CTPContentController";
import { ProblemBankController } from "@/components/features/ctp/problem-bank";
import { module04Problems } from "@/data/ctp/problems";
import { ChapterOverview } from "./shared/chapter-overview";
import { createInteractiveTemplateModules } from "./shared/module-utils";

// Tier 1 Main Visualizers & Hooks (module-04)
import { useCursorLinkedListSim, CursorLinkedListVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/cursor-linked-list";
import { useFc1Sim, Fc1Visualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/fc-1";
import { useFc2Sim, Fc2Visualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/fc-2";
import { useFc3Sim, Fc3Visualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/fc-3";
import { useFc4Sim, Fc4Visualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/fc-4";

// Tier 2 Main Visualizers & Hooks (module-04)
import { useSinglySim, SinglyVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/singly";
import { useDoublySim, DoublyVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/doubly";
import { useCircularSim, CircularVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/circular";
import { useTreeBasicsSim, TreeBasicsVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/tree-basics";
import { useBstSim, BstVisualizer } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/bst";

// Tier 1 Supplementary Visualizers (module-04)
import { CursorLinkedListSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/cursor-linked-list-supp";
import { Fc1SupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/fc-1-supp";
import { Fc2SupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/fc-2-supp";
import { Fc3SupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/fc-3-supp";
import { Fc4SupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/fc-4-supp";

// Tier 2 Supplementary Visualizers (module-04)
import { SinglySupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/singly-supp";
import { DoublySupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/doubly-supp";
import { CircularSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/circular-supp";
import { TreeBasicsSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/tree-basics-supp";
import { BstSupplementaryOptions } from "@/components/features/ctp/playground/visualizers/svg-animations/module-04/supp/bst-supp";

const LIST_MODULES = createInteractiveTemplateModules([
  {
    id: "singly",
    title: "08-1 단일 연결 리스트",
    description: "노드와 head 포인터로 한 방향 연결을 표현하는 단일 연결 리스트를 학습합니다.",
    sampleData: [1, 2, 3, 4],
    story: {
      problem:
        "배열은 한 번 만들면 중간 삽입·삭제 비용이 큽니다. 데이터를 자주 추가하거나 빼야 하는 상황에서 매번 뒤쪽 원소를 한 칸씩 옮기는 비용은 전체 성능을 떨어뜨립니다. 메모리 위치가 고정된 자료구조 대신, 필요한 곳에 노드를 추가하고 포인터로만 연결하는 새로운 표현이 필요합니다.",
      definition:
        "**단일 연결 리스트(Singly Linked List)** 는 노드들이 한 방향 포인터(`next`)로 이어진 선형 자료구조입니다. 각 노드는 데이터 필드와 `next` 포인터로 구성되고, 진입점은 `head` 한 개뿐입니다. `head = null`이면 빈 리스트로 정의합니다. 삽입·삭제는 포인터 재배선만으로 끝나므로 위치를 안다면 `O(1)`이지만, 위치 탐색에는 `O(N)`이 듭니다.",
      analogy:
        "기차의 객차들이 앞뒤로 한 방향만 연결된 모습과 같습니다. 새 객차를 중간에 끼우려면 앞 객차의 연결고리를 풀어 새 객차에 끼우고, 새 객차의 뒤쪽을 원래 뒷 객차에 다시 잇기만 하면 됩니다. 다만 객차들 사이를 이동할 때는 앞에서 뒤로만 갈 수 있습니다.",
    },
    features: [
      {
        title: "노드 기반 표현",
        description:
          "각 데이터를 노드 객체로 감싸고 `next` 포인터로 다음 노드를 가리킵니다. 메모리상 노드들이 서로 떨어져 있어도 논리적으로는 한 줄로 연결됩니다.",
        SupplementaryVisualizer: SinglySupplementaryOptions[0],
      },
      {
        title: "head 단일 진입점",
        description:
          "리스트 전체에 접근하려면 `head`만 알면 됩니다. `head`를 잃어버리면 전체 데이터에 접근할 방법이 사라지므로 `head` 관리가 가장 중요한 책임입니다.",
        SupplementaryVisualizer: SinglySupplementaryOptions[1],
      },
      {
        title: "O(1) 포인터 재배선",
        description:
          "삽입·삭제 위치를 이미 알고 있다면 두 개 포인터만 갱신하면 됩니다. 배열처럼 나머지 원소를 밀거나 당기는 비용이 발생하지 않습니다.",
        SupplementaryVisualizer: SinglySupplementaryOptions[2],
      },
      {
        title: "단방향 순회의 제약",
        description:
          "`prev` 정보가 없기 때문에 한 방향으로만 이동할 수 있습니다. 양방향 순회가 필요하거나 끝에서 자주 접근해야 하면 이중 연결 리스트로 확장합니다.",
        SupplementaryVisualizer: SinglySupplementaryOptions[3],
      },
    ],
    useSim: useSinglySim,
    Visualizer: SinglyVisualizer,
  },
  {
    id: "doubly",
    title: "08-2 이중 연결 리스트",
    description: "prev와 next 두 포인터로 양방향 순회와 O(1) 임의 노드 삭제를 가능케 하는 이중 연결 리스트를 학습합니다.",
    sampleData: [4, 6, 8, 10],
    story: {
      problem:
        "단일 연결 리스트는 한 방향으로만 이동할 수 있어, 임의 노드를 삭제할 때 직전 노드를 다시 찾아야 한다는 비효율이 있습니다. 또한 리스트의 마지막 원소에 접근하려고 매번 `head`부터 끝까지 순회하는 비용도 누적되면 무시할 수 없습니다.",
      definition:
        "**이중 연결 리스트(Doubly Linked List)** 는 각 노드가 `prev`와 `next` 두 포인터를 모두 가지는 연결 리스트입니다. 진입점은 `head`(첫 노드)와 `tail`(끝 노드) 두 개입니다. 양방향 순회가 가능하고, 임의 노드를 손에 쥐고 있으면 `O(1)` 삭제가 가능합니다. 노드당 포인터가 하나 더 필요하므로 메모리 비용은 단일 연결 리스트보다 약간 큽니다.",
      analogy:
        "왕복 통행이 가능한 양방향 도로와 비슷합니다. 어느 노드(교차로)에 있든 앞이나 뒤로 자유롭게 이동할 수 있고, 한 노드를 도로 위에서 제거할 때도 양옆 도로를 바로 이어 붙일 수 있습니다. 다만 도로마다 양방향 차선을 마련해야 하므로 공사 비용은 단방향 도로보다 큽니다.",
    },
    features: [
      {
        title: "prev·next 양방향 포인터",
        description:
          "각 노드는 직전·다음 노드를 동시에 가리킵니다. 어디서든 양쪽 방향으로 자유롭게 이동할 수 있다는 점이 단일 연결 리스트와의 가장 큰 차이입니다.",
        SupplementaryVisualizer: DoublySupplementaryOptions[0],
      },
      {
        title: "head와 tail 동시 보관",
        description:
          "리스트 시작과 끝 모두에 즉시 접근할 수 있어 양쪽 끝 삽입·삭제가 `O(1)`에 끝납니다. 데크(Deque) 같은 구조의 자연스러운 토대가 됩니다.",
        SupplementaryVisualizer: DoublySupplementaryOptions[1],
      },
      {
        title: "O(1) 임의 노드 삭제",
        description:
          "삭제할 노드를 알고 있으면 `prev`·`next`를 따라 양옆 노드만 다시 잇습니다. 단일 연결 리스트처럼 직전 노드를 다시 탐색하지 않아도 됩니다.",
        SupplementaryVisualizer: DoublySupplementaryOptions[2],
      },
      {
        title: "메모리 비용 트레이드오프",
        description:
          "노드마다 포인터 하나가 더 필요하기 때문에 메모리 사용량이 증가합니다. 데이터 양이 많거나 메모리 제약이 강한 환경에서는 단일 연결 리스트와 비용 효용을 비교해야 합니다.",
        SupplementaryVisualizer: DoublySupplementaryOptions[3],
      },
    ],
    useSim: useDoublySim,
    Visualizer: DoublyVisualizer,
  },
  {
    id: "cursor-linked-list",
    title: "08-3 커서 기반 연결 리스트",
    description: "포인터 대신 배열 인덱스(커서)로 노드 연결을 모사하는 정적 메모리 친화적 구조를 학습합니다.",
    sampleData: [7, 3, 9, 2],
    story: {
      problem:
        "포인터 기반 연결 리스트는 매 삽입마다 새 메모리를 할당해야 합니다. 그러나 임베디드 시스템이나 정적 메모리 풀처럼 동적 할당이 제한된 환경에서는 그 비용을 감당할 수 없고, 단편화(fragmentation) 위험도 큽니다.",
      definition:
        "**커서 기반 연결 리스트(Cursor-based Linked List)** 는 포인터 대신 배열 인덱스를 사용해 다음 노드를 가리키는 자료구조입니다. 핵심 변수는 `head`(데이터 진입점 인덱스), `free`(빈 슬롯 진입점 인덱스), `next`(다음 인덱스 또는 -1)입니다. 삽입은 `free`에서 한 칸을 떼어내 사용하고, 삭제는 사용 슬롯을 다시 `free` 앞에 매답니다. 동적 할당 없이 `O(1)` 삽입/삭제를 유지하지만 배열 크기가 곧 용량 상한입니다.",
      analogy:
        "고정된 칸 수의 주차장에서 각 자리에 \"다음 차량이 주차된 자리 번호\"를 적어두는 방식과 같습니다. 빈자리도 별도로 \"다음 빈자리 번호\"로 연결해 두면, 새 차가 와도 빈자리를 빠르게 찾고 떠난 자리도 다시 빈자리 목록에 끼워 넣을 수 있습니다.",
    },
    features: [
      {
        title: "인덱스 기반 다음 포인터",
        description:
          "각 노드는 `value`와 `next`(인덱스 번호)를 가지며, `-1`은 종단을 의미합니다. 포인터를 다루기 어려운 환경에서도 동일한 연결 의미를 표현할 수 있습니다.",
        SupplementaryVisualizer: CursorLinkedListSupplementaryOptions[0],
      },
      {
        title: "free 체인 재사용",
        description:
          "사용 중인 슬롯 체인과 빈 슬롯 체인을 분리해 유지합니다. 삭제된 슬롯은 `free` 앞에 다시 매달려 다음 삽입에 즉시 재활용됩니다.",
        SupplementaryVisualizer: CursorLinkedListSupplementaryOptions[1],
      },
      {
        title: "O(1) 삽입과 삭제",
        description:
          "`head`·`free` 두 진입점만 조정하면 되므로 노드 추가·제거가 상수 시간에 끝납니다. 배열의 물리적 이동이 전혀 일어나지 않습니다.",
        SupplementaryVisualizer: CursorLinkedListSupplementaryOptions[2],
      },
      {
        title: "용량 상한과 제약",
        description:
          "배열 크기를 넘는 노드는 가질 수 없고, `free`가 -1이면 삽입 실패로 처리해야 합니다. 동적 확장이 필요한 일반 응용보다는 정적 메모리 환경에 적합합니다.",
        SupplementaryVisualizer: CursorLinkedListSupplementaryOptions[3],
      },
    ],
    useSim: useCursorLinkedListSim,
    Visualizer: CursorLinkedListVisualizer,
  },
  {
    id: "circular",
    title: "08-4 원형 이중 연결 리스트",
    description: "끝과 시작을 이어 붙여 \"끝\"이라는 특수 경계를 제거한 원형 구조를 학습합니다.",
    sampleData: [5, 10, 15, 20],
    story: {
      problem:
        "라운드 로빈 스케줄러나 음악 반복 재생처럼 마지막에 도달한 뒤 다시 처음으로 돌아가야 하는 작업은 매번 \"끝에 닿았는가\"를 검사해 `head`로 되돌아가는 분기 코드를 작성해야 합니다. 분기 처리는 단순해 보여도 누락이 잦고, 데이터 흐름에서 끝-시작 경계를 특수 케이스로 만든다는 부담이 있습니다.",
      definition:
        "**원형 이중 연결 리스트(Circular Doubly Linked List)** 는 마지막 노드의 `next`가 첫 노드로, 첫 노드의 `prev`가 마지막 노드로 연결된 자료구조입니다. 진입점은 `head` 한 개로 충분하고, `tail`은 `head.prev`로 즉시 접근 가능합니다. \"끝\"이라는 특수 위치가 없으므로 종료 조건은 \"시작 노드로 되돌아왔는가\"로 정의합니다. 어느 노드에서 출발해도 한 바퀴 순회로 전체에 도달할 수 있어 라운드 로빈 응용에 적합합니다.",
      analogy:
        "회전 초밥 벨트나 원형 트랙과 같습니다. 접시는 정해진 순서대로 손님 앞을 지나가지만, 마지막 자리 다음에 다시 첫 자리가 등장하기 때문에 \"끝\"이라는 개념 자체가 없습니다. 어디에 앉아 있어도 한 바퀴를 기다리면 모든 접시를 볼 수 있습니다.",
    },
    features: [
      {
        title: "끝과 시작의 결합",
        description:
          "마지막 노드의 `next`가 `head`로 되돌아옴으로써 끝-시작 경계가 사라집니다. 모든 노드가 동등한 위치를 가지므로 특수 케이스 분기가 거의 사라집니다.",
        SupplementaryVisualizer: CircularSupplementaryOptions[0],
      },
      {
        title: "임의 출발점 순회",
        description:
          "`head`를 모르더라도 노드 하나만 손에 들고 있으면 한 바퀴를 돌아 전체를 방문할 수 있습니다. 시작 노드를 기억해 두는 것이 종료 조건의 핵심입니다.",
        SupplementaryVisualizer: CircularSupplementaryOptions[1],
      },
      {
        title: "라운드 로빈에 자연스러운 표현",
        description:
          "라운드 로빈 스케줄러, 음악 반복 재생, 게임 턴 진행처럼 \"끝나면 처음으로\"가 자연스러운 응용에 적합합니다. 별도 조건 분기 없이 `next` 한 번이면 됩니다.",
        SupplementaryVisualizer: CircularSupplementaryOptions[2],
      },
      {
        title: "무한 루프 방지 책임",
        description:
          "끝 노드가 없으므로 잘못 짠 순회는 영원히 끝나지 않을 수 있습니다. 시작 노드 비교, 방문 카운트 같은 안전 장치를 반드시 코드에 명시해야 합니다.",
        SupplementaryVisualizer: CircularSupplementaryOptions[3],
      },
    ],
    useSim: useCircularSim,
    Visualizer: CircularVisualizer,
  },
]);

const TREE_MODULES = createInteractiveTemplateModules([
  {
    id: "tree-basics",
    title: "09-1 트리 구조",
    description: "부모-자식 관계로 이어진 비선형 자료구조의 기본 용어와 순회 흐름을 학습합니다.",
    sampleData: [8, 4, 12, 2, 6],
    story: {
      problem:
        "지금까지 다룬 배열, 스택, 큐, 연결 리스트는 모두 데이터를 한 줄로 늘어놓은 선형 구조였습니다. 그러나 회사 조직도나 파일 시스템처럼 \"한 사람 아래 여러 명, 한 폴더 아래 여러 폴더\"가 자연스러운 데이터는 한 줄로 표현하기 어렵습니다. 데이터의 계층 관계를 직접 표현할 수 있는 자료구조가 필요합니다.",
      definition:
        "**트리(Tree)** 는 부모-자식 관계로 이어진 노드들의 비선형 자료구조입니다. **루트(root)** 는 부모가 없는 최상위 노드로 트리에 단 한 개만 존재합니다. **리프(leaf)** 는 자식이 없는 말단 노드입니다. **깊이(depth)** 는 루트에서 특정 노드까지의 간선 수, **높이(height)** 는 가장 깊은 리프까지의 간선 수입니다. 깊이는 노드별 속성, 높이는 트리 전체의 속성입니다. 노드를 빠짐없이 방문하는 **순회(traversal)** 는 **전위(pre)·중위(in)·후위(post)·레벨(level)** 4종이 있으며, 같은 트리라도 방문 순서가 달라 출력이 모두 달라집니다.",
      analogy:
        "회사 조직도와 가장 잘 맞아 들어갑니다. 사장(루트) 아래에 본부장 여러 명이 있고, 본부장 아래에 다시 팀장이, 그 아래에 팀원이 있습니다. 한 사람은 정확히 한 명의 직속 상사를 갖고, 위에서 아래로만 연결되며, 누구도 자신의 위쪽 사람을 자기 아래로 둘 수 없습니다.",
    },
    features: [
      {
        title: "부모-자식 계층 표현",
        description:
          "각 노드는 정확히 한 명의 부모와 0개 이상의 자식을 가집니다. 이 단순한 규칙으로 임의의 깊이를 가진 계층 구조를 모두 표현할 수 있습니다.",
        SupplementaryVisualizer: TreeBasicsSupplementaryOptions[0],
      },
      {
        title: "루트와 리프의 역할",
        description:
          "루트는 전체 트리의 진입점, 리프는 경로의 종착점입니다. 모든 탐색·순회는 루트에서 출발해 리프 방향으로 진행되는 것이 기본입니다.",
        SupplementaryVisualizer: TreeBasicsSupplementaryOptions[1],
      },
      {
        title: "깊이와 높이의 구분",
        description:
          "깊이는 \"이 노드가 얼마나 아래에 있는가\"를, 높이는 \"트리가 얼마나 깊은가\"를 나타냅니다. 두 개념을 혼동하지 않는 것이 트리 알고리즘 분석의 첫 단계입니다.",
        SupplementaryVisualizer: TreeBasicsSupplementaryOptions[2],
      },
      {
        title: "순회 4종 비교",
        description:
          "전위(부모→좌→우)·중위(좌→부모→우)·후위(좌→우→부모)·레벨(깊이 순 BFS) 네 가지 순회는 같은 트리에서도 출력이 모두 달라집니다. 풀려는 문제(검색·정렬·계산)에 맞춰 적절한 순회 순서를 고르는 감각이 필요합니다.",
        SupplementaryVisualizer: TreeBasicsSupplementaryOptions[3],
      },
    ],
    useSim: useTreeBasicsSim,
    Visualizer: TreeBasicsVisualizer,
  },
  {
    id: "bst",
    title: "09-2 이진 검색 트리(BST)",
    description: "왼쪽 < 부모 < 오른쪽 불변식으로 평균 O(log N) 검색을 제공하는 BST를 학습합니다.",
    sampleData: [10, 5, 15, 3, 7],
    story: {
      problem:
        "일반 트리는 데이터의 계층을 표현하지만, 특정 값을 검색하는 데는 그 자체로 도움이 되지 않습니다. 정렬되지 않은 트리에서는 모든 노드를 다 봐야 할 수도 있어 배열의 선형 검색과 다르지 않습니다. 검색·삽입·삭제를 평균 `O(log N)`에 처리할 수 있는 트리 구조가 필요합니다.",
      definition:
        "**이진 검색 트리(Binary Search Tree, BST)** 는 모든 노드가 \"왼쪽 < 부모 < 오른쪽\" 불변식을 만족하는 이진 트리입니다. 각 노드는 최대 2개의 자식만 가지며, 값 비교로 진행 방향을 결정합니다. 검색·삽입은 루트에서 시작해 한 방향으로만 내려가므로 평균 `O(log N)`입니다. 한쪽으로 치우친 입력이 들어오면 최악 `O(N)`까지 떨어지므로 균형이 핵심 변수입니다.",
      analogy:
        "사전의 색인이나 도서관 청구기호 정리 규칙과 같습니다. 어떤 단어를 찾을 때 사전을 가운데에서 펴서 알파벳 순서를 비교한 뒤 왼쪽 절반 또는 오른쪽 절반으로만 들어갑니다. BST는 이 규칙을 트리 구조로 굳혀 둔 자료구조라고 볼 수 있습니다.",
    },
    features: [
      {
        title: "정렬 불변식 유지",
        description:
          "모든 노드에서 왼쪽 < 부모 < 오른쪽이라는 부등식이 항상 성립합니다. 이 단순한 규칙이 검색·삽입·삭제 모두를 한 방향 탐색으로 풀어 줍니다.",
        SupplementaryVisualizer: BstSupplementaryOptions[0],
      },
      {
        title: "평균 O(log N) 검색",
        description:
          "한 단계마다 후보 노드 수가 절반에 가깝게 줄어듭니다. 균형이 잘 잡힌 BST에서는 N=1000 노드에서도 약 10번의 비교로 검색이 끝납니다.",
        SupplementaryVisualizer: BstSupplementaryOptions[1],
      },
      {
        title: "중위 순회 = 정렬 출력",
        description:
          "BST를 중위 순회하면 결과가 항상 오름차순 정렬됩니다. 정렬된 데이터 추출이 필요한 응용에서는 별도 정렬 단계를 생략할 수 있습니다.",
        SupplementaryVisualizer: BstSupplementaryOptions[2],
      },
      {
        title: "균형 붕괴 시 O(N)",
        description:
          "오름차순 입력처럼 데이터가 한쪽으로 쏠리면 트리가 선형 리스트처럼 늘어집니다. 이를 막기 위해 AVL 트리·레드-블랙 트리 같은 자동 균형 트리가 등장했습니다.",
        SupplementaryVisualizer: BstSupplementaryOptions[3],
      },
    ],
    useSim: useBstSim,
    Visualizer: BstVisualizer,
  },
]);

const FINAL_CHALLENGE_MODULES = createInteractiveTemplateModules([
  {
    id: "fc-1",
    title: "FC-1 기초·검색 종합",
    description: "Module 01 핵심(흐름 추적·배열·선형/이진/해시 검색)을 한 문제 안에서 통합 점검합니다.",
    sampleData: [1, 8, 2, 7, 3],
    story: {
      problem:
        "지금까지 학습한 흐름 추적, 배열 다루기, 선형/이진/해시 검색은 각각 독립된 개념처럼 다뤄졌습니다. 그러나 실제 문제는 \"어떤 데이터 상태에서 어떤 검색 전략이 가장 빠른가?\"를 한 호흡에 판단해야 하는 통합 과제입니다.",
      definition:
        "**FC-1** 은 모듈 01에서 학습한 네 가지 핵심 개념을 한 문제 안에서 통합 적용하는 종합 평가입니다. 평가 영역은 입출력 추적, 1D 배열 조작, 선형 검색, 이진 검색, 해시 검색입니다. 한 입력 배열에 세 가지 검색을 순차 적용해 비교 횟수와 복잡도를 비교하고, 데이터 상태(정렬 여부·검색 빈도·메모리 여유)에 따라 최적 전략을 선택할 수 있는지 검증합니다.",
      analogy:
        "각각의 검색 알고리즘이 한 종목의 시합이라면, FC-1은 같은 데이터 위에서 세 종목을 모두 치르는 종합 경기입니다. 어느 종목 하나만 잘해서는 점수를 채울 수 없고, 종목별 강점과 제약을 모두 이해해야 좋은 결과가 나옵니다.",
    },
    features: [
      {
        title: "복합 입력 추적",
        description:
          "정렬 전/후 배열과 해시 테이블을 한 화면에서 동시에 추적합니다. 동일한 `target`에 대한 세 전략의 동작을 나란히 비교할 수 있습니다.",
        SupplementaryVisualizer: Fc1SupplementaryOptions[0],
      },
      {
        title: "비교 횟수 누적 카운트",
        description:
          "각 전략이 수행한 비교 횟수를 명시적으로 세어 둡니다. 이론상 복잡도와 실제 횟수가 어떻게 매칭되는지 직관적으로 확인할 수 있습니다.",
        SupplementaryVisualizer: Fc1SupplementaryOptions[1],
      },
      {
        title: "복잡도 비교 요약표",
        description:
          "선형(`O(N)`), 이진(`O(log N)`), 해시(`O(1)` 평균)의 차이를 표로 정리합니다. 데이터 크기 N이 커질수록 차이가 어떻게 벌어지는지 함께 살펴봅니다.",
        SupplementaryVisualizer: Fc1SupplementaryOptions[2],
      },
      {
        title: "전략 선택 판단",
        description:
          "정렬 여부, 검색 횟수, 메모리 여유, 충돌 위험 4가지 조건을 따라 어떤 검색이 더 적합한지 결정합니다. 모듈 01 전체를 관통하는 응용 능력을 점검합니다.",
        SupplementaryVisualizer: Fc1SupplementaryOptions[3],
      },
    ],
    useSim: useFc1Sim,
    Visualizer: Fc1Visualizer,
  },
  {
    id: "fc-2",
    title: "FC-2 스택·재귀·정렬 종합",
    description: "스택(LIFO)·재귀 호출 트리·분할 정복 정렬을 호출 스택 관점으로 묶어 통합 점검합니다.",
    sampleData: [4, 9, 5, 2, 6],
    story: {
      problem:
        "모듈 02의 스택·재귀·백트래킹과 모듈 03의 정렬 알고리즘은 모두 \"호출 순서를 어떻게 통제할 것인가\"라는 공통 관점에서 연결됩니다. 그러나 학습할 때는 개별 챕터로 다루기 때문에, 동일한 알고리즘을 재귀로도 반복으로도 표현할 수 있다는 감각을 통합적으로 익히기 어렵습니다.",
      definition:
        "**FC-2** 는 모듈 02의 스택·재귀·백트래킹과 모듈 03의 분할 정복 정렬을 묶어서 검증하는 종합 평가입니다. 평가 영역은 스택(LIFO), 재귀 기저 조건과 분할, 퀵·병합 정렬의 호출 트리입니다. 동일 입력에 대해 재귀 호출과 명시적 스택 반복이 어떻게 등가인지 확인하고, 호출 깊이와 동시 활성 프레임 수에서 스택 메모리 비용을 측정합니다.",
      analogy:
        "여러 단계를 거치는 요리 레시피와 비슷합니다. 한 번에 모든 재료를 다루지 않고, 큰 작업을 작은 작업으로 쪼개 차례로 처리한 뒤 위에서부터 다시 합쳐 갑니다. 그 진행 상황을 메모지(스택)에 쌓아 두면 어디까지 했고 어디로 돌아가야 하는지가 명확해집니다.",
    },
    features: [
      {
        title: "호출 스택 가시화",
        description:
          "재귀 호출이 발생할 때마다 스택에 프레임이 어떻게 `push`·`pop`되는지 단계별로 보여 줍니다. 호출 흐름과 상태 변화를 한 화면에서 추적할 수 있습니다.",
        SupplementaryVisualizer: Fc2SupplementaryOptions[0],
      },
      {
        title: "분할 정복 트리 추적",
        description:
          "퀵 정렬과 병합 정렬이 입력을 어떻게 좌·우로 쪼개는지 트리 형태로 보여 줍니다. 각 노드의 처리 순서와 결과 결합 시점을 명확히 합니다.",
        SupplementaryVisualizer: Fc2SupplementaryOptions[1],
      },
      {
        title: "재귀 ↔ 반복 등가성",
        description:
          "동일 문제를 재귀로 푸는 코드와 명시적 스택을 쓴 반복 코드를 나란히 비교합니다. 두 방식이 결과 면에서는 동일하지만 메모리/제어성 측면에서 차이가 있음을 확인합니다.",
        SupplementaryVisualizer: Fc2SupplementaryOptions[2],
      },
      {
        title: "스택 깊이 측정",
        description:
          "활성 프레임 수의 최댓값을 기록해 공간복잡도를 직접 측정합니다. 입력 크기에 따른 깊이 증가 패턴을 통해 어떤 정렬이 안정적인지 판단합니다.",
        SupplementaryVisualizer: Fc2SupplementaryOptions[3],
      },
    ],
    useSim: useFc2Sim,
    Visualizer: Fc2Visualizer,
  },
  {
    id: "fc-3",
    title: "FC-3 문자열·리스트·트리 종합",
    description: "문자열 패턴 검색 결과를 이중 연결 리스트와 BST에 동시 적재해 자료구조 선택 감각을 점검합니다.",
    sampleData: [7, 1, 9, 3, 8],
    story: {
      problem:
        "현실의 문제는 자료구조 하나로 끝나지 않습니다. 문서에서 단어를 찾고, 발견된 위치를 어딘가에 보관하며, 다시 정렬해 조회까지 해야 한다면 어떤 자료구조를 어떤 순서로 결합해야 가장 깔끔할까요?",
      definition:
        "**FC-3** 는 모듈 03(문자열 검색)과 모듈 04(연결 리스트·트리)를 묶어서 검증하는 종합 평가입니다. 평가 영역은 KMP 또는 보이어-무어 같은 문자열 검색, 이중 연결 리스트, 이진 검색 트리(BST)입니다. 패턴 검색 결과를 리스트에 누적한 뒤 BST에 재배열하는 한 흐름을 설계하고, 각 자료구조가 어떤 질의(순서 보존·정렬 조회·범위 검색)에 적합한지 판단합니다.",
      analogy:
        "책에서 특정 단어를 찾아 페이지 번호를 메모하고, 이 메모를 시간순 다이어리(리스트)와 색인집(트리)에 동시에 옮겨 두는 과정과 같습니다. 데이터는 같지만 다이어리는 발견 순서, 색인집은 정렬 순서를 보존해 서로 다른 질문에 빠르게 답할 수 있습니다.",
    },
    features: [
      {
        title: "문자열 검색 결과 추적",
        description:
          "KMP 또는 보이어-무어로 일치 인덱스를 모두 찾아 모읍니다. 검색 알고리즘의 출력이 후속 자료구조의 입력으로 어떻게 연결되는지 한 호흡에 봅니다.",
        SupplementaryVisualizer: Fc3SupplementaryOptions[0],
      },
      {
        title: "이중 연결 리스트 적재",
        description:
          "발견 순서를 그대로 보존하기 위해 결과를 이중 연결 리스트로 묶습니다. 양방향 순회로 \"앞 일치 위치\", \"뒤 일치 위치\" 같은 질의를 손쉽게 처리할 수 있습니다.",
        SupplementaryVisualizer: Fc3SupplementaryOptions[1],
      },
      {
        title: "BST 재구성",
        description:
          "동일한 인덱스 집합을 BST에 삽입해 정렬된 트리로 만듭니다. 중위 순회 한 번으로 오름차순 출력을 얻고, 범위 검색도 효율적으로 처리할 수 있습니다.",
        SupplementaryVisualizer: Fc3SupplementaryOptions[2],
      },
      {
        title: "다중 자료구조 일관성",
        description:
          "한 데이터가 두 자료구조에 동시에 존재할 때 발생하는 동기화 비용과 메모리 비용을 함께 계산합니다. 무엇을 위해 어떤 자료구조를 선택했는지 명확히 설명할 수 있어야 합니다.",
        SupplementaryVisualizer: Fc3SupplementaryOptions[3],
      },
    ],
    useSim: useFc3Sim,
    Visualizer: Fc3Visualizer,
  },
  {
    id: "fc-4",
    title: "FC-4 미니 코딩테스트",
    description: "제한 시간 환경에서 문제 정독·전략 비교·구현·엣지 케이스 점검을 종합 훈련합니다.",
    sampleData: [10, 6, 11, 4, 12],
    story: {
      problem:
        "FC-1, FC-2, FC-3을 거치며 각 모듈의 핵심을 통합하는 능력을 길렀습니다. 그러나 실제 코딩 테스트는 \"제한 시간\"이라는 추가 제약을 부과합니다. 차분한 학습과 시간 압박 환경은 전혀 다른 종목이기 때문에 마지막에는 압박 안에서 흐름을 유지하는 훈련이 필요합니다.",
      definition:
        "**FC-4** 는 제한 시간 안에 문제를 읽고 풀이를 설계·구현하는 미니 코딩 테스트입니다. 다루는 단계는 문제 정독, 전략 후보 비교, 자료구조 선택, 단일 패스 구현, 엣지 케이스 점검이고, 구현 직전에 \"무엇을 어떻게 쓰겠다\"를 먼저 명문화하는 습관을 강조합니다. 아래 시각화는 정독→전략→설계→구현→제출 흐름을 보여 주는 **데모(목업)** 로, 10:00 고정 타이머가 흐르고 마지막 판정(AC)은 미리 정해 둔 결과입니다. 실제 코드 채점은 수행하지 않습니다.",
      analogy:
        "모의 면접의 라이브 코딩 단계와 가깝습니다. 정답을 빨리 짜는 능력보다, 짧은 시간 안에 \"왜 이 풀이인지\"를 설명하고 핵심 엣지 케이스를 놓치지 않는 침착함이 더 큰 변별 요소가 됩니다.",
      playgroundLimit:
        "아래 시각화는 단계 흐름을 보여 주는 데모(목업)입니다 — 10:00 고정 타이머가 흐르고 판정 결과(AC)는 하드코딩이며, 실제 코드 채점은 하지 않습니다.",
    },
    features: [
      {
        title: "타이머 기반 흐름 통제",
        description:
          "정독·전략·설계·구현·제출 5단계를 단일 10:00 데모 타이머 아래에서 진행합니다. 처음부터 구현으로 뛰어들지 않고 설계에 일정 시간을 확보하는 습관을 익힙니다.",
        SupplementaryVisualizer: Fc4SupplementaryOptions[0],
      },
      {
        title: "후보 풀이 비교",
        description:
          "최소 두 가지 풀이를 떠올린 뒤 시간·메모리·구현 난이도를 비교합니다. \"가능한 풀이\"와 \"제출 안전한 풀이\"의 차이를 의식적으로 분리합니다.",
        SupplementaryVisualizer: Fc4SupplementaryOptions[1],
      },
      {
        title: "설계 메모 명문화",
        description:
          "코드를 작성하기 전 사용할 자료구조와 핵심 변수, 종료 조건을 글로 적어 둡니다. 머릿속만으로 진행할 때보다 누락이 확연히 줄어듭니다.",
        SupplementaryVisualizer: Fc4SupplementaryOptions[2],
      },
      {
        title: "엣지 케이스 최종 점검",
        description:
          "제출 직전에 빈 입력·중복·음수·정답 없음 같은 케이스를 별도 검토합니다. 제출 후 추가 점수 손실을 막는 마지막 안전망입니다.",
        SupplementaryVisualizer: Fc4SupplementaryOptions[3],
      },
    ],
    useSim: useFc4Sim,
    Visualizer: Fc4Visualizer,
  },
]);

export function ListContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 04. List, Tree & Final"
        modules={LIST_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 04. List, Tree & Final"
            chapterTitle="08 리스트"
            chapterDescription="리스트 챕터는 참여형 인터랙티브 실습 중심으로 구성됩니다."
            guideItems={[
              "연산 버튼으로 삽입/삭제 흐름을 반복 체험하세요.",
              "로그를 통해 경계 조건 처리 규칙을 정리하세요.",
              "같은 데이터로 구조별 반응 차이를 비교하세요.",
            ]}
            items={[
              { id: "singly", title: "08-1 단일 연결 리스트", description: "단일 연결 리스트의 기본 연산을 실습합니다." },
              { id: "doubly", title: "08-2 이중 연결 리스트", description: "양방향 연결 구조의 연산을 학습합니다." },
              { id: "cursor-linked-list", title: "08-3 커서 기반 연결 리스트", description: "배열 인덱스로 노드 연결을 모사합니다." },
              { id: "circular", title: "08-4 원형 이중 연결 리스트", description: "순환 연결 구조의 경계 처리를 익힙니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function TreeContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 04. List, Tree & Final"
        modules={TREE_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 04. List, Tree & Final"
            chapterTitle="09 트리"
            chapterDescription="트리 챕터도 참여형 인터랙티브 실습으로 전환되었습니다."
            guideItems={[
              "버튼 조작으로 노드 상태 변화를 관찰하세요.",
              "탐색 순서에 따라 로그가 어떻게 달라지는지 비교하세요.",
              "리스트 구조와 트리 구조의 차이를 정리하세요.",
            ]}
            items={[
              { id: "tree-basics", title: "09-1 트리 구조", description: "트리 기본 구조와 순회를 학습합니다." },
              { id: "bst", title: "09-2 이진 검색 트리(BST)", description: "BST 규칙과 응용을 실습합니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}

export function ListTreeIntegrationContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <ProblemBankController
        moduleLabel="Module 04. List, Tree & Final"
        chapterTitle="리스트/트리 자료구조 개념 심화 및 적용"
        chapterDescription="Problem Bank에서 List/Tree 통합 문제를 풀이하고 자동 채점을 확인하세요."
        problems={module04Problems}
      />
    </Suspense>
  );
}

export function FinalChallengeContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading content...</div>}>
      <CTPContentController
        category="Module 04. List, Tree & Final"
        modules={FINAL_CHALLENGE_MODULES}
        overview={
          <ChapterOverview
            moduleLabel="Module 04. List, Tree & Final"
            chapterTitle="종합 평가 + 미니 코딩테스트 (Final Challenge)"
            chapterDescription="파이널 챌린지는 참여형 인터랙티브 시뮬레이션으로 진행됩니다."
            guideItems={[
              "각 FC 레슨에서 조작 순서를 스스로 설계하세요.",
              "반복 실습으로 안정적인 해결 흐름을 만드세요.",
              "로그를 기반으로 실전 전략을 복기하세요.",
            ]}
            items={[
              { id: "fc-1", title: "FC-1 기초·검색 종합", description: "기초/검색 영역을 통합 점검합니다." },
              { id: "fc-2", title: "FC-2 스택·재귀·정렬 종합", description: "스택/재귀/정렬 결합 문제를 풉니다." },
              { id: "fc-3", title: "FC-3 문자열·리스트·트리 종합", description: "문자열과 자료구조 복합 문제를 다룹니다." },
              { id: "fc-4", title: "FC-4 미니 코딩테스트", description: "타이머형 실전 테스트를 수행합니다." },
            ]}
          />
        }
      />
    </Suspense>
  );
}
