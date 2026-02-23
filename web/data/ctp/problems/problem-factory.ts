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
  timeLimit?: number;
  outputLimitBytes?: number;
}

export function defineProblems(moduleId: string, seeds: ProblemSeed[]): ProblemBankItem[] {
  return seeds.map((seed) => ({
    moduleId,
    timeLimit: 10000,
    outputLimitBytes: 1024 * 1024,
    ...seed,
  }));
}
