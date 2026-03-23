import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import prisma from "@/lib/prisma";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const BUCKET = "workspace-doc-assets";

export async function GET(
  request: Request,
  { params }: { params: { id: string; assetId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.id;
  const assetId = params.assetId;

  const [membership, asset] = await Promise.all([
    prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: session.user.id,
        },
      },
      select: { user_id: true },
    }),
    prisma.workspace_doc_assets.findFirst({
      where: {
        id: assetId,
        workspace_id: workspaceId,
      },
      select: {
        storage_path: true,
      },
    }),
  ]);

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(asset.storage_path, 60 * 10);

  if (error || !data?.signedUrl) {
    console.error("Workspace doc asset signed URL failed", error);
    return NextResponse.json({ error: "이미지를 불러오지 못했습니다." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
