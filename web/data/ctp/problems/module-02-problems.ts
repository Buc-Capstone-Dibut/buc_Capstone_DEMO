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
      },
    ],
    testCases: [
      {
        input: "7\npush 3\npush 5\npeek\npop\npop\npop\nsize",
        output: "5\n5\n3\n-1\n0",
      },
      {
        input: "5\npush 1\npush 2\nsize\npop\npeek",
        output: "2\n2\n1",
      },
      {
        input: "4\npop\npeek\nsize\npush 9",
        output: "-1\n-1\n0",
      },
    ],
    tags: ["stack", "implementation"],
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
      },
    ],
    testCases: [
      { input: "([]{})", output: "YES" },
      { input: "([)]", output: "NO" },
      { input: "(((())))", output: "YES" },
    ],
    tags: ["stack", "string"],
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
      },
    ],
    testCases: [
      { input: "5 5 1\n1 2\n1 3\n2 4\n3 4\n4 5", output: "1 2 3 4 5" },
      { input: "4 2 2\n1 2\n2 3", output: "2 1 3" },
      { input: "3 0 3", output: "3" },
    ],
    tags: ["queue", "bfs", "graph"],
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
      },
    ],
    testCases: [
      { input: "6", output: "720" },
      { input: "0", output: "1" },
      { input: "3", output: "6" },
    ],
    tags: ["iteration", "factorial"],
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
      },
    ],
    testCases: [
      { input: "10", output: "55" },
      { input: "0", output: "0" },
      { input: "30", output: "832040" },
    ],
    tags: ["recursion", "memoization"],
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
      },
    ],
    testCases: [
      { input: "5 5 1\n1 2\n1 3\n2 4\n3 4\n4 5", output: "1 2 4 3 5" },
      { input: "4 2 2\n1 2\n2 3", output: "2 1 3" },
      { input: "3 0 1", output: "1" },
    ],
    tags: ["dfs", "stack", "graph"],
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
      },
    ],
    testCases: [
      { input: "4", output: "2" },
      { input: "1", output: "1" },
      { input: "5", output: "10" },
    ],
    tags: ["backtracking", "n-queens"],
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
        explanation: "{1,4}, {2,3}",
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
      },
    ],
    testCases: [
      { input: "2 3 + 4 *", output: "20" },
      { input: "5 1 2 + 4 * + 3 -", output: "14" },
      { input: "10 2 / 3 +", output: "8" },
    ],
    tags: ["stack", "postfix"],
  },
]);
