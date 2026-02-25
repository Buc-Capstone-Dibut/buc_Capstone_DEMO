# CTP Problem Bank — Design & Architecture Plan

**Status:** Planning
**Target Pages:**
- `/insights/ctp/module-01-foundation/foundation-integration`
- `/insights/ctp/module-02-stack-recursion/stack-recursion-integration`
- `/insights/ctp/module-03-sorting-string/sorting-string-integration`
- `/insights/ctp/module-04-list-tree-final/list-tree-integration`

---

## 1. Overview

### What Changes

| Before | After |
|--------|-------|
| 3 generic code simulator problems per integration page | 15–20 curated problems per module |
| No auto-grading — user judges output manually | Browser-side judge with automatic verdict (AC / WA / TLE / RTE) |
| Single code editor, no problem statement | Baekjoon-style split panel: problem description ← → code editor |
| No problem taxonomy | Problems categorized by difficulty (Bronze / Silver / Gold) and type (Coding / Debugging) |

### Design Decisions (Confirmed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Problem solving UI | Left-right split panel (A) | Mirrors Baekjoon UX; maximizes screen real estate |
| Test case visibility | Open / no obfuscation (A) | Learning platform, not competitive; transparency preferred |
| Point / bookmark system | Excluded from current scope | To be added later as a separate feature layer |
| Language | Python 3 only | Matches existing Skulpt engine; reduces complexity |
| Problem types | Full Coding + Debugging only | Highest learning value; reuses existing playground |

---

## 2. Core Technical Challenge: `input()` Support

### Current Engine State

```
✅ Code execution (Skulpt Web Worker)
✅ stdout capture (print statements)
✅ Infinite loop guard (MAX_STEPS = 10,000)
✅ Step-by-step visualization
❌ input() — NOT IMPLEMENTED
   └─ skulpt.worker.js line 41: empty INPUT_RESPONSE handler
   └─ Falls back to window.prompt() which fails inside Web Worker
```

`input()` is the **only** technical blocker for a Baekjoon-style judge.
Without it, problems requiring user input cannot be graded.

### Solution: Python-level `input()` Override via Preamble Injection

Rather than implementing async Worker ↔ Main Thread communication for `input()`,
we inject a Python preamble **before the user's code** that replaces `input()` with
a function that reads from a pre-loaded list of strings.

```python
# ── INJECTED PREAMBLE (invisible to user) ──────────────────────────
_judge_lines = ["5", "3 12 7 1 8"]   # populated from test case input
_judge_idx = [0]

def input(prompt=""):
    i = _judge_idx[0]
    if i >= len(_judge_lines):
        raise EOFError("No more input available")
    _judge_idx[0] += 1
    return _judge_lines[i]
# ── USER CODE BEGINS HERE ──────────────────────────────────────────
```

**Why this works:**
- Python's `input()` is a builtin that can be shadowed at module scope
- No async messaging needed — execution stays synchronous within the Worker
- Existing Skulpt `output` / `breakpoints` infrastructure unchanged
- `EOFError` maps cleanly to a Runtime Error verdict

**Injection point:**
`web/public/workers/skulpt.worker.js` — prepend preamble to `fullSource` before `Sk.importMainWithBody()`

---

## 3. BrowserJudge Architecture

### Judge Flow

```
ProblemView mounts
    │
    ▼
User writes Python code in CodeEditor
    │
    ▼
User clicks [제출하기 / Submit]
    │
    ▼
BrowserJudge.run(userCode, testCases[])
    │
    ├─ for each testCase:
    │    1. Split input string into lines array
    │    2. Build preamble: _judge_lines = [...]
    │    3. fullSource = preamble + "\n" + userCode
    │    4. Post RUN_CODE to Skulpt Worker
    │    5. Collect stdout from BATCH_STEPS
    │    6. normalize(capturedOutput) vs normalize(expected)
    │    └─ verdict: AC | WA | TLE | RTE
    │
    └─ aggregate: all AC → "맞았습니다" | any fail → show details
```

### Output Normalization

```typescript
function normalize(raw: string): string {
  return raw
    .split("\n")
    .map(line => line.trimEnd())   // strip trailing spaces per line
    .join("\n")
    .trim();                       // strip leading/trailing blank lines
}
```

This matches Baekjoon's standard normalization behavior.

### Verdict Types

| Code | Label | Condition |
|------|-------|-----------|
| `AC` | ✅ 맞았습니다 | All test cases pass |
| `WA` | ❌ 틀렸습니다 | Output mismatch on ≥ 1 case |
| `TLE` | ⏱️ 시간 초과 | `stepCount > MAX_STEPS` (10,000) |
| `RTE` | 💥 런타임 에러 | Python exception raised |
| `OLE` | 📤 출력 초과 | stdout exceeds 1 MB |

---

## 4. Data Schema

### `ProblemBankItem`

```typescript
interface ProblemBankItem {
  id: string;                      // "p01-001"  (module prefix + sequential)
  moduleId: string;                // "foundation-integration"
  title: string;
  difficulty: "bronze" | "silver" | "gold";
  type: "coding" | "debugging";

  // Problem statement (Markdown)
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];

  // Shown to the user
  sampleIO: {
    input: string;
    output: string;
    explanation?: string;
  }[];

  // Used by BrowserJudge — not rendered in UI
  testCases: {
    input: string;
    output: string;
  }[];

  // Debugging problems: editor is pre-filled with this buggy code
  starterCode?: string;

  tags: string[];
  timeLimit?: number;              // MAX_STEPS override; defaults to 10,000
}
```

### `JudgeResult`

```typescript
interface TestCaseResult {
  index: number;
  verdict: "AC" | "WA" | "TLE" | "RTE" | "OLE";
  actualOutput?: string;
  expectedOutput?: string;
  errorMessage?: string;
}

interface JudgeResult {
  overall: "AC" | "WA" | "TLE" | "RTE" | "OLE";
  passed: number;
  total: number;
  cases: TestCaseResult[];
}
```

---

## 5. UI Layout

### Problem Bank Grid (Integration Page)

```
┌────────────────────────────────────────────────────────────────┐
│  Module 01 · Integration                                       │
│  Problem Bank — 15 problems                                    │
├────────────┬───────────────────────────────────────────────────┤
│ Filters    │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│            │  │ p01-001  │ │ p01-002  │ │ p01-003  │         │
│ All        │  │ 배열 최댓값│ │ Off-by-1 │ │ 배열 역순│         │
│ Coding     │  │ 🥉 Coding│ │ 🥉 Debug │ │ 🥉 Coding│         │
│ Debugging  │  └──────────┘ └──────────┘ └──────────┘         │
│ ─────────  │                                                   │
│ 🥉 Bronze  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ 🥈 Silver  │  │ p01-004  │ │ p01-005  │ │ p01-006  │         │
│ 🥇 Gold    │  │ 선형 탐색 │ │ 무한루프  │ │ 이진 탐색│         │
│            │  │ 🥈 Coding│ │ 🥈 Debug │ │ 🥈 Coding│         │
│            │  └──────────┘ └──────────┘ └──────────┘         │
│            │  ...                                              │
└────────────┴───────────────────────────────────────────────────┘
```

### Problem Solving View (split panel — opens on card click)

```
┌──────────────────────────────┬─────────────────────────────────┐
│  ← Back   p01-004  🥈 Silver │  # Python 3                     │
├──────────────────────────────┤  ─────────────────────────────  │
│                              │  n = int(input())               │
│  선형 탐색으로 타겟 반환      │  arr = list(map(int,            │
│                              │    input().split()))            │
│  정렬되지 않은 배열과 정수 k가│  target = int(input())          │
│  주어진다. k가 배열에 있으면  │                                 │
│  인덱스를, 없으면 -1을 출력. │  # write your solution here     │
│                              │                                 │
│  ── 입력 ───────────────     │                                 │
│  첫째 줄: 정수 N             │                                 │
│  둘째 줄: N개의 정수         │  ─────────────────────────────  │
│  셋째 줄: 정수 k             │  [Submit]        [Reset]        │
│                              │  ─────────────────────────────  │
│  ── 출력 ───────────────     │                                 │
│  인덱스 또는 -1              │  TC1 ✅  TC2 ✅  TC3 ❌  TC4 ✅ │
│                              │                                 │
│  ── 예제 ───────────────     │  ❌ 틀렸습니다  (3 / 4 passed)  │
│  입력        출력            │                                 │
│  4           2               │  TC3 detail:                    │
│  1 5 3 8     (empty input)   │  Expected: "-1"                 │
│  3                           │  Got:      ""                   │
└──────────────────────────────┴─────────────────────────────────┘
```

---

## 6. Problem Curriculum

### Difficulty Distribution per Module

| Difficulty | Count | Avg solving time |
|------------|-------|-----------------|
| 🥉 Bronze | 4 | 1–3 min |
| 🥈 Silver | 6 | 3–8 min |
| 🥇 Gold | 5 | 8–15 min |
| **Total** | **15** | |

---

### Module 01 — Foundation Integration
**Topics covered:** Arrays, Linear Search, Binary Search, Hash Map, 2D Arrays

| ID | Type | Diff | Title | Key Concept |
|----|------|------|-------|-------------|
| p01-001 | Coding | 🥉 | Find Max and Min in Array | Array traversal |
| p01-002 | Debugging | 🥉 | Fix Off-by-One Error | Boundary condition |
| p01-003 | Coding | 🥉 | Reverse an Array | Index manipulation |
| p01-004 | Coding | 🥈 | Linear Search — Return Index | O(N) search |
| p01-005 | Debugging | 🥈 | Fix Infinite Loop in Search | Loop termination |
| p01-006 | Coding | 🥈 | Binary Search on Sorted Array | O(log N), L/R/M |
| p01-007 | Debugging | 🥈 | Fix Binary Search Boundary | Off-by-one in mid calc |
| p01-008 | Coding | 🥈 | Row and Column Sums of 2D Array | Nested loop |
| p01-009 | Coding | 🥇 | Two Sum using Hash Map | Dict O(1) lookup |
| p01-010 | Debugging | 🥇 | Fix Hash Collision Handler | Chaining correctness |
| p01-011 | Coding | 🥇 | Sieve of Eratosthenes | Array as bitmask |
| p01-012 | Coding | 🥇 | Maximum Subarray Sum (Sliding Window) | Two-pointer |

---

### Module 02 — Stack & Recursion Integration
**Topics covered:** Stack, Queue, Recursion, Memoization, Backtracking, Postfix

| ID | Type | Diff | Title | Key Concept |
|----|------|------|-------|-------------|
| p02-001 | Coding | 🥉 | Implement Stack (push / pop / peek) | List as stack |
| p02-002 | Debugging | 🥉 | Fix Empty Stack Pop | Exception guard |
| p02-003 | Coding | 🥉 | Balanced Parentheses Check | Stack matching |
| p02-004 | Coding | 🥈 | BFS Skeleton using Queue | deque, level traversal |
| p02-005 | Debugging | 🥈 | Fix Missing Base Case in Recursion | Base case identification |
| p02-006 | Coding | 🥈 | Factorial: Recursion → Iteration | Call stack simulation |
| p02-007 | Coding | 🥈 | Fibonacci with Memoization | Dict cache |
| p02-008 | Debugging | 🥈 | Fix Infinite Recursion | Exit condition |
| p02-009 | Coding | 🥇 | DFS using Explicit Stack | Stack-based traversal |
| p02-010 | Coding | 🥇 | N-Queens Backtracking (N=4) | Pruning logic |
| p02-011 | Debugging | 🥇 | Fix Backtracking Pruning Condition | Constraint propagation |
| p02-012 | Coding | 🥇 | Evaluate Postfix Expression | Stack arithmetic |

---

### Module 03 — Sorting & String Integration
**Topics covered:** Bubble / Selection / Insertion / Quick / Merge Sort, String, Two-pointer, KMP

| ID | Type | Diff | Title | Key Concept |
|----|------|------|-------|-------------|
| p03-001 | Coding | 🥉 | Bubble Sort | Adjacent swap |
| p03-002 | Debugging | 🥉 | Fix Swap Logic in Selection Sort | Index confusion |
| p03-003 | Coding | 🥉 | Palindrome Check | String reversal |
| p03-004 | Coding | 🥈 | Insertion Sort | Shift-based insert |
| p03-005 | Debugging | 🥈 | Fix Partition Boundary in Quick Sort | Pivot placement |
| p03-006 | Coding | 🥈 | Character Frequency Count | Dict counter |
| p03-007 | Coding | 🥈 | Anagram Detection | Sorted comparison |
| p03-008 | Debugging | 🥈 | Fix Sliding Window Index Error | Window shrink logic |
| p03-009 | Coding | 🥇 | Merge Sort | Divide and conquer |
| p03-010 | Coding | 🥇 | Subarray Sum equals K (Two-pointer) | Two-pointer pattern |
| p03-011 | Debugging | 🥇 | Fix Merge Step in Merge Sort | Off-by-one in merge |
| p03-012 | Coding | 🥇 | KMP Pattern Matching — Failure Function | Prefix table build |

---

### Module 04 — List & Tree Integration
**Topics covered:** Linked List, BST, Tree Traversal, Cycle Detection, LCA

| ID | Type | Diff | Title | Key Concept |
|----|------|------|-------|-------------|
| p04-001 | Coding | 🥉 | Linked List — Append and Print | Node + next pointer |
| p04-002 | Debugging | 🥉 | Fix None Reference in Traversal | Null check |
| p04-003 | Coding | 🥉 | Reverse a Linked List | Pointer rewiring |
| p04-004 | Coding | 🥈 | BST Insert | Recursive insert |
| p04-005 | Debugging | 🥈 | Fix Search Direction in BST | Left/right condition |
| p04-006 | Coding | 🥈 | Binary Tree Traversals (Pre/In/Post) | Recursive DFS |
| p04-007 | Coding | 🥈 | Maximum Depth of Binary Tree | Recursive height |
| p04-008 | Debugging | 🥈 | Fix Stack-based Inorder Traversal | Iterative tree walk |
| p04-009 | Coding | 🥇 | Linked List Cycle Detection (Floyd) | Fast / slow pointer |
| p04-010 | Coding | 🥇 | K-th Smallest Element in BST | Inorder counting |
| p04-011 | Debugging | 🥇 | Fix BFS Level-order Output | Queue pop order |
| p04-012 | Coding | 🥇 | Lowest Common Ancestor (LCA) | Ancestor traversal |

---

## 7. Component Hierarchy (Planned)

```
integration page (e.g. FoundationIntegrationContent)
    └─ ProblemBankController
         ├─ ProblemBankFilters        ← type / difficulty filter bar
         ├─ ProblemBankGrid           ← card grid
         │    └─ ProblemCard[]        ← title, diff badge, type tag, solved status
         └─ ProblemSolvePanel         ← opens on card click (replaces current view)
              ├─ ProblemStatement     ← description, I/O spec, sample cases (left)
              └─ ProblemEditor        ← code editor + submit + judge result (right)
                   ├─ CodeEditor      ← reuse existing (restricted editable region)
                   ├─ JudgeToolbar    ← [Submit] [Reset] buttons
                   └─ JudgeResultPanel
                        ├─ VerdictBadge   ← AC / WA / TLE / RTE
                        ├─ TCStatusRow    ← TC1 ✅ TC2 ✅ TC3 ❌ ...
                        └─ TCDetailExpand ← expected vs actual (on WA)
```

---

## 8. New Files to Create

```
web/
├─ components/features/ctp/
│   ├─ problem-bank/
│   │   ├─ ProblemBankController.tsx   ← top-level page controller
│   │   ├─ ProblemBankFilters.tsx      ← filter sidebar
│   │   ├─ ProblemBankGrid.tsx         ← responsive card grid
│   │   ├─ ProblemCard.tsx             ← individual problem card
│   │   ├─ ProblemSolvePanel.tsx       ← split panel wrapper
│   │   ├─ ProblemStatement.tsx        ← left panel: problem text
│   │   ├─ ProblemEditor.tsx           ← right panel: editor + judge
│   │   └─ JudgeResultPanel.tsx        ← verdict display
│   └─ playground/
│       └─ browser-judge/
│           ├─ BrowserJudge.ts         ← core judge logic (preamble + run + compare)
│           └─ normalize.ts            ← output normalization utility
│
└─ data/ctp/problems/
    ├─ module-01-problems.ts           ← ProblemBankItem[] for Module 01
    ├─ module-02-problems.ts           ← ProblemBankItem[] for Module 02
    ├─ module-03-problems.ts           ← ProblemBankItem[] for Module 03
    └─ module-04-problems.ts           ← ProblemBankItem[] for Module 04
```

---

## 9. Files to Modify

| File | Change |
|------|--------|
| `web/public/workers/skulpt.worker.js` | Add preamble injection before `Sk.importMainWithBody()` |
| `module-01-foundation.tsx` | Replace `FoundationIntegrationContent` with `ProblemBankController` |
| `module-02-stack-recursion.tsx` | Replace integration content with `ProblemBankController` |
| `module-03-sorting-string.tsx` | Replace integration content with `ProblemBankController` |
| `module-04-list-tree-final.tsx` | Replace integration content with `ProblemBankController` |
| `docs/CTP/INVENTORY.md` | Update delivery mode for 4 integration chapters |
| `docs/CTP/README.md` | Add this document to reading order |

---

## 10. Implementation Phases

### Phase 1 — Engine (prerequisite for everything)
1. Add preamble injection to `skulpt.worker.js`
2. Build `BrowserJudge.ts` + `normalize.ts`
3. Smoke test: simple "print max of array" problem with 3 test cases

### Phase 2 — UI Shell
4. `ProblemCard.tsx` (static, no solve flow)
5. `ProblemBankGrid.tsx` + `ProblemBankFilters.tsx`
6. Wire into one integration page (Module 01) as proof of concept

### Phase 3 — Solve Flow
7. `ProblemSolvePanel.tsx` split layout
8. `ProblemStatement.tsx` (Markdown rendering + sample I/O table)
9. `ProblemEditor.tsx` + `JudgeResultPanel.tsx`
10. Connect BrowserJudge to submit button

### Phase 4 — Problem Data
11. Write all 48 problems (12 × 4 modules) with test cases
12. Wire remaining 3 integration pages

### Phase 5 — Deferred
- Bookmark (localStorage)
- Solve history / progress tracking
- Point / currency system
- Difficulty-gated unlock

---

## 11. Key Constraints & Gotchas

| Issue | Impact | Mitigation |
|-------|--------|------------|
| Skulpt is not CPython — some stdlib missing | `collections.deque` works; `heapq` works; most stdlib OK | Test each problem on Skulpt before finalising |
| `input()` preamble shadows builtin globally | If user redefines `input` themselves, preamble is overridden | Document in problem statement: "Do not redefine `input()`" |
| MAX_STEPS = 10,000 is the TLE threshold | O(N²) on N=200 = 40,000 ops → TLE | Keep Bronze/Silver problems within O(N log N) safe range |
| Web Worker has no `window` | Cannot use DOM APIs inside judge | All judge logic stays in Worker; UI updates via postMessage |
| Test cases stored in JS bundle | Technically inspectable by user | Accepted per design decision (Q2: A) |

---

*Last updated: 2026-02-23*
*Next step: Begin Phase 1 — engine implementation*
