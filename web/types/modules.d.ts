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
