// Module declarations for packages without bundled TypeScript types

declare module 'cytoscape' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cytoscape: any;
  export = cytoscape;
  export type Core = any;
  export type ElementDefinition = any;
  export type Stylesheet = any;
}

declare module 'dagre' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dagre: any;
  export = dagre;
}

declare module 'uuid' {
  export function v4(): string;
  export function v1(): string;
  export function v3(name: string, namespace: string): string;
  export function v5(name: string, namespace: string): string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const uuidv4: any;
}

declare module '@prisma/config' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function defineConfig(config: any): any;
}

declare module '@met4citizen/talkinghead' {
  interface TalkingHeadMorphTarget {
    realtime?: number | null;
    needsUpdate?: boolean;
  }

  export class TalkingHead {
    mtAvatar?: Record<string, TalkingHeadMorphTarget>;

    constructor(node: HTMLElement, opt?: Record<string, unknown>);

    showAvatar(
      avatar: Record<string, unknown>,
      onprogress?: (event: ProgressEvent<EventTarget>) => void,
    ): Promise<void>;

    setView(view: string, opt?: Record<string, unknown>): void;
    setLighting(opt?: Record<string, unknown>): void;
    setMood(mood: string): void;
    makeEyeContact(durationMs: number): void;
    lookAhead(durationMs: number): void;
    lookAtCamera(durationMs: number): void;
    playGesture(name: string, durationSec?: number, mirror?: boolean, transitionMs?: number): void;
    stopGesture(transitionMs?: number): void;
    dispose(): void;
  }
}
