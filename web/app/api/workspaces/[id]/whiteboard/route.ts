import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

// workspace-server → BFF 서버 간 내부 통신 인증
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? "";
// Vercel Functions accept at most 4.5 MB per request/response. Keep a margin
// for platform handling and surface the same 4 MiB safe limit in the client.
const MAX_WHITEBOARD_STATE_BYTES = 4 * 1024 * 1024;

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

  const state = whiteboard?.yjs_state;
  if (!state?.byteLength) {
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  return new NextResponse(new Uint8Array(state), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Length": String(state.byteLength),
      "Content-Type": "application/octet-stream",
    },
  });
}

/**
 * PUT /api/workspaces/[id]/whiteboard
 * workspace-server가 Yjs 상태를 저장할 때 호출 (debounce / all-left / periodic)
 * body: raw application/octet-stream from Y.encodeStateAsUpdate()
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !req.headers.get("content-type")?.startsWith("application/octet-stream")
  ) {
    return NextResponse.json(
      { error: "Content-Type must be application/octet-stream" },
      { status: 415 },
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_WHITEBOARD_STATE_BYTES) {
    return NextResponse.json(
      { error: "Whiteboard state exceeds the 4 MiB safe limit" },
      { status: 413 },
    );
  }

  const stateBuffer = Buffer.from(await req.arrayBuffer());
  if (!stateBuffer.byteLength) {
    return NextResponse.json(
      { error: "Empty whiteboard state" },
      { status: 400 },
    );
  }
  if (stateBuffer.byteLength > MAX_WHITEBOARD_STATE_BYTES) {
    return NextResponse.json(
      { error: "Whiteboard state exceeds the 4 MiB safe limit" },
      { status: 413 },
    );
  }

  const writableCheck = await ensureWorkspaceWritable(params.id);
  if (!writableCheck.ok) {
    return NextResponse.json(
      { error: writableCheck.error },
      { status: writableCheck.status },
    );
  }

  await prisma.workspace_whiteboards.upsert({
    where: { workspace_id: params.id },
    create: {
      workspace_id: params.id,
      yjs_state: stateBuffer,
    },
    update: {
      yjs_state: stateBuffer,
    },
  });

  return NextResponse.json({ ok: true, savedBytes: stateBuffer.byteLength });
}
