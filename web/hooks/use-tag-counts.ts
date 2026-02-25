import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getTagsForCategory, type TagCategory } from "@/lib/tag-filters";

export interface TagCount {
  tag: string;
  count: number;
}

export function useTagCounts(category: string) {
  const [tagCounts, setTagCounts] = useState<TagCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTags() {
      setLoading(true);
      try {
        let query = supabase.from("blogs").select("tags");

        if (category && category !== "all") {
          const categoryTags = getTagsForCategory(category as TagCategory);
          if (categoryTags.length > 0) {
            query = query.overlaps("tags", categoryTags);
          }
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching tags:", error);
          return;
        }

        if (!data) return;

        // Calculate counts
        const counts: Record<string, number> = {};
        data.forEach((row: { tags: string[] | null }) => {
          if (row.tags && Array.isArray(row.tags)) {
            row.tags.forEach((tag) => {
              // Normalize tag
              const normalizedTag = tag.trim().toLowerCase();
              counts[normalizedTag] = (counts[normalizedTag] || 0) + 1;
            });
          }
        });

        const allowedTagSet =
          category && category !== "all"
            ? new Set(
                getTagsForCategory(category as TagCategory).map((tag) =>
                  tag.toLowerCase(),
                ),
              )
            : null;

        // Convert to array and sort
        const sortedCounts = Object.entries(counts)
          .filter(([tag]) => !allowedTagSet || allowedTagSet.has(tag))
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count); // Sort by count desc

        setTagCounts(sortedCounts);
      } catch (error) {
        console.error("Failed to fetch tag counts", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTags();
  }, [category]);

  return { tagCounts, loading };
}
