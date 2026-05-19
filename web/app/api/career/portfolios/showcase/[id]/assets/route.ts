import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { showcasePortfolioDelegate } from "@/components/features/career/portfolio-showcase/server/showcase-portfolios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "portfolio-assets";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFromFile(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName && ["jpg", "jpeg", "png", "webp"].includes(byName)) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function getUser() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await showcasePortfolioDelegate().findFirst({
    where: { id: params.id, user_id: user.id },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type: ${file.type}. JPEG/PNG/WebP only.` },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB).` },
      { status: 400 },
    );
  }

  const ext = extensionFromFile(file);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const storagePath = `showcase/${user.id}/${row.id}/${ts}-${rand}.${ext}`;

  const admin = createAdminSupabaseClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.error("Showcase asset upload failed", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({
    url: publicData.publicUrl,
    storagePath,
    bucket: BUCKET,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
}
