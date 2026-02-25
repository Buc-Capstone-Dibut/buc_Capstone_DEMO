import { ComponentType } from "react";

// [NEW] Guidebook Interfaces
export interface GuideItem {
  label: string;
  code: string;
  description?: string;
  tags?: string[]; // e.g. ["Read-Only", "Pattern"]
  isEditable?: boolean;
}

export interface GuideSection {
  title: string;
  items: GuideItem[];
}

export interface CTPImplementationExample {
  language: 'python';
  description?: string;
  code: string;
}

export interface CTPPracticeProblem {
  id: number;
  title: string;
  tier: string;
  description: string;
  link?: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  Visualizer?: React.ComponentType<any>;
  SupplementaryVisualizer?: React.ComponentType<any>;
}

export interface CTPModuleConfig {
  id: string;
  title: string;
  description: string;
  sampleData?: number[];
  Visualizer?: React.ComponentType<any>;
  useSim?: (...args: any[]) => any;
  config?: {
    minSize?: number;
    maxSize?: number;
  };
  mode?: 'code' | 'interactive'; // Default: 'code'
  interactive?: {
    components: ('push' | 'pop' | 'peek' | 'reset' | 'pushFront' | 'pushRear' | 'popFront' | 'popRear')[];
    maxSize?: number;
  };
  tags?: string[];
  features?: FeatureItem[];
  complexity?: {
    access: string;
    search: string;
    insertion: string;
    deletion: string;
  };
  complexityNames?: {
    access?: string;
    search?: string;
    insertion?: string;
    deletion?: string;
  };
  practiceProblems?: CTPPracticeProblem[];
  implementation?: CTPImplementationExample[];
  initialCode?: {
    python: string;
  };

  showStatePanel?: boolean;
  statePanelMode?: "summary" | "full";

  // [NEW] Interactive Guide
  guide?: GuideSection[];

  story?: {
    problem: string;
    definition: string;
    analogy: string;
    playgroundLimit?: string;
    playgroundDescription?: string;
  };
}

export interface CTPModule {
  config: CTPModuleConfig;
  useSim: (...args: any[]) => {
    runSimulation: (code: string) => void;
    interactive?: {
      visualData: any;
      edges?: { source: string; target: string; label?: string }[];
      logs?: string[];
      handlers: Record<string, () => void>;
      selectedNodeId?: string | number | null;
      selectedSummary?: string[];
      onNodeSelect?: (nodeId: string | number) => void;
    };
  };
  Visualizer: ComponentType<any>;
}

export type CTPModuleRegistry = Record<string, CTPModule>;

export interface VisualItem {
  id: string | number;
  value: string | number | null;
  isHighlighted?: boolean;
  label?: string; // Optional label (e.g., index or variable name)
  isGhost?: boolean; // For capacity visualization etc.
  status?: 'active' | 'comparing' | 'pop' | 'success' | 'visited' | 'found'; // [NEW] For detailed algorithm states
}


export type LinearItem = VisualItem;
export type GridItem = VisualItem;

export interface LinkedListNode {
  id: string | number;
  value: any;
  nextId?: string | number | null;
  prevId?: string | number | null;
  label?: string; // e.g. "Head", "Curr"
  isHighlighted?: boolean;
  isNull?: boolean;
}
