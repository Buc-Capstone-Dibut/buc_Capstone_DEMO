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
    sampleIO: [{ input: "5\n5 1 4 2 8", output: "1 2 4 5 8" }],
    testCases: [
      { input: "5\n5 1 4 2 8", output: "1 2 4 5 8" },
      { input: "4\n9 9 1 3", output: "1 3 9 9" },
      { input: "1\n7", output: "7" },
    ],
    tags: ["sorting", "bubble-sort"],
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
    sampleIO: [{ input: "4\n4 3 2 1", output: "1 2 3 4" }],
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
    sampleIO: [{ input: "level", output: "YES" }],
    testCases: [
      { input: "level", output: "YES" },
      { input: "algorithm", output: "NO" },
      { input: "a", output: "YES" },
    ],
    tags: ["string", "palindrome"],
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
    sampleIO: [{ input: "5\n9 8 7 6 5", output: "5 6 7 8 9" }],
    testCases: [
      { input: "5\n9 8 7 6 5", output: "5 6 7 8 9" },
      { input: "6\n1 3 2 5 4 6", output: "1 2 3 4 5 6" },
      { input: "3\n2 2 1", output: "1 2 2" },
    ],
    tags: ["sorting", "insertion-sort"],
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
    sampleIO: [{ input: "5\n3 5 2 1 4", output: "1 2 3 4 5" }],
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
    sampleIO: [{ input: "abca", output: "2 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" }],
    testCases: [
      { input: "abca", output: "2 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" },
      { input: "zzz", output: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 3" },
      { input: "leetcode", output: "0 0 1 1 3 0 0 0 0 0 0 1 0 0 1 0 0 0 0 1 0 0 0 0 0 0" },
    ],
    tags: ["string", "hash-map"],
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
    sampleIO: [{ input: "listen\nsilent", output: "YES" }],
    testCases: [
      { input: "listen\nsilent", output: "YES" },
      { input: "apple\npapel", output: "YES" },
      { input: "cat\ncar", output: "NO" },
    ],
    tags: ["string", "anagram"],
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
    sampleIO: [{ input: "5 3\n1 2 3 4 5", output: "12" }],
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
    sampleIO: [{ input: "5\n5 4 3 2 1", output: "1 2 3 4 5" }],
    testCases: [
      { input: "5\n5 4 3 2 1", output: "1 2 3 4 5" },
      { input: "6\n10 1 9 2 8 3", output: "1 2 3 8 9 10" },
      { input: "3\n2 2 2", output: "2 2 2" },
    ],
    tags: ["sorting", "merge-sort"],
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
    sampleIO: [{ input: "5 5\n1 2 3 2 2", output: "2" }],
    testCases: [
      { input: "5 5\n1 2 3 2 2", output: "2" },
      { input: "4 3\n1 1 1 1", output: "2" },
      { input: "6 7\n2 1 3 2 4 1", output: "2" },
    ],
    tags: ["two-pointer", "sliding-window"],
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
    sampleIO: [{ input: "5\n3 1 4 1 5", output: "1 1 3 4 5" }],
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
    sampleIO: [{ input: "ababcabcabababd\nababd", output: "10" }],
    testCases: [
      { input: "ababcabcabababd\nababd", output: "10" },
      { input: "aaaaa\nbba", output: "-1" },
      { input: "hello\nll", output: "2" },
    ],
    tags: ["string", "kmp"],
  },
]);
