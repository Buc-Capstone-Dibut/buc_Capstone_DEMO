"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { TagFilterBar } from "@/components/features/tech-blog/tag-filter-bar";
import { TagFilterOption } from "@/lib/tag-filters";

// Common tags to show across categories
const COMMON_TAGS = [
  "AI",
  "클라우드",
  "블록체인",
  "프론트엔드",
  "백엔드",
  "모바일",
  "데이터",
  "보안",
  "DevOps",
  "기술일반",
  "온라인",
  "오프라인",
  "무료",
  "유료",
];

// Activity Categories mapping to dev-event.category
export const ACTIVITY_FILTER_OPTIONS: TagFilterOption[] = [
  { id: "all", value: "all", label: "전체", tags: [] },
  {
    id: "Competition",
    value: "Competition",
    label: "대회/해커톤",
    tags: [...COMMON_TAGS, "대회", "해커톤", "공모전"],
  },
  {
    id: "Education",
    value: "Education",
    label: "교육/부트캠프",
    tags: [...COMMON_TAGS, "교육", "부트캠프", "강의", "스터디"],
  },
  {
    id: "Community",
    value: "Community",
    label: "모임/네트워킹",
    tags: [...COMMON_TAGS, "모임", "네트워킹", "컨퍼런스", "세미나"],
  },
  {
    id: "Other",
    value: "Other",
    label: "기타",
    tags: [...COMMON_TAGS],
  },
];

interface ActivityFilterProps {
  allTags: { tag: string; count: number }[];
}

export function ActivityFilter({ allTags }: ActivityFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // URL Params State
  const category = (searchParams.get("category") as string) || "all";
  // We use 'tags' param for sub-tags in Activities URL scheme
  const selectedSubTags = searchParams.get("tags")
    ? searchParams
      .get("tags")!
      .split(",")
      .filter((tag) => tag.trim() !== "")
    : [];

  // Handlers
  const handleCategoryChange = (newCategory: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // Reset sub-tags when category changes
    params.delete("tags");

    if (newCategory === "all") {
      params.delete("category");
    } else {
      params.set("category", newCategory);
    }

    // Reset page if exists
    params.delete("page");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSubTagChange = (newSubTags: string[]) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newSubTags.length > 0) {
      params.set("tags", newSubTags.join(","));
    } else {
      params.delete("tags");
    }

    // Reset page
    params.delete("page");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full">
      <TagFilterBar
        value={category}
        options={ACTIVITY_FILTER_OPTIONS}
        selectedSubTags={selectedSubTags}
        availableTags={allTags}
        onChange={handleCategoryChange}
        onSubTagChange={handleSubTagChange}
      />
    </div>
  );
}
