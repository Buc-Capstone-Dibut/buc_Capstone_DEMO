import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Blog } from "@/lib/supabase";
import { getTagsForCategory, type TagCategory } from "@/lib/tag-filters";

interface UseBlogDataParams {
  selectedBlog?: string;
  sortBy?: string;
  searchQuery?: string;
  tagCategory?: string;
  selectedSubTags?: string[];
  /** 분석 페이지 '더 보기'에서 넘어온 추천 태그 조합 — 하나라도 포함하면(OR) 노출 */
  recommendedTags?: string[];
  page?: number;
}

export function useBlogData(params: UseBlogDataParams) {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      try {
        let query = supabase.from("blogs").select("*", { count: "exact" });

        // Apply filters here based on params
        // Apply filters here based on params
        // blogType filtering removed as we only support "company" now

        // Category Filter
        if (params.tagCategory && params.tagCategory !== "all") {
          const categoryTags = getTagsForCategory(params.tagCategory as TagCategory);
          if (categoryTags.length > 0) {
            query = query.overlaps("tags", categoryTags);
          }
        }

        if (params.selectedSubTags && params.selectedSubTags.length > 0) {
          query = query.contains("tags", params.selectedSubTags);
        }

        // 추천 태그 조합: 하나라도 겹치면 노출(OR). 분석 페이지 '더 보기' 진입용.
        if (params.recommendedTags && params.recommendedTags.length > 0) {
          query = query.overlaps("tags", params.recommendedTags);
        }

        if (params.searchQuery) {
          query = query.or(`title.ilike.%${params.searchQuery}%,author.ilike.%${params.searchQuery}%`);
        }

        // Blog Author (Company) Filter
        if (params.selectedBlog && params.selectedBlog !== "all") {
          query = query.eq("author", params.selectedBlog);
        }

        // Pagination
        const page = params.page || 1;
        const pageSize = 12;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        query = query.range(from, to);

        const { data, count, error } = await query;

        if (error) {
          console.error(error);
        } else {
          setBlogs((data as Blog[]) || []);
          setTotalCount(count || 0);
          setTotalPages(Math.ceil((count || 0) / pageSize));
          setCurrentPage(page);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [
    params.selectedBlog,
    params.sortBy,
    params.searchQuery,
    params.tagCategory,
    params.selectedSubTags,
    params.recommendedTags,
    params.page,
  ]);

  return { blogs, loading, totalCount, totalPages, currentPage };
}
