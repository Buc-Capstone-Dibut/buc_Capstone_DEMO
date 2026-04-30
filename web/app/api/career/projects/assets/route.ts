import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "project-representative-images";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
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
  if (byName && ["jpg", "jpeg", "png", "webp"].includes(byName)) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function safeFilename(value: string) {
  return (value || "project-image")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.\-가-힣]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "project-image";
}

async function ensureProjectImageBucket() {
  const admin = createAdminSupabaseClient();
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) throw error;

  const exists = buckets?.some((bucket) => bucket.name === BUCKET);
  if (exists) {
    const { error: updateError } = await admin.storage.updateBucket(BUCKET, BUCKET_OPTIONS);
    if (updateError) throw updateError;
    return admin;
  }

  const { error: createError } = await admin.storage.createBucket(BUCKET, BUCKET_OPTIONS);
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
  const title = typeof formData.get("title") === "string" ? String(formData.get("title")).trim() : "";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "JPG, PNG, WebP 이미지만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "대표 이미지는 5MB 이하만 업로드할 수 있습니다." },
      { status: 400 },
    );
  }

  try {
    const admin = await ensureProjectImageBucket();
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

    const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;
    const caption = title || file.name.replace(/\.[^.]+$/, "") || "프로젝트";

    return NextResponse.json(
      {
        representativeImage: {
          url: publicUrl,
          storagePath,
          bucket: BUCKET,
          fileName: file.name || filename,
          mimeType: file.type,
          sizeBytes: file.size,
          alt: `${caption} 대표 이미지`,
          caption,
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Project representative image upload failed", error);
    return NextResponse.json(
      { error: "대표 이미지 업로드에 실패했습니다." },
      { status: 500 },
    );
  }
}
