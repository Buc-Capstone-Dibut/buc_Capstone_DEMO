import { defineProblems } from "./problem-factory";

export const module01Problems = defineProblems("foundation-integration", [
  {
    id: "p01-001",
    title: "배열 최댓값과 최솟값 찾기",
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
        explanation: "배열 [3, 12, 7, 1, 8] 중 최댓값 12, 최솟값 1.",
      },
    ],
    testCases: [
      { input: "5\n3 12 7 1 8", output: "12 1" },
      { input: "4\n-5 -2 -9 -1", output: "-1 -9" },
      { input: "1\n42", output: "42 42" },
    ],
    tags: ["array", "traversal"],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))
print(max(arr), min(arr))
`,
    solutionExplanation: `**시간복잡도**: O(N)

Python 내장 \`max()\` / \`min()\`을 사용하면 단일 패스로 두 값을 모두 구할 수 있습니다.

- 직접 루프로 비교해도 동일 결과
- N=1 케이스에서 max == min
- 음수만 있는 배열도 동일하게 동작`,
    hints: [
      "Python 내장 함수를 활용해보세요.",
      "출력 형식은 'max min' 공백 구분입니다.",
    ],
  },
  {
    id: "p01-002",
    title: "오프바이원 오류 수정",
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
        explanation: "1+2+3+4 = 10. 기존 코드는 마지막 원소(4)를 빠뜨려 6을 출력합니다.",
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
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))
total = 0
for i in range(n):
    total += arr[i]
print(total)
`,
    solutionExplanation: `**버그**: \`range(n - 1)\`은 인덱스 0~n-2까지만 순회하여 마지막 원소가 누락됩니다.

**수정**: \`range(n)\`으로 변경해 0~n-1 전체를 순회합니다.

- Python의 \`range(k)\`는 \`[0, k)\` 반열린 구간
- N=1 입력에서도 \`range(1)\` = [0]으로 안전`,
    hints: [
      "range() 함수의 인자가 무엇을 의미하는지 확인하세요.",
      "마지막 원소의 인덱스는 n-1입니다. range(n)이 [0, n)을 만듭니다.",
    ],
  },
  {
    id: "p01-003",
    title: "배열 뒤집기",
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
        explanation: "[1,2,3,4,5]를 거꾸로 출력.",
      },
    ],
    testCases: [
      { input: "5\n1 2 3 4 5", output: "5 4 3 2 1" },
      { input: "3\n9 8 7", output: "7 8 9" },
      { input: "1\n100", output: "100" },
    ],
    tags: ["array", "index"],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))
print(" ".join(map(str, reversed(arr))))
`,
    solutionExplanation: `**시간복잡도**: O(N)

\`reversed()\` 또는 슬라이싱 \`arr[::-1]\` 으로 역순 시퀀스를 만들고 \`" ".join()\`으로 출력 문자열을 구성합니다.

- \`map(str, ...)\`로 정수를 문자열로 변환 후 join
- \`print(*arr[::-1])\` 사용 시 자동 공백 구분`,
    hints: [
      "슬라이싱 [::-1] 이나 reversed() 내장 함수를 사용해보세요.",
      "출력은 공백 구분이므로 ' '.join() 또는 print(*...)를 사용합니다.",
    ],
  },
  {
    id: "p01-004",
    title: "선형 탐색 인덱스 반환",
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
        explanation: "20이 인덱스 1과 3에 있지만 첫 번째 인덱스 1을 출력.",
      },
    ],
    testCases: [
      { input: "5\n10 20 30 20 10\n20", output: "1" },
      { input: "4\n1 2 3 4\n5", output: "-1" },
      { input: "6\n7 7 7 7 7 7\n7", output: "0" },
    ],
    tags: ["search", "linear"],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))
target = int(input())
result = -1
for i in range(n):
    if arr[i] == target:
        result = i
        break
print(result)
`,
    solutionExplanation: `**시간복잡도**: O(N) 최악, O(1) 최선

선형 탐색은 배열을 처음부터 순회하며 일치하는 첫 인덱스를 찾으면 즉시 종료합니다.

- \`break\`로 첫 발견 직후 종료 → 중복 원소가 있어도 첫 인덱스만 반환
- 못 찾으면 -1 유지`,
    hints: [
      "for 루프로 0부터 N-1까지 순회하며 비교하세요.",
      "처음 발견 시 break로 즉시 종료해야 첫 인덱스가 보장됩니다.",
    ],
  },
  {
    id: "p01-005",
    title: "탐색 무한 루프 수정",
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
        explanation: "9는 인덱스 2에 있음.",
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
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))
target = int(input())
idx = 0
while idx < n:
    if arr[idx] == target:
        print(idx)
        break
    idx += 1
else:
    print(-1)
`,
    solutionExplanation: `**버그**: \`idx += 1\` 증가 문이 빠져 무한 루프 발생.

**수정**: while 본문 끝에 \`idx += 1\` 추가.

- Python의 \`while/else\`는 break 없이 정상 종료되면 else 실행 → 미발견 시 -1
- C와 다르게 while 헤더에 증가식이 없음을 잊지 말 것`,
    hints: [
      "while 루프에서 인덱스 변수가 어떻게 변하는지 확인하세요.",
      "조건이 항상 참이 되면 무한 루프. idx를 증가시켜야 합니다.",
    ],
  },
  {
    id: "p01-006",
    title: "정렬 배열 이진 탐색",
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
        explanation: "정렬된 배열에서 7은 인덱스 3.",
      },
    ],
    testCases: [
      { input: "6\n1 3 5 7 9 11\n7", output: "3" },
      { input: "5\n2 4 6 8 10\n1", output: "-1" },
      { input: "1\n9\n9", output: "0" },
    ],
    tags: ["search", "binary-search"],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))
target = int(input())
left, right = 0, n - 1
answer = -1
while left <= right:
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
    solutionExplanation: `**시간복잡도**: O(log N)

이진 탐색은 정렬된 배열에서 탐색 범위를 절반씩 줄여나갑니다.

- 핵심 변수: \`left\`, \`right\`, \`mid = (left + right) // 2\`
- 종료 조건: \`left > right\` → 미발견
- 정렬 전제가 없으면 적용 불가`,
    hints: [
      "left, right 두 포인터를 사용하세요.",
      "while 조건은 left <= right. 종료 시 미발견 처리.",
      "mid의 값과 target을 비교해 절반을 버립니다.",
    ],
  },
  {
    id: "p01-007",
    title: "이진 탐색 경계 수정",
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
        explanation: "마지막 원소 5의 인덱스는 4. left < right 조건이면 마지막을 못 찾음.",
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
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))
target = int(input())
left, right = 0, n - 1
answer = -1
while left <= right:
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
    solutionExplanation: `**버그**: \`while left < right\` 조건은 left == right일 때 본문을 건너뛰므로, 마지막 후보 원소를 검사하지 않습니다.

**수정**: \`while left <= right\` 로 변경하면 단일 원소 케이스도 정확히 처리.

- N=1 입력에서 left=0, right=0인데 < 조건이면 본문 미실행`,
    hints: [
      "while 조건이 left와 right가 같을 때도 검사를 수행해야 합니다.",
      "<= 와 < 의 차이를 생각해보세요.",
    ],
  },
  {
    id: "p01-008",
    title: "2차원 배열 행/열 합",
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
        explanation: "행 합: [1+2+3, 4+5+6] = [6, 15]. 열 합: [1+4, 2+5, 3+6] = [5, 7, 9].",
      },
    ],
    testCases: [
      { input: "2 3\n1 2 3\n4 5 6", output: "6 15\n5 7 9" },
      { input: "3 2\n1 1\n2 2\n3 3", output: "2 4 6\n6 6" },
      { input: "1 1\n9", output: "9\n9" },
    ],
    tags: ["2d-array", "nested-loop"],
    referenceSolution: `n, m = map(int, input().split())
matrix = []
for _ in range(n):
    matrix.append(list(map(int, input().split())))

row_sums = [sum(row) for row in matrix]
col_sums = [sum(matrix[i][j] for i in range(n)) for j in range(m)]

print(" ".join(map(str, row_sums)))
print(" ".join(map(str, col_sums)))
`,
    solutionExplanation: `**시간복잡도**: O(N×M)

행 합은 각 row를 직접 \`sum()\`하면 됩니다. 열 합은 같은 열의 모든 행을 더해야 하므로 중첩 순회가 필요합니다.

- list comprehension으로 간결하게 표현 가능
- N=M=1 케이스는 같은 값을 두 번 출력`,
    hints: [
      "행 합은 sum(row)로 한 번에 구할 수 있습니다.",
      "열 합은 매 열 j마다 모든 행 i를 순회해서 더합니다.",
    ],
  },
  {
    id: "p01-009",
    title: "해시맵 두 수의 합",
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
        explanation: "arr[0]+arr[1] = 2+7 = 9. 인덱스를 오름차순으로 출력.",
      },
    ],
    testCases: [
      { input: "5\n2 7 11 15 3\n9", output: "0 1" },
      { input: "4\n1 2 3 4\n8", output: "-1" },
      { input: "6\n3 3 4 5 1 2\n6", output: "0 1" },
      // 중복 원소: 3+3=6 첫 짝 = (0,1)
      { input: "4\n3 3 3 6\n6", output: "0 1" },
      // 음수만: (-2)+(-3)=-5 첫 짝 = (1,2)
      { input: "4\n-1 -2 -3 -4\n-5", output: "1 2" },
      // N=2 최소 케이스
      { input: "2\n1 5\n6", output: "0 1" },
      // N=20 stress: j=18에서 arr[18]=19, need=21-19=2가 seen[2]=1 → 첫 짝 (1,18)
      {
        input: "20\n1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20\n21",
        output: "1 18",
      },
    ],
    tags: ["hash-map", "two-sum"],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))
k = int(input())
seen = {}
result = -1
for j in range(n):
    need = k - arr[j]
    if need in seen:
        result = (seen[need], j)
        break
    if arr[j] not in seen:
        seen[arr[j]] = j
if result == -1:
    print(-1)
else:
    print(result[0], result[1])
`,
    solutionExplanation: `**시간복잡도**: O(N) — 해시맵 평균 조회 O(1)

각 인덱스 j에서 \`need = K - arr[j]\`를 계산하고, 이전에 본 값들 중 \`need\`가 있으면 짝을 찾습니다.

- 단순 이중 루프는 O(N²)
- 해시맵으로 한 번 순회로 줄임
- 첫 발견 짝의 두 인덱스 (i, j)는 i < j 자동 보장`,
    hints: [
      "이중 for 루프는 O(N²)으로 너무 느립니다.",
      "딕셔너리에 (값 → 인덱스)를 저장하면서 K - 현재값이 있는지 확인하세요.",
    ],
  },
  {
    id: "p01-010",
    title: "해시 충돌 처리 수정",
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
        explanation: "a 3회, b 1회, c 1회. 최대 빈도 3.",
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
    referenceSolution: `n = int(input())
freq = {}
for _ in range(n):
    word = input().strip()
    if word in freq:
        freq[word] += 1
    else:
        freq[word] = 1
print(max(freq.values()))
`,
    solutionExplanation: `**버그**: 키가 이미 존재할 때도 \`freq[word] = 1\`로 덮어써서 빈도가 항상 1.

**수정**: 존재할 때 \`freq[word] += 1\` 로 누적.

- \`collections.Counter\`를 사용하면 더 깔끔
- \`freq.get(word, 0) + 1\` 패턴으로도 한 줄 처리 가능`,
    hints: [
      "기존 키가 있을 때 누적해야 합니다.",
      "= 와 += 의 차이를 확인하세요.",
    ],
  },
  {
    id: "p01-011",
    title: "에라토스테네스의 체",
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
        explanation: "10 이하 소수: 2, 3, 5, 7 → 4개.",
      },
    ],
    testCases: [
      { input: "10", output: "4" },
      { input: "2", output: "1" },
      { input: "30", output: "10" },
    ],
    tags: ["sieve", "prime"],
    referenceSolution: `n = int(input())
is_prime = [True] * (n + 1)
is_prime[0] = is_prime[1] = False
i = 2
while i * i <= n:
    if is_prime[i]:
        for j in range(i * i, n + 1, i):
            is_prime[j] = False
    i += 1
count = sum(1 for k in range(2, n + 1) if is_prime[k])
print(count)
`,
    solutionExplanation: `**시간복잡도**: O(N log log N)

배열 \`is_prime[0..N]\`을 True로 초기화 후, 2부터 √N까지의 각 소수의 배수를 False로 표시합니다.

- 0, 1은 소수 아님 → 사전 False
- \`i * i > n\`까지만 검사 (그 위 배수는 이미 처리됨)
- 단순 \`is_prime(k)\` 함수 호출 N번은 O(N√N)`,
    hints: [
      "True/False 배열을 만들고 배수를 False로 표시하세요.",
      "i*i > n 까지만 검사하면 충분합니다.",
    ],
  },
  {
    id: "p01-012",
    title: "최대 부분배열 합",
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
        explanation: "최대 합은 [4] 단독으로 4.",
      },
    ],
    testCases: [
      { input: "5\n-2 1 -3 4 -1", output: "4" },
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4", output: "6" },
      { input: "3\n-5 -2 -9", output: "-2" },
    ],
    tags: ["kadane", "array"],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))
current = arr[0]
best = arr[0]
for i in range(1, n):
    current = max(arr[i], current + arr[i])
    best = max(best, current)
print(best)
`,
    solutionExplanation: `**시간복잡도**: O(N) — Kadane 알고리즘

각 위치 i에서 "여기서 시작하는 부분합" vs "이전 합 + 현재값" 중 큰 값을 \`current\`로 유지합니다.

- 핵심: \`current = max(arr[i], current + arr[i])\`
- 모두 음수인 케이스는 최댓값 원소 하나가 답
- 누적 합이 음수가 되면 끊고 새로 시작하는 직관`,
    hints: [
      "각 위치에서 '이전 합에 더할지 / 새로 시작할지' 선택합니다.",
      "current = max(arr[i], current + arr[i]) 패턴.",
      "최대 누적값을 별도 변수에 추적합니다.",
    ],
  },
]);
