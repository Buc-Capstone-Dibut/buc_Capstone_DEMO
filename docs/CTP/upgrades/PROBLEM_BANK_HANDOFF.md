# Problem Bank — AI Developer Handoff Prompt

> Copy everything below the horizontal rule and use it as your opening prompt.

---

## PROMPT START

Hey, I need your help building a **Problem Bank** feature for a coding education platform called CTP (Coding Test Preparation). The planning is already done — your job is to read the plan and implement it, using your own judgment wherever the plan doesn't spell something out.

---

### What this project is

CTP is a Next.js 14 + TypeScript web app. It teaches algorithms and data structures through interactive visualizations. The platform runs Python code directly in the browser using a Skulpt-powered Web Worker — no server-side execution.

The app lives at `web/` inside the monorepo root `/Users/junghwan/buc_Capstone_DEMO/`.

---

### What needs to be built

Right now, four "integration" pages exist but they're basically empty placeholders:

- `/insights/ctp/module-01-foundation/foundation-integration`
- `/insights/ctp/module-02-stack-recursion/stack-recursion-integration`
- `/insights/ctp/module-03-sorting-string/sorting-string-integration`
- `/insights/ctp/module-04-list-tree-final/list-tree-integration`

We want to turn these into a **Baekjoon-style problem bank** — users see a grid of coding problems, click one, get a split-panel view (problem description on the left, Python code editor on the right), write their solution, hit Submit, and get an automatic verdict (AC / WA / TLE / RTE).

Python only. No server. Everything runs in the browser.

---

### Read this first

The full architecture plan is at:
```
docs/CTP/upgrades/PROBLEM_BANK_PLAN.md
```

It covers the technical design, data schemas, UI layout, the complete problem list for all 4 modules, component hierarchy, and a phased implementation roadmap. **Start there before touching any code.**

Also worth a quick skim:
- `docs/CTP/foundation/ARCHITECTURE.md` — overall CTP routing and module system
- `docs/CTP/INVENTORY.md` — which pages exist and their current delivery mode

---

### The one technical thing you must understand before starting

The existing Skulpt engine doesn't support `input()` — which is essential for Baekjoon-style problems. The plan describes a clean solution: **inject a Python preamble before the user's code** that shadows the builtin `input()` with a function reading from pre-loaded test case lines.

```python
# injected silently before user code
_judge_lines = ["5", "3 12 7 1 8"]
_judge_idx = [0]

def input(prompt=""):
    i = _judge_idx[0]
    _judge_idx[0] += 1
    return _judge_lines[i]
```

The injection point is `web/public/workers/skulpt.worker.js`. Everything else about the engine stays the same. This is Phase 1 — get this working with a simple smoke test before building UI.

---

### A few things to keep in mind

- The existing playground components are already quite good — reuse them wherever it makes sense rather than rebuilding from scratch.
- The problem list in the plan (48 problems across 4 modules) is a starting point. If you think the test cases for a specific problem need tweaking to work well with Skulpt's quirks, just adjust them.
- Design-wise, match the existing CTP visual language — dark/light theme aware, uses shadcn/ui components, Tailwind. Don't introduce new design patterns unless necessary.
- The point/bookmark system is **out of scope** for now. Don't wire it up even if it's tempting.
- If you hit something the plan didn't anticipate, use your judgment. You don't need to ask about every small decision.

---

### Where the relevant source files are

```
web/public/workers/skulpt.worker.js          ← Skulpt engine (add preamble injection here)
web/components/features/ctp/
  ├─ common/CTPModuleLoader.tsx              ← how modules are rendered
  ├─ playground/ctp-playground.tsx           ← existing code editor + visualizer
  ├─ contents/categories/modules/
  │   ├─ module-01-foundation.tsx            ← replace FoundationIntegrationContent
  │   ├─ module-02-stack-recursion.tsx       ← replace integration content
  │   ├─ module-03-sorting-string.tsx        ← replace integration content
  │   └─ module-04-list-tree-final.tsx       ← replace integration content
  └─ problem-bank/                           ← create this directory with new components
```

---

### Suggested order of work

1. Get `input()` preamble injection working in the worker + verify with a minimal test
2. Build `BrowserJudge.ts` — the core judge that runs code against test cases and returns verdicts
3. Build the UI: problem card grid → split panel → code editor + judge result
4. Wire up Module 01 end-to-end as a working proof of concept
5. Add the remaining 3 modules once Module 01 is solid

The plan calls this Phases 1–4. Follow that order loosely, but adapt if something makes more sense to tackle differently.

---

Good luck — the hard design decisions are already made, so you should be able to move fast. When in doubt, read the plan again before asking.

## PROMPT END
