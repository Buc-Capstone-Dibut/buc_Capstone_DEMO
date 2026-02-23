import { defineProblems } from "./problem-factory";

export const module04Problems = defineProblems("list-tree-integration", [
  {
    id: "p04-001",
    title: "Linked List — Append and Print",
    difficulty: "bronze",
    type: "coding",
    description: "정수 N개를 연결 리스트에 순서대로 append한 뒤 같은 순서로 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "연결 리스트 순회 결과를 공백으로 출력",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [{ input: "4\n1 2 3 4", output: "1 2 3 4" }],
    testCases: [
      { input: "4\n1 2 3 4", output: "1 2 3 4" },
      { input: "3\n7 7 8", output: "7 7 8" },
      { input: "1\n9", output: "9" },
    ],
    tags: ["linked-list", "traversal"],
  },
  {
    id: "p04-002",
    title: "Fix None Reference in Traversal",
    difficulty: "bronze",
    type: "debugging",
    description: "연결 리스트 합계를 구하는 코드가 마지막 노드를 놓치거나 None 참조 오류를 냅니다. 수정하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수 (N=0이면 둘째 줄 없음)",
    outputFormat: "노드 값의 합",
    constraints: ["0 ≤ N ≤ 1000"],
    sampleIO: [{ input: "4\n1 2 3 4", output: "10" }],
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
    tags: ["debugging", "linked-list"],
  },
  {
    id: "p04-003",
    title: "Reverse a Linked List",
    difficulty: "bronze",
    type: "coding",
    description: "연결 리스트를 뒤집어 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "역순 결과",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [{ input: "5\n1 2 3 4 5", output: "5 4 3 2 1" }],
    testCases: [
      { input: "5\n1 2 3 4 5", output: "5 4 3 2 1" },
      { input: "2\n9 8", output: "8 9" },
      { input: "1\n11", output: "11" },
    ],
    tags: ["linked-list", "pointer"],
  },
  {
    id: "p04-004",
    title: "BST Insert",
    difficulty: "silver",
    type: "coding",
    description: "정수를 BST에 순서대로 삽입한 뒤 중위 순회 결과를 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "중위 순회 결과(오름차순)",
    constraints: ["1 ≤ N ≤ 2000"],
    sampleIO: [{ input: "5\n5 3 7 2 4", output: "2 3 4 5 7" }],
    testCases: [
      { input: "5\n5 3 7 2 4", output: "2 3 4 5 7" },
      { input: "4\n10 5 15 12", output: "5 10 12 15" },
      { input: "3\n3 2 1", output: "1 2 3" },
    ],
    tags: ["tree", "bst"],
  },
  {
    id: "p04-005",
    title: "Fix Search Direction in BST",
    difficulty: "silver",
    type: "debugging",
    description: "BST 탐색 코드의 좌/우 이동 조건이 뒤집혀 있습니다. target 존재 여부를 올바르게 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수\n셋째 줄에 target",
    outputFormat: "FOUND 또는 NOT FOUND",
    constraints: ["1 ≤ N ≤ 2000"],
    sampleIO: [{ input: "5\n5 3 7 2 4\n4", output: "FOUND" }],
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
    tags: ["debugging", "bst"],
  },
  {
    id: "p04-006",
    title: "Binary Tree Traversals (Pre/In/Post)",
    difficulty: "silver",
    type: "coding",
    description: "완전 이진트리를 배열로 입력받아 전위/중위/후위 순회 결과를 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수 (1-index 완전트리 노드 값)",
    outputFormat: "첫째 줄 전위\n둘째 줄 중위\n셋째 줄 후위",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [{ input: "7\n1 2 3 4 5 6 7", output: "1 2 4 5 3 6 7\n4 2 5 1 6 3 7\n4 5 2 6 7 3 1" }],
    testCases: [
      { input: "7\n1 2 3 4 5 6 7", output: "1 2 4 5 3 6 7\n4 2 5 1 6 3 7\n4 5 2 6 7 3 1" },
      { input: "3\n9 8 7", output: "9 8 7\n8 9 7\n8 7 9" },
      { input: "1\n5", output: "5\n5\n5" },
    ],
    tags: ["tree", "traversal"],
  },
  {
    id: "p04-007",
    title: "Maximum Depth of Binary Tree",
    difficulty: "silver",
    type: "coding",
    description: "레벨 순서 배열(결측은 -1)로 주어진 이진트리의 최대 깊이를 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수 (-1은 null)",
    outputFormat: "최대 깊이",
    constraints: ["1 ≤ N ≤ 2000"],
    sampleIO: [{ input: "7\n3 9 20 -1 -1 15 7", output: "3" }],
    testCases: [
      { input: "7\n3 9 20 -1 -1 15 7", output: "3" },
      { input: "1\n1", output: "1" },
      { input: "3\n1 -1 2", output: "2" },
    ],
    tags: ["tree", "depth"],
  },
  {
    id: "p04-008",
    title: "Fix Stack-based Inorder Traversal",
    difficulty: "silver",
    type: "debugging",
    description: "반복 기반 중위 순회 코드의 while 조건이 잘못되었습니다. BST 중위 순회를 올바르게 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수 (BST 삽입 순서)",
    outputFormat: "중위 순회 결과",
    constraints: ["1 ≤ N ≤ 2000"],
    sampleIO: [{ input: "5\n5 3 7 2 4", output: "2 3 4 5 7" }],
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
    tags: ["debugging", "tree", "stack"],
  },
  {
    id: "p04-009",
    title: "Linked List Cycle Detection (Floyd)",
    difficulty: "gold",
    type: "coding",
    description:
      "0번 노드에서 시작하는 단일 연결 구조가 주어집니다. 각 노드의 next 인덱스가 주어질 때 사이클이 있으면 CYCLE, 없으면 NO CYCLE을 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수 next[i] (-1 또는 0..N-1)",
    outputFormat: "CYCLE 또는 NO CYCLE",
    constraints: ["1 ≤ N ≤ 200000"],
    sampleIO: [{ input: "5\n1 2 3 4 2", output: "CYCLE" }],
    testCases: [
      { input: "5\n1 2 3 4 2", output: "CYCLE" },
      { input: "4\n1 2 3 -1", output: "NO CYCLE" },
      { input: "3\n0 -1 -1", output: "CYCLE" },
    ],
    tags: ["linked-list", "floyd"],
  },
  {
    id: "p04-010",
    title: "K-th Smallest Element in BST",
    difficulty: "gold",
    type: "coding",
    description: "BST에 정수를 삽입한 뒤 K번째로 작은 값을 출력하세요. 범위를 벗어나면 -1을 출력하세요.",
    inputFormat: "첫째 줄에 N K\n둘째 줄에 N개의 정수",
    outputFormat: "K번째 작은 값 또는 -1",
    constraints: ["1 ≤ N ≤ 5000"],
    sampleIO: [{ input: "5 3\n5 3 7 2 4", output: "4" }],
    testCases: [
      { input: "5 3\n5 3 7 2 4", output: "4" },
      { input: "4 1\n10 5 15 12", output: "5" },
      { input: "3 5\n1 2 3", output: "-1" },
    ],
    tags: ["bst", "inorder"],
  },
  {
    id: "p04-011",
    title: "Fix BFS Level-order Output",
    difficulty: "gold",
    type: "debugging",
    description: "완전 이진트리의 레벨 순회 코드를 수정해 레벨별로 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "각 레벨을 한 줄씩 출력",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [{ input: "7\n1 2 3 4 5 6 7", output: "1\n2 3\n4 5 6 7" }],
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
    tags: ["debugging", "tree", "bfs"],
  },
  {
    id: "p04-012",
    title: "Lowest Common Ancestor (LCA)",
    difficulty: "gold",
    type: "coding",
    description: "BST에 정수를 삽입한 뒤 두 값 A, B의 최소 공통 조상 값을 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수\n셋째 줄에 A B",
    outputFormat: "LCA 값",
    constraints: ["1 ≤ N ≤ 5000"],
    sampleIO: [{ input: "7\n20 10 30 5 15 25 35\n5 15", output: "10" }],
    testCases: [
      { input: "7\n20 10 30 5 15 25 35\n5 15", output: "10" },
      { input: "7\n20 10 30 5 15 25 35\n5 35", output: "20" },
      { input: "5\n10 5 15 2 7\n2 7", output: "5" },
    ],
    tags: ["tree", "bst", "lca"],
  },
]);
