import { create } from 'zustand';

export type PlayState = 'idle' | 'playing' | 'paused' | 'completed';

import { VisualItem } from "../common/types";

export interface VisualStep {
  id: string; // unique step id
  description: string; // what happened in this step?
  data: any | VisualItem[] | VisualItem[][]; // snapshot of data structure state
  highlightedIndices?: number[]; // indices to highlight
  activeLine?: number; // code line number associated with this step
  stdout?: string[]; // accumulated console output
  events?: any[]; // tracer events (optional)
  variables?: any; // raw globals snapshot for state panels
}

interface CTPState {
  // Code Editor State
  code: string;
  // language is always 'python' implicitly
  setCode: (code: string) => void;

  // Execution State
  steps: VisualStep[];
  currentStepIndex: number;
  playState: PlayState;
  playbackSpeed: number; // ms per step

  // Actions
  setSteps: (steps: VisualStep[]) => void;
  setCurrentStep: (index: number) => void;
  setPlayState: (state: PlayState) => void;
  setPlaybackSpeed: (speed: number) => void;
  reset: () => void;
  nextStep: () => void;
  prevStep: () => void;
}

export const useCTPStore = create<CTPState>((set, get) => ({
  code: '',
  setCode: (code) => set({ code }),

  steps: [],
  currentStepIndex: -1,
  playState: 'idle',
  playbackSpeed: 1000, // default 1s

  setSteps: (steps) => set({ steps, currentStepIndex: 0, playState: 'idle' }),

  setCurrentStep: (index) => {
    const { steps } = get();
    if (index >= 0 && index < steps.length) {
      set({ currentStepIndex: index });
    }
  },

  setPlayState: (playState) => set({ playState }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

  reset: () => set({ steps: [], currentStepIndex: -1, playState: 'idle' }),

  nextStep: () => {
    const { currentStepIndex, steps } = get();
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      set({ playState: 'completed' });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },
}));
