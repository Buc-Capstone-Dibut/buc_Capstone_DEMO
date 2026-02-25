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
  timeLimit?: number;
  outputLimitBytes?: number;
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
