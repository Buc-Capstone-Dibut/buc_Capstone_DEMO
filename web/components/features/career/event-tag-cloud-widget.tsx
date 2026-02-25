import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";

interface TagData {
  tag: string;
  count: number;
}

interface EventTagCloudWidgetProps {
  tags: TagData[];
}

export function EventTagCloudWidget({ tags }: EventTagCloudWidgetProps) {
  // Take top 20 tags
  const topTags = tags.slice(0, 20);

  return (
    <Card className="border-border/50 shadow-sm bg-background/50 backdrop-blur-sm mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          인기 키워드
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {topTags.length > 0 ? (
          topTags.map((t) => (
            <Link
              key={t.tag}
              href={`/insights/activities?tags=${encodeURIComponent(t.tag)}`}
              className="no-underline"
            >
              <Badge
                variant="secondary"
                className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer px-2 py-1 text-sm font-normal"
              >
                #{t.tag}{" "}
                <span className="ml-1 opacity-60 text-xs">({t.count})</span>
              </Badge>
            </Link>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">
            등록된 태그가 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
