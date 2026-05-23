import { ComponentType } from "react";
import dynamic from "next/dynamic";

type ContentComponent = ComponentType;

// Each module file ships ~600 lines of layout + ~25 visualizer imports apiece.
// Splitting per module keeps the CTP detail page chunk small: only the
// requested module's bundle ever ships to the visitor.
//
// `ssr: true` (default) preserves server-rendering for the initial HTML so
// CTP pages remain pre-renderable; `ssr: false` is reserved for components
// that touch `window`/Monaco/Skulpt, which already live deeper in the tree.
const M01_AlgoBasics = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-01-foundation").then(
    (m) => ({ default: m.FoundationAlgorithmBasicsContent }),
  ),
);
const M01_BasicDsArray = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-01-foundation").then(
    (m) => ({ default: m.FoundationBasicDsArrayContent }),
  ),
);
const M01_SearchAlgorithms = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-01-foundation").then(
    (m) => ({ default: m.FoundationSearchAlgorithmsContent }),
  ),
);
const M01_Integration = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-01-foundation").then(
    (m) => ({ default: m.FoundationIntegrationContent }),
  ),
);

const M02_StackQueue = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-02-stack-recursion").then(
    (m) => ({ default: m.StackQueueContent }),
  ),
);
const M02_Recursion = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-02-stack-recursion").then(
    (m) => ({ default: m.RecursionContent }),
  ),
);
const M02_Integration = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-02-stack-recursion").then(
    (m) => ({ default: m.StackRecursionIntegrationContent }),
  ),
);

const M03_Sorting = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-03-sorting-string").then(
    (m) => ({ default: m.SortingContent }),
  ),
);
const M03_StringSearch = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-03-sorting-string").then(
    (m) => ({ default: m.StringSearchContent }),
  ),
);
const M03_Integration = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-03-sorting-string").then(
    (m) => ({ default: m.SortingStringIntegrationContent }),
  ),
);

const M04_List = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-04-list-tree-final").then(
    (m) => ({ default: m.ListContent }),
  ),
);
const M04_Tree = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-04-list-tree-final").then(
    (m) => ({ default: m.TreeContent }),
  ),
);
const M04_Integration = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-04-list-tree-final").then(
    (m) => ({ default: m.ListTreeIntegrationContent }),
  ),
);
const M04_FinalChallenge = dynamic(() =>
  import("@/components/features/ctp/contents/categories/modules/module-04-list-tree-final").then(
    (m) => ({ default: m.FinalChallengeContent }),
  ),
);

export const CTP_CONTENT_REGISTRY: Record<string, ContentComponent | undefined> = {
  "module-01-foundation/algo-basics": M01_AlgoBasics,
  "module-01-foundation/basic-ds-array": M01_BasicDsArray,
  "module-01-foundation/search-algorithms": M01_SearchAlgorithms,
  "module-01-foundation/foundation-integration": M01_Integration,

  "module-02-stack-recursion/stack-queue": M02_StackQueue,
  "module-02-stack-recursion/recursion": M02_Recursion,
  "module-02-stack-recursion/stack-recursion-integration": M02_Integration,

  "module-03-sorting-string/sorting": M03_Sorting,
  "module-03-sorting-string/string-search": M03_StringSearch,
  "module-03-sorting-string/sorting-string-integration": M03_Integration,

  "module-04-list-tree-final/list": M04_List,
  "module-04-list-tree-final/tree": M04_Tree,
  "module-04-list-tree-final/list-tree-integration": M04_Integration,
  "module-04-list-tree-final/final-challenge": M04_FinalChallenge,
};

export function getCtpContent(categoryId: string, conceptId: string) {
  const key = `${categoryId}/${conceptId}`;
  return CTP_CONTENT_REGISTRY[key];
}
