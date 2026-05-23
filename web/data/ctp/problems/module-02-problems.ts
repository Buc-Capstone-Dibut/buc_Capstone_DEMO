import { defineProblems } from "./problem-factory";

export const module02Problems = defineProblems("stack-recursion-integration", [
  {
    id: "p02-001",
    title: "스택 구현 (push / pop / peek)",
    difficulty: "bronze",
    type: "coding",
    description:
      "스택 명령을 처리하세요.\n- `push x`: x 삽입\n- `pop`: 최상단 제거 후 출력 (비어 있으면 -1)\n- `peek`: 최상단 출력 (비어 있으면 -1)\n- `size`: 현재 크기 출력",
    inputFormat: "첫째 줄에 명령 수 Q\n다음 Q줄에 명령",
    outputFormat: "출력이 필요한 명령 결과를 줄바꿈으로 출력",
    constraints: ["1 ≤ Q ≤ 10000"],
    sampleIO: [
      {
        input: "7\npush 3\npush 5\npeek\npop\npop\npop\nsize",
        output: "5\n5\n3\n-1\n0",
        explanation: "push 3, push 5 후 peek=5, pop=5, pop=3, 빈 pop=-1, size=0.",
      },
    ],
    testCases: [
      { input: "7\npush 3\npush 5\npeek\npop\npop\npop\nsize", output: "5\n5\n3\n-1\n0" },
      { input: "5\npush 1\npush 2\nsize\npop\npeek", output: "2\n2\n1" },
      { input: "4\npop\npeek\nsize\npush 9", output: "-1\n-1\n0" },
    ],
    tags: ["stack", "implementation"],
    referenceSolution: `q = int(input())
stack = []
out = []
for _ in range(q):
    parts = input().split()
    cmd = parts[0]
    if cmd == "push":
        stack.append(int(parts[1]))
    elif cmd == "pop":
        out.append(str(stack.pop()) if stack else "-1")
    elif cmd == "peek":
        out.append(str(stack[-1]) if stack else "-1")
    elif cmd == "size":
        out.append(str(len(stack)))
print("\\n".join(out))
`,
    solutionExplanation: `**시간복잡도**: 각 명령 O(1)

Python의 list가 dynamic array로 \`append\`/\`pop\`이 모두 O(1) 평균.

- push/pop/peek/size 4 명령을 분기 처리
- 빈 스택 처리: \`if stack\` 으로 진단 후 -1 출력
- 매 명령마다 print하지 말고 buffer에 모았다가 한 번에 출력 (성능)`,
    hints: [
      "Python list를 스택으로 활용: append/pop이 모두 O(1)입니다.",
      "빈 스택 pop 시 IndexError 발생을 미리 막아야 합니다.",
    ],
  },
  {
    id: "p02-002",
    title: "빈 스택 pop 오류 수정",
    difficulty: "bronze",
    type: "debugging",
    description: "스택에서 pop을 수행할 때 빈 스택 예외가 발생합니다. 빈 경우 -1을 출력하도록 수정하세요.",
    inputFormat: "첫째 줄에 명령 수 Q\n다음 Q줄에 `push x` 또는 `pop`",
    outputFormat: "각 pop 결과를 줄바꿈으로 출력",
    constraints: ["1 ≤ Q ≤ 10000"],
    sampleIO: [
      {
        input: "5\npop\npush 7\npop\npop\npush 1",
        output: "-1\n7\n-1",
        explanation: "비어있는 상태 pop=-1, push 7 후 pop=7, 다시 빈 상태 pop=-1.",
      },
    ],
    testCases: [
      { input: "5\npop\npush 7\npop\npop\npush 1", output: "-1\n7\n-1" },
      { input: "4\npush 2\npush 3\npop\npop", output: "3\n2" },
      { input: "3\npop\npop\npop", output: "-1\n-1\n-1" },
    ],
    starterCode: `q = int(input())
stack = []
for _ in range(q):
    parts = input().split()
    if parts[0] == "push":
        stack.append(int(parts[1]))
    else:
        print(stack.pop())
`,
    tags: ["debugging", "stack"],
    referenceSolution: `q = int(input())
stack = []
for _ in range(q):
    parts = input().split()
    if parts[0] == "push":
        stack.append(int(parts[1]))
    else:
        if stack:
            print(stack.pop())
        else:
            print(-1)
`,
    solutionExplanation: `**버그**: 빈 스택에 \`pop()\` 호출 시 \`IndexError: pop from empty list\` 발생.

**수정**: pop 전에 \`if stack:\` 검사 추가. 비어있으면 -1 출력.

- LBYL(Look Before You Leap) 패턴
- try/except로 처리해도 무방하나 명시적 검사가 가독성 좋음`,
    hints: [
      "빈 리스트에 .pop()을 호출하면 어떤 예외가 발생할까요?",
      "pop 전에 길이를 검사하거나 truthy 체크하세요.",
    ],
  },
  {
    id: "p02-003",
    title: "올바른 괄호 판별",
    difficulty: "bronze",
    type: "coding",
    description: "괄호 문자열이 올바른지 판별하세요. `(`, `)`, `{`, `}`, `[`, `]`만 주어집니다.",
    inputFormat: "첫째 줄에 괄호 문자열 S",
    outputFormat: "올바르면 YES, 아니면 NO",
    constraints: ["1 ≤ |S| ≤ 100000"],
    sampleIO: [
      {
        input: "([]{})",
        output: "YES",
        explanation: "( → [ → ] (짝) → { → } (짝) → ) (짝). 모두 정상 닫힘.",
      },
    ],
    testCases: [
      { input: "([]{})", output: "YES" },
      { input: "([)]", output: "NO" },
      { input: "(((())))", output: "YES" },
    ],
    tags: ["stack", "string"],
    referenceSolution: `s = input().strip()
stack = []
pair = {")": "(", "]": "[", "}": "{"}
ok = True
for ch in s:
    if ch in "([{":
        stack.append(ch)
    else:
        if not stack or stack[-1] != pair[ch]:
            ok = False
            break
        stack.pop()
if ok and not stack:
    print("YES")
else:
    print("NO")
`,
    solutionExplanation: `**시간복잡도**: O(N)

여는 괄호는 스택에 push. 닫는 괄호는 스택 top이 짝이어야 pop.

- 짝 매핑 dict로 처리
- 종료 시 스택이 비어있어야 모든 괄호가 닫힘
- 빈 스택에서 닫는 괄호 만나면 실패`,
    hints: [
      "여는 괄호는 스택에 쌓고, 닫는 괄호는 스택 top과 짝을 비교하세요.",
      "마지막에 스택이 비어있는지 확인해야 합니다.",
    ],
  },
  {
    id: "p02-004",
    title: "큐 기반 BFS 골격",
    difficulty: "silver",
    type: "coding",
    description: "무방향 그래프에서 시작 정점 S부터 BFS 방문 순서를 출력하세요. 인접 정점은 번호 오름차순으로 방문합니다.",
    inputFormat: "첫째 줄: N M S\n다음 M줄: 간선 u v",
    outputFormat: "BFS 방문 순서를 공백으로 출력",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [
      {
        input: "5 5 1\n1 2\n1 3\n2 4\n3 4\n4 5",
        output: "1 2 3 4 5",
        explanation: "1에서 BFS: 1 → 인접 [2,3] → 그 다음 [4] → [5].",
      },
    ],
    testCases: [
      { input: "5 5 1\n1 2\n1 3\n2 4\n3 4\n4 5", output: "1 2 3 4 5" },
      { input: "4 2 2\n1 2\n2 3", output: "2 1 3" },
      { input: "3 0 3", output: "3" },
    ],
    tags: ["queue", "bfs", "graph"],
    referenceSolution: `from collections import deque

first = input().split()
n, m, s = int(first[0]), int(first[1]), int(first[2])
adj = [[] for _ in range(n + 1)]
for _ in range(m):
    u, v = map(int, input().split())
    adj[u].append(v)
    adj[v].append(u)
for i in range(1, n + 1):
    adj[i].sort()

visited = [False] * (n + 1)
order = []
q = deque([s])
visited[s] = True
while q:
    cur = q.popleft()
    order.append(cur)
    for nxt in adj[cur]:
        if not visited[nxt]:
            visited[nxt] = True
            q.append(nxt)
print(" ".join(map(str, order)))
`,
    solutionExplanation: `**시간복잡도**: O(N + M)

BFS는 큐(FIFO) 기반: 시작 정점을 큐에 넣고, 꺼낼 때마다 미방문 인접을 큐에 추가.

- 인접 리스트를 오름차순 정렬해 순서 일관성 보장
- \`collections.deque\`로 O(1) popleft
- M=0인 경우 시작 정점만 출력`,
    hints: [
      "BFS는 큐(FIFO)를 사용합니다. collections.deque를 활용하세요.",
      "방문 배열을 만들어 중복 방문을 막아야 합니다.",
      "인접 정점은 정렬한 뒤 순회해야 출력 순서가 일관됩니다.",
    ],
  },
  {
    id: "p02-005",
    title: "재귀 기저 조건 누락 수정",
    difficulty: "silver",
    type: "debugging",
    description: "팩토리얼 재귀 코드에 기저 조건이 부족합니다. `n!`을 올바르게 출력하도록 수정하세요.",
    inputFormat: "첫째 줄에 정수 N",
    outputFormat: "N! 출력",
    constraints: ["0 ≤ N ≤ 12"],
    sampleIO: [
      {
        input: "5",
        output: "120",
        explanation: "5! = 5·4·3·2·1 = 120.",
      },
    ],
    testCases: [
      { input: "5", output: "120" },
      { input: "0", output: "1" },
      { input: "1", output: "1" },
    ],
    starterCode: `def fact(n):
    if n == 1:
        return 1
    return n * fact(n - 1)

n = int(input())
print(fact(n))
`,
    tags: ["debugging", "recursion"],
    referenceSolution: `def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

n = int(input())
print(fact(n))
`,
    solutionExplanation: `**버그**: 기저 조건이 \`n == 1\` 만 처리 → N=0 입력 시 무한 재귀.

**수정**: \`n <= 1\` 로 변경. 0!=1 정의에 따라 0도 기저로 처리.

- 재귀 함수는 모든 기저 케이스를 반드시 포함해야 함
- 음수 입력 가능성도 검토 필요 (본 문제는 0 ≤ N)`,
    hints: [
      "N=0 입력 시 어떤 일이 일어나는지 추적해보세요.",
      "0!의 정의는 1입니다. 기저 조건 범위를 넓혀야 합니다.",
    ],
  },
  {
    id: "p02-006",
    title: "팩토리얼: 재귀 → 반복",
    difficulty: "silver",
    type: "coding",
    description: "재귀를 사용하지 않고 반복문으로 N!을 계산하세요.",
    inputFormat: "첫째 줄에 정수 N",
    outputFormat: "N! 출력",
    constraints: ["0 ≤ N ≤ 12"],
    sampleIO: [
      {
        input: "6",
        output: "720",
        explanation: "6·5·4·3·2·1 = 720.",
      },
    ],
    testCases: [
      { input: "6", output: "720" },
      { input: "0", output: "1" },
      { input: "3", output: "6" },
    ],
    tags: ["iteration", "factorial"],
    referenceSolution: `n = int(input())
result = 1
for i in range(2, n + 1):
    result *= i
print(result)
`,
    solutionExplanation: `**시간복잡도**: O(N), 공간 O(1)

재귀 대신 \`result\` 누적 변수로 2부터 N까지 곱.

- N=0, 1 모두 result=1 (range(2, 1) = 빈 range)
- 재귀 변환 시 호출 스택 비용 제거 → 공간 효율
- Python 정수는 임의 정밀도라 overflow 없음`,
    hints: [
      "result 변수를 1로 초기화 후 1..N까지 곱하세요.",
      "range(2, n+1)이면 0!, 1! 케이스도 자연스럽게 1을 반환합니다.",
    ],
  },
  {
    id: "p02-007",
    title: "메모이제이션 피보나치",
    difficulty: "silver",
    type: "coding",
    description: "N번째 피보나치 수를 메모이제이션을 활용해 계산하세요. F(0)=0, F(1)=1",
    inputFormat: "첫째 줄에 정수 N",
    outputFormat: "F(N) 출력",
    constraints: ["0 ≤ N ≤ 35"],
    sampleIO: [
      {
        input: "10",
        output: "55",
        explanation: "0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55 → F(10) = 55.",
      },
    ],
    testCases: [
      { input: "10", output: "55" },
      { input: "0", output: "0" },
      { input: "30", output: "832040" },
    ],
    tags: ["recursion", "memoization"],
    referenceSolution: `n = int(input())
memo = {0: 0, 1: 1}
def fib(k):
    if k in memo:
        return memo[k]
    memo[k] = fib(k - 1) + fib(k - 2)
    return memo[k]
print(fib(n))
`,
    solutionExplanation: `**시간복잡도**: O(N) — 메모이제이션

순수 재귀 fib는 O(2^N)으로 N=30만 되어도 매우 느림. memo dict로 한 번 계산된 값을 저장하면 각 fib(k)가 1회만 호출되어 O(N).

- 반복형으로도 가능: \`a, b = 0, 1; for _ in range(n): a, b = b, a+b\`
- functools.lru_cache 사용 가능하지만 Skulpt 호환 위해 직접 dict 사용`,
    hints: [
      "순수 재귀는 O(2^N)으로 너무 느립니다.",
      "이미 계산한 fib(k) 값을 dict에 저장해 재사용하세요.",
      "또는 반복문으로 a, b 두 변수만 굴려도 됩니다.",
    ],
  },
  {
    id: "p02-008",
    title: "무한 재귀 수정",
    difficulty: "silver",
    type: "debugging",
    description: "최대공약수(GCD) 재귀 코드가 종료되지 않습니다. 종료 조건/재귀 호출을 수정하세요.",
    inputFormat: "첫째 줄에 정수 a b",
    outputFormat: "gcd(a, b)",
    constraints: ["1 ≤ a, b ≤ 10^9"],
    sampleIO: [
      {
        input: "24 18",
        output: "6",
        explanation: "gcd(24,18) = gcd(18,6) = gcd(6,0) = 6.",
      },
    ],
    testCases: [
      { input: "24 18", output: "6" },
      { input: "7 5", output: "1" },
      { input: "100 25", output: "25" },
    ],
    starterCode: `def gcd(a, b):
    if b == 0:
        return a
    return gcd(a, b)

a, b = map(int, input().split())
print(gcd(a, b))
`,
    tags: ["debugging", "recursion", "gcd"],
    referenceSolution: `def gcd(a, b):
    if b == 0:
        return a
    return gcd(b, a % b)

a, b = map(int, input().split())
print(gcd(a, b))
`,
    solutionExplanation: `**버그**: 재귀 호출이 \`gcd(a, b)\` 그대로 → 같은 인자로 무한 호출.

**수정**: 유클리드 호제법 \`gcd(b, a % b)\`. 호출마다 두 번째 인자가 줄어 b=0에서 종료.

- 시간복잡도: O(log min(a,b))
- a < b 케이스도 첫 호출에서 자동 정렬 (a%b = a, 다음 호출이 gcd(b, a))`,
    hints: [
      "재귀 호출의 인자가 그대로면 절대 종료할 수 없습니다.",
      "유클리드 호제법: gcd(a, b) = gcd(b, a % b).",
    ],
  },
  {
    id: "p02-009",
    title: "명시적 스택 DFS",
    difficulty: "gold",
    type: "coding",
    description: "무방향 그래프에서 시작 정점 S부터 DFS 방문 순서를 출력하세요. 인접 정점은 오름차순으로 처리합니다.",
    inputFormat: "첫째 줄: N M S\n다음 M줄: 간선 u v",
    outputFormat: "DFS 방문 순서를 공백으로 출력",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [
      {
        input: "5 5 1\n1 2\n1 3\n2 4\n3 4\n4 5",
        output: "1 2 4 3 5",
        explanation: "DFS: 1 → 2 → 4 → 3 (back) → 5. 인접 오름차순.",
      },
    ],
    testCases: [
      { input: "5 5 1\n1 2\n1 3\n2 4\n3 4\n4 5", output: "1 2 4 3 5" },
      { input: "4 2 2\n1 2\n2 3", output: "2 1 3" },
      { input: "3 0 1", output: "1" },
    ],
    tags: ["dfs", "stack", "graph"],
    referenceSolution: `first = input().split()
n, m, s = int(first[0]), int(first[1]), int(first[2])
adj = [[] for _ in range(n + 1)]
for _ in range(m):
    u, v = map(int, input().split())
    adj[u].append(v)
    adj[v].append(u)
for i in range(1, n + 1):
    adj[i].sort(reverse=True)  # 스택은 역순으로 push해야 오름차순 pop

visited = [False] * (n + 1)
order = []
stack = [s]
while stack:
    cur = stack.pop()
    if visited[cur]:
        continue
    visited[cur] = True
    order.append(cur)
    for nxt in adj[cur]:
        if not visited[nxt]:
            stack.append(nxt)
print(" ".join(map(str, order)))
`,
    solutionExplanation: `**시간복잡도**: O(N + M)

DFS를 명시적 스택(LIFO)으로 구현. 재귀 깊이 제한 회피.

- 인접을 **내림차순** 정렬 후 push → 스택 LIFO 특성으로 작은 번호가 먼저 pop됨
- visited 체크는 pop 시점에 (중복 push 가능하므로)
- M=0이면 시작 정점만 출력`,
    hints: [
      "재귀 대신 list를 스택으로 사용하세요.",
      "스택은 LIFO이므로 인접 정점을 역순으로 push해야 작은 번호가 먼저 처리됩니다.",
      "중복 push가 발생하므로 visited 체크를 pop 시점에 합니다.",
    ],
  },
  {
    id: "p02-010",
    title: "N-Queens 백트래킹",
    difficulty: "gold",
    type: "coding",
    description: "N-Queens 문제의 해 개수를 출력하세요.",
    inputFormat: "첫째 줄에 정수 N",
    outputFormat: "해의 개수",
    constraints: ["1 ≤ N ≤ 10"],
    sampleIO: [
      {
        input: "4",
        output: "2",
        explanation: "4-Queens의 해는 2개 (대칭).",
      },
    ],
    testCases: [
      { input: "4", output: "2" },
      { input: "1", output: "1" },
      { input: "5", output: "10" },
    ],
    tags: ["backtracking", "n-queens"],
    referenceSolution: `n = int(input())
count = 0
cols = [0] * n

def safe(row, col):
    for r in range(row):
        c = cols[r]
        if c == col or abs(c - col) == row - r:
            return False
    return True

def dfs(row):
    global count
    if row == n:
        count += 1
        return
    for col in range(n):
        if safe(row, col):
            cols[row] = col
            dfs(row + 1)

dfs(0)
print(count)
`,
    solutionExplanation: `**시간복잡도**: O(N!) 최악 — 가지치기로 실제론 훨씬 작음

각 행에 퀸을 1개씩 배치하며, 같은 열·같은 대각선 충돌을 검사.

- \`safe(row, col)\`: 이전 row까지의 퀸들과 비교
- 대각선 충돌: \`|c-col| == row-r\`
- 비트마스크 최적화로 N=12까지 빠른 처리 가능 (이 문제는 N≤10)`,
    hints: [
      "각 행에 퀸 1개씩 놓는다고 가정하면 열 충돌만 검사하면 됩니다.",
      "대각선 충돌: 두 퀸 (r1,c1)과 (r2,c2)가 |r1-r2| == |c1-c2|이면 충돌.",
      "safe 함수로 현재 row까지 충돌 없으면 다음 row 재귀.",
    ],
  },
  {
    id: "p02-011",
    title: "백트래킹 가지치기 조건 수정",
    difficulty: "gold",
    type: "debugging",
    description: "부분집합 합 문제 코드의 가지치기 조건이 잘못되었습니다. 목표 합과 같은 경우를 올바르게 세도록 수정하세요.",
    inputFormat: "첫째 줄: N K\n둘째 줄: N개의 양의 정수",
    outputFormat: "합이 K인 부분집합 개수",
    constraints: ["1 ≤ N ≤ 20", "1 ≤ K ≤ 1000"],
    sampleIO: [
      {
        input: "4 5\n1 2 3 4",
        output: "2",
        explanation: "{1,4}, {2,3} 두 부분집합이 합 5.",
      },
    ],
    testCases: [
      { input: "4 5\n1 2 3 4", output: "2" },
      { input: "5 10\n2 3 5 7 8", output: "2" },
      { input: "3 100\n10 20 30", output: "0" },
    ],
    starterCode: `n, k = map(int, input().split())
arr = list(map(int, input().split()))
count = 0

def dfs(idx, total):
    global count
    if total >= k:
        return
    if idx == n:
        if total == k:
            count += 1
        return
    dfs(idx + 1, total + arr[idx])
    dfs(idx + 1, total)

dfs(0, 0)
print(count)
`,
    tags: ["debugging", "backtracking"],
    referenceSolution: `n, k = map(int, input().split())
arr = list(map(int, input().split()))
count = 0

def dfs(idx, total):
    global count
    if total > k:
        return
    if idx == n:
        if total == k:
            count += 1
        return
    dfs(idx + 1, total + arr[idx])
    dfs(idx + 1, total)

dfs(0, 0)
print(count)
`,
    solutionExplanation: `**버그**: 가지치기 조건 \`total >= k\`가 total==k 케이스를 잘라버려 count 누락.

**수정**: \`total > k\` 로 변경. total==k는 계속 진행해 idx==n 시점에 카운트.

- 가지치기는 "더 가도 가능성 없음" 일 때만 발동
- total==k는 leaf에서 count되어야 함`,
    hints: [
      "가지치기 조건이 정답 케이스를 제외하지 않는지 확인하세요.",
      ">= 와 > 의 차이를 생각해보세요.",
    ],
  },
  {
    id: "p02-012",
    title: "후위 표기식 계산",
    difficulty: "gold",
    type: "coding",
    description: "후위 표기식을 계산하세요. 토큰은 공백으로 구분됩니다.",
    inputFormat: "첫째 줄에 후위 표기식",
    outputFormat: "계산 결과 정수",
    constraints: ["피연산자는 정수", "연산자: + - * /"] ,
    sampleIO: [
      {
        input: "2 3 + 4 *",
        output: "20",
        explanation: "(2+3)*4 = 20.",
      },
    ],
    testCases: [
      { input: "2 3 + 4 *", output: "20" },
      { input: "5 1 2 + 4 * + 3 -", output: "14" },
      { input: "10 2 / 3 +", output: "8" },
    ],
    tags: ["stack", "postfix"],
    referenceSolution: `tokens = input().split()
stack = []
for tok in tokens:
    if tok in "+-*/":
        b = stack.pop()
        a = stack.pop()
        if tok == "+":
            stack.append(a + b)
        elif tok == "-":
            stack.append(a - b)
        elif tok == "*":
            stack.append(a * b)
        else:
            stack.append(int(a / b))
    else:
        stack.append(int(tok))
print(stack[0])
`,
    solutionExplanation: `**시간복잡도**: O(N)

후위 표기식은 스택으로 단순 계산:
- 숫자 → push
- 연산자 → 두 번 pop (b, a 순서 주의) → 연산 → push

- 마지막에 스택에 결과 1개 남음
- 나눗셈은 정수 결과를 요구하면 \`int(a/b)\` 또는 \`a // b\` (부호 처리 주의)`,
    hints: [
      "토큰을 순회하며 숫자는 push, 연산자는 두 번 pop.",
      "주의: 두 번째 pop이 첫 피연산자 (a), 첫 번째 pop이 두 번째 (b)입니다.",
      "결과는 스택에 마지막 1개 남습니다.",
    ],
  },
]);
