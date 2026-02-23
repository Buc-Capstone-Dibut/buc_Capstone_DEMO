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
  string: `### 심화 포인트
**핵심 개념**
- 문자열 연산은 길이에 비례해 비용이 증가합니다.
- 불변(immutable) 구조이므로 반복 덧셈은 반드시 피해야 합니다.

**대표 패턴**
- 슬라이딩 윈도우 / 투 포인터 / KMP / 롤링 해시.
- 패턴 매칭, 최소/최대 길이 substring 문제에 자주 등장.

**실수/주의**
- 슬라이스 복사 비용과 인덱스 경계 실수.
- 유니코드/대소문자 처리 규칙 혼동.`,
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
  hash: `### 심화 포인트
**핵심 개념**
- 해시 함수 품질 + 충돌 처리 전략이 성능을 좌우합니다.
- 로드 팩터가 높아지면 리해시가 필수입니다.

**대표 패턴**
- 빈도 카운팅, 중복 제거, 교집합/차집합.

**실수/주의**
- 오픈 어드레싱의 클러스터링.
- 삭제 시 tombstone 처리 누락.`,
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
  heap: `### 심화 포인트
**핵심 개념**
- 완전 이진 트리 + 힙 속성.
- root에 최솟/최댓값 유지.

**대표 패턴**
- 우선순위 큐, K번째 수, 스케줄링.

**실수/주의**
- 배열 인덱스 규칙 오류.
- heapify 과정에서 swap 조건 혼동.`,
  trie: `### 심화 포인트
**핵심 개념**
- 접두사 길이에 비례한 탐색 O(L).
- end flag로 단어/접두사를 구분합니다.

**대표 패턴**
- 자동완성, 사전 검색, IP prefix 매칭.

**실수/주의**
- 메모리 사용량 급증(노드 수 증가).
- end flag 누락으로 단어 판정 실패.`,
  uf: `### 심화 포인트
**핵심 개념**
- Union/Find는 연결성/사이클 판정의 핵심.
- Union by Rank + Path Compression이 최적 조합.

**대표 패턴**
- MST(Kruskal), 네트워크 연결성 문제.

**실수/주의**
- parent 초기화 누락.
- find 재귀 구현에서 반환값 갱신 누락.`,
  graph: `### 심화 포인트
**핵심 개념**
- 관계/연결/최단 경로 문제의 기본 모델.
- 표현 방식(리스트/행렬) 선택이 성능을 좌우합니다.

**대표 패턴**
- DFS/BFS, Topological Sort, MST, Shortest Path.

**실수/주의**
- 방문 배열 관리 누락 → 무한 루프.
- 방향/무방향 간선 처리 실수.`,
  search: `### 심화 포인트
**핵심 개념**
- 정렬/단조성 전제가 없으면 이분 탐색 불가.
- 구간 불변식을 유지하는 것이 핵심입니다.

**대표 패턴**
- 파라메트릭 서치(결정 함수 단조성).

**실수/주의**
- mid 계산/경계 이동 실수.
- 무한 루프(정지 조건 부정확).`,
  dp: `### 심화 포인트
**핵심 개념**
- 상태 정의가 문제 난이도의 80%를 결정합니다.
- 전이식과 기저 조건이 핵심입니다.

**대표 패턴**
- LIS, Knapsack, LCS, Grid DP.

**실수/주의**
- 기저 조건 누락.
- 상태 차원 폭발(불필요 변수 포함).`,
};

const groupByKey: Record<string, string> = {};
const mapGroup = (group: string, keys: string[]) => keys.forEach((key) => (groupByKey[key] = group));
mapGroup("array", ["1d-array", "2d-array"]);
mapGroup("string", ["string"]);
mapGroup("linked", ["singly", "doubly", "circular", "two-pointers"]);
mapGroup("stack", ["lifo-basics", "array-stack", "linked-stack", "monotonic-stack"]);
mapGroup("queue", ["linear-queue", "circular-queue", "deque", "pq-basics"]);
mapGroup("hash", ["hash-basics", "collision", "hash-implement"]);
mapGroup("tree", ["tree-basics", "tree-properties", "binary-traversal", "bst"]);
mapGroup("heap", ["heap-basics", "min-heap", "max-heap"]);
mapGroup("trie", ["trie-basics", "prefix-search", "trie-apps"]);
mapGroup("uf", ["ds-basics", "union-rank", "path-compression", "ds-apps"]);
mapGroup("graph", [
  "graph-representation",
  "dfs",
  "bfs",
  "cycle-detection",
  "shortest-path",
  "mst",
  "dfs-basics",
  "dfs-backtracking",
  "dfs-tree-traversal",
  "dfs-cycle-detection",
  "dfs-path-reconstruction",
  "bfs-basics",
  "grid-traversal",
  "bfs-multi-source",
  "bfs-zero-one",
  "bfs-path-reconstruction",
  "dijkstra",
  "floyd-warshall",
  "topological-sort"
]);
mapGroup("sorting", ["bubble-sort", "selection-sort", "insertion-sort", "merge-sort", "quick-sort", "heap-sort"]);
mapGroup("search", ["basic-binary-search", "parametric-search"]);
mapGroup("dp", ["dp-basics", "dp-1d", "dp-2d", "dp-patterns"]);

const groupObservation: Record<string, string> = {
  array: `**이번 단계에서 무엇을 볼까?**\\n- 인덱스가 어떻게 이동하는지\\n- 비교/갱신 횟수가 어디서 커지는지`,
  string: `**이번 단계에서 무엇을 볼까?**\\n- 포인터 이동과 부분 문자열 길이 변화\\n- 불필요한 복사/연결이 생기는 지점`,
  linked: `**이번 단계에서 무엇을 볼까?**\\n- 포인터 갱신 순서\\n- head/tail 변경 시 연결 유지 여부`,
  stack: `**이번 단계에서 무엇을 볼까?**\\n- push/pop 후 top 변화\\n- 단조 스택에서 연속 pop 발생 시점`,
  queue: `**이번 단계에서 무엇을 볼까?**\\n- front/rear 이동 규칙\\n- empty/full 판정 조건`,
  hash: `**이번 단계에서 무엇을 볼까?**\\n- 충돌 발생 위치\\n- 리해시/프로빙 경로`,
  tree: `**이번 단계에서 무엇을 볼까?**\\n- 차수/거리/레벨/너비/크기 변화\\n- 방문 순서(전/중/후위)와 의미 차이`,
  heap: `**이번 단계에서 무엇을 볼까?**\\n- bubble-up/down 과정\\n- 힙 속성 유지 여부`,
  trie: `**이번 단계에서 무엇을 볼까?**\\n- prefix 경로가 확장되는 과정\\n- end flag가 켜지는 위치`,
  uf: `**이번 단계에서 무엇을 볼까?**\\n- find 경로\\n- union 이후 parent 변화`,
  graph: `**이번 단계에서 무엇을 볼까?**\\n- 방문 순서와 큐/스택 상태\\n- dist/parent 갱신 시점`,
  sorting: `**이번 단계에서 무엇을 볼까?**\\n- swap/partition 시점\\n- 안정성 유지 여부\\n\\n**색상 규칙(정렬 시뮬레이터)**\\n- 파랑: 기준/선택 원소 (active)\\n- 노랑: 비교 중 (comparing)\\n- 초록: 정렬 확정/완료 (success)\\n- 회색: 일반 상태`,
  search: `**이번 단계에서 무엇을 볼까?**\\n- low/high 경계 이동\\n- mid 갱신 방식`,
  dp: `**이번 단계에서 무엇을 볼까?**\\n- dp 테이블이 채워지는 순서\\n- 전이식 적용 시점`,
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

const hashGuide: GuideSection[] = [
  {
    title: "해시 설계",
    items: [
      {
        label: "로드 팩터",
        description: "alpha = size/capacity가 커질수록 충돌이 급증하므로 임계값에서 리해시합니다.",
        code: "if size / capacity > 0.7:\n    rehash()",
        tags: ["Invariant"],
      },
      {
        label: "충돌 처리",
        description: "체이닝은 평균 O(1), 오픈 어드레싱은 클러스터링 주의가 필요합니다.",
        code: "# chaining\nbuckets[h].append((k,v))",
        tags: ["Tradeoff"],
      },
    ],
  },
  {
    title: "실전 포인트",
    items: [
      {
        label: "해시 키 설계",
        description: "문자열은 다항 해시, 튜플은 조합 해시를 쓰면 충돌을 줄일 수 있습니다.",
        code: "h = 0\nfor c in s: h = (h*P + ord(c)) % M",
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

const heapGuide: GuideSection[] = [
  {
    title: "힙 불변식",
    items: [
      {
        label: "완전 이진 트리",
        description: "배열로 표현할 때 index 규칙(부모/자식)이 유지됩니다.",
        code: "parent = i//2\nleft = i*2\nright = i*2+1",
        tags: ["Invariant"],
      },
      {
        label: "heapify",
        description: "삽입은 sift-up, 삭제는 sift-down으로 불변식을 복구합니다.",
        code: "while i>1 and heap[i] < heap[i//2]: swap()",
        tags: ["Pattern"],
      },
    ],
  },
];

const trieGuide: GuideSection[] = [
  {
    title: "Trie 핵심",
    items: [
      {
        label: "Prefix ID",
        description: "노드는 접두사 문자열로 식별하면 경로 시각화가 명확합니다.",
        code: "# word='cat' -> ['c','ca','cat']",
        tags: ["Invariant"],
      },
      {
        label: "종료 표시",
        description: "단어 종료 여부(end flag)는 접두사/단어 구분의 핵심입니다.",
        code: "node.is_end = True",
        tags: ["Edge"],
      },
    ],
  },
];

const ufGuide: GuideSection[] = [
  {
    title: "Union-Find 불변식",
    items: [
      {
        label: "부모 배열",
        description: "각 노드는 부모를 가리키고, 루트는 자기 자신을 가리킵니다.",
        code: "if parent[x] == x: return x",
        tags: ["Invariant"],
      },
      {
        label: "경로 압축",
        description: "find 후 경로를 루트로 직접 연결해 amortized 성능을 개선합니다.",
        code: "parent[x] = find(parent[x])",
        tags: ["Pattern"],
      },
    ],
  },
  {
    title: "실전 포인트",
    items: [
      {
        label: "사이클 판정",
        description: "간선을 추가할 때 두 노드가 이미 같은 집합이면 사이클입니다.",
        code: "if find(a) == find(b): cycle",
        tags: ["Pattern"],
      },
    ],
  },
];

const graphGuide: GuideSection[] = [
  {
    title: "그래프 불변식",
    items: [
      {
        label: "visited 관리",
        description: "방문 상태를 명시적으로 관리해 무한 루프를 방지합니다.",
        code: "visited[u] = True\nfor v in adj[u]: ...",
        tags: ["Invariant"],
      },
      {
        label: "간선 방향",
        description: "무방향 그래프는 양방향 간선을 모두 추가해야 합니다.",
        code: "adj[u].append(v)\nadj[v].append(u)",
        tags: ["Edge"],
      },
    ],
  },
  {
    title: "실전 패턴",
    items: [
      {
        label: "BFS 최단거리",
        description: "가중치가 없으면 BFS 레벨이 최단거리를 보장합니다.",
        code: "dist[s]=0\nq=[s]\nwhile q: ...",
        tags: ["Pattern"],
      },
      {
        label: "Topo Sort",
        description: "진입차수 0 노드를 큐로 관리합니다.",
        code: "if indeg[v]==0: q.append(v)",
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

const dpGuide: GuideSection[] = [
  {
    title: "DP 설계",
    items: [
      {
        label: "상태 정의",
        description: "최소한의 정보로 문제를 재귀적으로 표현할 수 있어야 합니다.",
        code: "dp[i] = i까지의 최적값",
        tags: ["Pattern"],
      },
      {
        label: "전이/기저",
        description: "전이식을 먼저 세우고, 기저 조건을 명확히 고정합니다.",
        code: "dp[i] = min(dp[i-1], dp[i-2]) + cost[i]",
        tags: ["Invariant"],
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
  string: {
    story: {
      problem: `문자열은 많은 언어에서 **immutable**이므로, 반복적인 덧셈은 예상보다 느릴 수 있습니다.\n\n문자열 알고리즘은 비교/탐색 비용이 길이에 비례하므로 성능 함정이 많습니다.`,
      definition: `**핵심 아이디어**: 문자열은 문자 배열의 특수한 형태로, 길이에 비례해 연산 비용이 증가합니다.\n\n**불변식**\n- 인덱싱은 배열과 동일하지만, 수정은 새로운 문자열을 생성합니다.\n- 부분 문자열은 O(k) 복사 비용이 들 수 있습니다.\n\n**실전 패턴**\n- 투 포인터/슬라이딩 윈도우/롤링 해시를 자주 사용합니다.`,
      analogy: `책에서 문장을 복사해 새로운 문장을 만드는 것과 같습니다.\n즉, 작은 수정도 **전체 문장을 다시 쓰는 비용**이 발생할 수 있습니다.`,
      playgroundDescription: `문자열 탐색 시 **현재 포인터**와 **일치 길이**가 어떻게 변하는지 확인하세요.`,
    },
    features: [
      { title: "Immutable", description: "수정은 새 문자열을 생성합니다." },
      { title: "부분 문자열 비용", description: "슬라이스는 O(k) 복사가 필요할 수 있습니다." },
      { title: "패턴 매칭", description: "KMP, 라빈-카프, 투 포인터가 핵심입니다." },
      { title: "빌더 패턴", description: "리스트에 append 후 join으로 최적화합니다." },
    ],
    guide: [
      {
        title: "문자열 패턴",
        items: [
          {
            label: "슬라이딩 윈도우",
            description: "고정/가변 길이 구간을 관리하며 조건을 만족하는 부분 문자열을 찾습니다.",
            code: "l = 0\nfor r in range(n):\n    add(s[r])\n    while invalid: remove(s[l]); l += 1",
            tags: ["Pattern"],
          },
          {
            label: "롤링 해시",
            description: "부분 문자열 비교를 O(1)으로 줄여 중복 탐색을 피합니다.",
            code: "h = (h*P + ord(c)) % M",
            tags: ["Pattern"],
          },
        ],
      },
    ],
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
  "two-pointers": {
    story: {
      problem: `정렬 배열이나 문자열 문제에서 단순 이중 루프는 O(n^2)로 너무 느립니다.\n\n투 포인터는 두 인덱스를 이동해 **선형 시간**으로 해결합니다.`,
      definition: `**핵심 아이디어**: i, j 두 포인터가 조건을 만족하도록 이동하며 탐색한다.\n\n**불변식**\n- i <= j, 구간 [i, j]는 특정 조건을 유지한다.\n\n**실전 패턴**\n- 합이 특정 값인 쌍 찾기, 최소 길이 부분 배열 등.`,
      analogy: `두 사람이 책의 양쪽에서 동시에 페이지를 넘기며 조건을 찾는 상황과 비슷합니다.`,
      playgroundDescription: `포인터가 움직일 때 조건이 어떻게 변하는지 관찰하세요.`,
    },
    features: [
      { title: "선형 시간", description: "정렬 배열에서는 O(n)으로 처리 가능합니다." },
      { title: "불변식 유지", description: "조건을 만족하도록 포인터를 이동합니다." },
      { title: "슬라이딩 윈도우", description: "변형된 형태로 사용됩니다." },
      { title: "실전 빈도", description: "코딩 테스트에서 매우 자주 등장합니다." },
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
    features: [
      { title: "재귀 대체", description: "스택으로 DFS/재귀를 반복문으로 바꿀 수 있습니다." },
      { title: "괄호 검증", description: "여닫는 괄호 매칭에 사용됩니다." },
      { title: "Undo/Redo", description: "실전 UI 기능 구현에 활용됩니다." },
      { title: "O(1) 연산", description: "push/pop은 상수 시간입니다." },
    ],
    guide: stackGuide,
  },
  "array-stack": {
    story: {
      problem: `배열 기반 스택은 구현이 간단하지만, 크기 제한과 overflow 관리가 필요합니다.`,
      definition: `**핵심 아이디어**: top 인덱스로 스택의 끝을 추적한다.\n\n**불변식**\n- top은 마지막 원소를 가리킨다.`,
      analogy: `사물함에 물건을 순서대로 넣고 맨 위에서만 꺼내는 구조입니다.`,
      playgroundDescription: `top 인덱스를 기준으로 push/pop 동작을 확인하세요.`,
    },
    features: [
      { title: "고정 크기", description: "용량이 정해진 경우 overflow 체크 필요." },
      { title: "캐시 효율", description: "배열 기반이라 속도가 빠릅니다." },
      { title: "O(1) 연산", description: "push/pop은 상수 시간입니다." },
      { title: "실전 적용", description: "문자열 처리, 계산기 구현에 활용됩니다." },
    ],
    guide: stackGuide,
  },
  "linked-stack": {
    story: {
      problem: `스택 크기가 동적으로 변하는 상황에서는 연결 리스트 기반 스택이 유리합니다.`,
      definition: `**핵심 아이디어**: head가 top을 가리키는 연결 리스트 구조이다.`,
      analogy: `계속 쌓을 수 있는 스프링 노트에 종이를 끼우는 구조와 같습니다.`,
      playgroundDescription: `노드 연결이 push/pop에 따라 어떻게 바뀌는지 확인하세요.`,
    },
    features: [
      { title: "동적 크기", description: "필요한 만큼만 메모리를 사용합니다." },
      { title: "포인터 비용", description: "추가 포인터로 메모리 오버헤드가 있습니다." },
      { title: "O(1) 연산", description: "push/pop은 상수 시간입니다." },
      { title: "실전 활용", description: "재귀 구조/백트래킹 구현에 사용됩니다." },
    ],
    guide: stackGuide,
  },
  "monotonic-stack": {
    story: {
      problem: `다음 큰 원소, 최대 직사각형 등은 단순 스캔으로는 O(n^2)입니다.`,
      definition: `**핵심 아이디어**: 스택을 단조 증가/감소 상태로 유지해 이전/다음 원소를 빠르게 찾는다.`,
      analogy: `높은 산을 하나씩 제거해 시야를 확보하는 것과 비슷합니다.`,
      playgroundDescription: `스택에서 pop이 연속으로 발생하는 순간을 관찰하세요.`,
    },
    features: [
      { title: "선형 시간", description: "각 원소가 최대 한 번 push/pop 됩니다." },
      { title: "NGE 문제", description: "다음 큰/작은 원소 계산에 최적입니다." },
      { title: "구간 최적화", description: "히스토그램 최대 직사각형 등에 활용됩니다." },
      { title: "패턴 반복", description: "많은 문제에서 동일한 패턴으로 등장합니다." },
    ],
    guide: stackGuide,
  },
  "linear-queue": {
    story: {
      problem: `큐는 FIFO 구조가 필요하지만, 단순 배열 구현은 front가 이동하며 공간이 낭비됩니다.`,
      definition: `**핵심 아이디어**: front는 삭제 위치, rear는 삽입 위치를 가리킨다.`,
      analogy: `줄 서서 기다리는 것처럼 먼저 온 사람이 먼저 나갑니다.`,
      playgroundDescription: `front/rear가 어떻게 이동하는지 관찰하세요.`,
    },
    features: [
      { title: "FIFO", description: "먼저 들어온 데이터가 먼저 나갑니다." },
      { title: "공간 낭비", description: "선형 큐는 front가 이동해도 공간이 재사용되지 않습니다." },
      { title: "BFS 활용", description: "그래프 탐색에 핵심적으로 사용됩니다." },
      { title: "O(1) 연산", description: "삽입/삭제는 상수 시간입니다." },
    ],
    guide: queueGuide,
  },
  "circular-queue": {
    story: {
      problem: `선형 큐는 공간 낭비가 발생하므로, 원형 큐로 공간을 재사용해야 합니다.`,
      definition: `**핵심 아이디어**: rear/front를 모듈로 연산해 원형으로 연결한다.`,
      analogy: `회전 초밥 벨트처럼 끝이 시작과 연결되어 있습니다.`,
      playgroundDescription: `rear가 끝에서 다시 0으로 돌아오는 순간을 관찰하세요.`,
    },
    features: [
      { title: "공간 재사용", description: "배열을 원형으로 사용합니다." },
      { title: "empty/full", description: "front==rear만으로는 구분 불가, count 필요." },
      { title: "고정 크기", description: "버퍼/네트워크 큐에 적합합니다." },
      { title: "O(1) 연산", description: "모든 연산이 상수 시간입니다." },
    ],
    guide: queueGuide,
  },
  deque: {
    story: {
      problem: `양쪽 삽입/삭제가 필요한 경우, 큐나 스택만으로는 비효율적입니다.`,
      definition: `**핵심 아이디어**: 양 끝(front/rear)에서 모두 삽입/삭제가 가능하다.`,
      analogy: `양쪽 문이 있는 버스에 승객이 오가는 것과 같습니다.`,
      playgroundDescription: `front/rear 양쪽에서 push/pop이 어떻게 작동하는지 확인하세요.`,
    },
    features: [
      { title: "양방향 연산", description: "pushFront/pushRear, popFront/popRear 지원." },
      { title: "슬라이딩 윈도우", description: "최솟값/최댓값 유지에 자주 사용됩니다." },
      { title: "균형 구조", description: "양쪽 끝 포인터 관리가 핵심입니다." },
      { title: "O(1) 연산", description: "모든 연산이 상수 시간입니다." },
    ],
    guide: queueGuide,
  },
  "pq-basics": {
    story: {
      problem: `우선순위가 높은 작업을 먼저 처리해야 할 때 단순 큐는 부적절합니다.`,
      definition: `**핵심 아이디어**: 우선순위 큐는 항상 가장 우선순위 높은 원소를 반환한다.`,
      analogy: `응급실에서 중증 환자가 먼저 처리되는 것과 같습니다.`,
      playgroundDescription: `우선순위 기준으로 pop 순서가 어떻게 달라지는지 확인하세요.`,
    },
    features: [
      { title: "힙 기반", description: "일반적으로 힙으로 구현되어 O(log n)입니다." },
      { title: "우선 처리", description: "가장 중요한 작업을 즉시 꺼낼 수 있습니다." },
      { title: "Dijkstra 활용", description: "최단 경로에서 핵심 역할을 합니다." },
      { title: "정렬 대체", description: "부분 정렬처럼 사용할 수 있습니다." },
    ],
    guide: heapGuide,
  },
  "hash-basics": {
    story: {
      problem: `키-값 조회가 잦은 문제에서 선형 탐색은 너무 느립니다.`,
      definition: `**핵심 아이디어**: 해시 함수로 키를 배열 인덱스로 변환한다.\n\n**불변식**\n- 동일 키는 동일 인덱스로 매핑된다.\n- 로드 팩터가 일정 임계값을 넘지 않는다.`,
      analogy: `전화번호부에서 이름을 즉시 찾기 위해 분류표를 사용하는 것과 같습니다.`,
      playgroundDescription: `해시 충돌이 발생할 때 버킷이 어떻게 사용되는지 관찰하세요.`,
    },
    features: [
      { title: "O(1) 평균", description: "탐색/삽입/삭제 평균 O(1)입니다." },
      { title: "충돌 관리", description: "체이닝/오픈 어드레싱이 핵심입니다." },
      { title: "로드 팩터", description: "성능과 메모리 사용의 균형점입니다." },
      { title: "실전 활용", description: "빈도 계산/중복 제거/교집합 등에 사용됩니다." },
    ],
    guide: hashGuide,
  },
  collision: {
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
    guide: hashGuide,
  },
  "hash-implement": {
    story: {
      problem: `해시 테이블을 직접 구현하면 리사이즈/리해시/삭제 처리의 복잡성이 드러납니다.`,
      definition: `**핵심 아이디어**: 용량 확장 시 모든 키를 재해시해야 한다.\n\n**불변식**\n- capacity는 보통 2의 거듭제곱으로 유지한다.\n- 삭제 시 tombstone 처리가 필요할 수 있다.`,
      analogy: `책장을 넓히면 책의 위치를 다시 배치해야 하는 것과 같습니다.`,
      playgroundDescription: `rehash가 발생하는 순간과 버킷 이동을 관찰하세요.`,
    },
    features: [
      { title: "리사이즈", description: "capacity가 2배가 되면 모든 키를 다시 배치합니다." },
      { title: "재해시 비용", description: "리해시는 O(n) 비용이 발생합니다." },
      { title: "삭제 처리", description: "오픈 어드레싱은 tombstone이 필요합니다." },
      { title: "성능 유지", description: "로드 팩터를 관리해야 합니다." },
    ],
    guide: hashGuide,
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
  "binary-traversal": {
    story: {
      problem: `트리를 단순히 저장하는 것보다, **순회 순서**를 이해하는 것이 핵심입니다.`,
      definition: `**핵심 아이디어**: 전위/중위/후위 순회는 방문 순서에 따라 의미가 달라집니다.\n\n- 전위: 루트를 먼저 방문\n- 중위: 정렬된 순서(BST)\n- 후위: 삭제/해제 작업`,
      analogy: `집을 청소할 때 어느 방부터 들어가느냐에 따라 순서가 달라지는 것과 같습니다.`,
      playgroundDescription: `각 순회 방식에서 방문 순서가 어떻게 변하는지 확인하세요.`,
    },
    features: [
      { title: "중위 순회", description: "BST에서는 오름차순 결과를 보장합니다." },
      { title: "후위 순회", description: "삭제/해제 단계에 적합합니다." },
      { title: "재귀/반복", description: "스택 기반 반복 구현도 중요합니다." },
      { title: "실전 활용", description: "표현식 평가, 트리 직렬화에 사용됩니다." },
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
  "heap-basics": {
    story: {
      problem: `최솟값/최댓값을 반복적으로 찾아야 할 때 정렬은 비효율적입니다.`,
      definition: `**핵심 아이디어**: 완전 이진 트리 + 힙 속성으로 루트에 최댓/최솟값 유지.`,
      analogy: `항상 가장 작은 공이 맨 위에 올라오는 구조와 같습니다.`,
      playgroundDescription: `삽입/삭제 시 bubble-up/down이 어떻게 동작하는지 보세요.`,
    },
    features: [
      { title: "우선순위 관리", description: "최댓/최솟값 접근 O(1)." },
      { title: "삽입/삭제", description: "O(log n)으로 유지됩니다." },
      { title: "배열 구현", description: "완전 이진 트리 특성을 사용합니다." },
      { title: "실전 활용", description: "스케줄링/다익스트라에 사용됩니다." },
    ],
    guide: heapGuide,
  },
  "min-heap": {
    story: {
      problem: `항상 가장 작은 값을 빠르게 꺼내야 하는 상황에서 최소 힙이 사용됩니다.`,
      definition: `**핵심 아이디어**: 부모 <= 자식인 힙 불변식을 유지합니다.`,
      analogy: `가장 작은 숫자가 항상 맨 위에 있는 서랍과 같습니다.`,
      playgroundDescription: `min-heapify 과정에서 값이 위로 올라오는 걸 확인하세요.`,
    },
    features: [
      { title: "최솟값 O(1)", description: "root가 항상 최소값입니다." },
      { title: "삽입/삭제 O(log n)", description: "bubble-up/down으로 복구합니다." },
      { title: "다익스트라 활용", description: "최단거리 우선순위에 핵심입니다." },
      { title: "정렬 대체", description: "부분 정렬 용도로 유용합니다." },
    ],
    guide: heapGuide,
  },
  "max-heap": {
    story: {
      problem: `항상 가장 큰 값을 빠르게 꺼내야 하는 상황에서 최대 힙이 사용됩니다.`,
      definition: `**핵심 아이디어**: 부모 >= 자식 불변식 유지.`,
      analogy: `가장 큰 공이 위에 놓이도록 정렬된 구조입니다.`,
      playgroundDescription: `max-heapify 동작을 관찰하세요.`,
    },
    features: [
      { title: "최댓값 O(1)", description: "root가 항상 최대값입니다." },
      { title: "삽입/삭제 O(log n)", description: "bubble-up/down으로 복구합니다." },
      { title: "우선순위", description: "작업 스케줄링에 적합합니다." },
      { title: "힙 정렬", description: "정렬 알고리즘으로도 활용됩니다." },
    ],
    guide: heapGuide,
  },
  "trie-basics": {
    story: {
      problem: `문자열 집합에서 prefix 검색을 빠르게 하려면 트라이가 필요합니다.`,
      definition: `**핵심 아이디어**: 각 노드는 접두사(prefix)를 표현하며, 길이에 비례해 탐색한다.`,
      analogy: `사전에서 첫 글자부터 차례대로 찾는 과정과 같습니다.`,
      playgroundDescription: `단어 삽입 시 경로가 어떻게 확장되는지 확인하세요.`,
    },
    features: [
      { title: "Prefix 검색", description: "길이에 비례한 O(L) 탐색." },
      { title: "메모리 트레이드오프", description: "공간을 희생해 속도를 얻습니다." },
      { title: "자동완성", description: "검색 추천에 활용됩니다." },
      { title: "단어 종료", description: "end flag로 단어 여부를 구분합니다." },
    ],
    guide: trieGuide,
  },
  "prefix-search": {
    story: {
      problem: `접두사 검색은 정렬/해시만으로는 효율적이지 않을 수 있습니다.`,
      definition: `**핵심 아이디어**: prefix 길이에 비례해 탐색하므로 문자열 길이가 짧다면 매우 빠릅니다.`,
      analogy: `사전에서 특정 글자로 시작하는 단어들을 한꺼번에 찾는 과정과 같습니다.`,
      playgroundDescription: `prefix 경로가 어떻게 선택되는지 확인하세요.`,
    },
    features: [
      { title: "O(L) 탐색", description: "문자열 길이에 비례합니다." },
      { title: "자동완성", description: "입력 단계마다 후보를 제시합니다." },
      { title: "검색 최적화", description: "prefix 기반 필터링에 적합합니다." },
      { title: "메모리 비용", description: "노드 수가 많아질 수 있습니다." },
    ],
    guide: trieGuide,
  },
  "trie-apps": {
    story: {
      problem: `단어 추천, 사전 검색, 라우팅 테이블 등에서 트라이 응용이 중요합니다.`,
      definition: `**핵심 아이디어**: prefix 경로를 기반으로 다양한 질의를 처리한다.`,
      analogy: `자동 완성 기능이 트라이의 대표적 응용입니다.`,
      playgroundDescription: `검색 경로와 결과 후보를 확인하세요.`,
    },
    features: [
      { title: "자동완성", description: "prefix 기반 추천 기능." },
      { title: "사전 탐색", description: "문자열 집합 탐색 최적." },
      { title: "라우팅 테이블", description: "IP prefix 매칭에 사용됩니다." },
      { title: "검색 필터", description: "추천 시스템의 기본 구조." },
    ],
    guide: trieGuide,
  },
  "ds-basics": {
    story: {
      problem: `연결 요소, 사이클 판정 등에서 집합을 빠르게 합치고 찾는 연산이 필요합니다.`,
      definition: `**핵심 아이디어**: parent 배열로 집합을 표현하고 find/union을 수행한다.`,
      analogy: `친구 그룹을 하나씩 합치는 작업과 같습니다.`,
      playgroundDescription: `union과 find가 어떻게 경로를 압축하는지 관찰하세요.`,
    },
    features: [
      { title: "Union/Find", description: "두 원소가 같은 집합인지 즉시 확인합니다." },
      { title: "경로 압축", description: "amortized 성능 향상." },
      { title: "사이클 판정", description: "그래프 문제에 자주 사용됩니다." },
      { title: "집합 병합", description: "커넥션/네트워크 문제에 필수입니다." },
    ],
    guide: ufGuide,
  },
  "union-rank": {
    story: {
      problem: `단순 union은 트리가 한쪽으로 치우쳐 find 비용이 커질 수 있습니다.`,
      definition: `**핵심 아이디어**: 랭크(또는 size)가 큰 루트에 작은 루트를 붙인다.`,
      analogy: `큰 그룹에 작은 그룹을 합쳐 균형을 유지하는 것과 같습니다.`,
      playgroundDescription: `랭크 비교 후 부모가 결정되는 과정을 확인하세요.`,
    },
    features: [
      { title: "균형 유지", description: "트리 높이를 낮게 유지합니다." },
      { title: "amortized O(alpha)", description: "거의 상수 시간 성능." },
      { title: "대규모 그래프", description: "MST/연결성 문제에 필수." },
      { title: "효율적 union", description: "불필요한 깊이를 방지합니다." },
    ],
    guide: ufGuide,
  },
  "path-compression": {
    story: {
      problem: `find 연산이 반복되면 깊은 트리에서 성능이 크게 저하됩니다.`,
      definition: `**핵심 아이디어**: find 과정에서 모든 노드를 루트에 직접 연결한다.`,
      analogy: `자주 가는 길을 직선 도로로 새로 뚫는 것과 같습니다.`,
      playgroundDescription: `find 이후 부모가 루트로 바뀌는지 관찰하세요.`,
    },
    features: [
      { title: "경로 단축", description: "find를 반복할수록 빨라집니다." },
      { title: "amortized 효율", description: "거의 O(1)에 수렴합니다." },
      { title: "Union-Rank 결합", description: "최적 성능 조합입니다." },
      { title: "대규모 입력", description: "N이 큰 문제에서 필수입니다." },
    ],
    guide: ufGuide,
  },
  "ds-apps": {
    story: {
      problem: `Union-Find는 MST, 사이클 판정, 네트워크 연결 등에 폭넓게 사용됩니다.`,
      definition: `**핵심 아이디어**: 반복적인 연결/분리 여부 판단을 빠르게 수행한다.`,
      analogy: `다리 건설에서 이미 연결된 섬을 다시 연결할 필요가 없는 것과 같습니다.`,
      playgroundDescription: `간선 추가 시 union-find가 어떻게 작동하는지 확인하세요.`,
    },
    features: [
      { title: "사이클 판정", description: "그래프 간선 추가 시 즉시 확인합니다." },
      { title: "MST 핵심", description: "크루스칼 알고리즘의 기반입니다." },
      { title: "연결성 질의", description: "네트워크 문제에 적용됩니다." },
      { title: "온라인 쿼리", description: "실시간 연결/질의 처리에 유용합니다." },
    ],
    guide: ufGuide,
  },
  "graph-representation": {
    story: {
      problem: `그래프 알고리즘은 표현 방식에 따라 시간/공간 비용이 크게 달라집니다.`,
      definition: `**핵심 아이디어**: 인접 리스트는 희소 그래프에, 인접 행렬은 밀집 그래프에 적합하다.`,
      analogy: `교통 지도에서 각 교차로의 연결 목록(리스트) vs 전체 연결표(행렬).`,
      playgroundDescription: `인접 리스트/행렬의 조회 비용 차이를 확인하세요.`,
    },
    features: [
      { title: "희소/밀집", description: "리스트는 희소, 행렬은 밀집 그래프에 적합." },
      { title: "조회 비용", description: "행렬은 O(1), 리스트는 O(deg)." },
      { title: "메모리", description: "행렬은 O(V^2) 메모리 필요." },
      { title: "탐색 알고리즘", description: "DFS/BFS는 보통 리스트 기반." },
    ],
    guide: graphGuide,
  },
  dfs: {
    story: {
      problem: `그래프 탐색은 거의 모든 그래프 문제의 출발점입니다.`,
      definition: `**핵심 아이디어**: DFS는 한 갈래를 끝까지 탐색한 뒤 되돌아온다.\n\n- 재귀/스택 기반\n- 방문 처리로 무한 루프 방지`,
      analogy: `미로에서 막다른 골목까지 들어가 보고 돌아오는 탐험.`,
      playgroundDescription: `DFS 방문 순서를 확인하세요.`,
    },
    features: [
      { title: "깊이 우선", description: "재귀 또는 스택으로 구현합니다." },
      { title: "visited 관리", description: "재방문을 막아 무한 루프를 방지합니다." },
      { title: "연결 요소", description: "컴포넌트 분리/개수 계산에 사용됩니다." },
    ],
    guide: graphGuide,
  },
  bfs: {
    story: {
      problem: `최단 거리(가중치 동일) 문제는 레벨 순 탐색이 필요합니다.`,
      definition: `**핵심 아이디어**: BFS는 가까운 정점부터 레벨 순으로 확장한다.\n\n- 큐 기반\n- 최단 거리 보장`,
      analogy: `물결이 퍼져나가듯 한 층씩 탐색합니다.`,
      playgroundDescription: `BFS가 레벨별로 확장되는 흐름을 확인하세요.`,
    },
    features: [
      { title: "레벨 탐색", description: "큐를 사용해 가까운 정점부터 방문합니다." },
      { title: "최단 거리", description: "가중치가 동일한 그래프에서 최단 경로 보장." },
      { title: "visited 관리", description: "재방문 방지로 성능을 확보합니다." },
    ],
    guide: graphGuide,
  },
  "cycle-detection": {
    story: {
      problem: `사이클이 있는 그래프는 위상 정렬 불가, 최단 경로 문제도 달라집니다.`,
      definition: `**핵심 아이디어**: 방문 상태(색), Union-Find로 사이클을 판정한다.`,
      analogy: `길을 돌아 시작점으로 다시 오는 경우가 사이클입니다.`,
      playgroundDescription: `방문 상태가 어떻게 변하는지 확인하세요.`,
    },
    features: [
      { title: "방문 색상", description: "White/Gray/Black로 사이클을 감지합니다." },
      { title: "Union-Find", description: "무방향 그래프에서 빠른 판정." },
      { title: "Directed vs Undirected", description: "판정 방식이 다릅니다." },
      { title: "실전 활용", description: "스케줄링/의존성 분석에 필수." },
    ],
    guide: graphGuide,
  },
  "shortest-path": {
    story: {
      problem: `최단 경로는 네트워크/지도/게임 AI 등에서 핵심 알고리즘입니다.`,
      definition: `**핵심 아이디어**: 가중치가 양수인 경우 Dijkstra, 모든 쌍은 Floyd-Warshall을 사용한다.`,
      analogy: `지도에서 가장 빠른 길을 찾는 것과 같습니다.`,
      playgroundDescription: `dist가 업데이트되는 순간을 관찰하세요.`,
    },
    features: [
      { title: "Dijkstra", description: "우선순위 큐 기반 O(E log V)." },
      { title: "Floyd-Warshall", description: "O(V^3)으로 모든 쌍 계산." },
      { title: "음수 가중치", description: "벨만-포드 필요." },
      { title: "경로 복원", description: "prev 배열로 경로를 추적합니다." },
    ],
    guide: graphGuide,
  },
  mst: {
    story: {
      problem: `네트워크 연결 비용을 최소화하려면 MST를 이해해야 합니다.`,
      definition: `**핵심 아이디어**: 모든 정점을 연결하되 간선 가중치 합이 최소인 트리.`,
      analogy: `도시들을 최소 비용 도로로 연결하는 문제와 같습니다.`,
      playgroundDescription: `선택된 간선(edge_relax)이 어떻게 결정되는지 확인하세요.`,
    },
    features: [
      { title: "Kruskal", description: "간선 정렬 + Union-Find." },
      { title: "Prim", description: "우선순위 큐로 확장." },
      { title: "사이클 방지", description: "사이클 생기면 제외합니다." },
      { title: "최적성", description: "Cut property로 증명됩니다." },
    ],
    guide: graphGuide,
  },
  "bubble-sort": {
    story: {
      problem: `정렬 개념을 직관적으로 이해하는 데 버블 정렬이 가장 적합합니다.`,
      definition: `**정의**\n버블 정렬은 **인접한 두 원소를 비교해 필요하면 교환**하고, 이 과정을 여러 번 반복하여 정렬을 완성하는 방법입니다.\n\n**작동 방식**\n- 한 번의 패스가 끝나면 **가장 큰 값이 배열의 끝으로 이동**합니다.\n- 다음 패스에서는 맨 끝을 제외하고 같은 과정을 반복합니다.\n- 한 번의 패스에서 교환이 없으면 이미 정렬된 상태이므로 **조기 종료**할 수 있습니다.\n\n**특징**\n- 안정 정렬(같은 값의 상대 순서 유지)\n- 구현은 간단하지만 시간 복잡도가 O(n^2)로 느립니다.`,
      analogy: `거품이 위로 올라오듯 큰 값이 끝으로 이동합니다.`,
      playgroundDescription: `스왑이 반복될수록 배열이 정렬되는 과정을 확인하세요.`,
    },
    features: [
      { title: "O(n^2)", description: "단순하지만 비효율적입니다." },
      { title: "안정 정렬", description: "동일 값의 순서를 유지합니다." },
      { title: "조기 종료", description: "스왑이 없으면 종료 가능합니다." },
      { title: "학습용", description: "정렬 원리 이해에 적합합니다." },
    ],
    guide: sortingGuide,
  },
  "selection-sort": {
    story: {
      problem: `정렬의 기본 구조를 이해하기 위해 선택 정렬을 학습합니다.`,
      definition: `**정의**\n선택 정렬은 매 단계에서 **정렬되지 않은 구간의 최솟값을 찾아** 현재 위치와 교환하는 방식입니다.\n\n**작동 방식**\n- i번째 위치에 들어갈 최소값을 전체에서 탐색합니다.\n- 찾은 최소값을 i번째와 교환합니다.\n- i를 한 칸 이동하며 같은 과정을 반복합니다.\n\n**특징**\n- 비교 횟수는 항상 동일(≈ n^2/2)\n- 교환 횟수는 최대 n-1로 적음\n- 일반적으로 **불안정 정렬**입니다.`,
      analogy: `가장 작은 카드를 찾아 맨 앞에 놓는 과정과 같습니다.`,
      playgroundDescription: `최솟값 선택 과정과 swap 위치를 확인하세요.`,
    },
    features: [
      { title: "O(n^2)", description: "비교 횟수는 항상 일정합니다." },
      { title: "교환 횟수 적음", description: "swap은 n번만 발생합니다." },
      { title: "불안정", description: "안정 정렬이 아닙니다." },
      { title: "단순 구현", description: "가장 직관적인 정렬입니다." },
    ],
    guide: sortingGuide,
  },
  "insertion-sort": {
    story: {
      problem: `부분 배열이 이미 정렬된 상태라면 삽입 정렬이 매우 효율적입니다.`,
      definition: `**정의**\n삽입 정렬은 **앞쪽 구간을 항상 정렬 상태로 유지**하면서, 새로 들어온 원소를 올바른 위치에 삽입하는 방식입니다.\n\n**작동 방식**\n- i번째 원소를 key로 잡고, 앞쪽 정렬 구간에서 위치를 찾습니다.\n- key보다 큰 값들을 오른쪽으로 한 칸씩 밀어냅니다.\n- 빈 자리에 key를 삽입합니다.\n\n**특징**\n- 거의 정렬된 데이터에서 매우 빠름\n- 안정 정렬이며 구현이 간단\n- 데이터가 한 개씩 들어오는 상황(온라인)에도 적합`,
      analogy: `카드를 한 장씩 뽑아 올바른 위치에 끼우는 것과 같습니다.`,
      playgroundDescription: `삽입 위치를 찾는 과정과 shift 동작을 확인하세요.`,
    },
    features: [
      { title: "O(n^2)", description: "최악은 느리지만 거의 정렬된 경우 빠릅니다." },
      { title: "안정 정렬", description: "동일 값 순서를 유지합니다." },
      { title: "실전 사용", description: "작은 구간 정렬에 활용됩니다." },
      { title: "온라인 처리", description: "데이터가 하나씩 들어올 때 적합합니다." },
    ],
    guide: sortingGuide,
  },
  "merge-sort": {
    story: {
      problem: `안정성과 O(n log n)을 동시에 만족하는 정렬이 필요합니다.`,
      definition: `**정의**\n병합 정렬은 **배열을 반으로 나누고(분할)**, 각각을 정렬한 뒤 **두 개의 정렬된 배열을 병합**하여 전체 정렬을 만드는 알고리즘입니다.\n\n**작동 방식**\n- 배열을 길이 1이 될 때까지 분할합니다.\n- 두 정렬된 배열을 **두 포인터(i/j)**로 비교하며 작은 값을 먼저 결과 배열에 넣습니다.\n- 이 과정을 재귀적으로 반복합니다.\n\n**특징**\n- 항상 O(n log n) 시간 보장\n- 안정 정렬\n- 병합을 위한 **추가 메모리(O(n))**가 필요`,
      analogy: `작은 두 줄을 정렬한 뒤 하나의 큰 줄로 합치는 과정입니다.`,
      playgroundDescription: `병합 과정에서 두 포인터가 어떻게 움직이는지 확인하세요.`,
    },
    features: [
      { title: "O(n log n)", description: "항상 안정적인 성능." },
      { title: "안정 정렬", description: "동일 값 순서를 유지합니다." },
      { title: "추가 메모리", description: "병합을 위한 O(n) 공간 필요." },
      { title: "분할 정복", description: "재귀 구조를 이해해야 합니다." },
    ],
    guide: sortingGuide,
  },
  "quick-sort": {
    story: {
      problem: `평균적으로 가장 빠른 정렬 알고리즘으로 널리 사용됩니다.`,
      definition: `**정의**\n퀵 정렬은 **기준값(pivot)을 하나 선택**하고, pivot보다 작은 값은 왼쪽, 큰 값은 오른쪽으로 분할한 뒤 각 부분을 재귀적으로 정렬하는 방식입니다.\n\n**작동 방식**\n- pivot을 정합니다(첫 값/마지막 값/중앙/랜덤 등).\n- 분할(partition) 과정에서 pivot 위치가 확정됩니다.\n- pivot 기준으로 왼쪽/오른쪽을 재귀 정렬합니다.\n\n**특징**\n- 평균 O(n log n)로 매우 빠름\n- pivot 선택이 나쁘면 최악 O(n^2)\n- 추가 메모리 사용이 적은 in-place 정렬`,
      analogy: `기준점을 정하고 작은 값과 큰 값을 양쪽으로 분리하는 과정입니다.`,
      playgroundDescription: `pivot이 어디에 놓이는지 확인하세요.`,
    },
    features: [
      { title: "평균 O(n log n)", description: "실전에서 빠릅니다." },
      { title: "최악 O(n^2)", description: "pivot 선택이 나쁘면 느립니다." },
      { title: "in-place", description: "추가 메모리 적음." },
      { title: "불안정", description: "안정 정렬이 아닙니다." },
    ],
    guide: sortingGuide,
  },
  "heap-sort": {
    story: {
      problem: `추가 메모리 없이 O(n log n)을 보장하는 정렬이 필요합니다.`,
      definition: `**정의**\n힙 정렬은 **힙(완전 이진 트리의 우선순위 구조)**을 이용해 최대값/최솟값을 반복적으로 꺼내 정렬하는 방식입니다.\n\n**작동 방식**\n- 배열을 힙 구조로 만든 뒤(root가 최대/최소),\n- root와 배열 끝을 교환하고, 힙 크기를 1 줄입니다.\n- 줄어든 힙에 대해 heapify를 반복합니다.\n\n**특징**\n- 항상 O(n log n) 성능 보장\n- in-place 정렬 (추가 메모리 적음)\n- 불안정 정렬`,
      analogy: `우선순위 큐에서 하나씩 뽑아 정렬하는 것과 같습니다.`,
      playgroundDescription: `heapify → extract 과정이 반복되는 것을 확인하세요.`,
    },
    features: [
      { title: "O(n log n)", description: "항상 일정한 성능을 보장합니다." },
      { title: "in-place", description: "추가 메모리 사용이 적습니다." },
      { title: "불안정", description: "안정 정렬이 아닙니다." },
      { title: "힙 기반", description: "힙 자료구조 이해가 필요합니다." },
    ],
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
  "parametric-search": {
    story: {
      problem: `최적 값을 직접 계산하기 어려운 경우 이분 탐색으로 답을 찾을 수 있습니다.`,
      definition: `**핵심 아이디어**: 결정 함수가 단조성을 가질 때 답을 이분 탐색한다.`,
      analogy: `가능/불가능 경계를 찾는 것과 같습니다.`,
      playgroundDescription: `조건 함수의 True/False 경계가 어떻게 움직이는지 확인하세요.`,
    },
    features: [
      { title: "단조성", description: "조건 함수가 단조성을 만족해야 합니다." },
      { title: "답 범위", description: "정답 후보 범위를 설정합니다." },
      { title: "최적화", description: "최솟값/최댓값 문제 해결." },
      { title: "실전 빈도", description: "코딩 테스트에서 매우 자주 사용됩니다." },
    ],
    guide: searchGuide,
  },
  "dfs-basics": {
    story: {
      problem: `깊이 우선 탐색은 그래프/트리의 구조를 이해하는 핵심 알고리즘입니다.`,
      definition: `**핵심 아이디어**: 한 경로를 끝까지 탐색한 뒤 되돌아온다.`,
      analogy: `미로에서 한 길을 끝까지 가보고 막히면 되돌아오는 것과 같습니다.`,
      playgroundDescription: `재귀 스택이 쌓이는 과정을 관찰하세요.`,
    },
    features: [
      { title: "재귀/스택", description: "스택 기반 탐색입니다." },
      { title: "백트래킹", description: "조합/순열 문제와 연결됩니다." },
      { title: "사이클 감지", description: "방문 상태 관리가 중요합니다." },
      { title: "연결 요소", description: "컴포넌트 계산에 사용됩니다." },
    ],
    guide: graphGuide,
  },
  "dfs-backtracking": {
    story: {
      problem: `조합/순열/경로 찾기 문제는 모든 후보를 탐색해야 하지만, 불필요한 경로를 빨리 끊는 것이 핵심입니다.`,
      definition: `**핵심 아이디어**: 선택 → 재귀 → 되돌리기를 반복하며 해를 찾는다.\n\n**불변식**\n- path에는 현재까지 선택한 해가 순서대로 들어있다.\n- 조건을 만족하지 않으면 즉시 되돌아간다(가지치기).`,
      analogy: `갈림길마다 표지판을 남겼다가 막히면 즉시 되돌아오는 탐험입니다.`,
      playgroundDescription: `path가 확장/축소되는 순간과, 목표를 찾는 즉시 탐색이 멈추는 지점을 보세요.`,
    },
    features: [
      { title: "선택/취소", description: "path에 push하고 실패 시 pop합니다." },
      { title: "가지치기", description: "조건 불만족이면 즉시 되돌아갑니다." },
      { title: "탐색 공간 축소", description: "불필요한 분기를 제거해 시간을 줄입니다." },
      { title: "실전 빈도", description: "N과 M, 스도쿠, 순열 문제에 반복됩니다." },
    ],
    guide: graphGuide,
  },
  "dfs-tree-traversal": {
    story: {
      problem: `트리는 DFS 순회로 값을 집계하거나 구조를 출력하는 문제가 많습니다.`,
      definition: `**핵심 아이디어**: 전위/중위/후위 순회는 방문 시점이 다르다.\n\n- 전위: 방문 → 자식\n- 중위: (왼)자식 → 방문 → (오)자식\n- 후위: 자식 → 방문`,
      analogy: `폴더를 열어보며 경로를 기록하는 순서가 달라지는 것과 같습니다.`,
      playgroundDescription: `전위 순회에서 order가 쌓이는 순서를 확인하세요.`,
    },
    features: [
      { title: "전위/중위/후위", description: "방문 시점 차이가 핵심입니다." },
      { title: "서브트리 계산", description: "DFS로 서브트리 합/크기를 계산합니다." },
      { title: "재귀 깊이", description: "깊은 트리는 스택 오버플로에 주의." },
      { title: "실전 활용", description: "트리 DP, 순회 출력 문제에 사용됩니다." },
    ],
    guide: graphGuide,
  },
  "dfs-cycle-detection": {
    story: {
      problem: `사이클이 존재하면 위상 정렬/의존성 처리 방식이 달라집니다.`,
      definition: `**핵심 아이디어**: 방문 상태(0/1/2)로 역방향 간선을 감지한다.\n\n**불변식**\n- state=1(방문중) 노드로 다시 들어오면 사이클이다.`,
      analogy: `이미 지나가는 중인 길로 다시 들어가면 원형 구조입니다.`,
      playgroundDescription: `state 배열이 0→1→2로 바뀌는 순간과 사이클 감지 지점을 보세요.`,
    },
    features: [
      { title: "색칠법", description: "0/1/2 상태로 방문을 관리합니다." },
      { title: "역방향 간선", description: "state=1로 들어오면 사이클입니다." },
      { title: "무방향 그래프", description: "부모 간선은 제외해야 합니다." },
      { title: "실전 활용", description: "스케줄링/그래프 검증 문제에 사용." },
    ],
    guide: graphGuide,
  },
  "dfs-path-reconstruction": {
    story: {
      problem: `경로 존재 여부뿐 아니라 실제 경로 출력이 요구되는 문제가 많습니다.`,
      definition: `**핵심 아이디어**: 방문 시 parent를 기록하고 목표에서 역추적한다.`,
      analogy: `갈림길마다 표지판을 남겨 되돌아오는 것과 같습니다.`,
      playgroundDescription: `parent가 채워지는 순서와 path 복원 과정을 확인하세요.`,
    },
    features: [
      { title: "parent 배열", description: "최초 방문 시 부모를 기록합니다." },
      { title: "역추적", description: "target에서 parent를 따라 올라갑니다." },
      { title: "방문 순서", description: "DFS 순서와 경로는 다를 수 있습니다." },
      { title: "실전 활용", description: "트리 부모 찾기/경로 복원 문제." },
    ],
    guide: graphGuide,
  },
  "bfs-basics": {
    story: {
      problem: `최단 거리 탐색은 BFS가 가장 직관적이고 안정적입니다.`,
      definition: `**핵심 아이디어**: 큐로 레벨별 탐색을 수행한다.`,
      analogy: `불을 지피면 물결처럼 퍼지는 것과 같습니다.`,
      playgroundDescription: `레벨 별 방문 순서를 관찰하세요.`,
    },
    features: [
      { title: "최단 거리", description: "가중치 없는 그래프에서 최단거리 보장." },
      { title: "레벨 탐색", description: "거리/단계 기반 문제에 적합." },
      { title: "큐 사용", description: "FIFO 구조를 사용합니다." },
      { title: "격자 탐색", description: "미로/지도 문제에 자주 쓰입니다." },
    ],
    guide: graphGuide,
  },
  "grid-traversal": {
    story: {
      problem: `격자 기반 문제는 방향 이동, 경계 처리, 방문 체크에서 실수가 잦습니다.`,
      definition: `**핵심 아이디어**: (r, c) 좌표를 기준으로 BFS/DFS를 적용한다.`,
      analogy: `체스판 위에서 움직이는 규칙을 정해 탐색하는 것과 같습니다.`,
      playgroundDescription: `방문/미방문 상태가 어떻게 변하는지 확인하세요.`,
    },
    features: [
      { title: "방향 배열", description: "dr/dc로 이동을 표준화합니다." },
      { title: "경계 체크", description: "인덱스 범위 확인이 필수입니다." },
      { title: "거리 계산", description: "BFS로 최단거리 계산 가능." },
      { title: "응용 다양", description: "섬 개수, 미로, 최단거리 문제." },
    ],
    guide: arrayGuide,
  },
  "bfs-multi-source": {
    story: {
      problem: `여러 시작점에서 동시에 퍼지는 문제(전염, 확산, 불길)는 멀티 소스 BFS가 필요합니다.`,
      definition: `**핵심 아이디어**: 큐를 여러 시작점으로 초기화하면 레벨이 동시에 확장된다.`,
      analogy: `여러 곳에서 동시에 퍼져 나가는 파동과 같습니다.`,
      playgroundDescription: `dist가 여러 시작점에서 동시에 업데이트되는 흐름을 보세요.`,
    },
    features: [
      { title: "큐 초기화", description: "여러 시작점을 동시에 넣습니다." },
      { title: "최단 거리", description: "모든 노드까지의 최소 거리 계산." },
      { title: "확산 문제", description: "전염/토마토/불 문제에 자주 사용." },
      { title: "경계 조건", description: "도달 불가(-1) 처리에 주의." },
    ],
    guide: graphGuide,
  },
  "bfs-zero-one": {
    story: {
      problem: `가중치가 0 또는 1인 그래프는 다익스트라보다 빠르게 풀 수 있습니다.`,
      definition: `**핵심 아이디어**: 덱을 사용해 0 가중치는 앞, 1 가중치는 뒤에 넣는다.`,
      analogy: `무료 도로는 먼저, 유료 도로는 나중에 처리하는 것과 같습니다.`,
      playgroundDescription: `dist 업데이트와 덱 앞/뒤 삽입 순간을 확인하세요.`,
    },
    features: [
      { title: "덱 사용", description: "appendleft/append로 우선순위 구현." },
      { title: "최단 거리", description: "O(V+E)로 처리 가능합니다." },
      { title: "가중치 제한", description: "0/1만 가능(일반 가중치는 다익스트라)." },
      { title: "실전 활용", description: "숨바꼭질 3, 알고스팟." },
    ],
    guide: graphGuide,
  },
  "bfs-path-reconstruction": {
    story: {
      problem: `최단 거리뿐 아니라 실제 경로 출력이 요구되는 문제가 많습니다.`,
      definition: `**핵심 아이디어**: 방문 시 parent를 기록하고 target에서 역추적한다.`,
      analogy: `길마다 표지판을 남겨 되돌아오는 방식입니다.`,
      playgroundDescription: `parent가 채워지는 순간과 path 복원 과정을 확인하세요.`,
    },
    features: [
      { title: "최단 경로", description: "BFS 방문 순서가 최단 경로를 보장." },
      { title: "parent 기록", description: "최초 방문 시 부모를 저장합니다." },
      { title: "경로 복원", description: "target에서 start로 역추적합니다." },
      { title: "실전 활용", description: "숨바꼭질 4, 최단 경로 출력 문제." },
    ],
    guide: graphGuide,
  },
  dijkstra: {
    story: {
      problem: `가중치가 있는 그래프에서 최단 경로를 구하려면 Dijkstra가 필수입니다.`,
      definition: `**핵심 아이디어**: 우선순위 큐로 가장 가까운 노드를 확정한다.`,
      analogy: `가까운 도시부터 확정해 나가는 네비게이션과 같습니다.`,
      playgroundDescription: `dist_update 이벤트가 발생하는 순간을 관찰하세요.`,
    },
    features: [
      { title: "양수 가중치", description: "음수 간선에는 사용 불가." },
      { title: "우선순위 큐", description: "O(E log V) 복잡도." },
      { title: "경로 복원", description: "prev 배열로 최단 경로를 추적." },
      { title: "실전 활용", description: "지도/네트워크 라우팅에 사용." },
    ],
    guide: graphGuide,
  },
  "floyd-warshall": {
    story: {
      problem: `모든 정점 쌍 간의 최단 경로를 구해야 할 때 사용합니다.`,
      definition: `**핵심 아이디어**: DP로 모든 쌍 최단 경로를 갱신한다.`,
      analogy: `모든 도시 간 거리표를 한 번에 업데이트하는 것과 같습니다.`,
      playgroundDescription: `k 중간 노드를 기준으로 dist가 업데이트되는 순간을 확인하세요.`,
    },
    features: [
      { title: "O(V^3)", description: "정점 수가 작을 때만 가능." },
      { title: "간단 구현", description: "코드는 직관적이지만 느립니다." },
      { title: "모든 쌍", description: "모든 정점 쌍 최단 경로 계산." },
      { title: "음수 간선", description: "음수 간선 허용(음수 사이클 제외)." },
    ],
    guide: graphGuide,
  },
  "topological-sort": {
    story: {
      problem: `선행 작업이 있는 일정(의존성 그래프)을 정렬해야 합니다.`,
      definition: `**핵심 아이디어**: DAG에서 진입차수 0 노드를 순서대로 처리한다.`,
      analogy: `선수 과목을 모두 이수한 후 다음 과목을 듣는 과정과 같습니다.`,
      playgroundDescription: `indegree가 0이 되는 순간 큐에 들어가는 흐름을 보세요.`,
    },
    features: [
      { title: "DAG 전용", description: "사이클이 있으면 불가능합니다." },
      { title: "진입차수", description: "indegree 관리가 핵심입니다." },
      { title: "큐 활용", description: "Kahn 알고리즘이 대표적입니다." },
      { title: "실전 활용", description: "빌드/작업 스케줄링에 사용됩니다." },
    ],
    guide: graphGuide,
  },
  "dp-basics": {
    story: {
      problem: `중복 계산이 많은 문제는 재귀만으로 해결하기 어렵습니다.`,
      definition: `**핵심 아이디어**: 부분 문제를 저장해 전체 문제를 해결한다.`,
      analogy: `같은 계산을 여러 번 하지 않도록 메모를 남기는 것과 같습니다.`,
      playgroundDescription: `dp 배열이 채워지는 순서를 확인하세요.`,
    },
    features: [
      { title: "중복 제거", description: "메모이제이션/테이블로 중복 계산 제거." },
      { title: "상태 전이", description: "상태 정의와 전이가 핵심입니다." },
      { title: "Top-down/Bottom-up", description: "두 방식 모두 중요합니다." },
      { title: "실전 활용", description: "최적화 문제에 빈번히 등장." },
    ],
    guide: dpGuide,
  },
  "dp-1d": {
    story: {
      problem: `단일 인덱스로 표현되는 최적화 문제는 1D DP가 효율적입니다.`,
      definition: `**핵심 아이디어**: dp[i]가 i까지의 최적값을 의미한다.`,
      analogy: `계단을 하나씩 올라가며 최적 비용을 기록하는 것과 같습니다.`,
      playgroundDescription: `dp 배열이 이전 값으로부터 갱신되는 과정을 확인하세요.`,
    },
    features: [
      { title: "1D 최적화", description: "상태를 1차원으로 단순화합니다." },
      { title: "공간 절약", description: "rolling 배열로 공간을 줄일 수 있습니다." },
      { title: "실전 문제", description: "계단/연속합/점프 문제." },
      { title: "전이 규칙", description: "직전 1~k 상태로 전이합니다." },
    ],
    guide: dpGuide,
  },
  "dp-2d": {
    story: {
      problem: `격자/문자열 비교 문제는 2D DP가 가장 자연스러운 해결법입니다.`,
      definition: `**핵심 아이디어**: dp[i][j]가 i,j까지의 상태를 나타낸다.`,
      analogy: `표를 채워가며 정답을 완성하는 방식입니다.`,
      playgroundDescription: `행/열이 채워지는 순서를 확인하세요.`,
    },
    features: [
      { title: "표 기반", description: "행과 열을 동시에 고려합니다." },
      { title: "LCS/편집거리", description: "대표적인 2D DP 문제." },
      { title: "경계 초기화", description: "첫 행/열 초기값이 중요합니다." },
      { title: "공간 절약", description: "2행/2열로 줄일 수 있습니다." },
    ],
    guide: dpGuide,
  },
  "dp-patterns": {
    story: {
      problem: `DP는 상태 설계를 잘못하면 차원이 폭발하거나 시간 초과가 납니다.`,
      definition: `**핵심 아이디어**: 패턴을 익히면 새로운 문제도 빠르게 모델링할 수 있다.`,
      analogy: `비슷한 문제 유형을 푸는 공식들을 모아둔 것과 같습니다.`,
      playgroundDescription: `상태 정의와 전이를 먼저 적는 연습을 해보세요.`,
    },
    features: [
      { title: "상태 축소", description: "필요한 정보만 남겨 차원 축소." },
      { title: "전이 패턴", description: "구간/경로/부분집합 패턴." },
      { title: "최적화", description: "메모리/시간을 절약하는 트릭." },
      { title: "실전 빈도", description: "문제 유형을 빠르게 매칭합니다." },
    ],
    guide: dpGuide,
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
    story: mergedWithDeepDive ?? config.story,
    features: mergeFeatures(config.features, expansion?.features),
    guide: mergeGuide(mergeGuide(config.guide, expansion?.guide), groupGuide),
    implementation: mergeImplementation(config.implementation, expansion?.implementation),
  };
}
