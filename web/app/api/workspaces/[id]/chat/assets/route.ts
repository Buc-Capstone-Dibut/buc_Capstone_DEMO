import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "workspace-doc-assets";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function encodeAssetKey(storagePath: string) {
  return Buffer.from(storagePath, "utf8").toString("base64url");
}

function sanitizeAltText(filename: string) {
  const cleaned = filename.replace(/[\[\]\(\)]/g, "").trim();
  return cleaned || "chat-image";
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;

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

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "지원하지 않는 이미지 형식입니다." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "이미지는 10MB 이하만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const storagePath = `${workspaceId}/chat/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminSupabaseClient();

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Workspace chat asset upload failed", uploadError);
    return NextResponse.json(
      { error: "채팅 이미지 업로드에 실패했습니다." },
      { status: 500 },
    );
  }

  const assetKey = encodeAssetKey(storagePath);
  const accessUrl = `/api/workspaces/${workspaceId}/chat/assets/${assetKey}`;
  const alt = sanitizeAltText(file.name);

  return NextResponse.json({
    alt,
    accessUrl,
    markdown: `![${alt}](${accessUrl})`,
  });
}
