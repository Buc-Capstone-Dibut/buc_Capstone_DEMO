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
  "iterative-recursion": {},
  "condition-loop": {},
  "recursion-basics": {},
  "tower-of-hanoi": {},
  "recursion-analysis": {},

  // module-01: search-algorithms
  "search-problem-key": {},
  "linear-search": {},
  "brute-force-search": {},
  "kmp-search": {},
  "boyer-moore-search": {},
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
  "cursor-linked-list": {},
  "queue-overview": {},

  // module-02: sorting (overview / counting / shell)
  "sorting-overview": {},
  "counting-sort": {},
  "shell-sort": {},

  // module-02 or 03: backtracking
  "queen-backtracking": {},
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
