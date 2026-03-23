import { NextRequest, NextResponse } from "next/server";
import {
  loadOrSeedDocCollabState,
  saveDocCollabState,
} from "@/lib/server/doc-collab-state";

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? "";

function isInternalRequest(req: NextRequest): boolean {
  if (!INTERNAL_API_SECRET) return false;
  return req.headers.get("x-internal-secret") === INTERNAL_API_SECRET;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: { docId: string } },
) {
  if (!isInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isUuid(params.docId)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }

  try {
    const yjsState = await loadOrSeedDocCollabState(params.docId);

    if (yjsState === null) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ yjs_state: yjsState });
  } catch (error) {
    console.error("[doc-collab] failed to load state", error);
    return NextResponse.json(
      { error: "Failed to load document state" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { docId: string } },
) {
  if (!isInternalRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isUuid(params.docId)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }

  const { yjs_state } = (await req.json()) as { yjs_state?: unknown };

  if (typeof yjs_state !== "string" || !yjs_state) {
    return NextResponse.json({ error: "Invalid yjs_state" }, { status: 400 });
  }

  try {
    const result = await saveDocCollabState(params.docId, yjs_state);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[doc-collab] failed to save state", error);
    return NextResponse.json(
      { error: "Failed to save document state" },
      { status: 500 },
    );
  }
}
