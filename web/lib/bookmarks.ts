import { Blog } from "@/lib/supabase";
import { supabase } from "@/lib/supabase/client";

const supabaseAny = supabase as any;

export interface BookmarkedBlog extends Blog {
  bookmarked_at?: string;
}

export const getBookmarkedBlogs = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabaseAny.auth.getUser();

  if (authError || !user) {
    return { blogs: [] as BookmarkedBlog[], error: authError };
  }

  const { data, error } = await supabaseAny
    .from("blog_bookmarks")
    .select("created_at, blogs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { blogs: [] as BookmarkedBlog[], error };
  }

  const blogs = (data || [])
    .map((row: any) => {
      if (!row?.blogs) return null;
      return {
        ...(row.blogs as Blog),
        bookmarked_at: row.created_at,
      } as BookmarkedBlog;
    })
    .filter(Boolean) as BookmarkedBlog[];

  return { blogs, error: null };
};

export const isBookmarked = async (blogId: number) => {
  const {
    data: { user },
  } = await supabaseAny.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabaseAny
    .from("blog_bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("blog_id", blogId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.id);
};

export const addBookmark = async (blogId: number) => {
  const {
    data: { user },
    error: authError,
  } = await supabaseAny.auth.getUser();

  if (authError || !user) {
    return { error: authError || new Error("Unauthorized") };
  }

  const { error } = await supabaseAny
    .from("blog_bookmarks")
    .upsert(
      {
        user_id: user.id,
        blog_id: blogId,
      },
      { onConflict: "user_id,blog_id" },
    );

  return { error };
};

export const removeBookmark = async (blogId: number) => {
  const {
    data: { user },
    error: authError,
  } = await supabaseAny.auth.getUser();

  if (authError || !user) {
    return { error: authError || new Error("Unauthorized") };
  }

  const { error } = await supabaseAny
    .from("blog_bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("blog_id", blogId);

  return { error };
};
