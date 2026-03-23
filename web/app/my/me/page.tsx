import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForUser, extractAuthProfileSeed } from "@/lib/my-profile";

export const dynamic = "force-dynamic";

export default async function MyMePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  const user = session.user;
  const seed = extractAuthProfileSeed(user);
  const profile = await ensureProfileForUser({
    userId: user.id,
    nickname: seed.nickname,
    email: seed.email,
    avatarUrl: seed.avatarUrl,
  });

  const queryString = new URLSearchParams(searchParams as any).toString();
  redirect(`/my/${profile.handle}${queryString ? "?" + queryString : ""}`);
}
