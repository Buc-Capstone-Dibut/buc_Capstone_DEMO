import { Button } from "@/components/ui/button";
import { type TagFilterOption } from "@/lib/tag-filters";

interface TagFilterBarProps {
  value: string;
  options: TagFilterOption[];
  selectedSubTags: string[];
  availableTags: { tag: string; count: number }[];
  showSubTags?: boolean;
  onChange: (value: string) => void;
  onSubTagChange: (subTags: string[]) => void;
}

export function TagFilterBar({
  value,
  options,
  selectedSubTags,
  availableTags,
  showSubTags = true,
  onChange,
  onSubTagChange,
}: TagFilterBarProps) {
  // Create a Set of available tags (lowercase) for fast lookup
  const availableTagSet = new Set(
    availableTags.map((t) => t.tag.toLowerCase())
  );

  // 현재 선택된 메인 태그의 서브태그들 가져오기
  const currentOption = options.find((opt) => opt.id === value);
  const rawSubTags = currentOption?.tags ?? [];

  // Filter sub-tags: Only show those that actually exist in the DB
  const subTags = rawSubTags.filter((tag) =>
    availableTagSet.has(tag.toLowerCase())
  );

  // 서브태그 클릭 핸들러
  const handleSubTagClick = (subTag: string) => {
    if (selectedSubTags.includes(subTag)) {
      // 이미 선택된 경우 제거
      const newSubTags = selectedSubTags.filter((tag) => tag !== subTag);
      onSubTagChange(newSubTags);
    } else {
      // 선택되지 않은 경우 추가
      onSubTagChange([...selectedSubTags, subTag]);
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-2 px-2 sm:px-0 w-full">
      {/* 메인 태그 */}
      <div className="flex flex-wrap gap-2 items-center">
        {options.map((option) => {
          const isActive = option.id === value;
          return (
            <Button
              key={option.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="rounded-full px-4 whitespace-nowrap border-slate-300 dark:border-white/25"
              onClick={() => onChange(option.id)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      {/* 서브태그 목록: 항상 노출, 선택 시에도 배경 채우지 않음 */}
      {showSubTags && value !== "all" && subTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subTags.map((subTag) => {
            const isSelected = selectedSubTags.includes(subTag);
            return (
              <Button
                key={subTag}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`rounded-full px-3 py-0 h-7 text-xs whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "border border-slate-300 dark:border-white/25 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => handleSubTagClick(subTag)}
              >
                {subTag}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
