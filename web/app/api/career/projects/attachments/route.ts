import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ProjectAttachment } from "@/app/my/[handle]/profile-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 프로젝트 보관함의 첨부 파일 업로드 / 삭제 라우트.
 *
 * 대표 사진 1장만 다루는 기존 `/api/career/projects/assets` 와 달리, 한 프로젝트당
 * 최대 5장의 이미지(JPG/PNG/WebP)와 문서(PDF)를 함께 보관하기 위한 엔드포인트다.
 * 실제 "5장 제한"은 클라이언트에서 enforce 하며, 서버는 storage 업로드만 책임진다.
 */

const BUCKET = "project-attachments";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB (이미지는 5MB로 별도 가드)
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_DOC_TYPES = new Set([
  "application/pdf",
]);
const ALLOWED_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOC_TYPES,
]);

const BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: MAX_FILE_BYTES,
  allowedMimeTypes: Array.from(ALLOWED_TYPES),
};

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}

function extensionFromFile(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName) {
    if (["jpg", "jpeg"].includes(byName)) return "jpg";
    if (["png", "webp", "pdf"].includes(byName)) return byName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "application/pdf") return "pdf";
  return "jpg";
}

function safeFilename(value: string) {
  return (
    (value || "attachment")
      .trim()
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w.\-가-힣]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "attachment"
  );
}

async function ensureBucket() {
  const admin = createAdminSupabaseClient();
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw error;

  const exists = buckets?.some((bucket) => bucket.name === BUCKET);
  if (exists) {
    const { error: updateError } = await admin.storage.updateBucket(
      BUCKET,
      BUCKET_OPTIONS,
    );
    if (updateError) throw updateError;
    return admin;
  }

  const { error: createError } = await admin.storage.createBucket(
    BUCKET,
    BUCKET_OPTIONS,
  );
  if (createError) throw createError;
  return admin;
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const label =
    typeof formData.get("label") === "string"
      ? String(formData.get("label")).trim()
      : "";

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "업로드할 파일이 필요합니다." },
      { status: 400 },
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: "JPG·PNG·WebP 이미지 또는 PDF 문서만 업로드할 수 있습니다.",
      },
      { status: 400 },
    );
  }
  const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "이미지는 5MB 이하만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }
  if (!isImage && file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "문서는 10MB 이하만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  try {
    const admin = await ensureBucket();
    const extension = extensionFromFile(file);
    const assetId = crypto.randomUUID();
    const filename = safeFilename(file.name);
    const storagePath = `${user.id}/${assetId}-${filename}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = admin.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const attachment: ProjectAttachment = {
      id: assetId,
      url: publicUrlData.publicUrl,
      storagePath,
      bucket: BUCKET,
      fileName: file.name || filename,
      mimeType: file.type,
      sizeBytes: file.size,
      kind: isImage ? "image" : "document",
      label: label || undefined,
      alt: isImage ? `${label || file.name} 첨부 이미지` : undefined,
      uploadedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, attachment }, { status: 201 });
  } catch (error) {
    console.error("Project attachment upload failed", error);
    return NextResponse.json(
      { success: false, error: "파일 업로드에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const storagePath = searchParams.get("storagePath");
  if (!storagePath) {
    return NextResponse.json(
      { error: "storagePath 가 필요합니다." },
      { status: 400 },
    );
  }
  // 본인 폴더 외 삭제 차단
  if (!storagePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = await ensureBucket();
    const { error } = await admin.storage.from(BUCKET).remove([storagePath]);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Project attachment delete failed", error);
    return NextResponse.json(
      { success: false, error: "파일 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
