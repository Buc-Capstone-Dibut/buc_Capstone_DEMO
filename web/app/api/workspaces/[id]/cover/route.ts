import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import prisma from "@/lib/prisma";
import { ensureWorkspaceWritable } from "@/lib/server/workspace-lifecycle";
import { createRouteHandlerClient } from "@/lib/supabase/server";

const BUCKET = "workspace-covers";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getExtension(file: File) {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return null;
}

function getStoragePath(url: string | null, workspaceId: string) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = decodeURIComponent(url.slice(index + marker.length));
  return path.startsWith(`${workspaceId}/`) ? path : null;
}

async function getWorkspaceOwner(workspaceId: string) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, workspace: null };

  const [membership, workspace] = await Promise.all([
    prisma.workspace_members.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: user.id,
        },
      },
      select: { role: true },
    }),
    prisma.workspaces.findUnique({
      where: { id: workspaceId },
      select: { id: true, cover_image_url: true },
    }),
  ]);

  if (!workspace || membership?.role !== "owner") {
    return { supabase, user, workspace: null };
  }

  return { supabase, user, workspace };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workspaceId } = await params;
  const { supabase, user, workspace } = await getWorkspaceOwner(workspaceId);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!workspace) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const writable = await ensureWorkspaceWritable(workspaceId);
  if (!writable.ok) {
    return NextResponse.json(
      { error: writable.error },
      { status: writable.status },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "이미지 파일을 선택해 주세요." },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: "JPG, PNG, WebP 형식의 5MB 이하 이미지만 업로드할 수 있습니다.",
      },
      { status: 400 },
    );
  }

  const extension = getExtension(file);
  if (!extension) {
    return NextResponse.json(
      { error: "지원하지 않는 이미지 형식입니다." },
      { status: 400 },
    );
  }

  const path = `${workspaceId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "대표이미지를 업로드하지 못했습니다." },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  try {
    await prisma.workspaces.update({
      where: { id: workspaceId },
      data: { cover_image_url: publicUrl },
    });
  } catch {
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json(
      { error: "대표이미지를 저장하지 못했습니다." },
      { status: 500 },
    );
  }

  const previousPath = getStoragePath(workspace.cover_image_url, workspaceId);
  if (previousPath) {
    await supabase.storage.from(BUCKET).remove([previousPath]);
  }

  return NextResponse.json({ coverImageUrl: publicUrl });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workspaceId } = await params;
  const { supabase, user, workspace } = await getWorkspaceOwner(workspaceId);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!workspace) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const writable = await ensureWorkspaceWritable(workspaceId);
  if (!writable.ok) {
    return NextResponse.json(
      { error: writable.error },
      { status: writable.status },
    );
  }

  const previousPath = getStoragePath(workspace.cover_image_url, workspaceId);
  await prisma.workspaces.update({
    where: { id: workspaceId },
    data: { cover_image_url: null },
  });

  if (previousPath) {
    await supabase.storage.from(BUCKET).remove([previousPath]);
  }

  return NextResponse.json({ coverImageUrl: null });
}
