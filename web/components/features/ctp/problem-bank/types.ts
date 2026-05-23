export type Difficulty = "bronze" | "silver" | "gold";
export type ProblemType = "coding" | "debugging";
export type Verdict = "AC" | "WA" | "TLE" | "RTE" | "OLE";

export interface ProblemSampleIO {
  input: string;
  output: string;
  explanation?: string;
}

export interface ProblemTestCase {
  input: string;
  output: string;
}

export interface ProblemBankItem {
  id: string;
  moduleId: string;
  title: string;
  difficulty: Difficulty;
  type: ProblemType;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  sampleIO: ProblemSampleIO[];
  testCases: ProblemTestCase[];
  starterCode?: string;
  tags: string[];
  /**
   * @deprecated step count alias of `maxSteps` kept for backward compat.
   * Prefer `maxSteps` (instruction count cap) and `wallClockMs` (wall-clock cap).
   * Judge picks `maxSteps ?? timeLimit` so existing data keeps working.
   */
  timeLimit?: number;
  /** Maximum Skulpt instruction steps before TLE (counts lines executed). */
  maxSteps?: number;
  /** Wall-clock timeout in milliseconds before terminating the worker as TLE. */
  wallClockMs?: number;
  outputLimitBytes?: number;
  referenceSolution?: string;
  solutionExplanation?: string;
  hints?: string[];
}

export interface TestCaseResult {
  index: number;
  verdict: Verdict;
  actualOutput?: string;
  expectedOutput?: string;
  errorMessage?: string;
}

export interface JudgeResult {
  overall: Verdict;
  passed: number;
  total: number;
  cases: TestCaseResult[];
}
