import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createWorkspaceDocAssetUrl } from "@/lib/workspace-doc-assets";

const BUCKET = "workspace-doc-assets";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(
  request: Request,
  { params }: { params: { id: string; docId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const docId = params.docId;

  const membership = await prisma.workspace_members.findUnique({
    where: {
      workspace_id_user_id: {
        workspace_id: workspaceId,
        user_id: session.user.id,
      },
    },
    select: { user_id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const writableCheck = await ensureWorkspaceWritable(workspaceId);
  if (!writableCheck.ok) {
    return NextResponse.json(
      { error: writableCheck.error },
      { status: writableCheck.status },
    );
  }

  const doc = await prisma.workspace_docs.findFirst({
    where: {
      id: docId,
      workspace_id: workspaceId,
      kind: "page",
      is_archived: false,
    },
    select: { id: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "이미지는 10MB 이하만 업로드할 수 있습니다." }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const assetId = crypto.randomUUID();
  const storagePath = `${workspaceId}/${docId}/${assetId}.${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminSupabaseClient();

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Workspace doc asset upload failed", uploadError);
    return NextResponse.json({ error: "이미지 업로드에 실패했습니다." }, { status: 500 });
  }

  await prisma.workspace_doc_assets.create({
    data: {
      id: assetId,
      workspace_id: workspaceId,
      doc_id: docId,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      created_by: session.user.id,
    },
  });

  return NextResponse.json({
    id: assetId,
    url: createWorkspaceDocAssetUrl(workspaceId, assetId),
    assetUrl: `/api/workspaces/${workspaceId}/docs/assets/${assetId}`,
  });
}
