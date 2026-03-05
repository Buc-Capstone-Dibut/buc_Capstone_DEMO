import Link from "next/link";
import { Plus, X, Search } from "lucide-react";
import { SquadCard } from "@/components/features/community/squad-card";
import { Button } from "@/components/ui/button";
import { fetchSquads } from "@/lib/server/squads";
import { PaginationControl } from "@/components/ui/pagination-control";

export const revalidate = 30;

interface PageProps {
  searchParams: Promise<{ page?: string; type?: string; activityId?: string }>;
}

export default async function SquadListPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page =
    typeof resolvedSearchParams.page === "string"
      ? parseInt(resolvedSearchParams.page)
      : 1;
  const type = resolvedSearchParams.type || "all";
  const activityId = resolvedSearchParams.activityId || undefined;

  const { squads, totalPages, totalCount } = await fetchSquads({
    page,
    limit: 9,
    type,
    activityId,
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
      {/* Activity Filter Indicator */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {activityId ? <Search className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-sm font-medium text-primary">
              {activityId ? "특정 활동의 모집글만 보고 있습니다." : "원하는 팀원을 찾아보세요."}
            </p>
            <p className="text-xs text-slate-500">
              {activityId ? "연동된 대외활동의 팀원 모집 현황입니다." : "함께 성장할 동료들이 기다리고 있습니다."}
            </p>
          </div>
        </div>
        {activityId && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs hover:bg-primary/10" asChild>
            <Link href="/community/squad">
              <X className="w-3.5 h-3.5" />
              필터 해제
            </Link>
          </Button>
        )}
      </div>

      {/* Filters & Actions (Board Style) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={type === cat.id ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              asChild
            >
              <Link
                href={`/community/squad?type=${cat.id}${activityId ? `&activityId=${activityId}` : ""}`}
                scroll={false}
              >
                {cat.label}
              </Link>
            </Button>
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
        {/* 데모용 가짜 데이터 - 필터링 중이 아닐 때만 표시 */}
        {!activityId && page === 1 && (type === "all" || type === "side-project" || type === "project") && (
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
      </div>

      {squads.length > 0 && (
        <div className="py-12">
          <PaginationControl currentPage={page} totalPages={totalPages} />
        </div>
      )}

      {squads.length === 0 && (!activityId && page !== 1) && (
        <div className="flex flex-col items-center justify-center py-32 text-center border rounded-2xl border-dashed bg-muted/20">
          <div className="text-6xl mb-6">👥</div>
          <h3 className="text-xl font-bold mb-2">
            검색 결과가 없습니다.
          </h3>
        </div>
      )}

      {squads.length === 0 && activityId && (
        <div className="flex flex-col items-center justify-center py-32 text-center border rounded-2xl border-dashed bg-muted/20">
          <div className="text-6xl mb-6">🔍</div>
          <h3 className="text-xl font-bold mb-2">
            이 활동에 아직 모집글이 없습니다.
          </h3>
          <p className="text-sm text-slate-500 mb-6">첫 번째 팀원을 직접 모집해 보세요!</p>
          <Link href={`/community/squad/write?activityId=${activityId}`}>
            <Button>모집글 작성하기</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
