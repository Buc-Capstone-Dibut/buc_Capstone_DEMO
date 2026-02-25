import { ProblemBankItem } from "@/components/features/ctp/problem-bank/types";
import { module01Problems } from "./module-01-problems";
import { module02Problems } from "./module-02-problems";
import { module03Problems } from "./module-03-problems";
import { module04Problems } from "./module-04-problems";

export const CTP_PROBLEM_BANK: Record<string, ProblemBankItem[]> = {
  "foundation-integration": module01Problems,
  "stack-recursion-integration": module02Problems,
  "sorting-string-integration": module03Problems,
  "list-tree-integration": module04Problems,
};

export function getProblemsByModuleId(moduleId: string): ProblemBankItem[] {
  return CTP_PROBLEM_BANK[moduleId] ?? [];
}

export { module01Problems, module02Problems, module03Problems, module04Problems };
