import {
  ProblemBankItem,
  ProblemSampleIO,
  ProblemTestCase,
  Difficulty,
  ProblemType,
} from "@/components/features/ctp/problem-bank/types";

interface ProblemSeed {
  id: string;
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
  /** @deprecated step count alias of `maxSteps`. Use `maxSteps` going forward. */
  timeLimit?: number;
  /** Instruction-step cap per test case (Skulpt line execution count). */
  maxSteps?: number;
  /** Wall-clock cap (ms) per test case before the worker is terminated. */
  wallClockMs?: number;
  outputLimitBytes?: number;
  referenceSolution?: string;
  solutionExplanation?: string;
  hints?: string[];
}

export function defineProblems(moduleId: string, seeds: ProblemSeed[]): ProblemBankItem[] {
  return seeds.map((seed) => ({
    moduleId,
    // Learning-tier defaults — N=100000 problems must fit comfortably.
    maxSteps: 5_000_000,
    wallClockMs: 5_000,
    outputLimitBytes: 1024 * 1024,
    ...seed,
  }));
}
