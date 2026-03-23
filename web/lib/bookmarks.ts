import { Blog } from "@/lib/supabase";
import { supabase } from "@/lib/supabase/client";

export interface BookmarkedBlog extends Blog {
  bookmarked_at?: string;
}

type BookmarkRow = {
  created_at: string;
  blogs: Blog | null;
};

function isMissingConflictConstraintError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";

  return message.includes(
    "there is no unique or exclusion constraint matching the ON CONFLICT specification",
  );
}

export const getBookmarkedBlogs = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { blogs: [] as BookmarkedBlog[], error: authError };
  }

  const { data, error } = await supabase
    .from("blog_bookmarks")
    .select("created_at, blogs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { blogs: [] as BookmarkedBlog[], error };
  }

  const blogs = ((data || []) as BookmarkRow[])
    .map((row) => {
      if (!row?.blogs) return null;
      return {
        ...row.blogs,
        bookmarked_at: row.created_at,
      } as BookmarkedBlog;
    })
    .filter(Boolean) as BookmarkedBlog[];

  return { blogs, error: null };
};

export const isBookmarked = async (blogId: number) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
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
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: authError || new Error("Unauthorized") };
  }

  const { error } = await supabase
    .from("blog_bookmarks")
    .upsert(
      {
        user_id: user.id,
        blog_id: blogId,
      },
      { onConflict: "user_id,blog_id" },
    );

  if (!error) {
    return { error: null };
  }

  if (!isMissingConflictConstraintError(error)) {
    return { error };
  }

  const { data: existing, error: existingError } = await supabase
    .from("blog_bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("blog_id", blogId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError };
  }

  if (existing?.id) {
    return { error: null };
  }

  const { error: insertError } = await supabase.from("blog_bookmarks").insert(
    {
      user_id: user.id,
      blog_id: blogId,
    },
  );

  return { error: insertError };
};

export const removeBookmark = async (blogId: number) => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: authError || new Error("Unauthorized") };
  }

  const { error } = await supabase
    .from("blog_bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("blog_id", blogId);

  return { error };
};
