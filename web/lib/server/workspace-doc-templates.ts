import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export type WorkspaceDocTemplate = {
  id: string;
  name: string;
  description: string;
  emoji: string | null;
  title: string;
  content: unknown;
  createdAt: string;
  updatedAt: string;
  sourceDocId: string | null;
};

export type WorkspaceDocTemplateSummary = Omit<WorkspaceDocTemplate, "content">;

type TemplateSourceSnapshot = {
  title: string;
  emoji: string | null;
  content: unknown;
};

function isMissingTemplateTableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("workspace_doc_templates") &&
    (message.includes("does not exist") ||
      message.includes("relation") ||
      message.includes("table"))
  );
}

function toTemplateJsonValue(value: unknown): Prisma.InputJsonValue {
  const normalized = value ?? [];
  return JSON.parse(JSON.stringify(normalized)) as Prisma.InputJsonValue;
}

function normalizeTemplateRecord(
  template: {
    id: string;
    name: string;
    description: string | null;
    emoji: string | null;
    title: string;
    content: unknown;
    created_at: Date;
    updated_at: Date;
    source_doc_id: string | null;
  },
): WorkspaceDocTemplate {
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? "",
    emoji: template.emoji ?? null,
    title: template.title,
    content: template.content ?? [],
    createdAt: template.created_at.toISOString(),
    updatedAt: template.updated_at.toISOString(),
    sourceDocId: template.source_doc_id ?? null,
  };
}

async function getTemplateSourceSnapshot(
  workspaceId: string,
  sourceDocId: string,
): Promise<TemplateSourceSnapshot | null> {
  const sourceDoc = await prisma.workspace_docs.findFirst({
    where: {
      id: sourceDocId,
      workspace_id: workspaceId,
      kind: "page",
      is_archived: false,
    },
    select: {
      title: true,
      emoji: true,
      content: true,
    },
  });

  if (!sourceDoc) {
    return null;
  }

  return {
    title: sourceDoc.title,
    emoji: sourceDoc.emoji ?? null,
    content: sourceDoc.content ?? [],
  };
}

export async function getWorkspaceDocTemplate(
  workspaceId: string,
  templateId: unknown,
) {
  if (typeof templateId !== "string" || !templateId) return null;

  const template = await prisma.workspace_doc_templates.findFirst({
    where: {
      id: templateId,
      workspace_id: workspaceId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      emoji: true,
      title: true,
      content: true,
      created_at: true,
      updated_at: true,
      source_doc_id: true,
    },
  });

  return template ? normalizeTemplateRecord(template) : null;
}

export async function listWorkspaceDocTemplates(workspaceId: string) {
  let templates: Array<{
    id: string;
    name: string;
    description: string | null;
    emoji: string | null;
    title: string;
    created_at: Date;
    updated_at: Date;
    source_doc_id: string | null;
  }> = [];

  try {
    templates = await prisma.workspace_doc_templates.findMany({
      where: {
        workspace_id: workspaceId,
      },
      orderBy: [
        { updated_at: "desc" },
        { created_at: "desc" },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        emoji: true,
        title: true,
        created_at: true,
        updated_at: true,
        source_doc_id: true,
      },
    });
  } catch (error) {
    if (isMissingTemplateTableError(error)) {
      return [];
    }
    throw error;
  }

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description ?? "",
    emoji: template.emoji ?? null,
    title: template.title,
    createdAt: template.created_at.toISOString(),
    updatedAt: template.updated_at.toISOString(),
    sourceDocId: template.source_doc_id ?? null,
  })) satisfies WorkspaceDocTemplateSummary[];
}

export async function createWorkspaceDocTemplate(input: {
  workspaceId: string;
  createdBy: string;
  name: string;
  description?: string | null;
  emoji?: string | null;
  title?: string | null;
  content?: unknown;
  sourceDocId?: string | null;
}) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("템플릿 이름을 입력해 주세요.");
  }

  let sourceSnapshot: TemplateSourceSnapshot | null = null;
  if (input.sourceDocId) {
    sourceSnapshot = await getTemplateSourceSnapshot(
      input.workspaceId,
      input.sourceDocId,
    );
    if (!sourceSnapshot) {
      throw new Error("템플릿으로 저장할 문서를 찾을 수 없습니다.");
    }
  }

  const title =
    (typeof input.title === "string" && input.title.trim()) ||
    sourceSnapshot?.title ||
    "제목 없음";
  const content =
    input.content !== undefined ? input.content : sourceSnapshot?.content ?? [];
  const emoji =
    input.emoji !== undefined ? input.emoji : sourceSnapshot?.emoji ?? null;

  const created = await prisma.workspace_doc_templates.create({
    data: {
      workspace_id: input.workspaceId,
      created_by: input.createdBy,
      source_doc_id: input.sourceDocId ?? null,
      name,
      description: input.description?.trim() || null,
      emoji: emoji ?? null,
      title,
      content: toTemplateJsonValue(content),
    },
    select: {
      id: true,
      name: true,
      description: true,
      emoji: true,
      title: true,
      content: true,
      created_at: true,
      updated_at: true,
      source_doc_id: true,
    },
  });

  return normalizeTemplateRecord(created);
}

export async function updateWorkspaceDocTemplate(input: {
  workspaceId: string;
  templateId: string;
  name?: string | null;
  description?: string | null;
  emoji?: string | null;
  title?: string | null;
  content?: unknown;
  sourceDocId?: string | null;
}) {
  const existing = await prisma.workspace_doc_templates.findFirst({
    where: {
      id: input.templateId,
      workspace_id: input.workspaceId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      emoji: true,
      title: true,
      content: true,
    },
  });

  if (!existing) {
    throw new Error("템플릿을 찾을 수 없습니다.");
  }

  let sourceSnapshot: TemplateSourceSnapshot | null = null;
  if (input.sourceDocId) {
    sourceSnapshot = await getTemplateSourceSnapshot(
      input.workspaceId,
      input.sourceDocId,
    );
    if (!sourceSnapshot) {
      throw new Error("템플릿으로 갱신할 문서를 찾을 수 없습니다.");
    }
  }

  const nextName =
    input.name !== undefined
      ? typeof input.name === "string"
        ? input.name.trim()
        : ""
      : existing.name;
  if (!nextName) {
    throw new Error("템플릿 이름을 입력해 주세요.");
  }

  const updateData: Prisma.workspace_doc_templatesUncheckedUpdateInput = {
    name: nextName,
  };

  if (input.description !== undefined) {
    updateData.description =
      typeof input.description === "string" && input.description.trim()
        ? input.description.trim()
        : null;
  }

  if (input.emoji !== undefined) {
    updateData.emoji =
      typeof input.emoji === "string" && input.emoji ? input.emoji : null;
  } else if (sourceSnapshot) {
    updateData.emoji = sourceSnapshot.emoji ?? null;
  }

  if (input.title !== undefined) {
    const nextTitle =
      typeof input.title === "string" ? input.title.trim() : "";
    updateData.title = nextTitle || existing.title;
  } else if (sourceSnapshot) {
    updateData.title = sourceSnapshot.title;
  }

  if (input.content !== undefined) {
    updateData.content = toTemplateJsonValue(input.content);
  } else if (sourceSnapshot) {
    updateData.content = toTemplateJsonValue(sourceSnapshot.content);
  }

  if (input.sourceDocId !== undefined) {
    updateData.source_doc_id = input.sourceDocId || null;
  }

  const updated = await prisma.workspace_doc_templates.update({
    where: {
      id: input.templateId,
    },
    data: updateData,
    select: {
      id: true,
      name: true,
      description: true,
      emoji: true,
      title: true,
      content: true,
      created_at: true,
      updated_at: true,
      source_doc_id: true,
    },
  });

  return normalizeTemplateRecord(updated);
}

export async function deleteWorkspaceDocTemplate(
  workspaceId: string,
  templateId: string,
) {
  const template = await prisma.workspace_doc_templates.findFirst({
    where: {
      id: templateId,
      workspace_id: workspaceId,
    },
    select: { id: true },
  });

  if (!template) {
    throw new Error("템플릿을 찾을 수 없습니다.");
  }

  await prisma.workspace_doc_templates.delete({
    where: {
      id: templateId,
    },
  });
}
