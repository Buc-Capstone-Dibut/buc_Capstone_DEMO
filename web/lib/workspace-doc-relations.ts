export const WORKSPACE_DOC_RELATION_TYPES = [
  "reference",
  "spec",
  "meeting_note",
  "qa",
  "result",
  "design",
] as const;

export type WorkspaceDocRelationType =
  (typeof WORKSPACE_DOC_RELATION_TYPES)[number];

export function normalizeWorkspaceDocRelationType(
  value: unknown,
): WorkspaceDocRelationType {
  if (
    typeof value === "string" &&
    WORKSPACE_DOC_RELATION_TYPES.includes(
      value as WorkspaceDocRelationType,
    )
  ) {
    return value as WorkspaceDocRelationType;
  }

  return "reference";
}

export const WORKSPACE_DOC_RELATION_LABEL: Record<
  WorkspaceDocRelationType,
  string
> = {
  reference: "참고 문서",
  spec: "명세 문서",
  meeting_note: "회의록",
  qa: "QA",
  result: "결과물",
  design: "디자인",
};
