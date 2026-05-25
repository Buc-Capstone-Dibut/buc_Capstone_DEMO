export type Domain =
  | "stack" | "queue" | "list" | "tree" | "graph"
  | "array" | "sort" | "string" | "hash" | "recursion";

export type VisualizerType =
  | "array" | "stack-bar" | "queue-ring" | "linked-list" | "tree" | "bst"
  | "sort-bars" | "string-pointer" | "hash-table" | "recursion-tree" | "backtracking-board";

export type ModuleId =
  | "module-01-foundation" | "module-02-stack-recursion"
  | "module-03-sorting-string" | "module-04-list-tree-final";

export interface StoryboardStep {
  step: number;
  description: string;
  stateAfter: unknown;
  highlight?: string;
}

export interface ConceptSpec {
  id: string;
  moduleId: ModuleId;
  conceptId: string;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];
  learningOutcomes: string[];
  simulation: {
    mode: "interactive" | "code";
    domain: Domain;
    stepCount: number;
    operations: string[];
    initialState: unknown;
    storyboard: StoryboardStep[];
  };
  visualizer: {
    type: VisualizerType;
    primaryColor?: string;
    showIndices?: boolean;
    showPointers?: string[];
  };
  supplementary: Array<{
    title: string;
    description: string;
    visualHint: string;
  }>;
  content: {
    story: {
      problem: string;
      definition: string;
      analogy: string;
    };
    features: Array<{
      title: string;
      description: string;
      icon?: string;
    }>;
    complexity?: {
      access: string;
      search: string;
      insertion: string;
      deletion: string;
    };
  };
}

export function validateConceptSpec(spec: unknown): asserts spec is ConceptSpec {
  if (!spec || typeof spec !== "object") {
    throw new Error("ConceptSpec must be an object");
  }
  const s = spec as Record<string, unknown>;
  if (typeof s.id !== "string") throw new Error("id must be string");
  if (typeof s.title !== "string") throw new Error("title must be string");
  if (!s.content || typeof s.content !== "object") throw new Error("content required");
  const content = s.content as Record<string, unknown>;
  const story = content.story as Record<string, unknown> | undefined;
  if (!story?.problem || !story?.definition || !story?.analogy) {
    throw new Error("story.problem/definition/analogy all required");
  }
  if (!Array.isArray(content.features) || content.features.length !== 4) {
    throw new Error("features must be exactly 4");
  }
}
