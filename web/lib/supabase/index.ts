import { supabase } from "@/lib/supabase/client";

export interface Blog {
  id: number;
  title: string;
  summary?: string | null;
  author: string;
  tags: string[];
  published_at?: string | Date | null;
  thumbnail_url?: string | null;
  external_url: string;
  views?: number | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
  blog_type?: string | null;
  category?: string | null;
}

export const fetchWeeklyPopularBlogs = async (limit = 10): Promise<Blog[]> => {
  const { data, error } = await supabase
    .from("blogs")
    .select("*")
    .order("views", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching popular blogs:", error);
    return [];
  }

  return (data as any[]) || [];
};

export const incrementViews = async (id: number) => {
  // Using RPC is better for atomicity, but for now we just define the method
  const { error } = await (supabase as any).rpc("increment_views", { blog_id: id });
  if (error) {
    console.error("Error incrementing views:", error);
  }
};

export const fetchAvailableBlogs = async () => {
  // Fetch distinct authors/blogs
  const { data, error } = await supabase
    .from("blogs")
    .select("author, blog_type, category")
    .order("author");

  if (error) {
    console.error("Error fetching available blogs:", error);
    return { companies: [], individuals: [] };
  }

  // De-duplicate based on author name
  const uniqueBlogs = Array.from(
    new Map(((data as any[]) || []).map((item: any) => [item.author, item])).values(),
  ) as any[];

  // Group by type
  const companies = uniqueBlogs.filter((b: any) => b.blog_type === "company");
  const individuals = uniqueBlogs.filter((b: any) => b.blog_type !== "company"); // Assuming 'personal' or null is individual

  return { companies, individuals };
};
