"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteResumeAction(id: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const target = await prisma.user_resumes.findUnique({ where: { id } });
  if (!target || target.user_id !== session.user.id) throw new Error("Unauthorized");

  await prisma.user_resumes.delete({ where: { id } });

  if (target.is_active) {
    const next = await prisma.user_resumes.findFirst({
      where: { user_id: session.user.id },
      orderBy: { updated_at: 'desc' }
    });
    if (next) {
      await prisma.user_resumes.update({
        where: { id: next.id },
        data: { is_active: true }
      });
    }
  }

  revalidatePath("/career/resumes");
  return { success: true };
}

export async function setActiveResumeAction(id: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const target = await prisma.user_resumes.findUnique({ where: { id } });
  if (!target || target.user_id !== session.user.id) throw new Error("Unauthorized");

  await prisma.$transaction([
    prisma.user_resumes.updateMany({
      where: { user_id: session.user.id },
      data: { is_active: false }
    }),
    prisma.user_resumes.update({
      where: { id },
      data: { is_active: true }
    })
  ]);

  return { success: true };
}
