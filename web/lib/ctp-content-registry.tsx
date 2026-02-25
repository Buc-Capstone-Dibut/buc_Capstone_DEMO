import { ReactNode } from "react";
import {
  FoundationAlgorithmBasicsContent,
  FoundationBasicDsArrayContent,
  FoundationSearchAlgorithmsContent,
  FoundationIntegrationContent,
} from "@/components/features/ctp/contents/categories/modules/module-01-foundation";
import {
  StackQueueContent,
  RecursionContent,
  StackRecursionIntegrationContent,
} from "@/components/features/ctp/contents/categories/modules/module-02-stack-recursion";
import {
  SortingContentRefactored,
  StringSearchContent,
  SortingStringIntegrationContent,
} from "@/components/features/ctp/contents/categories/modules/module-03-sorting-string";
import {
  ListContentRefactored,
  TreeContentRefactored,
  ListTreeIntegrationContent,
  FinalChallengeContent,
} from "@/components/features/ctp/contents/categories/modules/module-04-list-tree-final";

type ContentComponent = () => ReactNode;

export const CTP_CONTENT_REGISTRY: Record<string, ContentComponent | undefined> = {
  "module-01-foundation/algo-basics": FoundationAlgorithmBasicsContent,
  "module-01-foundation/basic-ds-array": FoundationBasicDsArrayContent,
  "module-01-foundation/search-algorithms": FoundationSearchAlgorithmsContent,
  "module-01-foundation/foundation-integration": FoundationIntegrationContent,

  "module-02-stack-recursion/stack-queue": StackQueueContent,
  "module-02-stack-recursion/recursion": RecursionContent,
  "module-02-stack-recursion/stack-recursion-integration": StackRecursionIntegrationContent,

  "module-03-sorting-string/sorting": SortingContentRefactored,
  "module-03-sorting-string/string-search": StringSearchContent,
  "module-03-sorting-string/sorting-string-integration": SortingStringIntegrationContent,

  "module-04-list-tree-final/list": ListContentRefactored,
  "module-04-list-tree-final/tree": TreeContentRefactored,
  "module-04-list-tree-final/list-tree-integration": ListTreeIntegrationContent,
  "module-04-list-tree-final/final-challenge": FinalChallengeContent,
};

export function getCtpContent(categoryId: string, conceptId: string) {
  const key = `${categoryId}/${conceptId}`;
  return CTP_CONTENT_REGISTRY[key];
}
