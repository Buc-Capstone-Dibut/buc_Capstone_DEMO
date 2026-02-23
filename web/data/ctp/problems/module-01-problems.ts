import { defineProblems } from "./problem-factory";

export const module01Problems = defineProblems("foundation-integration", [
  {
    id: "p01-001",
    title: "Find Max and Min in Array",
    difficulty: "bronze",
    type: "coding",
    description:
      "정수 배열이 주어질 때 최댓값과 최솟값을 한 줄에 출력하세요.\n\n출력 형식: `max min`",
    inputFormat: "첫째 줄에 정수 N\n둘째 줄에 N개의 정수",
    outputFormat: "최댓값과 최솟값을 공백으로 구분해 출력",
    constraints: ["1 ≤ N ≤ 1000", "-10^6 ≤ 원소 ≤ 10^6"],
    sampleIO: [
      {
        input: "5\n3 12 7 1 8",
        output: "12 1",
      },
    ],
    testCases: [
      { input: "5\n3 12 7 1 8", output: "12 1" },
      { input: "4\n-5 -2 -9 -1", output: "-1 -9" },
      { input: "1\n42", output: "42 42" },
    ],
    tags: ["array", "traversal"],
  },
  {
    id: "p01-002",
    title: "Fix Off-by-One Error",
    difficulty: "bronze",
    type: "debugging",
    description:
      "N개의 정수 합을 구하는 코드에 off-by-one 버그가 있습니다.\n버그를 고쳐서 전체 합을 출력하세요.",
    inputFormat: "첫째 줄에 정수 N\n둘째 줄에 N개의 정수",
    outputFormat: "배열 원소의 총합을 출력",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [
      {
        input: "4\n1 2 3 4",
        output: "10",
      },
    ],
    testCases: [
      { input: "4\n1 2 3 4", output: "10" },
      { input: "5\n10 20 30 40 50", output: "150" },
      { input: "1\n7", output: "7" },
    ],
    starterCode: `n = int(input())
arr = list(map(int, input().split()))
total = 0
for i in range(n - 1):
    total += arr[i]
print(total)
`,
    tags: ["debugging", "boundary"],
  },
  {
    id: "p01-003",
    title: "Reverse an Array",
    difficulty: "bronze",
    type: "coding",
    description: "배열을 역순으로 출력하세요.",
    inputFormat: "첫째 줄에 정수 N\n둘째 줄에 N개의 정수",
    outputFormat: "역순 배열을 공백으로 구분해 출력",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [
      {
        input: "5\n1 2 3 4 5",
        output: "5 4 3 2 1",
      },
    ],
    testCases: [
      { input: "5\n1 2 3 4 5", output: "5 4 3 2 1" },
      { input: "3\n9 8 7", output: "7 8 9" },
      { input: "1\n100", output: "100" },
    ],
    tags: ["array", "index"],
  },
  {
    id: "p01-004",
    title: "Linear Search — Return Index",
    difficulty: "silver",
    type: "coding",
    description: "배열에서 target의 첫 인덱스를 출력하고 없으면 -1을 출력하세요.",
    inputFormat: "첫째 줄에 정수 N\n둘째 줄에 N개의 정수\n셋째 줄에 target",
    outputFormat: "찾은 인덱스 또는 -1",
    constraints: ["1 ≤ N ≤ 2000"],
    sampleIO: [
      {
        input: "5\n10 20 30 20 10\n20",
        output: "1",
      },
    ],
    testCases: [
      { input: "5\n10 20 30 20 10\n20", output: "1" },
      { input: "4\n1 2 3 4\n5", output: "-1" },
      { input: "6\n7 7 7 7 7 7\n7", output: "0" },
    ],
    tags: ["search", "linear"],
  },
  {
    id: "p01-005",
    title: "Fix Infinite Loop in Search",
    difficulty: "silver",
    type: "debugging",
    description:
      "선형 탐색 코드가 무한 루프에 빠집니다. target 인덱스를 출력하거나 없으면 -1을 출력하도록 고치세요.",
    inputFormat: "첫째 줄에 정수 N\n둘째 줄에 N개의 정수\n셋째 줄에 target",
    outputFormat: "찾은 인덱스 또는 -1",
    constraints: ["1 ≤ N ≤ 2000"],
    sampleIO: [
      {
        input: "4\n5 1 9 2\n9",
        output: "2",
      },
    ],
    testCases: [
      { input: "4\n5 1 9 2\n9", output: "2" },
      { input: "4\n5 1 9 2\n3", output: "-1" },
      { input: "3\n8 8 8\n8", output: "0" },
    ],
    starterCode: `n = int(input())
arr = list(map(int, input().split()))
target = int(input())
idx = 0
while idx < n:
    if arr[idx] == target:
        print(idx)
        break
else:
    print(-1)
`,
    tags: ["debugging", "loop"],
  },
  {
    id: "p01-006",
    title: "Binary Search on Sorted Array",
    difficulty: "silver",
    type: "coding",
    description: "오름차순 정렬 배열에서 target 인덱스를 이진 탐색으로 출력하세요.",
    inputFormat: "첫째 줄에 정수 N\n둘째 줄에 N개의 오름차순 정수\n셋째 줄에 target",
    outputFormat: "찾은 인덱스 또는 -1",
    constraints: ["1 ≤ N ≤ 100000"],
    sampleIO: [
      {
        input: "6\n1 3 5 7 9 11\n7",
        output: "3",
      },
    ],
    testCases: [
      { input: "6\n1 3 5 7 9 11\n7", output: "3" },
      { input: "5\n2 4 6 8 10\n1", output: "-1" },
      { input: "1\n9\n9", output: "0" },
    ],
    tags: ["search", "binary-search"],
  },
  {
    id: "p01-007",
    title: "Fix Binary Search Boundary",
    difficulty: "silver",
    type: "debugging",
    description:
      "이진 탐색 경계 조건이 잘못되어 마지막 원소를 찾지 못합니다. 코드를 수정하세요.",
    inputFormat: "첫째 줄에 정수 N\n둘째 줄에 N개의 오름차순 정수\n셋째 줄에 target",
    outputFormat: "찾은 인덱스 또는 -1",
    constraints: ["1 ≤ N ≤ 100000"],
    sampleIO: [
      {
        input: "5\n1 2 3 4 5\n5",
        output: "4",
      },
    ],
    testCases: [
      { input: "5\n1 2 3 4 5\n5", output: "4" },
      { input: "5\n1 2 3 4 5\n1", output: "0" },
      { input: "5\n1 2 3 4 5\n6", output: "-1" },
    ],
    starterCode: `n = int(input())
arr = list(map(int, input().split()))
target = int(input())
left, right = 0, n - 1
answer = -1
while left < right:
    mid = (left + right) // 2
    if arr[mid] == target:
        answer = mid
        break
    if arr[mid] < target:
        left = mid + 1
    else:
        right = mid - 1
print(answer)
`,
    tags: ["debugging", "binary-search"],
  },
  {
    id: "p01-008",
    title: "Row and Column Sums of 2D Array",
    difficulty: "silver",
    type: "coding",
    description:
      "N x M 행렬이 주어집니다.\n첫 줄에 각 행의 합을 출력하고, 둘째 줄에 각 열의 합을 출력하세요.",
    inputFormat: "첫째 줄에 N M\n다음 N줄에 M개의 정수",
    outputFormat: "첫째 줄: 행 합 N개\n둘째 줄: 열 합 M개",
    constraints: ["1 ≤ N, M ≤ 50"],
    sampleIO: [
      {
        input: "2 3\n1 2 3\n4 5 6",
        output: "6 15\n5 7 9",
      },
    ],
    testCases: [
      { input: "2 3\n1 2 3\n4 5 6", output: "6 15\n5 7 9" },
      { input: "3 2\n1 1\n2 2\n3 3", output: "2 4 6\n6 6" },
      { input: "1 1\n9", output: "9\n9" },
    ],
    tags: ["2d-array", "nested-loop"],
  },
  {
    id: "p01-009",
    title: "Two Sum using Hash Map",
    difficulty: "gold",
    type: "coding",
    description:
      "배열에서 합이 K가 되는 두 수의 인덱스(0-based)를 오름차순으로 출력하세요.\n없으면 -1을 출력하세요.",
    inputFormat: "첫째 줄에 정수 N\n둘째 줄에 N개의 정수\n셋째 줄에 K",
    outputFormat: "i j 또는 -1",
    constraints: ["2 ≤ N ≤ 100000"],
    sampleIO: [
      {
        input: "5\n2 7 11 15 3\n9",
        output: "0 1",
      },
    ],
    testCases: [
      { input: "5\n2 7 11 15 3\n9", output: "0 1" },
      { input: "4\n1 2 3 4\n8", output: "-1" },
      { input: "6\n3 3 4 5 1 2\n6", output: "0 1" },
    ],
    tags: ["hash-map", "two-sum"],
  },
  {
    id: "p01-010",
    title: "Fix Hash Collision Handler",
    difficulty: "gold",
    type: "debugging",
    description:
      "문자열 빈도수를 세는 코드가 충돌(동일 키 재등장)을 제대로 처리하지 못합니다.\n가장 많이 등장한 빈도수를 출력하세요.",
    inputFormat: "첫째 줄에 정수 N\n다음 N줄에 문자열",
    outputFormat: "최대 빈도수",
    constraints: ["1 ≤ N ≤ 10000"],
    sampleIO: [
      {
        input: "5\na\nb\na\nc\na",
        output: "3",
      },
    ],
    testCases: [
      { input: "5\na\nb\na\nc\na", output: "3" },
      { input: "4\ncat\ndog\ncat\ndog", output: "2" },
      { input: "3\nx\ny\nz", output: "1" },
    ],
    starterCode: `n = int(input())
freq = {}
for _ in range(n):
    word = input().strip()
    if word in freq:
        freq[word] = 1
    else:
        freq[word] = 1
print(max(freq.values()))
`,
    tags: ["debugging", "hash-map"],
  },
  {
    id: "p01-011",
    title: "Sieve of Eratosthenes",
    difficulty: "gold",
    type: "coding",
    description: "N 이하 소수의 개수를 출력하세요.",
    inputFormat: "첫째 줄에 정수 N",
    outputFormat: "N 이하 소수 개수",
    constraints: ["2 ≤ N ≤ 100000"],
    sampleIO: [
      {
        input: "10",
        output: "4",
      },
    ],
    testCases: [
      { input: "10", output: "4" },
      { input: "2", output: "1" },
      { input: "30", output: "10" },
    ],
    tags: ["sieve", "prime"],
  },
  {
    id: "p01-012",
    title: "Maximum Subarray Sum",
    difficulty: "gold",
    type: "coding",
    description: "연속 부분 배열의 최대 합을 출력하세요.",
    inputFormat: "첫째 줄에 정수 N\n둘째 줄에 N개의 정수",
    outputFormat: "최대 부분합",
    constraints: ["1 ≤ N ≤ 100000", "-10^4 ≤ 원소 ≤ 10^4"],
    sampleIO: [
      {
        input: "5\n-2 1 -3 4 -1",
        output: "4",
      },
    ],
    testCases: [
      { input: "5\n-2 1 -3 4 -1", output: "4" },
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4", output: "6" },
      { input: "3\n-5 -2 -9", output: "-2" },
    ],
    tags: ["kadane", "array"],
  },
]);
