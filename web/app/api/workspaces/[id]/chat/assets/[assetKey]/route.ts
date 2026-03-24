import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "workspace-doc-assets";

function decodeAssetKey(assetKey: string) {
  try {
    return Buffer.from(assetKey, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; assetKey: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const storagePath = decodeAssetKey(params.assetKey);

  if (!storagePath || !storagePath.startsWith(`${workspaceId}/chat/`)) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

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

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 10);

  if (error || !data?.signedUrl) {
    console.error("Workspace chat asset signed URL failed", error);
    return NextResponse.json(
      { error: "이미지를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
