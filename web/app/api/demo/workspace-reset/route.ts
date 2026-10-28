import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { buildWorkspaceDemoSql, DEMO_WORKSPACE_ID } from "@/lib/demo/workspace-demo";

// 발표 시연 후 시연용 워크스페이스(칸반·문서·채팅)를 처음 상태로 되돌린다. 해당 워크스페이스 owner만 가능.
export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await prisma.workspace_members.findUnique({
    where: { workspace_id_user_id: { workspace_id: DEMO_WORKSPACE_ID, user_id: session.user.id } },
    select: { role: true },
  });
  if (member?.role !== "owner") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  await prisma.$transaction(buildWorkspaceDemoSql().map((sql) => prisma.$executeRawUnsafe(sql)));
  return NextResponse.json({ success: true });
}
