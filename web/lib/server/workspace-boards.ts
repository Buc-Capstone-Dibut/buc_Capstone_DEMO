import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function ensureDefaultWorkspaceBoard(workspaceId: string) {
  const existingDefault = await prisma.workspace_boards.findFirst({
    where: {
      workspace_id: workspaceId,
      is_default: true,
    },
    orderBy: { created_at: "asc" },
  });

  if (existingDefault) return existingDefault;

  const firstBoard = await prisma.workspace_boards.findFirst({
    where: { workspace_id: workspaceId },
    orderBy: [{ position: "asc" }, { created_at: "asc" }],
  });

  if (firstBoard) {
    return prisma.workspace_boards.update({
      where: { id: firstBoard.id },
      data: { is_default: true },
    });
  }

  try {
    return await prisma.workspace_boards.create({
      data: {
        workspace_id: workspaceId,
        name: "기본 보드",
        position: 0,
        is_default: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentDefault = await prisma.workspace_boards.findFirst({
        where: { workspace_id: workspaceId, is_default: true },
      });
      if (concurrentDefault) return concurrentDefault;
    }
    throw error;
  }
}

export async function findWorkspaceBoard(workspaceId: string, boardId: string) {
  return prisma.workspace_boards.findFirst({
    where: {
      id: boardId,
      workspace_id: workspaceId,
    },
  });
}
