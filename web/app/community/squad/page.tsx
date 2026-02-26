import Link from "next/link";
import { Plus } from "lucide-react";
import { SquadCard } from "@/components/features/community/squad-card";
import { Button } from "@/components/ui/button";
import { fetchSquads } from "@/lib/server/squads";
import { PaginationControl } from "@/components/ui/pagination-control";

export const revalidate = 30;

interface PageProps {
  searchParams: Promise<{ page?: string; type?: string }>;
}

export default async function SquadListPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page =
    typeof resolvedSearchParams.page === "string"
      ? parseInt(resolvedSearchParams.page)
      : 1;
  const type = resolvedSearchParams.type || "all";

  const { squads, totalPages, totalCount } = await fetchSquads({
    page,
    limit: 9,
    type,
  });

  const categories = [
    { id: "all", label: "전체" },
    { id: "project", label: "프로젝트" },
    { id: "study", label: "스터디" },
    { id: "contest", label: "공모전" },
    { id: "mogakco", label: "모각코" },
  ];

  return (
    <div className="space-y-6">
      {/* Filters & Actions (Board Style) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/community/squad?type=${cat.id}`}
              scroll={false}
            >
              <Button
                variant={type === cat.id ? "default" : "outline"}
                size="sm"
                className="rounded-full"
              >
                {cat.label}
              </Button>
            </Link>
          ))}
        </div>

        <Link href="/community/squad/write">
          <Button className="w-full md:w-auto gap-2 shadow-lg">
            <Plus className="w-4 h-4" />
            모집글 작성하기
          </Button>
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 데모용 가짜 데이터 추가 (첫 페이지일 때 상시 노출, 필터 호환) */}
        {page === 1 && (type === "all" || type === "side-project" || type === "project") && (
          <SquadCard
            squad={{
              id: "squad-demo-1" as any,
              title: "Dibut 개발자 플랫폼 클론 코딩 팀원 모집 (데모)",
              content: "데모용 모집글입니다. 클릭하여 상세보기를 확인하세요.",
              type: "side-project" as any,
              status: "recruiting" as any,
              capacity: 4,
              recruited_count: 3,
              leader_id: "demo-leader",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              tech_stack: ["Next.js", "Tailwind CSS", "Supabase", "TypeScript"],
              place_type: "online" as any,
              location: null,
              activity_id: null,
              workspace_id: "p-2",
              leader: {
                nickname: "Junghwan",
                avatar_url: null,
              } as any
            }}
          />
        )}

        {squads.map((squad) => (
          // @ts-ignore
          <SquadCard key={squad.id} squad={squad} />
        ))}

        {/* 실제 데이터가 없고 데모만 있는 경우에도 추가로 모집글 작성을 유도하는 빈 카드 표시 가능 (선택) */}
      </div>

      {squads.length > 0 && (
        <div className="py-12">
          <PaginationControl currentPage={page} totalPages={totalPages} />
        </div>
      )}

      {squads.length === 0 && page !== 1 && (
        <div className="flex flex-col items-center justify-center py-32 text-center border rounded-2xl border-dashed bg-muted/20">
          <div className="text-6xl mb-6">👥</div>
          <h3 className="text-xl font-bold mb-2">
            검색 결과가 없습니다.
          </h3>
        </div>
      )}
    </div>
  );
}
