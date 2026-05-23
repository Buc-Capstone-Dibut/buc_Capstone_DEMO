import { defineProblems } from "./problem-factory";

export const module04Problems = defineProblems("list-tree-integration", [
  {
    id: "p04-001",
    title: "연결 리스트 끝에 추가 후 출력",
    difficulty: "bronze",
    type: "coding",
    description: "정수 N개를 연결 리스트에 순서대로 append한 뒤 같은 순서로 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "연결 리스트 순회 결과를 공백으로 출력",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [
      {
        input: "4\n1 2 3 4",
        output: "1 2 3 4",
        explanation: "1을 head로 만든 뒤 2, 3, 4를 tail 뒤에 차례로 연결합니다. head부터 순회하면 입력 순서와 동일합니다.",
      },
    ],
    testCases: [
      { input: "4\n1 2 3 4", output: "1 2 3 4" },
      { input: "3\n7 7 8", output: "7 7 8" },
      { input: "1\n9", output: "9" },
    ],
    referenceSolution: `class Node:
    def __init__(self, v):
        self.v = v
        self.next = None

n = int(input())
arr = list(map(int, input().split()))

head = None
tail = None
for x in arr:
    node = Node(x)
    if head is None:
        head = node
        tail = node
    else:
        tail.next = node
        tail = node

out = []
cur = head
while cur is not None:
    out.append(str(cur.v))
    cur = cur.next
print(" ".join(out))
`,
    solutionExplanation: `## 풀이 아이디어
- head와 tail 포인터를 유지하면 매 append를 O(1)에 처리할 수 있습니다.
- 첫 노드는 head=tail이 되고, 그 이후는 tail.next에 새 노드를 붙이고 tail을 갱신합니다.
- 출력은 head부터 next를 따라 순회해 값을 수집합니다.

## 복잡도
- 시간: O(N) — N개 노드를 한 번씩 추가 및 순회.
- 공간: O(N) — 노드 N개를 저장.

## 엣지 케이스
- N=1: head=tail=노드 한 개, 출력도 한 줄.
- 동일 값이 반복되어도 별도 처리 없이 그대로 출력합니다.`,
    hints: [
      "head, tail 두 포인터를 유지하면 매 append를 O(1)에 처리할 수 있습니다.",
      "출력은 head부터 cur=cur.next로 순회하며 값을 모아 join하세요.",
      "첫 노드 추가 시에는 head=tail로 동시에 설정해야 합니다.",
    ],
    tags: ["linked-list", "traversal"],
  },
  {
    id: "p04-002",
    title: "순회 널 참조 오류 수정",
    difficulty: "bronze",
    type: "debugging",
    description: "연결 리스트 합계를 구하는 코드가 마지막 노드를 놓치거나 None 참조 오류를 냅니다. 수정하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수 (N=0이면 둘째 줄 없음)",
    outputFormat: "노드 값의 합",
    constraints: ["0 ≤ N ≤ 1000"],
    sampleIO: [
      {
        input: "4\n1 2 3 4",
        output: "10",
        explanation: "원래 코드의 `while cur.next is not None`은 마지막 노드를 누락하고 N=0일 때 None.next로 터집니다. `while cur is not None`으로 바꿔야 합니다.",
      },
    ],
    testCases: [
      { input: "4\n1 2 3 4", output: "10" },
      { input: "0", output: "0" },
      { input: "1\n5", output: "5" },
    ],
    starterCode: `class Node:
    def __init__(self, v):
        self.v = v
        self.next = None

n = int(input())
arr = list(map(int, input().split())) if n > 0 else []
head = None
cur = None
for x in arr:
    node = Node(x)
    if head is None:
        head = node
        cur = node
    else:
        cur.next = node
        cur = node

s = 0
cur = head
while cur.next is not None:
    s += cur.v
    cur = cur.next
print(s)
`,
    referenceSolution: `class Node:
    def __init__(self, v):
        self.v = v
        self.next = None

n = int(input())
arr = list(map(int, input().split())) if n > 0 else []
head = None
tail = None
for x in arr:
    node = Node(x)
    if head is None:
        head = node
        tail = node
    else:
        tail.next = node
        tail = node

s = 0
cur = head
while cur is not None:
    s += cur.v
    cur = cur.next
print(s)
`,
    solutionExplanation: `## 버그
원본 코드는 두 가지 결함을 가집니다.
1. \`while cur.next is not None\`: 마지막 노드는 \`cur.next\`가 None이므로 더해지지 않고 루프가 끝나 합이 틀립니다.
2. N=0이면 head가 None인데 \`cur.next\`를 즉시 평가해 \`NoneType has no attribute 'next'\` 오류가 발생합니다.

## 수정
- \`while cur is not None\`으로 조건을 바꿔 자기 자신을 더하고 다음으로 이동.
- 이렇게 하면 빈 리스트(N=0)에서도 첫 비교에서 바로 루프를 건너뛰어 안전합니다.

## 복잡도
- 시간: O(N), 공간: O(N).

## 엣지 케이스
- N=0: head=None이라 바로 합 0 출력.
- N=1: 한 번 더하고 종료.`,
    hints: [
      "조건이 `cur.next is not None`이면 마지막 노드를 누락합니다.",
      "현재 노드 자체를 보고 싶다면 `while cur is not None`을 쓰세요.",
      "N=0이면 head가 None이므로 cur.next를 먼저 보면 터집니다.",
    ],
    tags: ["debugging", "linked-list"],
  },
  {
    id: "p04-003",
    title: "연결 리스트 뒤집기",
    difficulty: "bronze",
    type: "coding",
    description: "연결 리스트를 뒤집어 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "역순 결과",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [
      {
        input: "5\n1 2 3 4 5",
        output: "5 4 3 2 1",
        explanation: "prev=None에서 시작해 cur=head를 따라가며 cur.next를 prev로 뒤집습니다. 끝나면 prev가 새 head입니다.",
      },
    ],
    testCases: [
      { input: "5\n1 2 3 4 5", output: "5 4 3 2 1" },
      { input: "2\n9 8", output: "8 9" },
      { input: "1\n11", output: "11" },
    ],
    referenceSolution: `class Node:
    def __init__(self, v):
        self.v = v
        self.next = None

n = int(input())
arr = list(map(int, input().split()))

head = None
tail = None
for x in arr:
    node = Node(x)
    if head is None:
        head = node
        tail = node
    else:
        tail.next = node
        tail = node

prev = None
cur = head
while cur is not None:
    nxt = cur.next
    cur.next = prev
    prev = cur
    cur = nxt

out = []
cur = prev
while cur is not None:
    out.append(str(cur.v))
    cur = cur.next
print(" ".join(out))
`,
    solutionExplanation: `## 풀이 아이디어
- 세 포인터 prev / cur / nxt를 사용합니다.
- 매 단계마다 cur.next를 prev로 돌리고, prev=cur, cur=nxt로 한 칸씩 전진합니다.
- 루프가 끝나면 prev가 뒤집힌 리스트의 새로운 head입니다.

## 복잡도
- 시간: O(N), 공간: O(1) — in-place 포인터 조작.

## 엣지 케이스
- N=1: prev=None → 한 번만 돌려 prev가 그 노드. 출력도 그대로.
- 입력 순서가 곧 역순이 되도록 보장하려면 head/tail로 정방향 구성 후 뒤집습니다.`,
    hints: [
      "prev=None, cur=head에서 시작해 cur.next를 prev로 뒤집고 두 포인터를 한 칸 전진시키세요.",
      "다음 노드를 잃지 않으려면 `nxt = cur.next`를 먼저 저장하세요.",
      "루프가 끝나면 prev가 새로운 head입니다.",
    ],
    tags: ["linked-list", "pointer"],
  },
  {
    id: "p04-004",
    title: "BST 삽입",
    difficulty: "silver",
    type: "coding",
    description: "정수를 BST에 순서대로 삽입한 뒤 중위 순회 결과를 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "중위 순회 결과(오름차순)",
    constraints: ["1 ≤ N ≤ 2000"],
    sampleIO: [
      {
        input: "5\n5 3 7 2 4",
        output: "2 3 4 5 7",
        explanation: "5를 루트로, 3은 왼쪽, 7은 오른쪽, 2는 3 왼쪽, 4는 3 오른쪽에 들어갑니다. 중위 순회 → 2 3 4 5 7.",
      },
    ],
    testCases: [
      { input: "5\n5 3 7 2 4", output: "2 3 4 5 7" },
      { input: "4\n10 5 15 12", output: "5 10 12 15" },
      { input: "3\n3 2 1", output: "1 2 3" },
    ],
    referenceSolution: `import sys
sys.setrecursionlimit(10000)

n = int(input())
arr = list(map(int, input().split()))

# tree as parallel arrays (iterative insert to avoid recursion)
val = []
left = []
right = []

def insert(root_idx, x):
    if root_idx == -1:
        val.append(x)
        left.append(-1)
        right.append(-1)
        return len(val) - 1
    cur = root_idx
    while True:
        if x < val[cur]:
            if left[cur] == -1:
                val.append(x)
                left.append(-1)
                right.append(-1)
                left[cur] = len(val) - 1
                return root_idx
            cur = left[cur]
        else:
            if right[cur] == -1:
                val.append(x)
                left.append(-1)
                right.append(-1)
                right[cur] = len(val) - 1
                return root_idx
            cur = right[cur]

root = -1
for x in arr:
    root = insert(root, x)

# iterative inorder
out = []
stack = []
cur = root
while cur != -1 or stack:
    while cur != -1:
        stack.append(cur)
        cur = left[cur]
    cur = stack.pop()
    out.append(str(val[cur]))
    cur = right[cur]
print(" ".join(out))
`,
    solutionExplanation: `## 풀이 아이디어
- BST 삽입: 루트에서 시작해 x < cur이면 왼쪽, 아니면 오른쪽으로 내려가고 빈 자리에 노드를 만듭니다.
- 중위 순회는 왼쪽 → 자기 → 오른쪽 순서이므로 오름차순 정렬이 나옵니다.
- Skulpt 재귀 깊이 한계를 피하려고 반복적 삽입과 스택 기반 중위 순회를 사용합니다.
- 노드를 parallel array(val/left/right)로 두면 클래스 인스턴스보다 가볍습니다.

## 복잡도
- 시간 평균 O(N log N), 최악 O(N²) — 정렬된 입력이면 한쪽으로 쏠립니다.
- 공간: O(N).

## 엣지 케이스
- 같은 값이 들어오면 ≥를 우측으로 보내 안정적으로 처리합니다.
- N=1: 루트만 출력.`,
    hints: [
      "BST 삽입은 빈 자리를 만날 때까지 좌/우로 내려가 그 자리에 새 노드를 답니다.",
      "중위 순회를 하면 BST는 오름차순으로 출력됩니다.",
      "Skulpt 깊이 한계를 피하려면 스택 기반 반복 중위 순회를 쓰세요.",
    ],
    tags: ["tree", "bst"],
  },
  {
    id: "p04-005",
    title: "BST 탐색 방향 수정",
    difficulty: "silver",
    type: "debugging",
    description: "BST 탐색 코드의 좌/우 이동 조건이 뒤집혀 있습니다. target 존재 여부를 올바르게 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수\n셋째 줄에 target",
    outputFormat: "FOUND 또는 NOT FOUND",
    constraints: ["1 ≤ N ≤ 2000"],
    sampleIO: [
      {
        input: "5\n5 3 7 2 4\n4",
        output: "FOUND",
        explanation: "삽입은 정상이지만 탐색에서 `target < cur.v`인데도 right로 가도록 잘못 적혀 있습니다. 좌/우를 바꾸면 4를 찾습니다.",
      },
    ],
    testCases: [
      { input: "5\n5 3 7 2 4\n4", output: "FOUND" },
      { input: "5\n5 3 7 2 4\n6", output: "NOT FOUND" },
      { input: "1\n10\n10", output: "FOUND" },
    ],
    starterCode: `class Node:
    def __init__(self, v):
        self.v = v
        self.left = None
        self.right = None

def insert(root, x):
    if root is None:
        return Node(x)
    if x < root.v:
        root.left = insert(root.left, x)
    else:
        root.right = insert(root.right, x)
    return root

def search(root, target):
    cur = root
    while cur:
        if cur.v == target:
            return True
        if target < cur.v:
            cur = cur.right
        else:
            cur = cur.left
    return False

n = int(input())
arr = list(map(int, input().split()))
target = int(input())
root = None
for x in arr:
    root = insert(root, x)
print("FOUND" if search(root, target) else "NOT FOUND")
`,
    referenceSolution: `class Node:
    def __init__(self, v):
        self.v = v
        self.left = None
        self.right = None

def insert(root, x):
    if root is None:
        return Node(x)
    cur = root
    while True:
        if x < cur.v:
            if cur.left is None:
                cur.left = Node(x)
                return root
            cur = cur.left
        else:
            if cur.right is None:
                cur.right = Node(x)
                return root
            cur = cur.right

def search(root, target):
    cur = root
    while cur is not None:
        if cur.v == target:
            return True
        if target < cur.v:
            cur = cur.left
        else:
            cur = cur.right
    return False

n = int(input())
arr = list(map(int, input().split()))
target = int(input())
root = None
for x in arr:
    root = insert(root, x)
print("FOUND" if search(root, target) else "NOT FOUND")
`,
    solutionExplanation: `## 버그
탐색 함수의 분기가 뒤집혀 있습니다.
- 원본: \`target < cur.v\`일 때 \`cur = cur.right\` → BST 성질을 무시.
- 정답: \`target < cur.v\`이면 왼쪽 서브트리로, 아니면 오른쪽으로 가야 합니다.

## 수정
좌/우 두 줄만 바꾸면 됩니다. 삽입 함수는 옳으므로 건드리지 않습니다(서지컬 변경).

## 복잡도
- 평균 O(log N), 최악 O(N).
- 공간 O(1) (반복 탐색).

## 엣지 케이스
- 트리에 노드가 1개 → 비교 한 번으로 종료.
- target이 없으면 None을 만나 NOT FOUND.`,
    hints: [
      "BST 성질: 왼쪽 서브트리 < 루트 < 오른쪽 서브트리. 탐색도 같은 방향을 따라야 합니다.",
      "코드에서 `target < cur.v`일 때 어느 쪽으로 내려가는지 확인하세요.",
      "수정은 두 줄(좌/우)만 바꾸면 충분합니다 — 다른 코드는 건드리지 마세요.",
    ],
    tags: ["debugging", "bst"],
  },
  {
    id: "p04-006",
    title: "이진 트리 순회 (전위/중위/후위)",
    difficulty: "silver",
    type: "coding",
    description: "완전 이진트리를 배열로 입력받아 전위/중위/후위 순회 결과를 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수 (1-index 완전트리 노드 값)",
    outputFormat: "첫째 줄 전위\n둘째 줄 중위\n셋째 줄 후위",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [
      {
        input: "7\n1 2 3 4 5 6 7",
        output: "1 2 4 5 3 6 7\n4 2 5 1 6 3 7\n4 5 2 6 7 3 1",
        explanation: "0-index 기준 자식은 2i+1, 2i+2. 전위=루트→좌→우, 중위=좌→루트→우, 후위=좌→우→루트.",
      },
    ],
    testCases: [
      { input: "7\n1 2 3 4 5 6 7", output: "1 2 4 5 3 6 7\n4 2 5 1 6 3 7\n4 5 2 6 7 3 1" },
      { input: "3\n9 8 7", output: "9 8 7\n8 9 7\n8 7 9" },
      { input: "1\n5", output: "5\n5\n5" },
    ],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))

def left(i):
    return 2 * i + 1

def right(i):
    return 2 * i + 2

# iterative preorder
pre = []
stack = [0]
while stack:
    i = stack.pop()
    if i >= n:
        continue
    pre.append(str(arr[i]))
    # push right first so left is processed first
    stack.append(right(i))
    stack.append(left(i))

# iterative inorder
ino = []
stack = []
i = 0
while stack or i < n:
    while i < n:
        stack.append(i)
        i = left(i)
    i = stack.pop()
    ino.append(str(arr[i]))
    i = right(i)

# iterative postorder via two stacks
post = []
s1 = [0]
s2 = []
while s1:
    i = s1.pop()
    if i >= n:
        continue
    s2.append(i)
    s1.append(left(i))
    s1.append(right(i))
while s2:
    post.append(str(arr[s2.pop()]))

print(" ".join(pre))
print(" ".join(ino))
print(" ".join(post))
`,
    solutionExplanation: `## 풀이 아이디어
0-index 배열에서 자식 인덱스는 left=2i+1, right=2i+2. N보다 크거나 같은 인덱스는 존재하지 않는 노드로 봅니다.

세 순회는 모두 스택 기반으로 구현하면 Skulpt 재귀 한계를 피할 수 있습니다.
- 전위(Pre): 스택에 루트 → 팝하며 출력, 오른쪽 → 왼쪽 순으로 push (LIFO이므로 왼쪽 먼저 나옴).
- 중위(In): 왼쪽 끝까지 push → 팝하며 출력 → 오른쪽으로 이동.
- 후위(Post): 두 스택 트릭(루트, 왼쪽, 오른쪽을 s1에 넣고 s2로 옮긴 뒤 역순 출력).

## 복잡도
- 시간 O(N), 공간 O(N).

## 엣지 케이스
- N=1: 세 결과 모두 동일.
- 결측 자식(인덱스 ≥ N)은 push 단계에서 컷.`,
    hints: [
      "완전 이진트리 배열에서 자식 인덱스는 2i+1, 2i+2입니다.",
      "전위는 스택에 오른쪽을 먼저 push해야 왼쪽이 먼저 팝됩니다.",
      "후위는 두 스택 트릭이 가장 간단합니다 — s2에 쌓은 뒤 역순으로 출력하세요.",
    ],
    tags: ["tree", "traversal"],
  },
  {
    id: "p04-007",
    title: "이진 트리 최대 깊이",
    difficulty: "silver",
    type: "coding",
    description: "레벨 순서 배열(결측은 -1)로 주어진 이진트리의 최대 깊이를 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수 (-1은 null)",
    outputFormat: "최대 깊이",
    constraints: ["1 ≤ N ≤ 2000"],
    sampleIO: [
      {
        input: "7\n3 9 20 -1 -1 15 7",
        output: "3",
        explanation: "루트 3 → 왼쪽 9(리프), 오른쪽 20 → 그 자식 15, 7. 가장 깊은 경로 길이는 3.",
      },
    ],
    testCases: [
      { input: "7\n3 9 20 -1 -1 15 7", output: "3" },
      { input: "1\n1", output: "1" },
      { input: "3\n1 -1 2", output: "2" },
    ],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))

# Level-order with explicit child pointers: skip -1 nodes (their slots
# do NOT consume children). Build children via a queue.
if n == 0 or arr[0] == -1:
    print(0)
else:
    children = [[-1, -1] for _ in range(n)]
    used = [False] * n
    used[0] = True
    from collections import deque
    q = deque([0])
    i = 1
    while q and i < n:
        node = q.popleft()
        # left
        if i < n:
            if arr[i] != -1:
                children[node][0] = i
                used[i] = True
                q.append(i)
            i += 1
        # right
        if i < n:
            if arr[i] != -1:
                children[node][1] = i
                used[i] = True
                q.append(i)
            i += 1

    # BFS for depth
    depth = 0
    q = deque([(0, 1)])
    while q:
        node, d = q.popleft()
        if d > depth:
            depth = d
        l, r = children[node]
        if l != -1:
            q.append((l, d + 1))
        if r != -1:
            q.append((r, d + 1))
    print(depth)
`,
    solutionExplanation: `## 풀이 아이디어
LeetCode 스타일 레벨 순서 직렬화는 -1(null)에 대해서는 자식 칸을 소비하지 않습니다. 따라서 단순히 \`2i+1\`로 자식을 구하면 안 되고, 큐로 BFS 하며 다음 두 칸을 자식으로 소비해야 합니다.

1. 루트가 -1이면 깊이 0.
2. 큐로 노드를 꺼내며 다음 두 입력 칸을 좌/우 자식으로 시도. -1이면 자식 없음.
3. 트리를 다 만든 뒤 다시 BFS로 최대 깊이를 잽니다.

## 복잡도
- 시간 O(N), 공간 O(N).

## 엣지 케이스
- N=1: 루트만 존재 → 깊이 1.
- 첫 노드가 -1: 트리가 비어 깊이 0 (테스트에는 없지만 안전 처리).
- 결측 자식 슬롯이 입력에 등장하지 않는 경우 i가 n을 넘어가 자연 종료.`,
    hints: [
      "LeetCode 스타일 직렬화에서는 -1(null)이 자식 칸을 소비하지 않습니다 — 2i+1 공식만으로는 안 됩니다.",
      "큐로 노드를 꺼내며 입력에서 다음 두 칸을 좌/우 자식으로 가져오세요.",
      "트리를 만든 뒤 다시 BFS로 깊이를 재면 가장 깔끔합니다.",
    ],
    tags: ["tree", "depth"],
  },
  {
    id: "p04-008",
    title: "스택 기반 중위 순회 수정",
    difficulty: "silver",
    type: "debugging",
    description: "반복 기반 중위 순회 코드의 while 조건이 잘못되었습니다. BST 중위 순회를 올바르게 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수 (BST 삽입 순서)",
    outputFormat: "중위 순회 결과",
    constraints: ["1 ≤ N ≤ 2000"],
    sampleIO: [
      {
        input: "5\n3 2 1",
        output: "1 2 3",
        explanation: "원본은 `while cur and stack`이라 시작 시 stack이 비어 즉시 종료됩니다. `while cur or stack`으로 고치면 정상 작동.",
      },
    ],
    testCases: [
      { input: "5\n5 3 7 2 4", output: "2 3 4 5 7" },
      { input: "4\n10 5 15 12", output: "5 10 12 15" },
      { input: "3\n3 2 1", output: "1 2 3" },
    ],
    starterCode: `class Node:
    def __init__(self, v):
        self.v = v
        self.left = None
        self.right = None

def insert(root, x):
    if root is None:
        return Node(x)
    if x < root.v:
        root.left = insert(root.left, x)
    else:
        root.right = insert(root.right, x)
    return root

n = int(input())
arr = list(map(int, input().split()))
root = None
for x in arr:
    root = insert(root, x)

stack = []
cur = root
out = []
while cur and stack:
    while cur:
        stack.append(cur)
        cur = cur.left
    cur = stack.pop()
    out.append(cur.v)
    cur = cur.right

print(*out)
`,
    referenceSolution: `class Node:
    def __init__(self, v):
        self.v = v
        self.left = None
        self.right = None

def insert(root, x):
    if root is None:
        return Node(x)
    cur = root
    while True:
        if x < cur.v:
            if cur.left is None:
                cur.left = Node(x)
                return root
            cur = cur.left
        else:
            if cur.right is None:
                cur.right = Node(x)
                return root
            cur = cur.right

n = int(input())
arr = list(map(int, input().split()))
root = None
for x in arr:
    root = insert(root, x)

stack = []
cur = root
out = []
while cur is not None or stack:
    while cur is not None:
        stack.append(cur)
        cur = cur.left
    cur = stack.pop()
    out.append(cur.v)
    cur = cur.right

print(*out)
`,
    solutionExplanation: `## 버그
바깥 while 조건이 \`cur and stack\`(AND)이라, 처음에 stack이 비어 있으므로 루프가 한 번도 실행되지 않습니다.

## 수정
\`while cur is not None or stack:\` (OR)로 바꿉니다. 이유는:
- 시작 시: cur=root, stack=[] → cur가 살아 있으므로 진입.
- 진행 중: 왼쪽 끝까지 내려가면 cur=None이지만 stack에 노드가 쌓여 있어 계속 진행.
- 종료: cur=None이고 stack이 비면 모두 처리 완료.

## 복잡도
- 시간 O(N), 공간 O(H) — H는 트리 높이.

## 엣지 케이스
- N=1: 한 번 push, 한 번 pop 후 종료.
- 정렬 입력은 한쪽으로 쏠려 H≈N이 될 수 있음.`,
    hints: [
      "AND 조건이면 시작 시 stack=[]이라 즉시 종료됩니다.",
      "중위 순회 반복형은 `while cur or stack`이 정석입니다 (OR).",
      "안쪽 while은 왼쪽 끝까지 내려가는 역할이라 바꿀 필요 없습니다.",
    ],
    tags: ["debugging", "tree", "stack"],
  },
  {
    id: "p04-009",
    title: "연결 리스트 사이클 탐지 (Floyd)",
    difficulty: "gold",
    type: "coding",
    description:
      "0번 노드에서 시작하는 단일 연결 구조가 주어집니다. 각 노드의 next 인덱스가 주어질 때 사이클이 있으면 CYCLE, 없으면 NO CYCLE을 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수 next[i] (-1 또는 0..N-1)",
    outputFormat: "CYCLE 또는 NO CYCLE",
    constraints: ["1 ≤ N ≤ 200000"],
    sampleIO: [
      {
        input: "5\n1 2 3 4 2",
        output: "CYCLE",
        explanation: "0→1→2→3→4→2→3→… 노드 4에서 2로 되돌아가 사이클을 만듭니다.",
      },
    ],
    testCases: [
      { input: "5\n1 2 3 4 2", output: "CYCLE" },
      { input: "4\n1 2 3 -1", output: "NO CYCLE" },
      { input: "3\n0 -1 -1", output: "CYCLE" },
    ],
    referenceSolution: `n = int(input())
nxt = list(map(int, input().split()))

slow = 0
fast = 0
has_cycle = False
# move at least once before checking equality
while True:
    if fast == -1 or nxt[fast] == -1:
        break
    slow = nxt[slow]
    fast = nxt[nxt[fast]]
    if fast == -1:
        break
    if slow == fast:
        has_cycle = True
        break

print("CYCLE" if has_cycle else "NO CYCLE")
`,
    solutionExplanation: `## 풀이 아이디어
Floyd의 토끼와 거북이 알고리즘:
- slow는 한 칸, fast는 두 칸 전진.
- 사이클이 있으면 둘은 언젠가 같은 노드에서 만남.
- 사이클이 없으면 fast가 먼저 -1(끝)에 도달.

## 구현 디테일
- fast를 두 칸 전진하기 전에 \`nxt[fast]\`도 -1이 아닌지 확인해야 합니다. \`fast = nxt[nxt[fast]]\` 직전 두 번의 가드가 필요.
- 0번 노드가 자기 자신(\`nxt[0] = 0\`)을 가리키는 케이스도 사이클로 잡힙니다.

## 복잡도
- 시간 O(N), 공간 O(1).

## 엣지 케이스
- N=1, nxt=[-1]: 시작이 곧 끝 → NO CYCLE.
- N=1, nxt=[0]: 자기 참조 → CYCLE.
- 입력 케이스 \`3\n0 -1 -1\`: 0→0 자기 참조이므로 CYCLE.`,
    hints: [
      "두 포인터(slow 1칸, fast 2칸)가 만나면 사이클이 있는 것입니다.",
      "fast = nxt[nxt[fast]] 전에 nxt[fast]가 -1이 아닌지도 체크해야 합니다.",
      "자기 자신을 가리키는 노드(nxt[0]=0)도 사이클입니다.",
    ],
    tags: ["linked-list", "floyd"],
  },
  {
    id: "p04-010",
    title: "BST K번째 작은 원소",
    difficulty: "gold",
    type: "coding",
    description: "BST에 정수를 삽입한 뒤 K번째로 작은 값을 출력하세요. 범위를 벗어나면 -1을 출력하세요.",
    inputFormat: "첫째 줄에 N K\n둘째 줄에 N개의 정수",
    outputFormat: "K번째 작은 값 또는 -1",
    constraints: ["1 ≤ N ≤ 5000"],
    sampleIO: [
      {
        input: "5 3\n5 3 7 2 4",
        output: "4",
        explanation: "BST 중위 순회 결과는 [2,3,4,5,7]. 3번째 작은 값은 4.",
      },
    ],
    testCases: [
      { input: "5 3\n5 3 7 2 4", output: "4" },
      { input: "4 1\n10 5 15 12", output: "5" },
      { input: "3 5\n1 2 3", output: "-1" },
    ],
    referenceSolution: `first = input().split()
n = int(first[0])
k = int(first[1])
arr = list(map(int, input().split()))

# tree via parallel arrays (iterative)
val = []
left = []
right = []

def insert(root_idx, x):
    if root_idx == -1:
        val.append(x)
        left.append(-1)
        right.append(-1)
        return len(val) - 1
    cur = root_idx
    while True:
        if x < val[cur]:
            if left[cur] == -1:
                val.append(x)
                left.append(-1)
                right.append(-1)
                left[cur] = len(val) - 1
                return root_idx
            cur = left[cur]
        else:
            if right[cur] == -1:
                val.append(x)
                left.append(-1)
                right.append(-1)
                right[cur] = len(val) - 1
                return root_idx
            cur = right[cur]

root = -1
for x in arr:
    root = insert(root, x)

# iterative inorder with early stop at k-th
stack = []
cur = root
count = 0
ans = -1
while cur != -1 or stack:
    while cur != -1:
        stack.append(cur)
        cur = left[cur]
    cur = stack.pop()
    count += 1
    if count == k:
        ans = val[cur]
        break
    cur = right[cur]

print(ans)
`,
    solutionExplanation: `## 풀이 아이디어
BST의 중위 순회는 오름차순이므로, 중위 순회 도중 카운트가 K가 되는 순간의 값이 답입니다.

- 노드 수 N보다 K가 크면 끝까지 가도 K번째가 없으니 -1.
- 스택 기반 반복 중위 순회로 K번째에 도달하면 즉시 중단해 시간을 아낍니다.

## 복잡도
- 평균 삽입 O(N log N), 탐색 O(K + H).
- 공간 O(N).

## 엣지 케이스
- K > N: -1 출력.
- K=1: 가장 왼쪽 노드.
- 정렬 입력은 한쪽으로 쏠려 트리 높이가 N에 근접하지만 알고리즘은 동일하게 동작.`,
    hints: [
      "BST 중위 순회는 오름차순입니다 — 그 순서대로 카운트하세요.",
      "K번째에 도달하면 즉시 중단하면 시간을 아낄 수 있습니다.",
      "K가 N보다 크면 -1을 출력하세요.",
    ],
    tags: ["bst", "inorder"],
  },
  {
    id: "p04-011",
    title: "BFS 레벨 순회 출력 수정",
    difficulty: "gold",
    type: "debugging",
    description: "완전 이진트리의 레벨 순회 코드를 수정해 레벨별로 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "각 레벨을 한 줄씩 출력",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [
      {
        input: "7\n1 2 3 4 5 6 7",
        output: "1\n2 3\n4 5 6 7",
        explanation: "원본은 `q.pop()`을 써서 스택처럼 동작합니다. BFS는 `q.popleft()`로 FIFO여야 레벨이 보존됩니다.",
      },
    ],
    testCases: [
      { input: "7\n1 2 3 4 5 6 7", output: "1\n2 3\n4 5 6 7" },
      { input: "3\n9 8 7", output: "9\n8 7" },
      { input: "1\n5", output: "5" },
    ],
    starterCode: `from collections import deque

n = int(input())
arr = list(map(int, input().split()))
if n == 0:
    print("")
else:
    q = deque([0])
    while q:
        size = len(q)
        level = []
        for _ in range(size):
            idx = q.pop()
            level.append(str(arr[idx]))
            left = idx * 2 + 1
            right = idx * 2 + 2
            if left < n:
                q.append(left)
            if right < n:
                q.append(right)
        print(" ".join(level))
`,
    referenceSolution: `from collections import deque

n = int(input())
arr = list(map(int, input().split()))
if n == 0:
    pass
else:
    q = deque([0])
    while q:
        size = len(q)
        level = []
        for _ in range(size):
            idx = q.popleft()
            level.append(str(arr[idx]))
            left = idx * 2 + 1
            right = idx * 2 + 2
            if left < n:
                q.append(left)
            if right < n:
                q.append(right)
        print(" ".join(level))
`,
    solutionExplanation: `## 버그
\`q.pop()\`은 deque의 오른쪽 끝을 꺼내 LIFO(스택)처럼 동작합니다. 그 결과 레벨 안 순서와 레벨 경계가 모두 깨집니다.

## 수정
- \`q.pop()\` → \`q.popleft()\` 한 곳만 바꾸면 정상 BFS가 됩니다.
- N=0 분기에서 \`print("")\`는 빈 줄을 출력해 문제 사양과 어긋날 수 있으므로 제거(혹은 그냥 pass).

## 복잡도
- 시간 O(N), 공간 O(N).

## 엣지 케이스
- N=1: 한 레벨만 출력.
- N=0: 출력 없음.
- 완전 이진트리이므로 자식 인덱스 2i+1, 2i+2 공식이 안전합니다(여긴 -1 결측이 없음).`,
    hints: [
      "deque에서 BFS는 popleft가 정석입니다 — pop은 스택입니다.",
      "한 줄만 바꾸면 됩니다 — 다른 코드는 손대지 마세요.",
      "for `_ in range(size)`로 레벨 크기를 고정한 뒤 처리하는 패턴을 유지하세요.",
    ],
    tags: ["debugging", "tree", "bfs"],
  },
  {
    id: "p04-012",
    title: "최소 공통 조상 (LCA)",
    difficulty: "gold",
    type: "coding",
    description: "BST에 정수를 삽입한 뒤 두 값 A, B의 최소 공통 조상 값을 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수\n셋째 줄에 A B",
    outputFormat: "LCA 값",
    constraints: ["1 ≤ N ≤ 5000"],
    sampleIO: [
      {
        input: "7\n20 10 30 5 15 25 35\n5 15",
        output: "10",
        explanation: "5와 15는 둘 다 10의 서브트리에 있고, 5<10<15이므로 10에서 갈라집니다. LCA=10.",
      },
    ],
    testCases: [
      { input: "7\n20 10 30 5 15 25 35\n5 15", output: "10" },
      { input: "7\n20 10 30 5 15 25 35\n5 35", output: "20" },
      { input: "5\n10 5 15 2 7\n2 7", output: "5" },
    ],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))
ab = input().split()
a = int(ab[0])
b = int(ab[1])

# BST via parallel arrays (iterative insert)
val = []
left = []
right = []

def insert(root_idx, x):
    if root_idx == -1:
        val.append(x)
        left.append(-1)
        right.append(-1)
        return len(val) - 1
    cur = root_idx
    while True:
        if x < val[cur]:
            if left[cur] == -1:
                val.append(x)
                left.append(-1)
                right.append(-1)
                left[cur] = len(val) - 1
                return root_idx
            cur = left[cur]
        else:
            if right[cur] == -1:
                val.append(x)
                left.append(-1)
                right.append(-1)
                right[cur] = len(val) - 1
                return root_idx
            cur = right[cur]

root = -1
for x in arr:
    root = insert(root, x)

# LCA in BST: walk from root, the first node where a and b split is LCA
lo = a if a < b else b
hi = b if a < b else a
cur = root
while cur != -1:
    if val[cur] > hi:
        cur = left[cur]
    elif val[cur] < lo:
        cur = right[cur]
    else:
        # lo <= val[cur] <= hi -> split point
        print(val[cur])
        break
`,
    solutionExplanation: `## 풀이 아이디어
BST에서의 LCA는 매우 간단합니다.
- 두 값 모두가 현재 노드 값보다 작으면 → 왼쪽 서브트리로.
- 두 값 모두가 현재 노드 값보다 크면 → 오른쪽 서브트리로.
- 그 외(현재 노드 값이 두 값 사이에 있거나 한쪽과 일치)면 → 그 노드가 LCA.

\`lo = min(a, b), hi = max(a, b)\`로 두면 분기가 깔끔합니다.

## 복잡도
- 평균 O(log N), 최악 O(N) (한쪽으로 쏠린 트리).
- 공간 O(1).

## 엣지 케이스
- a == b (테스트에는 없지만): 같은 값이 트리에 있다면 그 노드가 곧 LCA.
- 한 값이 다른 값의 조상: 그 조상 값 노드가 LCA.
- 두 값이 트리에 없으면 정의되지 않음(입력 가정상 항상 존재).`,
    hints: [
      "BST에서는 부모 자식 관계만으로 LCA를 알 수 있습니다 — 두 값을 모두 포함하는 분기점이 답.",
      "현재 노드 값이 두 값보다 모두 크면 왼쪽, 모두 작으면 오른쪽으로 내려가세요.",
      "lo/hi(min, max)를 미리 잡아두면 비교가 단순해집니다.",
    ],
    tags: ["tree", "bst", "lca"],
  },
]);
