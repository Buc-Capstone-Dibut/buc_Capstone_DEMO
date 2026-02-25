import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import PostForm from "@/components/features/community/post-form";

export default async function PostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) {
    notFound();
  }

  // Permission Check
  if ((post as any).author_id !== user.id) {
    return (
      <div className="container mx-auto py-20 text-center">
        수정 권한이 없습니다.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8 text-center">게시글 수정</h1>
      {/* @ts-ignore */}
      <PostForm initialData={post} />
    </div>
  );
}
