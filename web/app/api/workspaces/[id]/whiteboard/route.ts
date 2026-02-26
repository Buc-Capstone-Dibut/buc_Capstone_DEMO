import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// workspace-server → BFF 서버 간 내부 통신 인증
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? "";

function isInternalRequest(req: NextRequest): boolean {
  if (!INTERNAL_API_SECRET) return false;
  return req.headers.get("x-internal-secret") === INTERNAL_API_SECRET;
}

/**
 * GET /api/workspaces/[id]/whiteboard
 * workspace-server가 서버 시작 시 저장된 Yjs 상태를 가져갈 때 호출
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const whiteboard = await prisma.workspace_whiteboards.findUnique({
    where: { workspace_id: params.id },
    select: { yjs_state: true },
  });

  return NextResponse.json({ yjs_state: whiteboard?.yjs_state ?? null });
}

/**
 * PUT /api/workspaces/[id]/whiteboard
 * workspace-server가 Yjs 상태를 저장할 때 호출 (debounce / all-left / periodic)
 * body: { yjs_state: string }  ← base64-encoded Uint8Array
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { yjs_state } = (await req.json()) as { yjs_state: string };

  if (!yjs_state || typeof yjs_state !== "string") {
    return NextResponse.json({ error: "Invalid yjs_state" }, { status: 400 });
  }

  await prisma.workspace_whiteboards.upsert({
    where: { workspace_id: params.id },
    create: {
      workspace_id: params.id,
      yjs_state,
    },
    update: {
      yjs_state,
    },
  });

  return NextResponse.json({ ok: true });
}
