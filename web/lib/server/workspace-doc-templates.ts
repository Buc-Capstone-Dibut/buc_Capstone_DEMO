type BlockNoteContent = unknown[];

export type WorkspaceDocTemplate = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  title: string;
  content: BlockNoteContent;
};

export type WorkspaceDocTemplateSummary = Pick<
  WorkspaceDocTemplate,
  "id" | "name" | "description" | "emoji" | "title"
>;

export const WORKSPACE_DOC_TEMPLATES: WorkspaceDocTemplate[] = [
  {
    id: "meeting-note",
    name: "회의록",
    description: "회의 목적, 논의 내용, 액션 아이템을 빠르게 정리합니다.",
    emoji: "📝",
    title: "회의록",
    content: [
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "회의 목적", styles: {} }],
      },
      {
        type: "bulletListItem",
        content: [{ type: "text", text: "오늘 논의할 핵심 안건", styles: {} }],
      },
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "논의 내용", styles: {} }],
      },
      {
        type: "bulletListItem",
        content: [{ type: "text", text: "결정된 사항", styles: {} }],
      },
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "액션 아이템", styles: {} }],
      },
      {
        type: "numberedListItem",
        content: [{ type: "text", text: "담당자와 마감일을 적어주세요.", styles: {} }],
      },
    ],
  },
  {
    id: "prd",
    name: "요구사항 문서",
    description: "문제 정의, 목표, 기능 범위를 정리합니다.",
    emoji: "📌",
    title: "요구사항 문서",
    content: [
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "문제 정의", styles: {} }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "무엇이 문제인지 한 문단으로 적어주세요.", styles: {} }],
      },
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "목표", styles: {} }],
      },
      {
        type: "bulletListItem",
        content: [{ type: "text", text: "이번 작업으로 달성하려는 목표", styles: {} }],
      },
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "범위", styles: {} }],
      },
      {
        type: "bulletListItem",
        content: [{ type: "text", text: "필수 기능", styles: {} }],
      },
      {
        type: "bulletListItem",
        content: [{ type: "text", text: "후순위 기능", styles: {} }],
      },
    ],
  },
  {
    id: "retrospective",
    name: "회고",
    description: "잘한 점, 아쉬운 점, 다음 액션을 정리합니다.",
    emoji: "🔁",
    title: "회고",
    content: [
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "잘한 점", styles: {} }],
      },
      {
        type: "bulletListItem",
        content: [{ type: "text", text: "유지하고 싶은 점", styles: {} }],
      },
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "아쉬운 점", styles: {} }],
      },
      {
        type: "bulletListItem",
        content: [{ type: "text", text: "개선이 필요한 점", styles: {} }],
      },
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "다음 액션", styles: {} }],
      },
      {
        type: "numberedListItem",
        content: [{ type: "text", text: "바로 실행할 액션", styles: {} }],
      },
    ],
  },
  {
    id: "qa-checklist",
    name: "QA 체크리스트",
    description: "검수 항목과 확인 결과를 기록합니다.",
    emoji: "✅",
    title: "QA 체크리스트",
    content: [
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "확인 항목", styles: {} }],
      },
      {
        type: "checkListItem",
        content: [{ type: "text", text: "핵심 플로우 정상 동작", styles: {} }],
      },
      {
        type: "checkListItem",
        content: [{ type: "text", text: "오류 상태 확인", styles: {} }],
      },
      {
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: "메모", styles: {} }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "발견한 이슈와 재현 방법을 적어주세요.", styles: {} }],
      },
    ],
  },
];

export function getWorkspaceDocTemplate(templateId: unknown) {
  if (typeof templateId !== "string" || !templateId) return null;
  return WORKSPACE_DOC_TEMPLATES.find((template) => template.id === templateId) ?? null;
}

export function listWorkspaceDocTemplates(): WorkspaceDocTemplateSummary[] {
  return WORKSPACE_DOC_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    emoji: template.emoji,
    title: template.title,
  }));
}
