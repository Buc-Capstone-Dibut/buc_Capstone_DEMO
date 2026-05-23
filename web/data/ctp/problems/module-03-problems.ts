import { defineProblems } from "./problem-factory";

export const module03Problems = defineProblems("sorting-string-integration", [
  {
    id: "p03-001",
    title: "버블 정렬",
    difficulty: "bronze",
    type: "coding",
    description: "정수 배열을 오름차순으로 정렬해 출력하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "오름차순 정렬 결과",
    constraints: ["1 ≤ N ≤ 200"],
    sampleIO: [
      {
        input: "5\n5 1 4 2 8",
        output: "1 2 4 5 8",
        explanation:
          "인접한 두 원소를 비교하며 큰 값을 뒤로 보내는 과정을 반복해 1 2 4 5 8 순서로 정렬됩니다.",
      },
    ],
    testCases: [
      { input: "5\n5 1 4 2 8", output: "1 2 4 5 8" },
      { input: "4\n9 9 1 3", output: "1 3 9 9" },
      { input: "1\n7", output: "7" },
    ],
    tags: ["sorting", "bubble-sort"],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))

for i in range(n - 1):
    for j in range(n - 1 - i):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]

print(*arr)
`,
    solutionExplanation: `## 버블 정렬

**핵심 아이디어**: 인접한 두 원소를 비교하여 순서가 잘못된 경우 교환합니다. 한 번의 외부 루프가 끝날 때마다 가장 큰 값이 맨 뒤로 "버블링"되어 자리잡습니다.

**알고리즘 단계**
1. 외부 루프 i = 0 부터 N-2
2. 내부 루프 j = 0 부터 N-2-i (이미 정렬된 뒷부분 제외)
3. arr[j] > arr[j+1] 이면 swap

**복잡도**
- 시간: O(N²) — 최선/최악/평균 모두 동일
- 공간: O(1) — in-place 정렬

**엣지 케이스**
- N=1: 루프가 실행되지 않고 그대로 출력
- 이미 정렬된 배열: 비교는 일어나지만 swap은 없음

**다른 정렬과 비교**
- 선택 정렬과 같은 O(N²)이지만 swap 횟수는 더 많음
- 작은 N에서는 단순함의 장점, 큰 N에서는 병합/퀵 정렬에 압도적으로 밀림`,
    hints: [
      "두 개의 중첩 루프가 필요합니다. 외부 루프는 패스 횟수, 내부 루프는 비교 위치를 의미합니다.",
      "각 외부 루프 후에 가장 큰 값이 뒤로 이동하므로 내부 루프 범위를 줄일 수 있습니다.",
      "Python에서 swap은 `a, b = b, a` 한 줄로 가능합니다.",
    ],
  },
  {
    id: "p03-002",
    title: "선택 정렬 교환 로직 수정",
    difficulty: "bronze",
    type: "debugging",
    description: "선택 정렬 코드의 swap 로직이 잘못되었습니다. 오름차순 정렬되도록 수정하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "정렬된 배열",
    constraints: ["1 ≤ N ≤ 200"],
    sampleIO: [
      {
        input: "4\n4 3 2 1",
        output: "1 2 3 4",
        explanation:
          "swap이 두 번 일어나면 원상복귀되어 정렬이 되지 않습니다. 한 번만 교환해야 합니다.",
      },
    ],
    testCases: [
      { input: "4\n4 3 2 1", output: "1 2 3 4" },
      { input: "5\n5 2 3 1 4", output: "1 2 3 4 5" },
      { input: "3\n1 2 3", output: "1 2 3" },
    ],
    starterCode: `n = int(input())
arr = list(map(int, input().split()))

for i in range(n):
    min_idx = i
    for j in range(i + 1, n):
        if arr[j] < arr[min_idx]:
            min_idx = j
    arr[i], arr[min_idx] = arr[min_idx], arr[i]
    arr[i], arr[min_idx] = arr[min_idx], arr[i]

print(*arr)
`,
    tags: ["debugging", "selection-sort"],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))

for i in range(n):
    min_idx = i
    for j in range(i + 1, n):
        if arr[j] < arr[min_idx]:
            min_idx = j
    arr[i], arr[min_idx] = arr[min_idx], arr[i]

print(*arr)
`,
    solutionExplanation: `## 버그 분석

원본 코드는 swap을 **두 번** 수행합니다:
\`\`\`python
arr[i], arr[min_idx] = arr[min_idx], arr[i]
arr[i], arr[min_idx] = arr[min_idx], arr[i]
\`\`\`
두 번째 swap이 첫 번째 swap을 원상 복구해 결과적으로 아무 일도 일어나지 않습니다.

**수정**: 중복된 두 번째 swap 라인을 제거합니다.

## 선택 정렬 알고리즘

1. i 번째 위치에 들어갈 최솟값을 i..N-1 구간에서 찾음
2. 찾은 최솟값을 arr[i]와 한 번만 swap
3. i를 1 증가시키며 반복

**복잡도**
- 시간: O(N²) — swap 횟수는 정확히 N-1번 (버블 정렬보다 적음)
- 공간: O(1)

**엣지 케이스**
- 이미 정렬된 배열: 비교는 N²이지만 swap은 i==min_idx여도 발생 (의미 없는 swap)
- 동일한 원소: 안정 정렬이 아니므로 순서가 바뀔 수 있음`,
    hints: [
      "swap 라인이 몇 번 호출되는지 손으로 따라가 보세요.",
      "교환을 두 번 하면 원래대로 돌아간다는 점이 핵심입니다.",
      "선택 정렬의 swap은 외부 루프 한 번에 정확히 한 번만 실행되어야 합니다.",
    ],
  },
  {
    id: "p03-003",
    title: "팰린드롬 판별",
    difficulty: "bronze",
    type: "coding",
    description: "문자열이 팰린드롬이면 YES, 아니면 NO를 출력하세요.",
    inputFormat: "첫째 줄에 문자열 S",
    outputFormat: "YES 또는 NO",
    constraints: ["1 ≤ |S| ≤ 100000"],
    sampleIO: [
      {
        input: "level",
        output: "YES",
        explanation: "level을 뒤집어도 level이므로 팰린드롬입니다.",
      },
    ],
    testCases: [
      { input: "level", output: "YES" },
      { input: "algorithm", output: "NO" },
      { input: "a", output: "YES" },
    ],
    tags: ["string", "palindrome"],
    referenceSolution: `s = input().strip()
left = 0
right = len(s) - 1
ok = True
while left < right:
    if s[left] != s[right]:
        ok = False
        break
    left += 1
    right -= 1
print("YES" if ok else "NO")
`,
    solutionExplanation: `## 양 끝 포인터 (Two-Pointer)

**핵심 아이디어**: 양쪽 끝에서 중앙으로 좁혀가며 대칭 여부를 검사합니다.

**알고리즘**
1. left = 0, right = len(s) - 1
2. left < right 동안:
   - s[left] != s[right] 면 즉시 NO
   - 같으면 left += 1, right -= 1
3. 끝까지 통과하면 YES

**복잡도**
- 시간: O(N) — 절반만 순회
- 공간: O(1)

**다른 접근과 비교**
- \`s == s[::-1]\`: 코드는 한 줄이지만 새 문자열을 생성해 메모리 O(N)
- 양 끝 포인터: 메모리 절약 + 첫 불일치에서 조기 종료 가능

**엣지 케이스**
- |S| = 1: while 조건 즉시 거짓, 자동 YES
- 짝수 길이 vs 홀수 길이: left == right 또는 left > right 둘 다 처리됨`,
    hints: [
      "양 끝에서 동시에 검사하면 절반만 비교해도 충분합니다.",
      "한 글자라도 다르면 즉시 NO로 종료할 수 있습니다.",
      "`s[::-1]`로 뒤집어 비교하는 방법도 있지만 메모리 사용을 생각해 보세요.",
    ],
  },
  {
    id: "p03-004",
    title: "삽입 정렬",
    difficulty: "silver",
    type: "coding",
    description: "삽입 정렬로 배열을 오름차순 정렬하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "정렬 결과",
    constraints: ["1 ≤ N ≤ 500"],
    sampleIO: [
      {
        input: "5\n9 8 7 6 5",
        output: "5 6 7 8 9",
        explanation: "역순 배열은 삽입 정렬의 최악 케이스로, 매 단계 모든 원소를 한 칸씩 미룹니다.",
      },
    ],
    testCases: [
      { input: "5\n9 8 7 6 5", output: "5 6 7 8 9" },
      { input: "6\n1 3 2 5 4 6", output: "1 2 3 4 5 6" },
      { input: "3\n2 2 1", output: "1 2 2" },
    ],
    tags: ["sorting", "insertion-sort"],
    referenceSolution: `n = int(input())
arr = list(map(int, input().split()))

for i in range(1, n):
    key = arr[i]
    j = i - 1
    while j >= 0 and arr[j] > key:
        arr[j + 1] = arr[j]
        j -= 1
    arr[j + 1] = key

print(*arr)
`,
    solutionExplanation: `## 삽입 정렬

**핵심 아이디어**: 카드를 손에 정렬하듯, i 번째 원소를 0..i-1 부분 중 알맞은 자리에 끼워 넣습니다.

**알고리즘**
1. i = 1부터 N-1
2. key = arr[i]로 저장
3. j = i-1부터 0까지 거꾸로 가며 arr[j] > key 인 동안 한 칸씩 오른쪽으로 미룸
4. j+1 위치에 key를 삽입

**복잡도**
- 시간: 최선 O(N) — 이미 정렬된 경우, 최악 O(N²) — 역순 배열
- 공간: O(1)
- **안정 정렬**

**언제 유리한가**
- 거의 정렬된 데이터: 버블/선택보다 압도적으로 빠름
- 작은 N: 병합/퀵 정렬의 재귀 오버헤드보다 빠를 수 있음 (실무 정렬 라이브러리는 작은 부분배열에 삽입 정렬을 섞어 씀)

**엣지 케이스**
- N=1: 루프 시작값 i=1이 N과 같아 즉시 종료
- 같은 값: arr[j] > key가 거짓이므로 위치 유지 (안정성)`,
    hints: [
      "key를 따로 변수에 보관해야 한 칸씩 미루는 과정이 안전합니다.",
      "while 루프의 조건은 `j >= 0 and arr[j] > key` 두 가지 모두 필요합니다.",
      "삽입 위치는 항상 `j + 1` 입니다. j가 -1이 되어도 0번 위치에 잘 들어갑니다.",
    ],
  },
  {
    id: "p03-005",
    title: "퀵정렬 파티션 경계 수정",
    difficulty: "silver",
    type: "debugging",
    description: "퀵정렬 partition 경계 조건이 잘못되었습니다. 모든 원소가 정렬되도록 수정하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "정렬 결과",
    constraints: ["1 ≤ N ≤ 1000"],
    sampleIO: [
      {
        input: "5\n3 5 2 1 4",
        output: "1 2 3 4 5",
        explanation:
          "partition의 내부 루프 범위가 r-1까지로 잘못 잡혀 마지막 원소 직전을 빠뜨립니다. r까지 검사해야 합니다.",
      },
    ],
    testCases: [
      { input: "5\n3 5 2 1 4", output: "1 2 3 4 5" },
      { input: "4\n10 9 8 7", output: "7 8 9 10" },
      { input: "5\n1 1 1 1 1", output: "1 1 1 1 1" },
    ],
    starterCode: `def partition(arr, l, r):
    pivot = arr[r]
    i = l
    for j in range(l, r - 1):
        if arr[j] <= pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[r] = arr[r], arr[i]
    return i

def quick(arr, l, r):
    if l < r:
        p = partition(arr, l, r)
        quick(arr, l, p - 1)
        quick(arr, p + 1, r)

n = int(input())
arr = list(map(int, input().split()))
quick(arr, 0, n - 1)
print(*arr)
`,
    tags: ["debugging", "quick-sort"],
    referenceSolution: `def partition(arr, l, r):
    pivot = arr[r]
    i = l
    for j in range(l, r):
        if arr[j] <= pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[r] = arr[r], arr[i]
    return i

def quick(arr, l, r):
    if l < r:
        p = partition(arr, l, r)
        quick(arr, l, p - 1)
        quick(arr, p + 1, r)

n = int(input())
arr = list(map(int, input().split()))
quick(arr, 0, n - 1)
print(*arr)
`,
    solutionExplanation: `## 버그 분석

\`range(l, r - 1)\`은 j가 l부터 **r-2까지** 돕니다. 그러면 \`arr[r-1]\` (피벗 바로 앞 원소)을 검사하지 못해 잘못된 위치에 머무릅니다.

**수정**: \`range(l, r)\` 으로 변경하여 j가 r-1까지 돌도록 합니다. (r은 피벗 자리이므로 제외)

## Lomuto 파티션 방식

**알고리즘**
1. pivot = arr[r] (마지막 원소)
2. i = l (작은 값을 채워 넣을 위치)
3. j가 l..r-1을 순회하며 arr[j] <= pivot 이면 arr[i]와 swap 후 i 증가
4. 마지막에 pivot을 i 위치에 놓고 i를 반환

**복잡도**
- 시간: 평균 O(N log N), 최악 O(N²) — 이미 정렬된 입력 + 마지막 원소 피벗 조합
- 공간: O(log N) 평균 재귀 스택

**엣지 케이스**
- 모든 원소가 같음: arr[j] <= pivot 이 항상 참이라 i가 매번 증가 → 잘 동작
- N=1: \`l < r\` 거짓이라 재귀 없이 종료`,
    hints: [
      "range(a, b)는 b를 포함하지 않습니다. r-1까지 검사하려면 range(l, r) 입니다.",
      "피벗 자리(r)는 검사 대상에서 제외해야 하지만, 피벗 바로 앞(r-1)은 검사해야 합니다.",
      "잘못된 입력을 손으로 한 번 따라가 보면 어디서 멈추는지 보입니다.",
    ],
  },
  {
    id: "p03-006",
    title: "문자 빈도수 세기",
    difficulty: "silver",
    type: "coding",
    description: "소문자 문자열 S가 주어질 때 a~z 빈도수를 공백으로 출력하세요.",
    inputFormat: "첫째 줄에 문자열 S",
    outputFormat: "26개 정수 (a부터 z까지 빈도)",
    constraints: ["1 ≤ |S| ≤ 100000"],
    sampleIO: [
      {
        input: "abca",
        output: "2 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
        explanation: "a가 2번, b가 1번, c가 1번. 나머지 알파벳은 0입니다.",
      },
    ],
    testCases: [
      { input: "abca", output: "2 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" },
      { input: "zzz", output: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3" },
      { input: "leetcode", output: "0 0 1 1 3 0 0 0 0 0 0 1 0 0 1 0 0 0 0 1 0 0 0 0 0 0" },
    ],
    tags: ["string", "hash-map"],
    referenceSolution: `s = input().strip()
count = [0] * 26
base = ord('a')
for ch in s:
    count[ord(ch) - base] += 1
print(*count)
`,
    solutionExplanation: `## 카운팅 배열

**핵심 아이디어**: 알파벳 26자라는 고정된 알파벳 크기를 활용해 해시맵 대신 길이 26 배열을 카운터로 사용합니다.

**알고리즘**
1. \`count = [0] * 26\` 초기화
2. 각 문자 c에 대해 \`count[ord(c) - ord('a')] += 1\`
3. count 배열을 공백으로 출력

**복잡도**
- 시간: O(N)
- 공간: O(1) — 알파벳 크기가 상수

**다른 접근과 비교**
- \`collections.Counter\`: 직관적이지만 빠진 알파벳을 0으로 채우는 별도 로직 필요
- \`s.count(ch)\`을 26번: O(26N) — 작은 N에서는 차이가 작지만 큰 N에서 손해

**엣지 케이스**
- 모든 문자가 같음: 한 인덱스만 N이 되고 나머지는 0
- 한 글자: 해당 인덱스만 1`,
    hints: [
      "ord('a') = 97 입니다. ord(ch) - ord('a')로 0~25 인덱스가 됩니다.",
      "길이 26인 리스트를 미리 0으로 채워두면 출력 형식이 자연스럽게 맞습니다.",
      "`print(*count)`로 리스트를 공백으로 풀어서 출력할 수 있습니다.",
    ],
  },
  {
    id: "p03-007",
    title: "애너그램 판별",
    difficulty: "silver",
    type: "coding",
    description: "두 문자열이 애너그램이면 YES, 아니면 NO를 출력하세요.",
    inputFormat: "첫째 줄에 문자열 A\n둘째 줄에 문자열 B",
    outputFormat: "YES 또는 NO",
    constraints: ["1 ≤ |A|, |B| ≤ 100000"],
    sampleIO: [
      {
        input: "listen\nsilent",
        output: "YES",
        explanation: "두 단어 모두 같은 문자 집합 (e, i, l, n, s, t)을 한 번씩 사용합니다.",
      },
    ],
    testCases: [
      { input: "listen\nsilent", output: "YES" },
      { input: "apple\npapel", output: "YES" },
      { input: "cat\ncar", output: "NO" },
    ],
    tags: ["string", "anagram"],
    referenceSolution: `a = input().strip()
b = input().strip()

if len(a) != len(b):
    print("NO")
else:
    count_a = [0] * 26
    count_b = [0] * 26
    base = ord('a')
    for ch in a:
        count_a[ord(ch) - base] += 1
    for ch in b:
        count_b[ord(ch) - base] += 1
    print("YES" if count_a == count_b else "NO")
`,
    solutionExplanation: `## 문자 빈도수 비교

**핵심 아이디어**: 애너그램이란 두 문자열이 같은 문자 곱(multiset)을 가진다는 것입니다. 빈도수 배열이 같으면 애너그램입니다.

**알고리즘**
1. 길이가 다르면 즉시 NO
2. 각 문자열의 문자 빈도수 배열을 계산
3. 두 배열이 같으면 YES, 아니면 NO

**복잡도**
- 시간: O(N)
- 공간: O(1) — 알파벳 크기 상수

**다른 접근과 비교**
- \`sorted(a) == sorted(b)\`: O(N log N) — 짧은 코드, 큰 N에서 느림
- \`Counter(a) == Counter(b)\`: O(N) — 깔끔, 약간의 해시 오버헤드
- 빈도수 배열: O(N), 메모리 일정 — 가장 빠름

**엣지 케이스**
- 길이 다름: 절대 애너그램 불가 → 조기 종료
- 같은 문자열: 자기 자신과의 비교, 빈도수 동일 → YES`,
    hints: [
      "길이가 다르면 비교할 필요도 없습니다.",
      "정렬해서 비교하면 한 줄이지만 O(N log N)입니다. 빈도수 배열이 더 빠릅니다.",
      "두 빈도수 리스트는 `==` 연산자로 한 번에 비교할 수 있습니다.",
    ],
  },
  {
    id: "p03-008",
    title: "슬라이딩 윈도우 인덱스 오류 수정",
    difficulty: "silver",
    type: "debugging",
    description: "길이 K 구간의 최대 합을 구하는 코드에서 인덱스 오류를 수정하세요.",
    inputFormat: "첫째 줄에 N K\n둘째 줄에 N개의 정수",
    outputFormat: "길이 K 구간의 최대 합",
    constraints: ["1 ≤ K ≤ N ≤ 100000"],
    sampleIO: [
      {
        input: "5 3\n1 2 3 4 5",
        output: "12",
        explanation:
          "길이 3 구간은 [1,2,3]=6, [2,3,4]=9, [3,4,5]=12 세 개. 최댓값은 12. 루프 상한이 n-1이면 마지막 구간을 빠뜨려 9가 답이 됩니다.",
      },
    ],
    testCases: [
      { input: "5 3\n1 2 3 4 5", output: "12" },
      { input: "6 2\n5 1 3 2 6 4", output: "10" },
      { input: "4 4\n7 8 9 10", output: "34" },
    ],
    starterCode: `n, k = map(int, input().split())
arr = list(map(int, input().split()))
window = sum(arr[:k])
best = window
for i in range(k, n - 1):
    window += arr[i] - arr[i - k]
    if window > best:
        best = window
print(best)
`,
    tags: ["debugging", "sliding-window"],
    referenceSolution: `n, k = map(int, input().split())
arr = list(map(int, input().split()))
window = sum(arr[:k])
best = window
for i in range(k, n):
    window += arr[i] - arr[i - k]
    if window > best:
        best = window
print(best)
`,
    solutionExplanation: `## 버그 분석

\`range(k, n - 1)\`은 i가 k부터 **n-2까지** 돕니다. 즉 마지막 원소 arr[n-1]을 추가하는 윈도우 갱신이 실행되지 않아 마지막 구간을 빠뜨립니다.

**수정**: \`range(k, n)\` 으로 변경.

## 슬라이딩 윈도우 패턴

**핵심 아이디어**: 매번 K개를 다시 합산하면 O(NK)지만, 윈도우가 한 칸 이동하면 들어오는 원소를 더하고 나가는 원소를 빼서 O(1)에 갱신할 수 있습니다.

**알고리즘**
1. 초기 윈도우: sum(arr[:k])
2. i가 k부터 n-1까지:
   - window += arr[i] (들어오는 원소)
   - window -= arr[i - k] (나가는 원소)
   - best 갱신

**복잡도**
- 시간: O(N)
- 공간: O(1)

**엣지 케이스**
- K = N: 초기 윈도우가 곧 답, 루프는 한 번도 실행되지 않음
- K = 1: 단일 원소의 최댓값을 찾는 문제로 환원`,
    hints: [
      "range(a, b)는 b 직전까지입니다. n까지 포함하려면 range(k, n) 이어야 합니다.",
      "수동으로 작은 예제(N=5, K=3)를 따라가 보면 마지막 윈도우가 빠지는 것이 보입니다.",
      "슬라이딩 윈도우는 들어오는 원소와 나가는 원소만 갱신하면 O(1) 입니다.",
    ],
  },
  {
    id: "p03-009",
    title: "병합 정렬",
    difficulty: "gold",
    type: "coding",
    description: "병합 정렬로 배열을 오름차순 정렬하세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "정렬 결과",
    constraints: ["1 ≤ N ≤ 100000"],
    sampleIO: [
      {
        input: "5\n5 4 3 2 1",
        output: "1 2 3 4 5",
        explanation:
          "[5,4,3,2,1]을 절반으로 나누고 (5,4 / 3,2,1) → 각각 정렬 후 병합 → [1,2,3,4,5] 입니다.",
      },
    ],
    testCases: [
      { input: "5\n5 4 3 2 1", output: "1 2 3 4 5" },
      { input: "6\n10 1 9 2 8 3", output: "1 2 3 8 9 10" },
      { input: "3\n2 2 2", output: "2 2 2" },
    ],
    tags: ["sorting", "merge-sort"],
    referenceSolution: `def merge(left, right):
    out = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    while i < len(left):
        out.append(left[i])
        i += 1
    while j < len(right):
        out.append(right[j])
        j += 1
    return out

def msort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = msort(arr[:mid])
    right = msort(arr[mid:])
    return merge(left, right)

n = int(input())
arr = list(map(int, input().split()))
print(*msort(arr))
`,
    solutionExplanation: `## 병합 정렬 (Top-Down Recursive)

**핵심 아이디어**: 분할 정복. 배열을 절반씩 쪼개 각각 정렬한 후 둘을 병합합니다.

**알고리즘**
1. \`msort(arr)\`: 길이 1 이하면 그대로 반환
2. 중간 지점에서 절반으로 나눠 각각 재귀 호출
3. \`merge(left, right)\`: 두 정렬된 배열을 비교하며 새 배열에 작은 값부터 넣음
4. 한쪽이 끝나면 남은 쪽을 그대로 이어 붙임

**복잡도**
- 시간: O(N log N) — 최선/최악/평균 동일
- 공간: O(N) — 새 배열을 만들기 때문

**왜 안정적이고 일관적인가**
- log N 깊이의 재귀, 각 레벨에서 O(N) 병합 → 항상 N log N
- 퀵정렬과 달리 최악 케이스에서도 보장됨
- 안정 정렬 (\`<=\` 비교)

**엣지 케이스**
- N=1: 즉시 반환
- 모두 같은 값: \`left[i] <= right[j]\` 이 항상 참 → 왼쪽 먼저 소진`,
    hints: [
      "재귀 종료 조건: 길이 1 이하면 정렬할 것이 없습니다.",
      "merge 함수는 두 배열 중 짧은 쪽이 먼저 끝나므로, 나머지를 따로 처리하는 루프가 필요합니다.",
      "Python의 슬라이싱 `arr[:mid]`, `arr[mid:]`로 절반 나누기가 간단합니다.",
    ],
  },
  {
    id: "p03-010",
    title: "부분배열 합 K (투 포인터)",
    difficulty: "gold",
    type: "coding",
    description: "양의 정수 배열에서 합이 K가 되는 연속 부분배열의 개수를 출력하세요.",
    inputFormat: "첫째 줄에 N K\n둘째 줄에 N개의 양의 정수",
    outputFormat: "조건을 만족하는 부분배열 개수",
    constraints: ["1 ≤ N ≤ 100000"],
    sampleIO: [
      {
        input: "5 5\n1 2 3 2 2",
        output: "2",
        explanation: "[2,3]과 [3,2]가 합 5를 만드는 두 개의 부분배열입니다.",
      },
    ],
    testCases: [
      { input: "5 5\n1 2 3 2 2", output: "2" },
      { input: "4 3\n1 1 1 1", output: "2" },
      { input: "6 7\n2 1 3 2 4 1", output: "2" },
    ],
    tags: ["two-pointer", "sliding-window"],
    referenceSolution: `n, k = map(int, input().split())
arr = list(map(int, input().split()))

left = 0
window = 0
count = 0
for right in range(n):
    window += arr[right]
    while window > k and left <= right:
        window -= arr[left]
        left += 1
    if window == k:
        count += 1
print(count)
`,
    solutionExplanation: `## 가변 슬라이딩 윈도우 (Two-Pointer)

**핵심 아이디어**: 모든 원소가 양수일 때 윈도우 합은 right가 늘어나면 증가, left가 늘어나면 감소하는 단조성을 가집니다. 이 단조성 덕에 left를 절대 뒤로 되돌릴 필요가 없어 O(N) 입니다.

**알고리즘**
1. left = 0, window = 0, count = 0
2. right를 0..N-1로 진행:
   - window += arr[right]
   - window > k 인 동안 left를 오른쪽으로 밀고 window 감소
   - window == k 이면 count += 1

**복잡도**
- 시간: O(N) — left와 right 각각 최대 N번 이동
- 공간: O(1)

**중요한 전제: 양의 정수만**
- 음수가 섞이면 윈도우 합의 단조성이 깨져 이 기법으로는 풀 수 없습니다.
- 음수 포함 일반 케이스는 prefix sum + 해시맵 (O(N)) 으로 푸는 표준 패턴이 따로 있습니다.

**엣지 케이스**
- 단일 원소 == K: left == right 상태에서 1 카운트
- 어떤 부분배열도 K가 안 됨: 0 출력`,
    hints: [
      "양수만 있으므로 부분합이 K를 초과하면 left를 오른쪽으로 옮기면 됩니다.",
      "left를 뒤로 되돌리는 일이 없도록 설계하면 O(N)이 됩니다.",
      "window == k인 순간마다 카운트를 1 늘리면 됩니다. (양수 가정 하에서는 정확히 한 번씩 셉니다)",
    ],
  },
  {
    id: "p03-011",
    title: "병합 정렬 병합 단계 수정",
    difficulty: "gold",
    type: "debugging",
    description: "병합 단계에서 남은 원소 처리 버그를 수정해 정렬 결과를 올바르게 만드세요.",
    inputFormat: "첫째 줄에 N\n둘째 줄에 N개의 정수",
    outputFormat: "정렬 결과",
    constraints: ["1 ≤ N ≤ 20000"],
    sampleIO: [
      {
        input: "5\n3 1 4 1 5",
        output: "1 1 3 4 5",
        explanation:
          "왼쪽 a가 먼저 소진된 뒤 오른쪽 b의 남은 원소를 이어 붙이지 않으면 결과가 잘립니다.",
      },
    ],
    testCases: [
      { input: "5\n3 1 4 1 5", output: "1 1 3 4 5" },
      { input: "4\n9 7 5 3", output: "3 5 7 9" },
      { input: "3\n2 1 2", output: "1 2 2" },
    ],
    starterCode: `def merge(a, b):
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    while i < len(a):
        out.append(a[i])
        i += 1
    return out

def msort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = msort(arr[:mid])
    right = msort(arr[mid:])
    return merge(left, right)

n = int(input())
arr = list(map(int, input().split()))
print(*msort(arr))
`,
    tags: ["debugging", "merge-sort"],
    referenceSolution: `def merge(a, b):
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    while i < len(a):
        out.append(a[i])
        i += 1
    while j < len(b):
        out.append(b[j])
        j += 1
    return out

def msort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = msort(arr[:mid])
    right = msort(arr[mid:])
    return merge(left, right)

n = int(input())
arr = list(map(int, input().split()))
print(*msort(arr))
`,
    solutionExplanation: `## 버그 분석

원본 merge는 \`a\`의 잔여 원소만 처리하고 \`b\`의 잔여 원소를 빠뜨립니다. 메인 while이 끝났을 때 두 배열 중 어느 쪽이라도 남아 있을 수 있는데, 한쪽만 처리하므로 \`b\`가 남으면 결과 길이가 짧아집니다.

**수정**: \`while j < len(b)\` 루프를 추가해 b의 잔여 원소도 out에 이어 붙입니다.

## 왜 둘 다 필요한가

메인 while 종료 조건은 \`i >= len(a) or j >= len(b)\` 입니다.
- a가 먼저 소진되면 → b 잔여를 붙여야 함
- b가 먼저 소진되면 → a 잔여를 붙여야 함

대안: \`out.extend(a[i:])\` + \`out.extend(b[j:])\` 한 줄씩으로도 가능. 슬라이싱이 빈 리스트면 아무 일도 안 일어나므로 안전.

**복잡도**
- merge 자체: O(|a| + |b|)
- 전체 병합 정렬: O(N log N) 시간, O(N) 공간

**엣지 케이스**
- a와 b 중 하나가 빈 배열: 메인 while 즉시 종료, 잔여 처리 루프가 빈 쪽을 채움
- 모두 같은 값: 항상 a를 먼저 소비 (\`<=\` 비교) → 안정 정렬 유지`,
    hints: [
      "두 배열을 병합할 때 한쪽이 먼저 끝나는 경우가 두 가지입니다.",
      "메인 while 종료 후 남는 쪽이 a일지 b일지 미리 알 수 없습니다. 두 잔여 루프가 모두 필요합니다.",
      "`out.extend(a[i:])`와 `out.extend(b[j:])`로도 같은 효과를 낼 수 있습니다.",
    ],
  },
  {
    id: "p03-012",
    title: "KMP 패턴 매칭 (실패 함수)",
    difficulty: "gold",
    type: "coding",
    description: "문자열 T에서 패턴 P가 처음 등장하는 0-based 인덱스를 출력하세요. 없으면 -1을 출력하세요.",
    inputFormat: "첫째 줄에 텍스트 T\n둘째 줄에 패턴 P",
    outputFormat: "첫 등장 인덱스 또는 -1",
    constraints: ["1 ≤ |T|, |P| ≤ 100000"],
    sampleIO: [
      {
        input: "ababcabcabababd\nababd",
        output: "10",
        explanation:
          "패턴 ababd는 T의 10번 인덱스에서 시작합니다 (T[10..14] = 'ababd'). 0~9 위치에서는 부분 일치 후 실패합니다.",
      },
    ],
    testCases: [
      { input: "ababcabcabababd\nababd", output: "10" },
      { input: "aaaaa\nbba", output: "-1" },
      { input: "hello\nll", output: "2" },
    ],
    tags: ["string", "kmp"],
    referenceSolution: `def build_failure(p):
    m = len(p)
    fail = [0] * m
    k = 0
    for i in range(1, m):
        while k > 0 and p[k] != p[i]:
            k = fail[k - 1]
        if p[k] == p[i]:
            k += 1
        fail[i] = k
    return fail

def kmp_search(t, p):
    n = len(t)
    m = len(p)
    if m == 0:
        return 0
    fail = build_failure(p)
    j = 0
    for i in range(n):
        while j > 0 and p[j] != t[i]:
            j = fail[j - 1]
        if p[j] == t[i]:
            j += 1
        if j == m:
            return i - m + 1
    return -1

t = input().strip()
p = input().strip()
print(kmp_search(t, p))
`,
    solutionExplanation: `## KMP (Knuth-Morris-Pratt) 알고리즘

**핵심 아이디어**: 패턴이 일치하다 실패한 순간, 텍스트의 인덱스 i를 절대 뒤로 되돌리지 않고 패턴 인덱스 j만 "실패 함수"가 가리키는 위치로 점프시킵니다.

**실패 함수 fail[i]**
패턴의 prefix p[0..i] 안에서 "proper prefix이면서 동시에 suffix인" 가장 긴 길이를 저장합니다. 예: p = "ababd" → fail = [0,0,1,2,0]

**알고리즘**
1. \`build_failure(p)\`: O(M)에 실패 함수 계산
2. \`kmp_search(t, p)\`: i를 0..N-1로 진행하며 j가 매치된 패턴 길이를 추적
   - p[j] != t[i] 면 j = fail[j-1]로 점프 (j > 0 인 동안 반복)
   - 일치하면 j += 1
   - j == m 이 되면 매치 완료, 시작 위치 i - m + 1 반환

**복잡도**
- 시간: O(N + M) — 단순 매칭 O(NM)보다 압도적
- 공간: O(M) — 실패 함수

**왜 i를 되돌리지 않아도 되는가**
실패 함수가 "이미 일치한 부분 중 다시 활용할 수 있는 만큼"을 알려주므로, 텍스트를 다시 읽을 필요가 없습니다.

**엣지 케이스**
- 빈 패턴: 정의에 따라 0 반환 (이 문제에서는 \`|P| ≥ 1\`이라 신경 안 써도 됨)
- 패턴이 텍스트보다 길면 자연스럽게 -1
- 텍스트 처음 위치에서 매치: 0 반환 (예: "hello", "he")`,
    hints: [
      "단순 매칭은 i가 실패하면 i++ 후 처음부터 다시 비교해 O(NM) 입니다. 이를 피해야 합니다.",
      "실패 함수 fail[i]는 패턴 자기 자신의 prefix-suffix 관계를 미리 계산해 둡니다.",
      "build_failure와 kmp_search는 거의 동일한 구조입니다. 둘 다 `while j>0 and 불일치` 점프 패턴을 씁니다.",
    ],
  },
]);
