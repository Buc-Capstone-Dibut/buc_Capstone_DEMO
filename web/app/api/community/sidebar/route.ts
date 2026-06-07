import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PopularTopicItem {
  tag: string;
  count: number;
}

interface RecruitingSquadItem {
  id: string;
  title: string;
  type: string;
  place_type: string | null;
  location: string | null;
  created_at: Date;
}

interface TopicAgg {
  tag: string;
  count: number;
  latestAt: number;
}

const CATEGORY_TOPIC_LABEL: Record<string, string> = {
  qna: "Q&A",
  tech: "Tech 토론",
  codereview: "코드 리뷰",
  showcase: "프로젝트 자랑",
  daily: "잡담",
};

function buildPopularTopics(
  rows: { tags: string[] | null; category: string; created_at: Date }[],
  limit: number,
): PopularTopicItem[] {
  const map = new Map<string, TopicAgg>();

  for (const row of rows) {
    const createdAtTs = row.created_at.getTime();
    const normalizedTags =
      row.tags?.map((tag) => tag.trim()).filter((tag) => tag.length > 0) || [];

    if (normalizedTags.length > 0) {
      for (const trimmed of normalizedTags) {
        const key = trimmed.toLowerCase();
        const prev = map.get(key);
        if (!prev) {
          map.set(key, {
            tag: trimmed,
            count: 1,
            latestAt: createdAtTs,
          });
        } else {
          prev.count += 1;
          if (createdAtTs > prev.latestAt) {
            prev.latestAt = createdAtTs;
            prev.tag = trimmed;
          }
        }
      }
      continue;
    }

    // Fallback: when a post has no tags, use category as topic signal.
    const categoryLabel = CATEGORY_TOPIC_LABEL[row.category] || row.category;
    const key = `category:${row.category}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        tag: categoryLabel,
        count: 1,
        latestAt: createdAtTs,
      });
    } else {
      prev.count += 1;
      if (createdAtTs > prev.latestAt) {
        prev.latestAt = createdAtTs;
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.latestAt !== a.latestAt) return b.latestAt - a.latestAt;
      return a.tag.localeCompare(b.tag);
    })
    .slice(0, limit)
    .map((item) => ({ tag: item.tag, count: item.count }));
}

// Popular topics + recruiting squads are fully public, non-personalized data
// (no cookies/auth). Cache the DB scan (up to 300 posts) for 5 minutes and
// share the result across all users, instead of re-querying on every sidebar
// mount. Bust on demand via revalidateTag("community-sidebar").
const getSidebarData = unstable_cache(
  async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [recentRows, recruitingSquads] = await Promise.all([
      prisma.posts.findMany({
        where: {
          created_at: { gte: weekAgo },
        },
        select: {
          tags: true,
          category: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take: 300,
      }),
      prisma.squads.findMany({
        where: { status: "recruiting" },
        select: {
          id: true,
          title: true,
          type: true,
          place_type: true,
          location: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take: 3,
      }),
    ]);

    let popularTopics = buildPopularTopics(recentRows, 6);

    // Fallback: if last 7 days has no tags, use latest posts overall.
    if (popularTopics.length === 0) {
      const fallbackRows = await prisma.posts.findMany({
        select: {
          tags: true,
          category: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take: 300,
      });
      popularTopics = buildPopularTopics(fallbackRows, 6);
    }

    return {
      popularTopics,
      recruitingSquads: recruitingSquads as RecruitingSquadItem[],
      meta: {
        popularTopicsWindowDays: 7,
        popularTopicsMaxPosts: 300,
      },
    };
  },
  ["community-sidebar"],
  { revalidate: 300, tags: ["community-sidebar"] },
);

export async function GET() {
  try {
    const payload = await getSidebarData();
    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error("API: Community sidebar error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
