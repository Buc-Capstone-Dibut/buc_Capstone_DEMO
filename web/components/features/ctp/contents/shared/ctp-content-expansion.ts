import { CTPModuleConfig, GuideSection, CTPImplementationExample } from "@/components/features/ctp/common/types";

type StoryBlock = {
  problem?: string;
  definition?: string;
  analogy?: string;
  playgroundDescription?: string;
  playgroundLimit?: string;
};

type Expansion = {
  story?: StoryBlock;
  features?: { title: string; description: string }[];
  guide?: GuideSection[];
  implementation?: CTPImplementationExample[];
};

const appendText = (base?: string, extra?: string) => {
  if (!extra) return base;
  if (!base) return extra;
  return `${base}\n\n${extra}`;
};

const mergeStory = (base?: StoryBlock, extra?: StoryBlock): StoryBlock | undefined => {
  if (!base && !extra) return undefined;
  return {
    problem: appendText(base?.problem, extra?.problem),
    definition: appendText(base?.definition, extra?.definition),
    analogy: appendText(base?.analogy, extra?.analogy),
    playgroundDescription: appendText(base?.playgroundDescription, extra?.playgroundDescription),
    playgroundLimit: base?.playgroundLimit ?? extra?.playgroundLimit,
  };
};

const groupDeepDive: Record<string, string> = {
  array: `### 심화 포인트
**핵심 개념**
- 연속 메모리 구조로 **임의 접근 O(1)**을 보장합니다.
- 정렬된 배열은 이분 탐색/투 포인터/슬라이딩 윈도우를 가능하게 합니다.

**대표 패턴**
- Prefix Sum, Two Pointers, Sliding Window, Binary Search.
- 정렬 → 조건 만족 구간을 빠르게 찾는 문제에 최적입니다.

**실수/주의**
- 인덱스 경계(0/len-1), 오프바이원.
- 중간 삽입/삭제는 O(n)이며, 성능 병목이 됩니다.

**면접 질문**
- 배열 vs 연결리스트 선택 기준은?
- 배열이 실제로 더 빠른 이유(캐시 친화성)는?`,
  linked: `### 심화 포인트
**핵심 개념**
- 삽입/삭제가 빈번한 경우 배열보다 유리합니다.
- 임의 접근은 불가하므로 탐색은 O(n)입니다.

**대표 패턴**
- 더미 노드로 head/tail 삽입/삭제 단순화.
- slow/fast 포인터로 중간/사이클 탐지.

**실수/주의**
- 포인터 갱신 순서 오류로 노드 유실.
- head 변경 시 처리 누락.`,
  stack: `### 심화 포인트
**핵심 개념**
- LIFO 구조는 재귀/백트래킹/괄호 검증에 핵심입니다.

**대표 패턴**
- 단조 스택(Next Greater Element, 히스토그램 최대 직사각형).
- DFS를 스택으로 재귀 없이 구현.

**실수/주의**
- underflow/overflow 방어.
- top 인덱스 갱신 순서 실수.`,
  queue: `### 심화 포인트
**핵심 개념**
- FIFO 구조로 레벨 탐색/흐름 처리에 최적입니다.

**대표 패턴**
- BFS 최단 거리, 멀티 소스 BFS, 레벨 순회.
- 원형 큐로 공간 재사용.

**실수/주의**
- front/rear 규칙 혼동.
- 원형 큐에서 empty/full 구분 실패.`,
  tree: `### 심화 포인트
**핵심 개념**
- 계층 구조, 사이클 없음, 루트에서 모든 노드로 경로 존재.
- 순회 방식은 해석 의미가 다릅니다(중위=정렬).

**대표 패턴**
- 재귀/반복 순회, 높이/깊이 계산.
- 트리 DP의 기본 구조.

**실수/주의**
- 재귀 깊이 제한 (스택 오버플로).
- 부모/자식 관계 혼동.`,
  search: `### 심화 포인트
**핵심 개념**
- 정렬/단조성 전제가 없으면 이분 탐색 불가.
- 구간 불변식을 유지하는 것이 핵심입니다.

**대표 패턴**
- 파라메트릭 서치(결정 함수 단조성).

**실수/주의**
- mid 계산/경계 이동 실수.
- 무한 루프(정지 조건 부정확).`,
};

const groupByKey: Record<string, string> = {};
const mapGroup = (group: string, keys: string[]) => keys.forEach((key) => (groupByKey[key] = group));
mapGroup("array", ["1d-array", "2d-array"]);
mapGroup("linked", ["singly", "doubly", "circular"]);
mapGroup("stack", ["lifo-basics"]);
mapGroup("queue", ["linear-queue", "circular-queue"]);
mapGroup("tree", ["tree-basics", "tree-properties", "bst"]);
mapGroup("sorting", ["bubble-sort", "selection-sort", "insertion-sort", "merge-sort", "quick-sort", "heap-sort"]);
mapGroup("search", ["basic-binary-search"]);

const groupObservation: Record<string, string> = {
  array: `**이번 단계에서 무엇을 볼까?**\\n- 인덱스가 어떻게 이동하는지\\n- 비교/갱신 횟수가 어디서 커지는지`,
  linked: `**이번 단계에서 무엇을 볼까?**\\n- 포인터 갱신 순서\\n- head/tail 변경 시 연결 유지 여부`,
  stack: `**이번 단계에서 무엇을 볼까?**\\n- push/pop 후 top 변화\\n- 단조 스택에서 연속 pop 발생 시점`,
  queue: `**이번 단계에서 무엇을 볼까?**\\n- front/rear 이동 규칙\\n- empty/full 판정 조건`,
  tree: `**이번 단계에서 무엇을 볼까?**\\n- 차수/거리/레벨/너비/크기 변화\\n- 방문 순서(전/중/후위)와 의미 차이`,
  sorting: `**이번 단계에서 무엇을 볼까?**\\n- swap/partition 시점\\n- 안정성 유지 여부\\n\\n**색상 규칙(정렬 시뮬레이터)**\\n- 파랑: 기준/선택 원소 (active)\\n- 노랑: 비교 중 (comparing)\\n- 초록: 정렬 확정/완료 (success)\\n- 회색: 일반 상태`,
  search: `**이번 단계에서 무엇을 볼까?**\\n- low/high 경계 이동\\n- mid 갱신 방식`,
};

const sortingLegendGuide: GuideSection[] = [
  {
    title: "시각화 색상 규칙",
    items: [
      {
        label: "active (파랑)",
        description: "현재 기준이 되는 원소 또는 pivot/선택 대상입니다.",
        code: "active_index = i",
        tags: ["Legend"],
      },
      {
        label: "comparing (노랑)",
        description: "서로 비교 중인 원소 쌍을 표시합니다.",
        code: "compare_indices = [j, j+1]",
        tags: ["Legend"],
      },
      {
        label: "success (초록)",
        description: "정렬이 확정된 위치(또는 최종 상태)입니다.",
        code: "highlight_indices = sorted_range",
        tags: ["Legend"],
      },
    ],
  },
];

const groupGuides: Record<string, GuideSection[]> = {
  sorting: sortingLegendGuide,
};

const deepDiveByKey: Record<string, string> = {
  "bubble-sort": `### 심화 포인트
**개념 강조**
- 한 패스가 끝날 때마다 **가장 큰 값이 맨 뒤에 고정**됩니다.
- “스왑이 없으면 종료” 플래그를 넣으면 **거의 정렬된 배열**에서 크게 빨라집니다.

**실전 팁**
- 마지막 스왑 위치를 기억하면 다음 패스 범위를 줄일 수 있습니다.

**주의**
- 작은 입력에서만 학습용으로 사용하고, 큰 입력에는 비효율적입니다.`,
  "selection-sort": `### 심화 포인트
**개념 강조**
- 매 단계에서 **최솟값의 위치를 선택**해 교환합니다.
- 비교 횟수는 항상 비슷하지만 **교환 횟수는 매우 적습니다**.

**실전 팁**
- “교환이 비용이 큰 경우”에 선택 정렬이 유리할 수 있습니다.

**주의**
- 이미 정렬되어 있어도 **속도가 빨라지지 않습니다**.`,
  "insertion-sort": `### 심화 포인트
**개념 강조**
- 앞부분이 정렬되어 있을수록 **이동 거리(shift)가 줄어듭니다**.
- 최선의 경우 O(n)까지 빨라집니다.

**실전 팁**
- 작은 구간 정렬(퀵/병합 내부)에서 자주 쓰입니다.
- Binary Insertion(이분 탐색으로 삽입 위치 탐색)을 적용할 수 있습니다.

**주의**
- 역순 배열에서는 O(n^2)로 느려집니다.`,
  "merge-sort": `### 심화 포인트
**개념 강조**
- 분할된 배열은 **정렬된 상태**이므로, 병합은 “두 포인터 비교”만으로 끝납니다.
- 병합 과정이 핵심이며 **안정성**이 자연스럽게 보장됩니다.

**실전 팁**
- 외부 정렬(디스크 기반 대용량 정렬)에 가장 적합합니다.

**주의**
- 추가 메모리를 반드시 사용하므로 메모리 제약이 큰 경우 주의해야 합니다.`,
  "quick-sort": `### 심화 포인트
**개념 강조**
- pivot 위치가 확정되는 순간 그 원소는 최종 위치에 들어갑니다.
- 분할 방식(Lomuto/Hoare)에 따라 성능과 안정성이 달라집니다.

**실전 팁**
- pivot을 랜덤/중앙값 근사로 선택하면 최악 케이스를 줄일 수 있습니다.

**주의**
- 이미 정렬된 배열에서 최악 O(n^2)이 될 수 있습니다(naive pivot).`,
  "heap-sort": `### 심화 포인트
**개념 강조**
- heapify는 **아래에서 위로** 수행하면 O(n)입니다.
- 힙 크기를 줄여가며 **정렬 영역을 뒤쪽에 확정**합니다.

**실전 팁**
- 메모리가 제한된 환경에서 안정적인 성능을 원할 때 유리합니다.

**주의**
- 캐시 친화성이 낮아 실제 실행 시간은 병합/퀵보다 느릴 수 있습니다.`,
};

const mergeGuide = (base?: GuideSection[], extra?: GuideSection[]) => {
  if (!base && !extra) return undefined;
  return [...(base ?? []), ...(extra ?? [])];
};

const mergeFeatures = (base?: { title: string; description: string }[], extra?: { title: string; description: string }[]) => {
  if (!base && !extra) return undefined;
  return [...(base ?? []), ...(extra ?? [])];
};

const mergeImplementation = (base?: CTPImplementationExample[], extra?: CTPImplementationExample[]) => {
  if (!base && !extra) return undefined;
  return [...(base ?? []), ...(extra ?? [])];
};

const arrayGuide: GuideSection[] = [
  {
    title: "불변식 & 경계 조건",
    items: [
      {
        label: "Index Safety",
        description: "인덱스는 [0, n-1]를 벗어나지 않게 유지해야 하며, 루프 내부에서 i/j가 갱신될 때마다 경계를 재검증합니다.",
        code: "# 항상 먼저 경계 체크\nif not (0 <= i < n):\n    return",
        tags: ["Invariant"],
      },
      {
        label: "Length-1 케이스",
        description: "배열 길이가 0 또는 1일 때는 대부분의 알고리즘이 즉시 종료되어야 합니다.",
        code: "if len(arr) <= 1:\n    return arr",
        tags: ["Edge"],
      },
    ],
  },
  {
    title: "실전 패턴",
    items: [
      {
        label: "Prefix Sum",
        description: "구간 합/카운트 문제는 prefix sum으로 O(1) 질의로 바꿉니다.",
        code: "pref = [0]\nfor x in arr: pref.append(pref[-1] + x)\n# sum(l..r) = pref[r+1] - pref[l]",
        tags: ["Pattern"],
      },
      {
        label: "Two Pointers",
        description: "정렬 배열에서 i/j를 이동하며 조건을 만족하는 최소/최대 구간을 찾습니다.",
        code: "i = 0\nfor j in range(n):\n    while cond: i += 1",
        tags: ["Pattern"],
      },
    ],
  },
];

const linkedListGuide: GuideSection[] = [
  {
    title: "포인터 조작 핵심",
    items: [
      {
        label: "삽입 순서",
        description: "새 노드 삽입 시 기존 연결을 먼저 보관한 후 포인터를 갱신합니다.",
        code: "new.next = cur.next\ncur.next = new",
        tags: ["Invariant"],
      },
      {
        label: "삭제 순서",
        description: "삭제는 대상 노드의 이전 노드가 필요하며, 참조를 잃지 않도록 순서를 지킵니다.",
        code: "prev.next = cur.next\ncur.next = None",
        tags: ["Edge"],
      },
    ],
  },
  {
    title: "실전 패턴",
    items: [
      {
        label: "더미 노드",
        description: "헤드 삭제/삽입을 단순화하기 위해 dummy를 사용합니다.",
        code: "dummy = Node(0); dummy.next = head",
        tags: ["Pattern"],
      },
      {
        label: "Slow/Fast",
        description: "중간 찾기/사이클 검출은 slow/fast 포인터로 해결합니다.",
        code: "while fast and fast.next:\n    slow = slow.next\n    fast = fast.next.next",
        tags: ["Pattern"],
      },
    ],
  },
];

const stackGuide: GuideSection[] = [
  {
    title: "스택 불변식",
    items: [
      {
        label: "Top 관리",
        description: "push는 top 증가 후 저장, pop은 읽고 top 감소의 순서를 고정합니다.",
        code: "top += 1\narr[top] = x\n# pop\nval = arr[top]\ntop -= 1",
        tags: ["Invariant"],
      },
      {
        label: "Under/Over Flow",
        description: "빈 스택 pop과 가득 찬 스택 push는 반드시 방어 로직이 필요합니다.",
        code: "if top < 0: raise IndexError",
        tags: ["Edge"],
      },
    ],
  },
  {
    title: "모노토닉 스택",
    items: [
      {
        label: "단조 조건",
        description: "스택 내부를 증가/감소로 유지해 다음 큰/작은 값 문제를 해결합니다.",
        code: "while stack and arr[stack[-1]] <= arr[i]:\n    stack.pop()",
        tags: ["Pattern"],
      },
    ],
  },
];

const queueGuide: GuideSection[] = [
  {
    title: "큐 불변식",
    items: [
      {
        label: "front/rear 규칙",
        description: "front는 다음 pop 위치, rear는 다음 push 위치를 가리키도록 유지합니다.",
        code: "# push\narr[rear] = x\nrear = (rear + 1) % n",
        tags: ["Invariant"],
      },
      {
        label: "empty/full",
        description: "원형 큐는 (front == rear)만으로 empty/full을 구분할 수 없으므로 count를 둡니다.",
        code: "if count == 0: empty\nif count == n: full",
        tags: ["Edge"],
      },
    ],
  },
  {
    title: "실전 패턴",
    items: [
      {
        label: "BFS 레벨",
        description: "큐 길이를 기준으로 레벨 단위로 처리하면 최단 거리/레벨을 쉽게 구합니다.",
        code: "for _ in range(len(q)):\n    v = q.popleft()",
        tags: ["Pattern"],
      },
    ],
  },
];

const treeGuide: GuideSection[] = [
  {
    title: "트리 불변식",
    items: [
      {
        label: "부모-자식 관계",
        description: "모든 노드는 정확히 하나의 부모를 가지며, 루트는 예외입니다.",
        code: "# root has no parent",
        tags: ["Invariant"],
      },
      {
        label: "높이/깊이",
        description: "높이와 깊이를 구분해서 설명할 수 있어야 합니다.",
        code: "depth: root->node\nheight: node->leaf",
        tags: ["Definition"],
      },
    ],
  },
  {
    title: "순회 패턴",
    items: [
      {
        label: "재귀 vs 반복",
        description: "재귀는 직관적이지만 스택 제한이 있으므로 반복 순회 패턴도 익힙니다.",
        code: "stack = [root]\nwhile stack: node = stack.pop()",
        tags: ["Pattern"],
      },
    ],
  },
];

const sortingGuide: GuideSection[] = [
  {
    title: "정렬 공통 체크",
    items: [
      {
        label: "안정성",
        description: "안정 정렬은 동일 키의 상대 순서를 유지합니다.",
        code: "# stable: merge sort, insertion sort",
        tags: ["Concept"],
      },
      {
        label: "비교/교환",
        description: "비교 횟수 vs 교환 횟수의 차이를 분석해 문제에 맞는 알고리즘을 선택합니다.",
        code: "# 비교 많음/교환 적음 등을 고려",
        tags: ["Tradeoff"],
      },
    ],
  },
];

const searchGuide: GuideSection[] = [
  {
    title: "이분 탐색 불변식",
    items: [
      {
        label: "구간 유지",
        description: "항상 답이 [low, high] 안에 있다는 불변식을 유지합니다.",
        code: "while low <= high:\n    mid = (low+high)//2",
        tags: ["Invariant"],
      },
      {
        label: "무한 루프 방지",
        description: "mid 갱신 후 low/high 이동이 항상 범위를 줄여야 합니다.",
        code: "if cond: low = mid + 1\nelse: high = mid - 1",
        tags: ["Edge"],
      },
    ],
  },
];

const expansions: Record<string, Expansion> = {
  "1d-array": {
    story: {
      problem: `배열은 거의 모든 알고리즘의 출발점이지만, **삽입/삭제가 느리다는 한계**를 정확히 이해하지 못하면 성능을 크게 놓칠 수 있습니다.\n\n특히 코딩테스트에서는 “정렬 + 인덱스 기반 접근”을 요구하는 문제가 많아, 배열의 장단점을 명확히 알아야 합니다.`,
      definition: `**핵심 아이디어**: 연속된 메모리 공간에 데이터를 저장하므로 임의 접근이 O(1)입니다.\n\n**불변식**\n- 인덱스 i는 항상 0 ≤ i < n을 만족해야 합니다.\n- 정렬 여부/중복 허용 여부를 명확히 유지해야 합니다.\n\n**실전 패턴**\n- Prefix Sum, Sliding Window, Two Pointers는 배열 기반 최적화의 3대 패턴입니다.\n- 정렬 후 이분 탐색으로 탐색 비용을 줄입니다.`,
      analogy: `영화관 좌석이 연속적으로 배치되어 있어 **특정 좌석 번호를 바로 찾을 수 있는 구조**와 같습니다.\n하지만 중간 좌석을 새로 추가하려면 뒤의 사람들이 모두 이동해야 하는 불편함이 있습니다.`,
      playgroundDescription: `시뮬레이터에서 **active_index**가 어떻게 이동하는지 확인하면서,\n1) 탐색 구간이 줄어드는 방식, 2) 비교 횟수 증가 지점을 관찰하세요.`,
    },
    features: [
      { title: "Random Access", description: "인덱스를 통한 접근은 O(1)입니다." },
      { title: "삽입/삭제 비용", description: "중간 삽입/삭제는 요소 이동 때문에 O(n)입니다." },
      { title: "캐시 친화성", description: "연속 메모리 구조라 실제 실행 속도가 빠릅니다." },
      { title: "정렬과 결합", description: "정렬 후 이분 탐색으로 O(log n) 탐색이 가능합니다." },
    ],
    guide: arrayGuide,
  },
  "2d-array": {
    story: {
      problem: `격자 문제(미로 탐색/섬 개수/거리 계산)는 2D 배열 이해가 부족하면 구현 실수가 잦습니다.\n\n특히 좌표계와 인덱스 변환을 정확히 이해해야 BFS/DFS가 안정적으로 동작합니다.`,
      definition: `**핵심 아이디어**: 2차원 배열은 행(row)과 열(col)의 쌍으로 값을 접근합니다.\n\n**불변식**\n- 0 ≤ r < R, 0 ≤ c < C 경계를 항상 유지해야 합니다.\n- 방문 여부(visited)와 상태값(grid)의 의미를 혼동하지 않습니다.\n\n**실전 패턴**\n- 방향 배열(dr/dc)로 이동을 관리합니다.\n- BFS는 최단거리, DFS는 연결 요소 계산에 적합합니다.`,
      analogy: `도시의 바둑판 지도에서 좌표로 위치를 찾는 것과 같습니다.\n행과 열을 바꾸면 전혀 다른 위치가 되므로 **좌표계 실수**를 조심해야 합니다.`,
      playgroundDescription: `경계 조건을 하나씩 확인하며 방문 배열이 어떻게 변하는지 확인하세요.\n특히 **diagonal 이동 여부**에 따라 결과가 달라지는 점을 관찰합니다.`,
    },
    guide: arrayGuide,
  },
  "singly": {
    story: {
      problem: `삽입/삭제가 많은 상황에서 배열을 쓰면 O(n) 이동 비용이 발생합니다.\n\n연결 리스트는 포인터 변경으로 O(1) 삽입/삭제가 가능해 동적 자료구조의 기본이 됩니다.`,
      definition: `**핵심 아이디어**: 노드는 값과 다음 노드 포인터(next)를 가진다.\n\n**불변식**\n- 마지막 노드의 next는 null이다.\n- head는 리스트의 시작을 가리킨다.\n\n**실전 패턴**\n- dummy 노드를 사용해 삽입/삭제 로직을 단순화합니다.`,
      analogy: `기차 객차가 한 줄로 연결된 구조입니다.\n새 객차를 중간에 끼우려면 연결고리만 바꾸면 됩니다.`,
      playgroundDescription: `head와 current 포인터가 어떻게 이동하는지, 삽입/삭제 시 연결이 어떻게 바뀌는지 확인하세요.`,
    },
    features: [
      { title: "O(1) 삽입/삭제", description: "노드 주소만 바꾸면 됩니다." },
      { title: "순차 접근", description: "임의 접근은 불가하며 탐색은 O(n)입니다." },
      { title: "메모리 오버헤드", description: "포인터 저장으로 추가 메모리가 필요합니다." },
      { title: "실전 활용", description: "LRU 캐시, 스택/큐 구현에 사용됩니다." },
    ],
    guide: linkedListGuide,
  },
  "doubly": {
    story: {
      problem: `단일 연결 리스트는 이전 노드로 돌아갈 수 없어서 삭제/역방향 순회가 불편합니다.\n\n이중 연결 리스트는 prev 포인터를 추가해 양방향 이동을 지원합니다.`,
      definition: `**핵심 아이디어**: 각 노드는 next와 prev를 모두 가진다.\n\n**불변식**\n- node.next.prev == node\n- node.prev.next == node\n\n**실전 패턴**\n- LRU 캐시의 핵심 자료구조로 사용됩니다.`,
      analogy: `양방향 도로처럼, 어느 방향으로도 이동 가능한 길을 만드는 것과 같습니다.`,
      playgroundDescription: `삽입/삭제 시 prev와 next를 **모두 갱신**해야 함을 확인하세요.`,
    },
    features: [
      { title: "양방향 순회", description: "prev 포인터로 뒤로 이동할 수 있습니다." },
      { title: "삭제 편의", description: "현재 노드에서 O(1) 삭제가 가능합니다." },
      { title: "메모리 비용", description: "prev 포인터 추가로 메모리 증가." },
      { title: "실전 활용", description: "LRU 캐시, 브라우저 히스토리에서 사용됩니다." },
    ],
    guide: linkedListGuide,
  },
  "circular": {
    story: {
      problem: `원형 구조가 필요한 문제(라운드로빈, 큐 구현)에서는 일반 리스트만으로는 끝과 시작을 연결하기 어렵습니다.`,
      definition: `**핵심 아이디어**: 마지막 노드가 head를 가리켜 순환 구조를 만든다.\n\n**불변식**\n- tail.next == head\n- 순회 시 종료 조건을 명확히 설정해야 한다.`,
      analogy: `원형 트랙을 도는 경기처럼 끝이 곧 시작이 됩니다.`,
      playgroundDescription: `tail에서 head로 다시 연결되는 지점을 집중 관찰하세요.`,
    },
    features: [
      { title: "원형 구조", description: "끝과 시작이 연결된 구조를 표현합니다." },
      { title: "무한 루프 주의", description: "종료 조건을 명확히 해야 합니다." },
      { title: "라운드 로빈", description: "스케줄링/큐에 자주 사용됩니다." },
      { title: "포인터 관리", description: "tail/head 갱신이 핵심입니다." },
    ],
    guide: linkedListGuide,
  },
  "lifo-basics": {
    story: {
      problem: `되돌리기/괄호 검사/재귀 구조는 LIFO 구조가 없으면 구현이 어렵습니다.`,
      definition: `**핵심 아이디어**: 마지막에 들어온 데이터가 가장 먼저 나간다.\n\n**불변식**\n- push는 top을 증가, pop은 감소시킨다.`,
      analogy: `접시를 쌓아두고 위에서 하나씩 꺼내는 것과 같습니다.`,
      playgroundDescription: `push/pop 시 top이 어떻게 바뀌는지 관찰하세요.`,
    },
    guide: stackGuide,
  },
  "linear-queue": {
    story: {
      problem: `큐는 FIFO 구조가 필요하지만, 단순 배열 구현은 front가 이동하며 공간이 낭비됩니다.`,
      definition: `**핵심 아이디어**: front는 삭제 위치, rear는 삽입 위치를 가리킨다.`,
      analogy: `줄 서서 기다리는 것처럼 먼저 온 사람이 먼저 나갑니다.`,
      playgroundDescription: `front/rear가 어떻게 이동하는지 관찰하세요.`,
    },
    guide: queueGuide,
  },
  "circular-queue": {
    story: {
      problem: `선형 큐는 공간 낭비가 발생하므로, 원형 큐로 공간을 재사용해야 합니다.`,
      definition: `**핵심 아이디어**: rear/front를 모듈로 연산해 원형으로 연결한다.`,
      analogy: `회전 초밥 벨트처럼 끝이 시작과 연결되어 있습니다.`,
      playgroundDescription: `rear가 끝에서 다시 0으로 돌아오는 순간을 관찰하세요.`,
    },
    guide: queueGuide,
  },
  "tree-basics": {
    story: {
      problem: `계층 구조(파일 시스템, 조직도)를 표현하려면 배열/리스트만으로는 어렵습니다.`,
      definition: `**핵심 아이디어**: 노드와 간선으로 이루어진 계층 구조.\n\n**불변식**\n- 사이클이 없고, 루트에서 모든 노드로 경로가 존재한다.`,
      analogy: `가족 족보처럼 부모-자식 관계가 이어지는 구조입니다.`,
      playgroundDescription: `루트/리프/깊이를 관찰하며 구조를 이해하세요.`,
    },
    features: [
      { title: "계층 표현", description: "부모-자식 관계를 명확히 나타냅니다." },
      { title: "순회", description: "전위/중위/후위 순회가 핵심입니다." },
      { title: "재귀 구조", description: "부분 문제로 분해됩니다." },
      { title: "실전 활용", description: "폴더 구조, DOM 트리, 파서 등에 사용됩니다." },
    ],
    guide: treeGuide,
  },
  bst: {
    story: {
      problem: `정렬된 데이터에서 O(log n) 탐색을 원한다면 BST를 이해해야 합니다.`,
      definition: `**핵심 아이디어**: 왼쪽 < 루트 < 오른쪽 불변식을 유지한다.\n\n**불변식**\n- 모든 왼쪽 서브트리는 루트보다 작다\n- 모든 오른쪽 서브트리는 루트보다 크다`,
      analogy: `시험 성적표를 작은 값은 왼쪽, 큰 값은 오른쪽에 배치하는 것과 같습니다.`,
      playgroundDescription: `삽입/삭제 후에도 BST 불변식이 유지되는지 확인하세요.`,
    },
    features: [
      { title: "O(log n) 탐색", description: "균형 BST에서는 탐색이 빠릅니다." },
      { title: "불균형 위험", description: "편향되면 O(n)까지 느려집니다." },
      { title: "삭제 케이스", description: "자식 0/1/2개 경우를 구분합니다." },
      { title: "실전 활용", description: "Map/Set의 기본 개념입니다." },
    ],
    guide: treeGuide,
  },
  "bubble-sort": {
    story: {
      problem: `정렬 개념을 직관적으로 이해하는 데 버블 정렬이 가장 적합합니다.`,
      definition: `**정의**\n버블 정렬은 **인접한 두 원소를 비교해 필요하면 교환**하고, 이 과정을 여러 번 반복하여 정렬을 완성하는 방법입니다.\n\n**작동 방식**\n- 한 번의 패스가 끝나면 **가장 큰 값이 배열의 끝으로 이동**합니다.\n- 다음 패스에서는 맨 끝을 제외하고 같은 과정을 반복합니다.\n- 한 번의 패스에서 교환이 없으면 이미 정렬된 상태이므로 **조기 종료**할 수 있습니다.\n\n**특징**\n- 안정 정렬(같은 값의 상대 순서 유지)\n- 구현은 간단하지만 시간 복잡도가 O(n^2)로 느립니다.`,
      analogy: `거품이 위로 올라오듯 큰 값이 끝으로 이동합니다.`,
      playgroundDescription: `스왑이 반복될수록 배열이 정렬되는 과정을 확인하세요.`,
    },
    guide: sortingGuide,
  },
  "selection-sort": {
    story: {
      problem: `정렬의 기본 구조를 이해하기 위해 선택 정렬을 학습합니다.`,
      definition: `**정의**\n선택 정렬은 매 단계에서 **정렬되지 않은 구간의 최솟값을 찾아** 현재 위치와 교환하는 방식입니다.\n\n**작동 방식**\n- i번째 위치에 들어갈 최소값을 전체에서 탐색합니다.\n- 찾은 최소값을 i번째와 교환합니다.\n- i를 한 칸 이동하며 같은 과정을 반복합니다.\n\n**특징**\n- 비교 횟수는 항상 동일(≈ n^2/2)\n- 교환 횟수는 최대 n-1로 적음\n- 일반적으로 **불안정 정렬**입니다.`,
      analogy: `가장 작은 카드를 찾아 맨 앞에 놓는 과정과 같습니다.`,
      playgroundDescription: `최솟값 선택 과정과 swap 위치를 확인하세요.`,
    },
    guide: sortingGuide,
  },
  "insertion-sort": {
    story: {
      problem: `부분 배열이 이미 정렬된 상태라면 삽입 정렬이 매우 효율적입니다.`,
      definition: `**정의**\n삽입 정렬은 **앞쪽 구간을 항상 정렬 상태로 유지**하면서, 새로 들어온 원소를 올바른 위치에 삽입하는 방식입니다.\n\n**작동 방식**\n- i번째 원소를 key로 잡고, 앞쪽 정렬 구간에서 위치를 찾습니다.\n- key보다 큰 값들을 오른쪽으로 한 칸씩 밀어냅니다.\n- 빈 자리에 key를 삽입합니다.\n\n**특징**\n- 거의 정렬된 데이터에서 매우 빠름\n- 안정 정렬이며 구현이 간단\n- 데이터가 한 개씩 들어오는 상황(온라인)에도 적합`,
      analogy: `카드를 한 장씩 뽑아 올바른 위치에 끼우는 것과 같습니다.`,
      playgroundDescription: `삽입 위치를 찾는 과정과 shift 동작을 확인하세요.`,
    },
    guide: sortingGuide,
  },
  "merge-sort": {
    story: {
      problem: `안정성과 O(n log n)을 동시에 만족하는 정렬이 필요합니다.`,
      definition: `**정의**\n병합 정렬은 **배열을 반으로 나누고(분할)**, 각각을 정렬한 뒤 **두 개의 정렬된 배열을 병합**하여 전체 정렬을 만드는 알고리즘입니다.\n\n**작동 방식**\n- 배열을 길이 1이 될 때까지 분할합니다.\n- 두 정렬된 배열을 **두 포인터(i/j)**로 비교하며 작은 값을 먼저 결과 배열에 넣습니다.\n- 이 과정을 재귀적으로 반복합니다.\n\n**특징**\n- 항상 O(n log n) 시간 보장\n- 안정 정렬\n- 병합을 위한 **추가 메모리(O(n))**가 필요`,
      analogy: `작은 두 줄을 정렬한 뒤 하나의 큰 줄로 합치는 과정입니다.`,
      playgroundDescription: `병합 과정에서 두 포인터가 어떻게 움직이는지 확인하세요.`,
    },
    guide: sortingGuide,
  },
  "quick-sort": {
    story: {
      problem: `평균적으로 가장 빠른 정렬 알고리즘으로 널리 사용됩니다.`,
      definition: `**정의**\n퀵 정렬은 **기준값(pivot)을 하나 선택**하고, pivot보다 작은 값은 왼쪽, 큰 값은 오른쪽으로 분할한 뒤 각 부분을 재귀적으로 정렬하는 방식입니다.\n\n**작동 방식**\n- pivot을 정합니다(첫 값/마지막 값/중앙/랜덤 등).\n- 분할(partition) 과정에서 pivot 위치가 확정됩니다.\n- pivot 기준으로 왼쪽/오른쪽을 재귀 정렬합니다.\n\n**특징**\n- 평균 O(n log n)로 매우 빠름\n- pivot 선택이 나쁘면 최악 O(n^2)\n- 추가 메모리 사용이 적은 in-place 정렬`,
      analogy: `기준점을 정하고 작은 값과 큰 값을 양쪽으로 분리하는 과정입니다.`,
      playgroundDescription: `pivot이 어디에 놓이는지 확인하세요.`,
    },
    guide: sortingGuide,
  },
  "heap-sort": {
    story: {
      problem: `추가 메모리 없이 O(n log n)을 보장하는 정렬이 필요합니다.`,
      definition: `**정의**\n힙 정렬은 **힙(완전 이진 트리의 우선순위 구조)**을 이용해 최대값/최솟값을 반복적으로 꺼내 정렬하는 방식입니다.\n\n**작동 방식**\n- 배열을 힙 구조로 만든 뒤(root가 최대/최소),\n- root와 배열 끝을 교환하고, 힙 크기를 1 줄입니다.\n- 줄어든 힙에 대해 heapify를 반복합니다.\n\n**특징**\n- 항상 O(n log n) 성능 보장\n- in-place 정렬 (추가 메모리 적음)\n- 불안정 정렬`,
      analogy: `우선순위 큐에서 하나씩 뽑아 정렬하는 것과 같습니다.`,
      playgroundDescription: `heapify → extract 과정이 반복되는 것을 확인하세요.`,
    },
    guide: sortingGuide,
  },
  "basic-binary-search": {
    story: {
      problem: `정렬된 배열에서 선형 탐색은 너무 느립니다.`,
      definition: `**핵심 아이디어**: 탐색 구간을 절반씩 줄여 O(log n)으로 찾는다.\n\n**불변식**\n- 답이 항상 [low, high] 범위 안에 존재한다.`,
      analogy: `사전에서 단어를 찾기 위해 중간 페이지부터 보는 것과 같습니다.`,
      playgroundDescription: `low/high/mid가 움직이며 범위가 줄어드는 과정을 확인하세요.`,
    },
    features: [
      { title: "O(log n)", description: "로그 시간 탐색." },
      { title: "정렬 필수", description: "정렬되지 않으면 사용할 수 없습니다." },
      { title: "경계 조건", description: "mid 계산과 루프 조건이 중요합니다." },
      { title: "실전 활용", description: "파라메트릭 서치의 기본입니다." },
    ],
    guide: searchGuide,
  },

  // ───────────────────────────────────────────────────────────────
  // 신규 module-01~04 커리큘럼 placeholder (Phase 1 Content Specialist 가 채움)
  // ───────────────────────────────────────────────────────────────

  // module-01: algorithm-foundation
  "algo-overview": {},
  "flow-tracing": {},
  "iterative-recursion": {
    story: {
      definition: `**왜 변환하는가?**\n- Python 등 일부 언어는 꼬리 재귀 자동 최적화(TCO)를 제공하지 않는다.\n- 입력 크기가 커 호출 깊이가 수만 단계에 이르면 스택 오버플로가 발생한다.\n- 디버거에서 스택 프레임이 너무 많아 추적이 어려운 경우 명시적 스택이 더 명확하다.\n\n**명시 스택 패턴**\n- 재귀의 "프레임"을 스택에 push할 데이터(파라미터, 진행 단계, 복귀 지점)로 모델링.\n- while 루프에서 pop → 처리 → 필요 시 자식 push 흐름으로 동작 재현.`,
      playgroundDescription: `재귀 호출이 어떻게 명시 스택의 push/pop으로 치환되는지, 동일 입력에 대해 동일 결과가 나오는지 단계별로 확인하세요.`,
    },
    features: [
      { title: "스택 오버플로 회피", description: "암시적 호출 스택 대신 힙(heap) 메모리의 스택 자료구조를 사용하면 OS 스택 한도와 무관하게 깊은 탐색이 가능합니다." },
      { title: "디버깅 용이성", description: "스택 내용이 명시적이므로 현재 진행 상태와 남은 작업을 직접 출력하거나 검증할 수 있습니다." },
      { title: "메모리 vs 가독성 트레이드오프", description: "코드는 길어지고 가독성은 떨어지지만, 깊이 제한이 사라지고 흐름 제어가 명확해지는 이점이 있습니다." },
      { title: "꼬리 재귀 최적화 부재", description: "Python·Java 등 대부분 언어는 자동 TCO를 지원하지 않으므로, 재귀 깊이가 큰 알고리즘은 반복 변환이 안전합니다." },
    ],
    guide: [
      {
        title: "재귀 → 반복 변환 템플릿",
        items: [
          {
            label: "기본 변환",
            description: "스택에 작업을 push, 루프에서 pop하며 처리. 필요 시 자식 작업을 다시 push.",
            code: "stack = [initial_task]\nwhile stack:\n    task = stack.pop()\n    # 처리\n    for child in next_tasks(task):\n        stack.append(child)",
            tags: ["Pattern"],
          },
          {
            label: "DFS 변환 예",
            description: "트리 DFS 재귀를 명시 스택으로 변환.",
            code: "stack = [root]\nwhile stack:\n    node = stack.pop()\n    visit(node)\n    if node.right: stack.append(node.right)\n    if node.left: stack.append(node.left)",
            tags: ["Pattern"],
          },
        ],
      },
    ],
  },
  "condition-loop": {},
  "recursion-basics": {
    story: {
      definition: `**기저 조건(Base Case)의 중요성**\n- 기저 조건이 없거나 도달 불가능하면 스택 오버플로가 발생한다.\n- 입력이 매 호출마다 단조 감소(또는 단조 증가)해 반드시 기저 조건에 닿는지 확인해야 한다.\n\n**호출 스택 메모리 비용**\n- 호출 1회 = 스택 프레임 1개(지역 변수 + 반환 주소).\n- 깊이 N의 재귀는 O(N) 추가 메모리를 사용한다.\n- Python 기본 재귀 한도는 약 1000회 (\`sys.getrecursionlimit()\`).`,
      playgroundDescription: `기저 조건이 어디서 발동하는지, 그리고 호출 스택이 어떻게 쌓였다 풀리는지 단계별로 관찰하세요.`,
    },
    features: [
      { title: "꼬리 재귀 vs 머리 재귀", description: "꼬리 재귀(Tail Recursion)는 마지막 동작이 자기 호출이라 변환이 쉽고, 머리 재귀는 호출 결과를 결합해야 해 변환이 까다롭습니다." },
      { title: "스택 오버플로 임계값", description: "재귀 깊이가 OS 스택 크기를 넘으면 RuntimeError(Python) 또는 segfault(C/C++)가 발생합니다. 입력 크기에서 깊이를 미리 예측해야 합니다." },
      { title: "재귀 한도 조정", description: "Python에서는 `sys.setrecursionlimit(10000)`으로 조정 가능하지만, 본질적 해결책은 반복문 전환 또는 명시적 스택 사용입니다." },
    ],
    guide: [
      {
        title: "재귀 설계 체크리스트",
        items: [
          {
            label: "기저 조건 먼저",
            description: "함수 시작점에서 기저 조건을 검사하고 즉시 반환합니다.",
            code: "def f(n):\n    if n <= 0:\n        return 0  # base case\n    return n + f(n - 1)",
            tags: ["Invariant"],
          },
          {
            label: "입력 단조 감소",
            description: "재귀 호출의 인자가 기저 조건 방향으로 반드시 줄어드는지 확인합니다.",
            code: "# OK: f(n-1)  → 0으로 수렴\n# BAD: f(n) → 무한 재귀",
            tags: ["Edge"],
          },
        ],
      },
    ],
  },
  "tower-of-hanoi": {
    story: {
      definition: `**점화식과 최소 이동 횟수**\n- T(n) = 2T(n-1) + 1\n- 풀이: T(n) = 2^n - 1.\n- n=10 → 1023회, n=20 → 약 100만 회, n=64 → 약 1.8×10^19회.\n\n**분할 전략**\n- n-1개를 보조 기둥(via auxiliary)으로 이동.\n- 가장 큰 원판 1개를 목적 기둥으로 이동.\n- n-1개를 보조 기둥에서 목적 기둥으로 이동.`,
      playgroundDescription: `보조 기둥의 역할이 매 재귀 호출마다 어떻게 바뀌는지 관찰하세요. 같은 기둥이 어떤 호출에서는 from, 다른 호출에서는 via가 됩니다.`,
    },
    features: [
      { title: "분할 정복 사고의 정수", description: "한 번에 풀 수 없는 문제를 같은 형태의 더 작은 문제로 분해하는 사고 패턴이 하노이의 탑에 가장 선명하게 드러납니다." },
      { title: "보조 기둥 선택 규칙", description: "from·to·via 세 기둥의 역할이 매 재귀 호출마다 바뀌며, 이를 함수 인자로 명시적으로 전달하는 패턴을 익힙니다." },
      { title: "지수 복잡도 체감", description: "n이 1 증가할 때마다 이동 횟수가 2배가 되는 지수 성장의 위험성을 실제 숫자로 확인합니다." },
      { title: "전설의 하노이 (n=64)", description: "신화 속 64개 원판을 모두 옮기는 데 약 5800억 년이 걸린다는 사실은 지수 복잡도가 왜 위험한지 보여주는 고전 예시입니다." },
    ],
    guide: [
      {
        title: "하노이의 탑 재귀 패턴",
        items: [
          {
            label: "3단계 분해",
            description: "n-1을 via로 옮긴 뒤, 1을 to로, 다시 n-1을 to로 옮깁니다.",
            code: "def hanoi(n, src, dst, via):\n    if n == 0:\n        return\n    hanoi(n - 1, src, via, dst)\n    print(f'{src} -> {dst}')\n    hanoi(n - 1, via, dst, src)",
            tags: ["Pattern"],
          },
        ],
      },
    ],
  },
  "recursion-analysis": {
    story: {
      definition: `**점화식에서 시간복잡도 도출**\n- 분할 정복 형태: T(n) = aT(n/b) + f(n)\n- 마스터 정리(Master Theorem)로 빠르게 점근식 도출 가능.\n  - 예: T(n)=2T(n/2)+O(n) → O(n log n) (병합 정렬)\n  - 예: T(n)=2T(n/2)+O(1) → O(n) (이진 트리 순회 비교)\n\n**공간복잡도 분석**\n- 활성 스택 프레임 수 = 최대 호출 깊이 = O(depth).\n- 트리 재귀에서 깊이는 트리 높이와 같다.`,
      playgroundDescription: `호출 트리를 시각화하면서 중복 호출이 어디서 발생하는지, 그리고 그 중복이 시간복잡도에 어떻게 영향을 주는지 확인하세요.`,
    },
    features: [
      { title: "분할 형태 분류", description: "T(n) = aT(n/b) + f(n) 형태에서 a(분할 개수), b(축소 비율), f(n)(병합 비용)을 식별합니다." },
      { title: "중복 호출 감지", description: "피보나치처럼 같은 입력을 여러 번 계산하는 패턴은 호출 트리에서 동일 노드의 반복으로 드러납니다." },
      { title: "메모이제이션 전환 신호", description: "중복 부분 문제 + 최적 부분 구조가 보이면 메모이제이션(top-down) 또는 DP(bottom-up)로 전환할 신호입니다." },
      { title: "공간복잡도 O(depth)", description: "한 번에 활성화되는 스택 프레임은 최대 호출 깊이만큼이므로, 공간복잡도는 호출 트리 노드 수가 아닌 트리 높이로 측정합니다." },
    ],
    guide: [
      {
        title: "메모이제이션 패턴",
        items: [
          {
            label: "순수 재귀 (느림)",
            description: "같은 부분 문제를 여러 번 재계산. O(2^n).",
            code: "def fib(n):\n    if n < 2: return n\n    return fib(n-1) + fib(n-2)",
            tags: ["Edge"],
          },
          {
            label: "메모이제이션 (빠름)",
            description: "한 번 계산한 결과를 dict/배열에 저장. O(n).",
            code: "from functools import lru_cache\n@lru_cache(None)\ndef fib(n):\n    if n < 2: return n\n    return fib(n-1) + fib(n-2)",
            tags: ["Pattern"],
          },
        ],
      },
    ],
  },

  // module-01: search-algorithms
  "search-problem-key": {},
  "linear-search": {},
  "brute-force-search": {
    story: {
      problem: `텍스트 안에서 패턴을 찾는 문제는 검색·치환·로그 분석 등 거의 모든 도구에서 마주칩니다.\n\n가장 직관적인 풀이가 어디까지 통하고 어디서 한계를 만나는지 정확히 이해해야 후속 알고리즘(KMP, Boyer-Moore)을 학습할 토대가 마련됩니다.`,
      definition: `**핵심 아이디어**: 텍스트의 모든 시작 위치 i=0..N-M에서 패턴을 한 글자씩 대조한다.\n\n**불변식**\n- i는 텍스트 시작 위치, j는 패턴 비교 위치를 가리킨다.\n- 불일치 발생 시 i를 한 칸 뒤로 돌리고 j=0으로 초기화한다.\n\n**시간복잡도**\n- 최선 O(N), 평균/최악 O(NM).\n- 텍스트와 패턴이 길고 반복 구조가 많을수록 비교 횟수가 NM에 근접한다.`,
      analogy: `책에서 특정 문장을 찾을 때 한 글자도 빠짐없이 모든 시작 위치에서 비교하는 방식과 같습니다.\n누구나 이해할 수 있지만, 책이 길고 문장이 자주 비슷하게 시작하면 같은 자리를 여러 번 보게 됩니다.`,
      playgroundDescription: `i, j 포인터가 어떻게 함께 전진하는지, 불일치 발생 시 i가 어디로 되돌아가는지를 단계별로 관찰하세요.`,
    },
    features: [
      { title: "직관적 흐름", description: "두 포인터 i, j만으로 동작하므로 구현이 짧고 디버깅이 쉽습니다." },
      { title: "최악 시나리오 인식", description: "AAAA...B 형태처럼 마지막 글자에서 자주 실패하는 입력에서 NM에 가까운 비교 횟수가 누적됩니다." },
      { title: "후속 알고리즘 동기", description: "이 풀이의 비효율 지점이 KMP의 LPS와 Boyer-Moore의 점프 규칙으로 이어집니다." },
    ],
    guide: [
      {
        title: "패턴 검색 패턴",
        items: [
          {
            label: "기본 이중 루프",
            description: "i는 시작 위치, j는 패턴 비교 위치. 끝까지 일치하면 발견.",
            code: "for i in range(N - M + 1):\n    j = 0\n    while j < M and T[i+j] == P[j]:\n        j += 1\n    if j == M:\n        return i",
            tags: ["Pattern"],
          },
          {
            label: "최악 입력",
            description: "패턴이 텍스트와 거의 같다가 마지막 글자에서 실패하면 비교 횟수가 폭증합니다.",
            code: "T = 'AAAA...AAAB'\nP = 'AAAB'  # NM에 근접",
            tags: ["Edge"],
          },
        ],
      },
    ],
  },
  "kmp-search": {
    story: {
      problem: `브루트 포스는 불일치 시 텍스트 포인터를 되돌려 같은 위치를 여러 번 비교합니다.\n\n이미 일치했던 부분에서 얻은 정보를 활용하면 텍스트를 한 번만 훑으면서 검색을 끝낼 수 있어, 긴 텍스트·반복 검사 환경에서 큰 이득을 얻습니다.`,
      definition: `**핵심 아이디어**: 패턴 내부의 접두사·접미사 일치 정보를 LPS 배열에 미리 계산해 두고, 불일치 시 j만 LPS[j-1]로 점프시킨다.\n\n**불변식**\n- 텍스트 포인터 i는 절대 뒤로 돌아가지 않는다.\n- LPS[k]는 패턴[0..k]에서 동일한 접두사와 접미사의 최대 길이.\n\n**시간복잡도**\n- LPS 구축 O(M) + 검색 O(N) = 전체 O(N+M).\n- 공간복잡도 O(M).`,
      analogy: `오답 노트를 미리 만들어 두고 같은 실수를 반복하지 않는 학습 방식과 같습니다.\n이미 맞춘 부분(접두사)을 다시 검사하지 않고 다음 단계에서 바로 이어갑니다.`,
      playgroundDescription: `LPS 테이블이 어떻게 구성되는지, 불일치 발생 시 j가 어디로 점프하는지를 함께 관찰하세요.`,
    },
    features: [
      { title: "패턴 자체 분석", description: "외부 텍스트가 아니라 패턴 내부의 대칭 구조에서 정보를 끌어냅니다." },
      { title: "재사용 가능한 LPS", description: "한 번 구축한 LPS 테이블은 동일 패턴이 등장하는 모든 텍스트에서 재사용할 수 있습니다." },
      { title: "선형 시간 보장", description: "텍스트 포인터가 단조 증가하므로 누적 비교 횟수가 N에 비례해 묶입니다." },
    ],
    guide: [
      {
        title: "LPS 구축",
        items: [
          {
            label: "두 포인터 i, len",
            description: "len은 현재까지 일치한 접두사 길이. 일치 확장 또는 LPS[len-1]로 후퇴.",
            code: "lps = [0] * M\nlen_ = 0\ni = 1\nwhile i < M:\n    if P[i] == P[len_]:\n        len_ += 1\n        lps[i] = len_\n        i += 1\n    elif len_ > 0:\n        len_ = lps[len_ - 1]\n    else:\n        lps[i] = 0\n        i += 1",
            tags: ["Pattern"],
          },
        ],
      },
      {
        title: "검색 루프",
        items: [
          {
            label: "i 단조 진행",
            description: "불일치 시 j만 LPS[j-1]로 점프하고 i는 그대로 유지.",
            code: "i = j = 0\nwhile i < N:\n    if T[i] == P[j]:\n        i += 1; j += 1\n        if j == M:\n            print('match', i - j); j = lps[j - 1]\n    elif j > 0:\n        j = lps[j - 1]\n    else:\n        i += 1",
            tags: ["Pattern"],
          },
        ],
      },
    ],
  },
  "boyer-moore-search": {
    story: {
      problem: `KMP는 텍스트를 한 글자도 건너뛰지 않으므로 입력에 따라 더 빠른 풀이가 가능한지 의문이 생깁니다.\n\n패턴과 닮지 않은 영역을 통째로 건너뛸 수 있다면 실전 텍스트에서 비교 횟수를 크게 줄일 수 있습니다.`,
      definition: `**핵심 아이디어**: 패턴을 뒤에서 앞으로 비교하고, 불일치 시 Bad Character·Good Suffix 규칙 중 더 큰 점프를 선택해 패턴을 슬라이드한다.\n\n**불변식**\n- 비교는 패턴의 마지막 글자에서 시작.\n- 두 점프 규칙은 모두 안전(정답을 건너뛰지 않음).\n\n**시간복잡도**\n- 평균은 매우 빠르고, 알파벳 크기와 패턴 길이에 비례해 점프 폭이 커진다.\n- 최악은 O(NM)이지만 실전 텍스트에서는 거의 발생하지 않는다.`,
      analogy: `긴 터널 앞에서 차량 뒤쪽 번호판만 보고 통과 여부를 결정하는 검문과 같습니다.\n전혀 다른 번호이면 차량을 통째로 통과시키고 다음 차량으로 한 번에 넘어갈 수 있습니다.`,
      playgroundDescription: `Bad Character가 패턴 안에 있을 때와 없을 때 점프 거리가 어떻게 달라지는지 관찰하세요.\nGood Suffix와의 점프 거리 비교도 확인합니다.`,
    },
    features: [
      { title: "역방향 비교", description: "패턴 마지막 글자에서 시작하므로 한 번의 확인으로 큰 영역을 배제할 수 있습니다." },
      { title: "두 규칙의 결합", description: "Bad Character와 Good Suffix 중 더 큰 점프를 선택해 평균 성능을 극대화합니다." },
      { title: "알파벳/패턴 의존성", description: "알파벳 크기가 크고 패턴이 길수록 점프 폭이 커져 실전 성능이 좋아집니다." },
    ],
    guide: [
      {
        title: "Bad Character 테이블",
        items: [
          {
            label: "마지막 등장 위치",
            description: "패턴의 각 문자가 마지막으로 등장한 위치를 기록.",
            code: "bad = {}\nfor i, c in enumerate(P):\n    bad[c] = i",
            tags: ["Pattern"],
          },
        ],
      },
      {
        title: "점프 폭 계산",
        items: [
          {
            label: "max(BC, GS)",
            description: "두 규칙 중 더 큰 점프를 적용해 패턴을 슬라이드합니다.",
            code: "shift = max(bc_shift, gs_shift)\ni += shift",
            tags: ["Pattern"],
          },
        ],
      },
    ],
  },
  "hash-collision": {
    story: {
      problem: `해시 함수는 완벽하지 않아 **충돌**이 반드시 발생합니다. 이를 어떻게 처리하느냐가 성능의 핵심입니다.`,
      definition: `**핵심 아이디어**: 동일 버킷을 공유하는 키를 관리하는 방식.\n\n**대표 전략**\n- 체이닝: 연결 리스트/배열로 버킷 관리\n- 오픈 어드레싱: 빈 슬롯을 탐색`,
      analogy: `같은 사물함 번호를 받은 사람이 여러 명일 때, 줄을 세우거나 다른 빈 칸을 찾는 상황과 같습니다.`,
      playgroundDescription: `충돌이 일어난 버킷에서 탐색 경로가 어떻게 변하는지 확인하세요.`,
    },
    features: [
      { title: "체이닝", description: "버킷마다 리스트를 사용해 충돌을 처리합니다." },
      { title: "오픈 어드레싱", description: "선형/이차/이중 해시로 빈 슬롯을 찾습니다." },
      { title: "클러스터링", description: "연속 충돌로 성능이 급락할 수 있습니다." },
      { title: "로드 팩터", description: "임계값을 넘기면 리해시가 필요합니다." },
    ],
  },

  // module-01: data-structures
  "ds-compare": {},
  "array-number-prime": {},
  "cursor-linked-list": {
    story: {
      problem: `포인터 기반 연결 리스트는 매 삽입마다 메모리를 새로 할당해야 합니다.\n\n임베디드나 정적 메모리 풀처럼 동적 할당이 제한된 환경에서는 이 비용을 감당할 수 없고, 단편화 위험도 큽니다.`,
      definition: `**핵심 아이디어**: 포인터 대신 배열 인덱스(커서)를 next 필드에 저장한다.\n\n**불변식**\n- head: 데이터 진입점 인덱스, free: 빈 슬롯 진입점 인덱스.\n- next == -1은 종단을 의미.\n- 사용 슬롯과 빈 슬롯이 같은 배열을 공유한다.\n\n**시간복잡도**\n- 삽입/삭제 O(1) (head·free 두 진입점만 갱신).\n- 임의 접근 O(N).`,
      analogy: `고정된 칸 수의 주차장에서 각 자리에 "다음 차량이 주차된 자리 번호"를 적어두는 방식과 같습니다.\n빈자리도 "다음 빈자리 번호"로 연결해 두면 새 차가 와도 빈자리를 빠르게 찾고, 떠난 자리도 다시 빈자리 목록에 끼울 수 있습니다.`,
      playgroundDescription: `삽입 시 free에서 한 칸을 떼고, 삭제 시 사용 슬롯을 다시 free 앞에 매다는 흐름을 단계별로 관찰하세요.`,
    },
    features: [
      { title: "정적 메모리 친화", description: "동적 할당이 금지된 환경에서도 연결 리스트의 유연성을 그대로 가져옵니다." },
      { title: "free 체인 재사용", description: "삭제된 슬롯을 free 앞에 매달아 다음 삽입에 즉시 재활용합니다." },
      { title: "용량 상한 명확", description: "배열 크기가 곧 노드 수 상한이며 free == -1이면 삽입 실패로 처리합니다." },
    ],
    guide: linkedListGuide,
  },
  "queue-overview": {
    story: {
      definition: `**FIFO 비용 모델**\n- \`enqueue\`: rear에 추가 → O(1).\n- \`dequeue\`: front에서 제거 → O(1).\n- 중간 접근/탐색은 큐의 기본 연산이 아니다(필요하면 다른 자료구조).\n\n**front/rear 포인터의 의미**\n- front는 "다음 dequeue 대상" 위치.\n- rear는 "다음 enqueue가 들어갈" 위치.\n- 빈 큐 / 가득 찬 큐 판별 규칙을 둘 중 어느 한 쪽 기준으로 통일해 두면 디버깅이 쉽다.`,
      playgroundDescription: `enqueue/dequeue를 번갈아 실행하면서 front와 rear의 거리가 어떻게 변하는지 추적하세요.`,
    },
    features: [
      { title: "원형 큐와의 차이", description: "선형 큐는 front가 이동하면 앞쪽 슬롯이 낭비되지만, 원형 큐는 (i+1)%n으로 처음에 다시 연결해 공간을 재활용합니다." },
      { title: "데크(Deque) 확장", description: "Deque는 양쪽 끝에서 enqueue/dequeue가 모두 가능한 큐의 확장입니다. BFS·슬라이딩 윈도우 최대값 문제에 자주 사용됩니다." },
      { title: "Python 큐 구현 비교", description: "Python에서는 `queue.Queue`(스레드 안전, 락 비용), `collections.deque`(O(1) 양끝 연산, 일반 알고리즘에 적합)을 구분해서 사용합니다." },
    ],
    guide: queueGuide,
  },

  // module-02: sorting (overview / counting / shell)
  "sorting-overview": {
    story: {
      problem: `데이터가 무작위로 섞여 있으면 검색·중복 제거·범위 질의 같은 후속 작업이 모두 비효율적으로 바뀝니다.\n\n정렬은 그 자체가 목적이 아니더라도, 데이터 준비 단계에서 절대적인 비중을 차지하는 알고리즘 그룹입니다.`,
      definition: `**핵심 분류 축**\n- **안정성**: 같은 값의 입력 순서가 출력에서도 보존되는지.\n- **내부/외부**: 데이터를 모두 메모리에 적재할 수 있는지.\n- **비교/비비교**: 원소를 직접 비교하는지(비교 기반은 정보 이론적으로 O(N log N) 하한).\n\n**의사결정**\n- 작은 N: 삽입 정렬이 간단하고 빠르다.\n- 거의 정렬됨: 삽입·셸 정렬이 유리.\n- 값 범위 K가 작은 정수: 도수 정렬이 O(N+K).\n- 안정성 필요: 병합·삽입·도수 정렬.\n- 메모리 제약: 힙 정렬(in-place).`,
      analogy: `학생들이 키 순서대로 줄을 서는 방법은 여러 가지가 있고, "같은 키끼리 누가 앞인지" 정해 두는 규칙 유무에 따라 결과의 의미가 달라집니다.\n정렬 알고리즘은 모두 "줄 세우는 한 가지 규칙"을 정형화한 것입니다.`,
      playgroundDescription: `같은 입력에 대해 정렬 알고리즘별 비교/교환 횟수와 안정성을 비교해 보세요.`,
    },
    features: [
      { title: "분류 축 명확화", description: "안정성·내외부·비교/비비교 세 축으로 알고리즘을 그룹화해 선택 기준을 정리합니다." },
      { title: "하한 인식", description: "비교 기반은 O(N log N)이 한계이며, 그 아래로 가려면 비비교 정렬(도수·기수)이 필요합니다." },
      { title: "데이터 특성 우선", description: "단 하나의 \"가장 빠른 정렬\"은 없고, 입력 특성에 따라 최적 알고리즘이 달라집니다." },
    ],
    guide: sortingGuide,
  },
  "counting-sort": {
    story: {
      problem: `비교 기반 정렬은 O(N log N)보다 빨라질 수 없다는 한계가 있습니다.\n\n시험 점수(0~100), 투표 결과(후보 ID 10명)처럼 값의 범위가 좁고 미리 알려진 데이터에서는 비교 자체를 생략한 더 빠른 정렬이 가능합니다.`,
      definition: `**핵심 아이디어**: 각 값이 몇 번 등장했는지 도수 배열에 기록하고, 누적 도수로 출력 위치를 직접 계산한다.\n\n**불변식**\n- 사전 조건: 정수형이고 값 범위 [0, K]를 알아야 한다.\n- 입력을 뒤에서부터 훑으며 count[v]를 감소시켜야 안정성이 유지된다.\n\n**시간복잡도**\n- 시간 O(N + K), 공간 O(N + K).\n- K가 N보다 매우 크면 메모리가 폭증하므로 사용 시나리오가 제한된다.`,
      analogy: `시험 점수표에서 "90점이 3명, 95점이 5명"이라는 빈도표를 만든 뒤, 점수가 높은 순으로 좌석을 미리 배정해 두는 것과 같습니다.\n핵심은 "누가 누구보다 큰가"가 아니라 "같은 점수가 몇 명인가"입니다.`,
      playgroundDescription: `도수 배열 → 누적 도수 변환 → 안정적 배치 3단계가 어떻게 진행되는지 단계별로 관찰하세요.`,
    },
    features: [
      { title: "비교 없는 정렬", description: "원소를 직접 비교하지 않으므로 비교 기반의 O(N log N) 하한을 우회합니다." },
      { title: "K 의존성", description: "K가 작거나 정수 범위가 좁을 때만 효율적이고, K가 크면 도수 배열이 텅 비어 비효율적입니다." },
      { title: "안정성 보장", description: "입력을 역방향으로 훑으며 배치하면 같은 값의 원래 순서가 보존됩니다." },
    ],
    guide: [
      {
        title: "도수 정렬 3단계",
        items: [
          {
            label: "1) 도수 배열",
            description: "각 값의 등장 횟수를 count[v]에 기록.",
            code: "count = [0] * (K + 1)\nfor x in arr:\n    count[x] += 1",
            tags: ["Pattern"],
          },
          {
            label: "2) 누적 도수",
            description: "count[v]를 \"v 이하 원소 개수\"로 변환.",
            code: "for v in range(1, K + 1):\n    count[v] += count[v - 1]",
            tags: ["Pattern"],
          },
          {
            label: "3) 안정 배치",
            description: "입력을 역방향으로 훑으며 count[v]를 감소시켜 출력에 배치.",
            code: "out = [0] * N\nfor x in reversed(arr):\n    count[x] -= 1\n    out[count[x]] = x",
            tags: ["Pattern"],
          },
        ],
      },
    ],
  },
  "shell-sort": {
    story: {
      problem: `삽입 정렬은 거의 정렬된 데이터에서 빠르지만, 큰 값이 맨 앞에 있는 무작위 입력에서는 그 값을 끝까지 한 칸씩 밀어내야 합니다.\n\n한 원소를 N번에 가깝게 이동시키는 비용이 누적되면 O(N²)에 묶이므로, 한 번에 멀리 이동시키는 방법이 필요합니다.`,
      definition: `**핵심 아이디어**: 일정 간격(gap)으로 떨어진 원소끼리 부분 배열을 만들어 삽입 정렬한 뒤, gap을 점차 줄여 마지막에 gap=1로 마무리한다.\n\n**불변식**\n- 같은 gap 그룹은 항상 정렬된 상태.\n- gap이 감소할수록 배열은 점점 더 정렬되어 있음.\n\n**시간복잡도**\n- 평균 O(N^1.5), gap 수열 선택에 따라 O(N^4/3)까지 개선 가능.\n- Shell, Hibbard, Sedgewick 등 다양한 gap 수열이 제안됨.`,
      analogy: `엉킨 머리를 빗을 때 처음엔 굵은 빗(gap=4)으로 큰 덩어리를 풀고, 점차 가는 빗으로 바꾸며 마지막에 참빗(gap=1)으로 마무리하는 것과 같습니다.`,
      playgroundDescription: `gap이 어떻게 줄어드는지, 각 회차에서 멀리 떨어진 원소가 한 번에 자리를 잡는 모습을 관찰하세요.`,
    },
    features: [
      { title: "장거리 교환", description: "한 번의 교환으로 멀리 떨어진 원소를 자리에 가깝게 보내 이동 횟수를 절감합니다." },
      { title: "gap 수열 의존성", description: "어떤 gap 수열을 쓰느냐에 따라 평균 시간복잡도가 크게 달라집니다." },
      { title: "마지막은 삽입 정렬", description: "gap=1 단계에서는 이미 거의 정렬된 상태이므로 추가 이동이 거의 없습니다." },
    ],
    guide: [
      {
        title: "셸 정렬 핵심 루프",
        items: [
          {
            label: "gap 감소 루프",
            description: "각 gap마다 부분 배열에 대해 삽입 정렬 수행.",
            code: "gap = N // 2\nwhile gap > 0:\n    for i in range(gap, N):\n        key = arr[i]; j = i\n        while j >= gap and arr[j - gap] > key:\n            arr[j] = arr[j - gap]; j -= gap\n        arr[j] = key\n    gap //= 2",
            tags: ["Pattern"],
          },
        ],
      },
    ],
  },

  // 종합 평가 (fc-1 ~ fc-4)
  "fc-1": {
    story: {
      definition: `Module 1 학습 후 배열 인덱싱, 선형 탐색, 이진 탐색, 해시 충돌 처리 4가지 핵심 개념을 통합 적용하는 평가다.\n- 4단계 워크플로(최댓값 → 선형 탐색 → 이진 탐색 → 해시)로 각 알고리즘의 시간 복잡도 차이를 체험한다.\n- 같은 배열을 4가지 방식으로 다뤄보며 어떤 상황에 어떤 알고리즘이 유리한지 직관을 쌓는다.\n- 한 페이지 안에서 자료구조별 비용 모델을 비교한다.`,
    },
    features: [
      {
        title: "통합 워크플로",
        description: "한 화면에서 4가지 알고리즘이 같은 데이터에 어떻게 다르게 접근하는지 한눈에 비교한다. 학습 전 vs 학습 후의 사고 흐름을 측정할 수 있다.",
      },
      {
        title: "시간 복잡도 직관",
        description: "선형 O(N) vs 이진 O(log N) vs 해시 O(1)의 차이를 step 수로 직접 비교한다. N=1000에서 step 수 차이가 가시화된다.",
      },
      {
        title: "자료구조 선택 연습",
        description: "정렬 여부, 중복 허용, 메모리 제약 등 조건에 따라 어떤 자료구조가 적합한지 판단 능력을 키운다.",
      },
    ],
  },
  "fc-2": {
    story: {
      definition: `Module 2 학습 후 스택/큐, 재귀, 백트래킹 알고리즘과 Module 3 정렬 기초를 통합 적용하는 평가다.\n- 스택/큐/재귀 트리 3개 자료구조의 동작 흐름을 한 화면에서 비교한다.\n- 같은 문제를 재귀로도 반복으로도 풀어보며 변환 패턴을 익힌다.\n- 백트래킹과 단순 brute-force의 차이를 가지치기 시점으로 체감한다.`,
    },
    features: [
      {
        title: "3가지 자료구조 동시 비교",
        description: "스택(LIFO), 큐(FIFO), 재귀 호출 트리를 같은 step에서 관찰한다. 어떤 문제는 어떤 구조에 자연스러운지 직관이 생긴다.",
      },
      {
        title: "재귀 ↔ 반복 변환",
        description: "팩토리얼, 피보나치 같은 단순 예제부터 시작해 명시 스택으로 재귀를 변환하는 패턴을 익힌다.",
      },
      {
        title: "백트래킹 가지치기",
        description: "전체 탐색과 가지치기 탐색의 step 수를 비교해 분기 결정의 비용 가치를 체득한다.",
      },
    ],
  },
  "fc-3": {
    story: {
      definition: `Module 3 문자열 검색과 Module 4 연결 리스트/트리를 통합한 평가다.\n- 문자열 매칭, 연결 리스트 traversal, 트리 순회 세 가지 작업을 같은 step 시나리오로 진행한다.\n- 자료구조별 traversal 비용을 비교하고 어떤 자료구조가 어떤 검색 패턴에 적합한지 판단한다.\n- KMP 같은 효율적 검색 알고리즘이 일반 traversal 대비 얼마나 빠른지 step 수로 가시화한다.`,
    },
    features: [
      {
        title: "다중 자료구조 traversal",
        description: "문자열 인덱스 traversal, 연결 리스트 next-chain traversal, 트리 in-order traversal을 한 화면에서 비교한다.",
      },
      {
        title: "검색 알고리즘 비교",
        description: "Brute force, KMP, 트리 BST 탐색의 step 수 차이를 직접 측정한다. 입력 크기 N에 따른 비용 차이가 가시화된다.",
      },
      {
        title: "자료구조 → 알고리즘 매핑",
        description: "어떤 자료구조에 어떤 알고리즘이 자연스러운지 학습 단계의 종합 결과로 확인한다.",
      },
    ],
  },
  "fc-4": {
    story: {
      definition: `전 모듈 종합 평가. 타이머 환경에서 4문제 미니 시험 형식으로 학습 효과를 검증한다.\n- 시간 압박(약 20-30분 권장)과 정답률을 동시에 측정해 실제 코딩테스트와 유사한 환경 제공.\n- 문제 4개는 각 모듈의 핵심 개념을 골고루 다룬다.\n- 풀이 직후 자기 평가 + 학습 노트가 자동 정리된다.`,
    },
    features: [
      {
        title: "실전 시간 압박",
        description: "타이머가 가시화되어 시간 분배와 풀이 속도를 동시에 훈련한다. 일정 시간 초과 시 자동 평가로 넘어간다.",
      },
      {
        title: "4 모듈 종합 평가",
        description: "Module 1~4의 핵심 개념을 1문제씩 다룬다. 한 모듈에 약점이 있으면 점수에 즉시 반영되어 약점을 식별한다.",
      },
      {
        title: "학습 노트 자동 정리",
        description: "풀이 직후 자기 평가 + 막혔던 부분 메모가 자동 정리되어 다음 학습 사이클의 기준이 된다.",
      },
    ],
  },

  // module-02 or 03: backtracking
  "queen-backtracking": {
    story: {
      definition: `**가지치기(Pruning) 결정 기준**\n- N-Queen에서 새 퀸을 (r, c)에 두려면 다음이 모두 비어야 한다.\n  - 같은 열 c\n  - 주대각선: r - c (변하지 않는 값)\n  - 부대각선: r + c (변하지 않는 값)\n- 세 집합 중 하나라도 충돌하면 그 가지를 즉시 포기.\n\n**탐색 트리 구조**\n- 각 행 r에서 N개 후보 열을 시도 → 분기 인수 N.\n- 최대 깊이 N (행 개수).\n- 무가지치기 시 N^N 경우의 수, 가지치기 후 실제 탐색 노드는 훨씬 적다.`,
      playgroundDescription: `가지치기 전후 방문 노드 수의 차이를 비교하면서, 어떤 가지에서 일찍 포기하는지 확인하세요.`,
    },
    features: [
      { title: "분기 인수와 깊이", description: "분기 인수 b·깊이 d일 때 최악 탐색 공간은 O(b^d). N-Queen은 b=N, d=N으로 가지치기 없이는 매우 큽니다." },
      { title: "대칭성 활용", description: "체스판 좌우 대칭으로 첫 행의 절반만 탐색해 해를 구한 뒤 2배 해도 됩니다(중앙 열은 별도)." },
      { title: "N=8 해의 개수", description: "정확히 92개의 해가 존재하며, 본질적으로 서로 다른 해는 회전·반사 대칭을 제외하면 12개입니다." },
      { title: "비트마스크 표현", description: "열·대각선·부대각선을 정수 비트로 표현하면 충돌 검사가 O(1)이 되어 큰 N에서도 빠르게 동작합니다." },
    ],
    guide: [
      {
        title: "백트래킹 일반 패턴",
        items: [
          {
            label: "선택 → 재귀 → 복원",
            description: "유효한 선택을 적용하고 재귀 호출, 복귀 후 선택을 되돌립니다.",
            code: "def backtrack(state):\n    if is_goal(state):\n        record(state)\n        return\n    for choice in candidates(state):\n        if not feasible(state, choice):\n            continue\n        apply(state, choice)\n        backtrack(state)\n        undo(state, choice)",
            tags: ["Pattern"],
          },
          {
            label: "N-Queen 비트마스크",
            description: "col·diag1·diag2 세 비트마스크로 충돌 검사를 상수 시간에 처리.",
            code: "def solve(r, n, cols, d1, d2):\n    if r == n:\n        return 1\n    count = 0\n    free = ~(cols | d1 | d2) & ((1 << n) - 1)\n    while free:\n        pick = free & -free\n        count += solve(r+1, n,\n                       cols | pick,\n                       (d1 | pick) << 1,\n                       (d2 | pick) >> 1)\n        free ^= pick\n    return count",
            tags: ["Pattern"],
          },
        ],
      },
    ],
  },
};

export function applyContentExpansion(config: CTPModuleConfig, activeKey: string): CTPModuleConfig {
  const expansion = expansions[activeKey];
  const group = groupByKey[activeKey];
  const deepDive = deepDiveByKey[activeKey] ?? (group ? groupDeepDive[group] : undefined);
  const groupGuide = group ? groupGuides[group] : undefined;
  if (!expansion && !deepDive) return config;

  const mergedStory = mergeStory(config.story, expansion?.story);
  const observation = group ? groupObservation[group] : undefined;
  const mergedWithDeepDive = mergedStory
    ? {
        ...mergedStory,
        definition: appendText(mergedStory.definition, deepDive),
        playgroundDescription: appendText(mergedStory.playgroundDescription, observation),
      }
    : deepDive
    ? {
        problem: "",
        definition: deepDive,
        analogy: "",
        playgroundDescription: observation ?? "",
      }
    : mergedStory;

  return {
    ...config,
    story: (mergedWithDeepDive as NonNullable<typeof config.story>) ?? config.story,
    features: mergeFeatures(config.features, expansion?.features),
    guide: mergeGuide(mergeGuide(config.guide, expansion?.guide), groupGuide),
    implementation: mergeImplementation(config.implementation, expansion?.implementation),
  };
}
